import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Simple in-memory rate limiting (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'your-secret-key';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-char-encryption-key-here!!';
const DEMO_OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Create Supabase client conditionally
let supabase: SupabaseClient | null = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
}

// Types
interface APIKey {
  id: string;
  user_id: string;
  name: string;
  encrypted_key: string;
  created_at: string;
  updated_at: string;
}

// Decryption function
function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  // Convert hex string to buffer for AES-256
  const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Helper function to get user ID from token
function getUserIdFromToken(request: NextRequest): string | null {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

// Rate limiting function
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new rate limit entry
    rateLimitMap.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

async function getAPIKeyById(id: string): Promise<APIKey | null> {
  if (!supabase) {
    console.error('Supabase client not initialized - missing environment variables');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error getting API key by id:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting API key by id:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, api_key_id, model = 'gpt-4o-mini', system_message = 'You are a helpful AI assistant.', demo_mode } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Require authentication for all requests
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check rate limit
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    let openaiApiKey: string;

    // Check if using personal API key or demo mode
    if (api_key_id) {
      // Personal API key mode
      // Check if Supabase is available
      if (!supabase) {
        return NextResponse.json(
          { error: 'Database not available - missing environment variables' },
          { status: 500 }
        );
      }

      // Get the API key from Supabase
      const apiKeyRecord = await getAPIKeyById(api_key_id);
      if (!apiKeyRecord || apiKeyRecord.user_id !== userId) {
        return NextResponse.json(
          { error: 'API key not found' },
          { status: 404 }
        );
      }

      // Decrypt the API key
      openaiApiKey = decrypt(apiKeyRecord.encrypted_key);
    } else {
      // Demo mode - still requires authentication
      if (!DEMO_OPENAI_API_KEY) {
        return NextResponse.json(
          { error: 'Demo mode not available' },
          { status: 500 }
        );
      }
      openaiApiKey = DEMO_OPENAI_API_KEY;
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Create chat completion
    const stream = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: system_message },
        { role: 'user', content: message }
      ],
      stream: true,
    });

    // Convert stream to ReadableStream
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
