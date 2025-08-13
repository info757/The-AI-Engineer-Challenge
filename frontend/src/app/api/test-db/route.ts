import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/db';

export async function GET() {
  try {
    const isConnected = await testConnection();
    
    if (isConnected) {
      return NextResponse.json({ 
        status: 'success', 
        message: 'Database connection working',
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Database connection failed',
        fallback: 'Using in-memory storage'
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ 
      status: 'error', 
      message: 'Database test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      fallback: 'Using in-memory storage'
    }, { status: 500 });
  }
}
