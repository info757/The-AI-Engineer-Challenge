import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Database connection test function - Vercel redeploy trigger - 3:15 PM
async function testConnection() {
  try {
    // Check if environment variables are available
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('Supabase environment variables not found');
      return false;
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Test connection with a simple query
    const { error } = await supabase.from('_test').select('*').limit(1);
    
    if (error) {
      // If table doesn't exist, try a simple query
      const { error: testError } = await supabase.rpc('version');
      if (testError) {
        console.error('Database connection failed:', testError);
        return false;
      }
    }
    
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

export async function GET() {
  try {
    const isConnected = await testConnection();
    
    if (isConnected) {
      return NextResponse.json({ 
        status: 'success', 
        message: 'Supabase database connection working',
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
