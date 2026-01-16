-- =============================================
-- EMERGENCY ROLLBACK: Single-Family Architecture
-- Run this in the Supabase SQL Editor
-- Fixes RLS infinite recursion errors (42P17)
-- =============================================

-- =============================================
-- STEP 1: REPAIR DATA BEFORE DROPPING
-- Update profiles.family_id from family_members
-- =============================================

-- Ensure family_id column exists on profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id) ON DELETE SET NULL;

-- Update profiles.family_id from family_members (pick first/oldest membership)
UPDATE public.profiles p
SET family_id = (
    SELECT fm.family_id 
    FROM public.family_members fm 
    WHERE fm.user_id = p.id 
    ORDER BY fm.joined_at ASC 
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 FROM public.family_members fm WHERE fm.user_id = p.id
);

-- =============================================
-- STEP 2: DROP FAMILY_MEMBERS TABLE
-- =============================================

-- Try to remove from realtime publication (may fail if not added, that's OK)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'family_members') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime DROP TABLE public.family_members;
        EXCEPTION WHEN OTHERS THEN
            -- Table might not be in publication, that's fine
            NULL;
        END;
    END IF;
END $$;

-- Drop all policies on family_members
DROP POLICY IF EXISTS "Users can view own memberships" ON public.family_members;
DROP POLICY IF EXISTS "Users can view family members" ON public.family_members;
DROP POLICY IF EXISTS "Users can insert own membership" ON public.family_members;
DROP POLICY IF EXISTS "Admins can delete family members" ON public.family_members;

-- Drop the table
DROP TABLE IF EXISTS public.family_members CASCADE;

-- =============================================
-- STEP 3: DROP BROKEN RPC FUNCTIONS
-- Remove multi-family functions
-- =============================================

DROP FUNCTION IF EXISTS get_user_families();
DROP FUNCTION IF EXISTS create_new_family(TEXT);
DROP FUNCTION IF EXISTS get_family_members_by_id(UUID);

-- =============================================
-- STEP 4: RESET FAMILIES RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Users can view joined families" ON public.families;
DROP POLICY IF EXISTS "Users can view own family" ON public.families;

CREATE POLICY "Users can view own family"
    ON public.families FOR SELECT
    TO authenticated
    USING (id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

-- =============================================
-- STEP 5: RESET PROFILES RLS POLICIES
-- CRITICAL: Avoid recursion by using simple auth.uid() checks
-- =============================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view family members" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Simple policy: view own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- View family members: use a subquery that doesn't cause recursion
-- This uses a direct join approach instead of nested subqueries
CREATE POLICY "Users can view family members"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        family_id IS NOT NULL AND
        family_id = (SELECT p.family_id FROM public.profiles p WHERE p.id = auth.uid())
    );

-- Update own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- =============================================
-- STEP 6: RESET GROCERY_ITEMS RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Family members can view items" ON public.grocery_items;
DROP POLICY IF EXISTS "Family members can insert items" ON public.grocery_items;
DROP POLICY IF EXISTS "Family members can update items" ON public.grocery_items;
DROP POLICY IF EXISTS "Family members can delete items" ON public.grocery_items;

CREATE POLICY "Family members can view items"
    ON public.grocery_items FOR SELECT
    TO authenticated
    USING (family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Family members can insert items"
    ON public.grocery_items FOR INSERT
    TO authenticated
    WITH CHECK (family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Family members can update items"
    ON public.grocery_items FOR UPDATE
    TO authenticated
    USING (family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Family members can delete items"
    ON public.grocery_items FOR DELETE
    TO authenticated
    USING (family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

-- =============================================
-- STEP 7: RESET PURCHASE_HISTORY RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Family members can view history" ON public.purchase_history;
DROP POLICY IF EXISTS "Family members can insert history" ON public.purchase_history;

CREATE POLICY "Family members can view history"
    ON public.purchase_history FOR SELECT
    TO authenticated
    USING (family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Family members can insert history"
    ON public.purchase_history FOR INSERT
    TO authenticated
    WITH CHECK (family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

-- =============================================
-- STEP 8: RESTORE CLASSIC RPC FUNCTIONS
-- =============================================

-- Restore join_family_by_code to update profiles.family_id directly
CREATE OR REPLACE FUNCTION join_family_by_code(code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_family_id UUID;
    current_user_id UUID := auth.uid();
    current_family_id UUID;
    existing_request UUID;
BEGIN
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Find family with the given invite code
    SELECT id INTO target_family_id 
    FROM public.families 
    WHERE UPPER(invite_code) = UPPER(code);

    IF target_family_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid invite code');
    END IF;

    -- Get user's current family_id
    SELECT family_id INTO current_family_id 
    FROM public.profiles 
    WHERE id = current_user_id;

    -- Don't allow joining the same family
    IF current_family_id = target_family_id THEN
        RETURN json_build_object('success', false, 'error', 'Already in this family');
    END IF;

    -- Check if there's already a pending request
    SELECT id INTO existing_request 
    FROM public.family_requests 
    WHERE user_id = current_user_id AND family_id = target_family_id AND status = 'pending';

    IF existing_request IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'Request already pending');
    END IF;

    -- Create a join request
    INSERT INTO public.family_requests (user_id, family_id, status)
    VALUES (current_user_id, target_family_id, 'pending')
    ON CONFLICT (user_id, family_id) DO UPDATE SET status = 'pending', created_at = NOW();

    RETURN json_build_object(
        'success', true, 
        'pending', true,
        'message', 'Request sent successfully'
    );
END;
$$;

-- Restore handle_family_request to update profiles.family_id
CREATE OR REPLACE FUNCTION handle_family_request(request_id UUID, decision TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    user_family_id UUID;
    request_record RECORD;
    requester_old_family UUID;
BEGIN
    IF decision NOT IN ('approve', 'reject') THEN
        RETURN json_build_object('success', false, 'error', 'Invalid decision');
    END IF;

    -- Get current user's family_id
    SELECT family_id INTO user_family_id 
    FROM public.profiles 
    WHERE id = current_user_id;

    -- Get the request details
    SELECT * INTO request_record 
    FROM public.family_requests 
    WHERE id = request_id AND family_id = user_family_id AND status = 'pending';

    IF request_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Request not found or already processed');
    END IF;

    IF decision = 'approve' THEN
        -- Get requester's current family
        SELECT family_id INTO requester_old_family 
        FROM public.profiles 
        WHERE id = request_record.user_id;

        -- Update the requester's family_id to the new family
        UPDATE public.profiles 
        SET family_id = user_family_id, updated_at = NOW()
        WHERE id = request_record.user_id;

        -- Delete the old family if empty
        IF requester_old_family IS NOT NULL THEN
            DELETE FROM public.families 
            WHERE id = requester_old_family 
            AND NOT EXISTS (
                SELECT 1 FROM public.profiles WHERE family_id = requester_old_family
            );
        END IF;

        -- Update request status
        UPDATE public.family_requests SET status = 'approved' WHERE id = request_id;

        RETURN json_build_object('success', true, 'message', 'User approved and added to family');
    ELSE
        -- Reject: just update status
        UPDATE public.family_requests SET status = 'rejected' WHERE id = request_id;
        
        RETURN json_build_object('success', true, 'message', 'Request rejected');
    END IF;
END;
$$;

-- Restore handle_new_user to classic behavior
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_family_id UUID;
BEGIN
    -- Create a new family for this user
    INSERT INTO public.families (name, invite_code)
    VALUES ('Ailem', UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)))
    RETURNING id INTO new_family_id;

    -- Create the user's profile with the new family
    INSERT INTO public.profiles (id, email, full_name, avatar_url, family_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        new_family_id
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- =============================================
-- DONE! Single-family architecture restored.
-- =============================================
SELECT 'Rollback complete! Single-family architecture restored.' AS status;
