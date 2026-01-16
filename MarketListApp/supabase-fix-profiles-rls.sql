-- =============================================
-- FIX PROFILES RLS INFINITE RECURSION
-- Run this in Supabase SQL Editor IMMEDIATELY
-- =============================================

-- Drop ALL existing profiles policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view family members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert for new users" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- Create simple, non-recursive policies

-- 1. Users can always view their own profile (no recursion possible)
CREATE POLICY "View own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- 2. Users can update their own profile
CREATE POLICY "Update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- 3. Users can insert their own profile (for signup)
CREATE POLICY "Insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- 4. Service role bypass for triggers
CREATE POLICY "Service role full access"
    ON public.profiles FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================
-- Now fix the family members visibility
-- Use a SECURITY DEFINER function to avoid recursion
-- =============================================

-- Create a function that returns family members without RLS recursion
CREATE OR REPLACE FUNCTION get_my_family_members()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    my_family_id UUID;
BEGIN
    -- Get current user's family_id directly
    SELECT family_id INTO my_family_id 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    -- Return all profiles in the same family
    RETURN QUERY
    SELECT * FROM public.profiles 
    WHERE family_id = my_family_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_my_family_members() TO authenticated;

-- =============================================
-- DONE! Profiles RLS is now non-recursive.
-- =============================================
SELECT 'Profiles RLS fix applied!' AS status;
