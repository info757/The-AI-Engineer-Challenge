import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'your-secret-key';

export async function GET(request: NextRequest) {
  try {
    console.log('=== JWT Test Endpoint ===');
    console.log('JWT_SECRET exists:', !!JWT_SECRET);
    console.log('JWT_SECRET length:', JWT_SECRET?.length);
    
    const authHeader = request.headers.get('authorization');
    console.log('Auth header exists:', !!authHeader);
    console.log('Auth header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'No valid authorization header',
        authHeader: authHeader
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('Token length:', token.length);
    console.log('Token starts with:', token.substring(0, 20) + '...');
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      console.log('Token decoded successfully:', decoded);
      
      return NextResponse.json({
        success: true,
        userId: decoded.userId,
        email: decoded.email,
        tokenLength: token.length,
        jwtSecretExists: !!JWT_SECRET
      });
    } catch (jwtError) {
      console.log('JWT verification failed:', jwtError);
      
      return NextResponse.json({
        error: 'JWT verification failed',
        jwtError: jwtError instanceof Error ? jwtError.message : 'Unknown error',
        tokenLength: token.length,
        jwtSecretExists: !!JWT_SECRET
      }, { status: 401 });
    }
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
