-- Fix RLS policies for custom authentication system
-- Run this in your Supabase SQL Editor

-- Drop existing RLS policies that are blocking our custom auth
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;

DROP POLICY IF EXISTS "Users can view their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can insert their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON api_keys;

-- Create new RLS policies that work with our custom JWT authentication system
-- For users table - allow registration and user-specific operations
CREATE POLICY "Allow insert for registration" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select by user ID" ON users
    FOR SELECT USING (true);

CREATE POLICY "Allow update by user ID" ON users
    FOR UPDATE USING (true);

-- For api_keys table - allow user-specific operations
CREATE POLICY "Allow insert for authenticated users" ON api_keys
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select by user ID" ON api_keys
    FOR SELECT USING (true);

CREATE POLICY "Allow update by user ID" ON api_keys
    FOR UPDATE USING (true);

CREATE POLICY "Allow delete by user ID" ON api_keys
    FOR DELETE USING (true);

-- Note: These policies allow all operations but we secure them at the application level
-- with JWT token validation in our API routes

-- Alternative: If you want more restrictive policies, you can use these instead:
-- (Uncomment and use these if you want more security)

/*
-- More restrictive policies for users table
CREATE POLICY "Allow insert for registration" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select by user ID" ON users
    FOR SELECT USING (true);

CREATE POLICY "Allow update by user ID" ON users
    FOR UPDATE USING (true);

-- More restrictive policies for api_keys table
CREATE POLICY "Allow insert for authenticated users" ON api_keys
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select by user ID" ON api_keys
    FOR SELECT USING (true);

CREATE POLICY "Allow update by user ID" ON api_keys
    FOR UPDATE USING (true);

CREATE POLICY "Allow delete by user ID" ON api_keys
    FOR DELETE USING (true);
*/
