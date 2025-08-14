import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'your-secret-key';
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
    console.log('=== JWT Token Validation ===');
    const authHeader = request.headers.get('authorization');
    console.log('Auth header exists:', !!authHeader);
    console.log('Auth header starts with Bearer:', authHeader?.startsWith('Bearer '));
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Invalid auth header format');
      return null;
    }

    const token = authHeader.substring(7);
    console.log('Token length:', token.length);
    console.log('Token starts with:', token.substring(0, 20) + '...');
    console.log('JWT_SECRET exists:', !!JWT_SECRET);
    console.log('JWT_SECRET length:', JWT_SECRET?.length);
    
    if (!JWT_SECRET || JWT_SECRET === 'your-secret-key') {
      console.log('JWT_SECRET is not properly configured');
      return null;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    console.log('Token decoded successfully, userId:', decoded.userId);
    return decoded.userId;
  } catch (error) {
    console.log('JWT verification failed:', error);
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
    console.log('=== API Key Retrieval Request ===');
    const userId = getUserIdFromToken(request);
    console.log('User ID:', userId);
    
    if (!userId) {
      console.log('No user ID found - unauthorized');
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

    console.log('Fetching API keys for user...');
    const apiKeys = await getUserAPIKeys(userId);
    console.log('Found API keys:', apiKeys.length);
    
    // Return API keys without the encrypted key for security
    const safeApiKeys = apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      created_at: key.created_at,
      updated_at: key.updated_at
    }));

    console.log('Returning safe API keys:', safeApiKeys);
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
    console.log('=== API Key Creation Request ===');
    
    // Check environment variables first
    if (!process.env.SUPABASE_JWT_SECRET) {
      console.log('SUPABASE_JWT_SECRET environment variable is missing');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    const userId = getUserIdFromToken(request);
    console.log('User ID:', userId);
    
    if (!userId) {
      console.log('No user ID found - unauthorized');
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

    const body = await request.json();
    console.log('Request body:', body);
    
    const { name, apiKey } = body;

    if (!name || !apiKey) {
      console.log('Missing required fields - name:', !!name, 'apiKey:', !!apiKey);
      return NextResponse.json(
        { error: 'Name and API key are required' },
        { status: 400 }
      );
    }
    
    console.log('All required fields present');

    // Encrypt the API key
    const encryptedKey = encrypt(apiKey);

    // Save to Supabase
    console.log('Attempting to save API key to database...');
    const savedKey = await createAPIKey(userId, name, encryptedKey);
    if (!savedKey) {
      console.log('Failed to save API key to database');
      return NextResponse.json(
        { error: 'Failed to save API key' },
        { status: 500 }
      );
    }
    
    console.log('API key saved successfully:', savedKey.id);

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


