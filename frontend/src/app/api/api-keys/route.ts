import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { createCipheriv, randomBytes } from 'crypto';
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

interface APIKeyResponse {
  id: string;
  key_name: string;
  is_active: boolean;
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

// GET - Get user's API keys
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userApiKeys = storage.findAPIKeysByUserId(user.userId);
    
    const response: APIKeyResponse[] = userApiKeys.map(key => ({
      id: key.id,
      key_name: key.key_name,
      is_active: key.is_active,
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
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { api_key, key_name } = body;

    if (!api_key) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Encrypt the API key
    const encryptedKey = encrypt(api_key);

    const newApiKey: APIKey = {
      id: Date.now().toString(),
      userId: user.userId,
      encrypted_api_key: encryptedKey,
      key_name: key_name || 'Default',
      is_active: true,
      created_at: new Date().toISOString(),
      last_used: undefined
    };

    storage.addAPIKey(newApiKey);

    const response: APIKeyResponse = {
      id: newApiKey.id,
      key_name: newApiKey.key_name,
      is_active: newApiKey.is_active,
      last_used: newApiKey.last_used
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
        { error: 'Unauthorized' },
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

    const key = storage.findAPIKeyById(keyId);
    if (!key || key.userId !== user.userId) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    storage.deleteAPIKey(keyId);

    return NextResponse.json({ message: 'API key deleted successfully' });

  } catch (error) {
    console.error('Delete API key error:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
