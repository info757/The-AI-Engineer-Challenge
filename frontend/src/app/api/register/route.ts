import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Simple in-memory storage for demo purposes
const users: User[] = [];

// TypeScript interfaces for better type safety
interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
}

interface UserResponse {
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
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = users.find(u => u.username === username || u.email === email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user
    const user: User = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(user);

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const response: UserResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      access_token: token,
      token_type: 'bearer'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
