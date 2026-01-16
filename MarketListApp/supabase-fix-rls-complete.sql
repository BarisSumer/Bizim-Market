-- =============================================
-- COMPLETE RLS FIX FOR SINGLE-FAMILY ARCHITECTURE
-- Run this ENTIRE script in Supabase SQL Editor
-- This fixes infinite recursion errors
-- =============================================

-- =============================================
-- STEP 1: DROP ALL BROKEN POLICIES ON PROFILES
-- =============================================
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_name);
    END LOOP;
END $$;

-- =============================================
-- STEP 2: DROP ALL POLICIES ON FAMILIES
-- =============================================
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'families' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.families', policy_name);
    END LOOP;
END $$;

-- =============================================
-- STEP 3: DROP ALL POLICIES ON GROCERY_ITEMS
-- =============================================
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'grocery_items' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.grocery_items', policy_name);
    END LOOP;
END $$;

-- =============================================
-- STEP 4: DROP ALL POLICIES ON PURCHASE_HISTORY
-- =============================================
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'purchase_history' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.purchase_history', policy_name);
    END LOOP;
END $$;

-- =============================================
-- STEP 5: CREATE SIMPLE PROFILES POLICIES
-- Only use auth.uid(), no subqueries = no recursion
-- =============================================

-- Users can view their own profile
CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- Users can insert their own profile (for trigger)
CREATE POLICY "profiles_insert_own"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- =============================================
-- STEP 6: CREATE HELPER FUNCTION FOR FAMILY ACCESS
-- Uses SECURITY DEFINER to bypass RLS
-- =============================================

CREATE OR REPLACE FUNCTION get_my_family_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT family_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_family_members()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    my_family_id UUID;
BEGIN
    SELECT family_id INTO my_family_id FROM public.profiles WHERE id = auth.uid();
    IF my_family_id IS NULL THEN
        RETURN;
    END IF;
    RETURN QUERY SELECT * FROM public.profiles WHERE family_id = my_family_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_family_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_family_members() TO authenticated;

-- =============================================
-- STEP 7: CREATE FAMILIES POLICIES
-- Use the helper function to avoid recursion
-- =============================================

CREATE POLICY "families_select"
    ON public.families FOR SELECT
    TO authenticated
    USING (id = get_my_family_id());

CREATE POLICY "families_update"
    ON public.families FOR UPDATE
    TO authenticated
    USING (id = get_my_family_id());

-- =============================================
-- STEP 8: CREATE GROCERY_ITEMS POLICIES
-- Use the helper function to avoid recursion
-- =============================================

CREATE POLICY "grocery_items_select"
    ON public.grocery_items FOR SELECT
    TO authenticated
    USING (family_id = get_my_family_id());

CREATE POLICY "grocery_items_insert"
    ON public.grocery_items FOR INSERT
    TO authenticated
    WITH CHECK (family_id = get_my_family_id());

CREATE POLICY "grocery_items_update"
    ON public.grocery_items FOR UPDATE
    TO authenticated
    USING (family_id = get_my_family_id());

CREATE POLICY "grocery_items_delete"
    ON public.grocery_items FOR DELETE
    TO authenticated
    USING (family_id = get_my_family_id());

-- =============================================
-- STEP 9: CREATE PURCHASE_HISTORY POLICIES
-- =============================================

CREATE POLICY "purchase_history_select"
    ON public.purchase_history FOR SELECT
    TO authenticated
    USING (family_id = get_my_family_id());

CREATE POLICY "purchase_history_insert"
    ON public.purchase_history FOR INSERT
    TO authenticated
    WITH CHECK (family_id = get_my_family_id());

-- =============================================
-- STEP 10: CLEANUP FAMILY_MEMBERS IF EXISTS
-- =============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'family_members') THEN
        -- First repair profiles.family_id from family_members
        UPDATE public.profiles p
        SET family_id = (
            SELECT fm.family_id 
            FROM public.family_members fm 
            WHERE fm.user_id = p.id 
            ORDER BY fm.joined_at ASC 
            LIMIT 1
        )
        WHERE p.family_id IS NULL
        AND EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.user_id = p.id);

        -- Then drop the table
        DROP TABLE public.family_members CASCADE;
    END IF;
END $$;

-- Drop multi-family functions if they exist
DROP FUNCTION IF EXISTS get_user_families();
DROP FUNCTION IF EXISTS create_new_family(TEXT);
DROP FUNCTION IF EXISTS get_family_members_by_id(UUID);

-- =============================================
-- DONE! RLS is now fixed.
-- =============================================
SELECT 'RLS fix complete! Single-family architecture restored.' AS status;
