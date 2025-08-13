import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { createCipheriv, randomBytes } from 'crypto';

// Simple in-memory storage for demo purposes
const apiKeys: APIKey[] = [];

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

interface APIKeyResponse {
  id: string;
  key_name: string;
  is_active: boolean;
  created_at: string;
  last_used?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-encryption-key-32-chars-long!';

// Encryption helper function
function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
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

// GET - List user's API keys
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userKeys = apiKeys.filter(k => k.userId === user.userId);
    const response: APIKeyResponse[] = userKeys.map(key => ({
      id: key.id,
      key_name: key.key_name,
      is_active: key.is_active,
      created_at: key.created_at,
      last_used: key.last_used
    }));

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get API keys error:', error);
    return NextResponse.json(
      { error: 'Failed to get API keys' },
      { status: 500 }
    );
  }
}

// POST - Add new API key
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { api_key, key_name = 'Default' } = body;

    if (!api_key) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Encrypt the API key
    const encryptedApiKey = encrypt(api_key);

    // Create API key record
    const newKey: APIKey = {
      id: Date.now().toString(),
      userId: user.userId,
      encrypted_api_key: encryptedApiKey,
      key_name,
      is_active: true,
      created_at: new Date().toISOString()
    };

    apiKeys.push(newKey);

    const response: APIKeyResponse = {
      id: newKey.id,
      key_name: newKey.key_name,
      is_active: newKey.is_active,
      created_at: newKey.created_at
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Add API key error:', error);
    return NextResponse.json(
      { error: 'Failed to add API key' },
      { status: 500 }
    );
  }
}

// DELETE - Delete API key
export async function DELETE(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
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

    // Find the key and verify ownership
    const keyIndex = apiKeys.findIndex(k => k.id === keyId && k.userId === user.userId);
    if (keyIndex === -1) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Delete the key
    apiKeys.splice(keyIndex, 1);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete API key error:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
