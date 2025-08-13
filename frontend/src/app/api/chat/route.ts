import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verify } from 'jsonwebtoken';
import { createDecipheriv } from 'crypto';
import { storage } from '../../../lib/storage';

// TypeScript interfaces for better type safety
interface APIKey {
  id: string;
  userId: string;
  encrypted_api_key: string;
  key_name: string;
  is_active: boolean;
  created_at: string;
  last_used?: string;
}

interface JwtPayload {
  userId: string;
  username: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-encryption-key-32-chars-long!';

// Decryption helper function
function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Helper function to get user from token
function getUserFromToken(request: NextRequest): JwtPayload | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { developer_message, user_message, model = 'gpt-4o-mini', use_demo_mode, api_key_id } = body;

    if (!developer_message || !user_message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let apiKeyToUse: string;

    if (use_demo_mode) {
      // Use demo mode with default API key
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
          { error: 'Demo mode not available - no default API key configured' },
          { status: 500 }
        );
      }
      apiKeyToUse = process.env.OPENAI_API_KEY;
    } else {
      // Use personal API key
      const user = getUserFromToken(request);
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required for personal API key usage' },
          { status: 401 }
        );
      }

      let userApiKey;
      if (api_key_id) {
        // Use specific API key
        userApiKey = storage.findAPIKeyById(api_key_id);
        if (userApiKey && userApiKey.userId !== user.userId) {
          userApiKey = null; // Not owned by this user
        }
      } else {
        // Use first available API key
        const userKeys = storage.findAPIKeysByUserId(user.userId);
        userApiKey = userKeys.find(key => key.is_active);
      }

      if (!userApiKey) {
        return NextResponse.json(
          { error: 'No personal API key found. Please add an API key in settings.' },
          { status: 400 }
        );
      }

      try {
        apiKeyToUse = decrypt(userApiKey.encrypted_api_key);
        // Update last used timestamp
        storage.updateAPIKey(userApiKey.id, { last_used: new Date().toISOString() });
      } catch {
        return NextResponse.json(
          { error: 'Failed to decrypt API key. Please re-add your API key.' },
          { status: 500 }
        );
      }
    }

    // Initialize OpenAI client with the determined API key
    const openai = new OpenAI({
      apiKey: apiKeyToUse,
    });

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: developer_message },
        { role: 'user', content: user_message }
      ],
      stream: true,
    });

    // Convert to ReadableStream for streaming response
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain',
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
