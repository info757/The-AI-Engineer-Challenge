import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Database connection test function - Vercel redeploy trigger - 3:15 PM
async function testConnection() {
  try {
    // Check if environment variables are available
    console.log('Checking environment variables...');
    console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
    console.log('SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('Supabase environment variables not found');
      console.error('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
      console.error('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
      return false;
    }

    console.log('Creating Supabase client...');
    // Create Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    console.log('Testing Supabase connection...');
    // Test connection with a simple query
    const { error } = await supabase.from('_test').select('*').limit(1);
    
    if (error) {
      console.log('Test table query failed, trying version query...');
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
    console.log('=== Starting database test ===');
    const isConnected = await testConnection();
    console.log('=== Database test completed ===');
    
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
