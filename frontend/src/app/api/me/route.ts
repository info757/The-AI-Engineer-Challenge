import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { storage } from '../../../lib/storage';

// TypeScript interfaces for better type safety
interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
}

interface JwtPayload {
  userId: string;
  username: string;
}

interface UserResponse {
  id: string;
  username: string;
  email: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = verify(token, JWT_SECRET) as JwtPayload;
    
    // Find user
    const user = storage.findUserById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const response: UserResponse = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}
