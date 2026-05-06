-- Quick Diagnostic Queries for Venue Creation Issues
-- Run these in Supabase SQL Editor to diagnose problems

-- ============================================
-- CHECK YOUR USER SETUP
-- ============================================

-- 1. Check if your user exists
-- Replace 'user_3AhTRB7mHNpVmwVbX7IgQ5GeBas' with your actual Clerk user ID
SELECT 
    'User Record' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = 'user_3AhTRB7mHNpVmwVbX7IgQ5GeBas'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING - Need to create user record'
    END as status;

-- 2. Check if your host profile exists
SELECT 
    'Host Profile' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.hosts 
            WHERE user_id = 'user_3AhTRB7mHNpVmwVbX7IgQ5GeBas'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING - Need to create host profile'
    END as status;

-- ============================================
-- VIEW YOUR CURRENT DATA
-- ============================================

-- Your user details
SELECT id, email, username, first_name, last_name, created_at
FROM public.users
WHERE id = 'user_3AhTRB7mHNpVmwVbX7IgQ5GeBas';

-- Your host profile
SELECT user_id
FROM public.hosts
WHERE user_id = 'user_3AhTRB7mHNpVmwVbX7IgQ5GeBas';

-- Your venues
SELECT id, name, venue_type, capacity, address, created_at
FROM public.venues
WHERE host_id = 'user_3AhTRB7mHNpVmwVbX7IgQ5GeBas';

-- ============================================
-- CHECK RLS STATUS
-- ============================================

-- Check which tables have RLS enabled
SELECT 
    schemaname, 
    tablename, 
    CASE 
        WHEN rowsecurity THEN '🔒 RLS Enabled'
        ELSE '🔓 RLS Disabled'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'hosts', 'venues', 'events')
ORDER BY tablename;

-- Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'hosts', 'venues', 'events')
ORDER BY tablename, policyname;

-- ============================================
-- QUICK FIX: CREATE MISSING RECORDS
-- ============================================

-- Create user record if missing (replace with your details)
INSERT INTO public.users (id, email, username, first_name, last_name)
VALUES (
    'user_3AhTRB7mHNpVmwVbX7IgQ5GeBas',
    'your-email@example.com',
    'your-username',
    'Your First Name',
    'Your Last Name'
)
ON CONFLICT (id) DO NOTHING;

-- Create host profile if missing
INSERT INTO public.hosts (user_id)
VALUES ('user_3AhTRB7mHNpVmwVbX7IgQ5GeBas')
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- TEST VENUE CREATION
-- ============================================

-- Try inserting a test venue
INSERT INTO public.venues (
    host_id,
    name,
    venue_type,
    latitude,
    longitude,
    address,
    capacity,
    description,
    picture_urls
)
VALUES (
    'user_3AhTRB7mHNpVmwVbX7IgQ5GeBas',
    'Test Venue',
    'bar',
    44.8125,
    20.4489,
    'Test Address',
    100,
    'Test description',
    ARRAY[]::text[]
)
RETURNING *;

-- If the above works, you can delete the test:
-- DELETE FROM public.venues WHERE name = 'Test Venue';
