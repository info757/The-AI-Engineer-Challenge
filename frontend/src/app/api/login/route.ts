import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs'; // Fixed import for Vercel compatibility - rebuild forced
import jwt from 'jsonwebtoken';

// Simple in-memory storage for demo purposes - Vercel rebuild
const users: User[] = [
  {
    id: '1',
    username: 'demo',
    email: 'demo@example.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8O', // password: demo123
    createdAt: '2024-01-01T00:00:00.000Z'
  }
];

// TypeScript interfaces for better type safety
interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
}

interface LoginResponse {
  id: string;
  username: string;
  email: string;
  access_token: string;
  token_type: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find user by username
    const user = users.find(u => u.username === username);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const response: LoginResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      access_token: token,
      token_type: 'bearer'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
