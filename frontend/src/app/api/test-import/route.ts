import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test if we can import the supabase module
    const { createUser } = await import('../../../lib/supabase');
    
    return NextResponse.json({
      status: 'success',
      message: 'Import test successful',
      hasCreateUser: typeof createUser === 'function'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Import test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
