import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs'; // Fixed import for Vercel compatibility
import jwt from 'jsonwebtoken';

// Load users from environment variables for persistence
const loadUsers = (): User[] => {
  const demoUsers = process.env.DEMO_USERS;
  if (demoUsers) {
    try {
      return JSON.parse(demoUsers);
    } catch (error) {
      console.error('Failed to parse DEMO_USERS:', error);
    }
  }
  
  // Fallback to default demo user
  return [
    {
      id: '1',
      username: 'demo',
      email: 'demo@example.com',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8O', // password: demo123
      createdAt: '2024-01-01T00:00:00.000Z'
    }
  ];
};

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

    // Load existing users
    const users = loadUsers();

    // Check if user already exists
    const existingUser = users.find(u => u.username === username || u.email === email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user: User = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    // Add to users array (in a real app, this would be saved to a database)
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
