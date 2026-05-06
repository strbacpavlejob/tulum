-- RLS Policies for Venues Management
-- Run this in Supabase SQL Editor to set up proper Row Level Security

-- ============================================
-- HELPER FUNCTION FOR CLERK AUTHENTICATION
-- ============================================

-- This function extracts the user ID from Clerk's JWT token
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
    SELECT NULLIF(
        current_setting('request.jwt.claims', true)::json->>'sub',
        ''
    )::text;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- ENABLE RLS ON TABLES
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING POLICIES
-- ============================================

-- Users table policies
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;

-- Hosts table policies
DROP POLICY IF EXISTS "Users can view own host profile" ON public.hosts;
DROP POLICY IF EXISTS "Users can create own host profile" ON public.hosts;
DROP POLICY IF EXISTS "Service role can manage all hosts" ON public.hosts;

-- Venues table policies
DROP POLICY IF EXISTS "Hosts can view own venues" ON public.venues;
DROP POLICY IF EXISTS "Anyone can view venues" ON public.venues;
DROP POLICY IF EXISTS "Hosts can create venues" ON public.venues;
DROP POLICY IF EXISTS "Hosts can update own venues" ON public.venues;
DROP POLICY IF EXISTS "Hosts can delete own venues" ON public.venues;
DROP POLICY IF EXISTS "Service role can manage all venues" ON public.venues;

-- Events table policies
DROP POLICY IF EXISTS "Anyone can view active events" ON public.events;
DROP POLICY IF EXISTS "Hosts can create events for their venues" ON public.events;
DROP POLICY IF EXISTS "Hosts can update own venue events" ON public.events;
DROP POLICY IF EXISTS "Hosts can delete own venue events" ON public.events;
DROP POLICY IF EXISTS "Service role can manage all events" ON public.events;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Allow users to read their own data
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT
    USING (requesting_user_id() = id);

-- Allow users to update their own data
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE
    USING (requesting_user_id() = id);

-- Allow service role to manage all users
CREATE POLICY "Service role can manage all users" ON public.users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- HOSTS TABLE POLICIES
-- ============================================

-- Allow users to view their own host profile
CREATE POLICY "Users can view own host profile" ON public.hosts
    FOR SELECT
    USING (requesting_user_id() = user_id);

-- Allow users to create their own host profile
CREATE POLICY "Users can create own host profile" ON public.hosts
    FOR INSERT
    WITH CHECK (requesting_user_id() = user_id);

-- Allow service role to manage all hosts
CREATE POLICY "Service role can manage all hosts" ON public.hosts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- VENUES TABLE POLICIES
-- ============================================

-- Allow hosts to view their own venues
CREATE POLICY "Hosts can view own venues" ON public.venues
    FOR SELECT
    USING (requesting_user_id() = host_id);

-- Allow anyone to view all venues (public read)
CREATE POLICY "Anyone can view venues" ON public.venues
    FOR SELECT
    USING (true);

-- Allow hosts to create venues
CREATE POLICY "Hosts can create venues" ON public.venues
    FOR INSERT
    WITH CHECK (requesting_user_id() = host_id);

-- Allow hosts to update their own venues
CREATE POLICY "Hosts can update own venues" ON public.venues
    FOR UPDATE
    USING (requesting_user_id() = host_id)
    WITH CHECK (requesting_user_id() = host_id);

-- Allow hosts to delete their own venues
CREATE POLICY "Hosts can delete own venues" ON public.venues
    FOR DELETE
    USING (requesting_user_id() = host_id);

-- Allow service role to manage all venues
CREATE POLICY "Service role can manage all venues" ON public.venues
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- EVENTS TABLE POLICIES
-- ============================================

-- Allow anyone to view active events
CREATE POLICY "Anyone can view active events" ON public.events
    FOR SELECT
    USING (status = 'active' OR requesting_user_id() IN (
        SELECT host_id FROM public.venues WHERE id = venue_id
    ));

-- Allow venue hosts to create events
CREATE POLICY "Hosts can create events for their venues" ON public.events
    FOR INSERT
    WITH CHECK (
        requesting_user_id() IN (
            SELECT host_id FROM public.venues WHERE id = venue_id
        )
    );

-- Allow venue hosts to update their events
CREATE POLICY "Hosts can update own venue events" ON public.events
    FOR UPDATE
    USING (
        requesting_user_id() IN (
            SELECT host_id FROM public.venues WHERE id = venue_id
        )
    )
    WITH CHECK (
        requesting_user_id() IN (
            SELECT host_id FROM public.venues WHERE id = venue_id
        )
    );

-- Allow venue hosts to delete their events
CREATE POLICY "Hosts can delete own venue events" ON public.events
    FOR DELETE
    USING (
        requesting_user_id() IN (
            SELECT host_id FROM public.venues WHERE id = venue_id
        )
    );

-- Allow service role to manage all events
CREATE POLICY "Service role can manage all events" ON public.events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- VERIFY POLICIES
-- ============================================

-- Check which policies are active
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
