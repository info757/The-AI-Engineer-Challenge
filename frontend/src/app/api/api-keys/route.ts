import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-char-encryption-key-here!!';

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

// Encryption function
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
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

// API Key operations
async function createAPIKey(userId: string, name: string, encryptedKey: string): Promise<APIKey | null> {
  if (!supabase) {
    console.error('Supabase client not initialized - missing environment variables');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        name,
        encrypted_key: encryptedKey
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating API key:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating API key:', error);
    return null;
  }
}

async function getUserAPIKeys(userId: string): Promise<APIKey[]> {
  if (!supabase) {
    console.error('Supabase client not initialized - missing environment variables');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting user API keys:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting user API keys:', error);
    return [];
  }
}

async function deleteAPIKey(id: string): Promise<boolean> {
  if (!supabase) {
    console.error('Supabase client not initialized - missing environment variables');
    return false;
  }

  try {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting API key:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting API key:', error);
    return false;
  }
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

// GET - Get user's API keys
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if Supabase is available
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not available - missing environment variables' },
        { status: 500 }
      );
    }

    const apiKeys = await getUserAPIKeys(userId);
    
    // Return API keys without the encrypted key for security
    const safeApiKeys = apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      created_at: key.created_at,
      updated_at: key.updated_at
    }));

    return NextResponse.json({ apiKeys: safeApiKeys });

  } catch (error) {
    console.error('Get API keys error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new API key
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if Supabase is available
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not available - missing environment variables' },
        { status: 500 }
      );
    }

    const { name, apiKey } = await request.json();

    if (!name || !apiKey) {
      return NextResponse.json(
        { error: 'Name and API key are required' },
        { status: 400 }
      );
    }

    // Encrypt the API key
    const encryptedKey = encrypt(apiKey);

    // Save to Supabase
    const savedKey = await createAPIKey(userId, name, encryptedKey);
    if (!savedKey) {
      return NextResponse.json(
        { error: 'Failed to save API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'API key created successfully',
      apiKey: {
        id: savedKey.id,
        name: savedKey.name,
        created_at: savedKey.created_at
      }
    });

  } catch (error) {
    console.error('Create API key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete API key
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if Supabase is available
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not available - missing environment variables' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json(
        { error: 'API key ID is required' },
        { status: 400 }
      );
    }

    // Verify the API key belongs to the user
    const apiKey = await getAPIKeyById(keyId);
    if (!apiKey || apiKey.user_id !== userId) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Delete the API key
    const success = await deleteAPIKey(keyId);
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'API key deleted successfully'
    });

  } catch (error) {
    console.error('Delete API key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
