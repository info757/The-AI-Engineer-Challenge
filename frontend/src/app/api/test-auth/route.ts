import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Testing Authentication Environment ===');
    
    // Check environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    
    console.log('SUPABASE_URL exists:', !!supabaseUrl);
    console.log('SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);
    console.log('JWT_SECRET exists:', !!jwtSecret);
    
    // Try to create Supabase client
    let supabase: SupabaseClient | null = null;
    let clientError = null;
    
    if (supabaseUrl && supabaseAnonKey) {
      try {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
        console.log('Supabase client created successfully');
      } catch (error) {
        clientError = error;
        console.error('Error creating Supabase client:', error);
      }
    }
    
    // Test database connection
    let dbTest = null;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('count')
          .limit(1);
        
        if (error) {
          dbTest = { error: error.message };
          console.error('Database test error:', error);
        } else {
          dbTest = { success: 'Database connection working' };
          console.log('Database test successful');
        }
      } catch (error) {
        dbTest = { error: error instanceof Error ? error.message : 'Unknown error' };
        console.error('Database test exception:', error);
      }
    }
    
    const result = {
      timestamp: new Date().toISOString(),
      environment: {
        supabaseUrl: supabaseUrl ? 'SET' : 'NOT SET',
        supabaseAnonKey: supabaseAnonKey ? 'SET' : 'NOT SET',
        jwtSecret: jwtSecret ? 'SET' : 'NOT SET'
      },
      client: clientError ? { error: clientError instanceof Error ? clientError.message : 'Unknown error' } : { success: 'Client created' },
      database: dbTest
    };
    
    console.log('=== Authentication test completed ===');
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Test auth error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
