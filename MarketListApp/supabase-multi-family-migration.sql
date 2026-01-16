-- =============================================
-- MULTI-FAMILY SUPPORT MIGRATION
-- Run this in the Supabase SQL Editor
-- =============================================

-- =============================================
-- STEP 1: CREATE FAMILY_MEMBERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, family_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_family_members_user ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family ON public.family_members(family_id);

-- Enable RLS
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 2: MIGRATE EXISTING DATA
-- =============================================
-- Insert existing profile.family_id relationships into family_members
-- The creator of the family (first member) gets 'admin' role
INSERT INTO public.family_members (user_id, family_id, role, joined_at)
SELECT 
    p.id as user_id,
    p.family_id,
    CASE 
        WHEN p.id = (
            SELECT p2.id FROM public.profiles p2 
            WHERE p2.family_id = p.family_id 
            ORDER BY p2.created_at ASC 
            LIMIT 1
        ) THEN 'admin'
        ELSE 'member'
    END as role,
    p.created_at as joined_at
FROM public.profiles p
WHERE p.family_id IS NOT NULL
ON CONFLICT (user_id, family_id) DO NOTHING;

-- =============================================
-- STEP 3: RLS POLICIES FOR FAMILY_MEMBERS
-- =============================================
-- Users can view their own memberships
CREATE POLICY "Users can view own memberships"
    ON public.family_members FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can view members of families they belong to
CREATE POLICY "Users can view family members"
    ON public.family_members FOR SELECT
    TO authenticated
    USING (family_id IN (
        SELECT fm.family_id FROM public.family_members fm WHERE fm.user_id = auth.uid()
    ));

-- Users can insert their own memberships (for creating/joining families)
CREATE POLICY "Users can insert own membership"
    ON public.family_members FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Admins can delete members from their families
CREATE POLICY "Admins can delete family members"
    ON public.family_members FOR DELETE
    TO authenticated
    USING (
        family_id IN (
            SELECT fm.family_id FROM public.family_members fm 
            WHERE fm.user_id = auth.uid() AND fm.role = 'admin'
        )
    );

-- =============================================
-- STEP 4: UPDATE GROCERY_ITEMS RLS POLICIES
-- =============================================
-- Drop old policies
DROP POLICY IF EXISTS "Family members can view items" ON public.grocery_items;
DROP POLICY IF EXISTS "Family members can insert items" ON public.grocery_items;
DROP POLICY IF EXISTS "Family members can update items" ON public.grocery_items;
DROP POLICY IF EXISTS "Family members can delete items" ON public.grocery_items;

-- Create new policies using family_members table
CREATE POLICY "Family members can view items"
    ON public.grocery_items FOR SELECT
    TO authenticated
    USING (family_id IN (
        SELECT fm.family_id FROM public.family_members fm WHERE fm.user_id = auth.uid()
    ));

CREATE POLICY "Family members can insert items"
    ON public.grocery_items FOR INSERT
    TO authenticated
    WITH CHECK (family_id IN (
        SELECT fm.family_id FROM public.family_members fm WHERE fm.user_id = auth.uid()
    ));

CREATE POLICY "Family members can update items"
    ON public.grocery_items FOR UPDATE
    TO authenticated
    USING (family_id IN (
        SELECT fm.family_id FROM public.family_members fm WHERE fm.user_id = auth.uid()
    ));

CREATE POLICY "Family members can delete items"
    ON public.grocery_items FOR DELETE
    TO authenticated
    USING (family_id IN (
        SELECT fm.family_id FROM public.family_members fm WHERE fm.user_id = auth.uid()
    ));

-- =============================================
-- STEP 5: UPDATE FAMILIES RLS POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can view own family" ON public.families;

CREATE POLICY "Users can view joined families"
    ON public.families FOR SELECT
    TO authenticated
    USING (id IN (
        SELECT fm.family_id FROM public.family_members fm WHERE fm.user_id = auth.uid()
    ));

-- =============================================
-- STEP 6: UPDATE PURCHASE_HISTORY RLS POLICIES
-- =============================================
DROP POLICY IF EXISTS "Family members can view history" ON public.purchase_history;
DROP POLICY IF EXISTS "Family members can insert history" ON public.purchase_history;

CREATE POLICY "Family members can view history"
    ON public.purchase_history FOR SELECT
    TO authenticated
    USING (family_id IN (
        SELECT fm.family_id FROM public.family_members fm WHERE fm.user_id = auth.uid()
    ));

CREATE POLICY "Family members can insert history"
    ON public.purchase_history FOR INSERT
    TO authenticated
    WITH CHECK (family_id IN (
        SELECT fm.family_id FROM public.family_members fm WHERE fm.user_id = auth.uid()
    ));

-- =============================================
-- STEP 7: UPDATE PROFILES RLS POLICIES
-- =============================================
-- Add policy to view members of families user belongs to
DROP POLICY IF EXISTS "Users can view family members" ON public.profiles;

CREATE POLICY "Users can view family members"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() OR
        id IN (
            SELECT fm2.user_id FROM public.family_members fm1
            JOIN public.family_members fm2 ON fm1.family_id = fm2.family_id
            WHERE fm1.user_id = auth.uid()
        )
    );

-- =============================================
-- STEP 8: CREATE NEW RPC FUNCTIONS
-- =============================================

-- Function to get all families for a user
CREATE OR REPLACE FUNCTION get_user_families()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    families_result JSON;
BEGIN
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    SELECT json_agg(json_build_object(
        'id', fm.id,
        'family_id', f.id,
        'family_name', f.name,
        'invite_code', f.invite_code,
        'role', fm.role,
        'joined_at', fm.joined_at,
        'member_count', (
            SELECT COUNT(*) FROM public.family_members 
            WHERE family_id = f.id
        )
    ) ORDER BY fm.joined_at ASC)
    INTO families_result
    FROM public.family_members fm
    JOIN public.families f ON f.id = fm.family_id
    WHERE fm.user_id = current_user_id;

    RETURN json_build_object(
        'success', true,
        'families', COALESCE(families_result, '[]'::json)
    );
END;
$$;

-- Update join_family_by_code to insert into family_members
CREATE OR REPLACE FUNCTION join_family_by_code(code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_family_id UUID;
    current_user_id UUID := auth.uid();
    existing_membership UUID;
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

    -- Check if already a member
    SELECT id INTO existing_membership 
    FROM public.family_members 
    WHERE user_id = current_user_id AND family_id = target_family_id;

    IF existing_membership IS NOT NULL THEN
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

-- Update handle_family_request to insert into family_members
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
    is_admin BOOLEAN;
BEGIN
    IF decision NOT IN ('approve', 'reject') THEN
        RETURN json_build_object('success', false, 'error', 'Invalid decision');
    END IF;

    -- Get the request details
    SELECT fr.*, f.id as fam_id INTO request_record 
    FROM public.family_requests fr
    JOIN public.families f ON f.id = fr.family_id
    WHERE fr.id = request_id AND fr.status = 'pending';

    IF request_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Request not found or already processed');
    END IF;

    -- Check if current user is admin of the target family
    SELECT EXISTS(
        SELECT 1 FROM public.family_members 
        WHERE user_id = current_user_id 
        AND family_id = request_record.family_id 
        AND role = 'admin'
    ) INTO is_admin;

    IF NOT is_admin THEN
        RETURN json_build_object('success', false, 'error', 'Only admins can handle requests');
    END IF;

    IF decision = 'approve' THEN
        -- Add user to family_members table
        INSERT INTO public.family_members (user_id, family_id, role, joined_at)
        VALUES (request_record.user_id, request_record.family_id, 'member', NOW())
        ON CONFLICT (user_id, family_id) DO NOTHING;

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

-- Function to create a new family
CREATE OR REPLACE FUNCTION create_new_family(family_name TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    new_family_id UUID;
    new_invite_code TEXT;
BEGIN
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Generate a random 6-character invite code
    new_invite_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));

    -- Create the family
    INSERT INTO public.families (name, invite_code)
    VALUES (COALESCE(NULLIF(family_name, ''), 'Yeni Aile'), new_invite_code)
    RETURNING id INTO new_family_id;

    -- Add creator as admin
    INSERT INTO public.family_members (user_id, family_id, role, joined_at)
    VALUES (current_user_id, new_family_id, 'admin', NOW());

    RETURN json_build_object(
        'success', true,
        'family_id', new_family_id,
        'invite_code', new_invite_code,
        'message', 'Family created successfully'
    );
END;
$$;

-- Function to get family members for a specific family
CREATE OR REPLACE FUNCTION get_family_members_by_id(target_family_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    is_member BOOLEAN;
    members_result JSON;
BEGIN
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Check if user is a member of this family
    SELECT EXISTS(
        SELECT 1 FROM public.family_members 
        WHERE user_id = current_user_id AND family_id = target_family_id
    ) INTO is_member;

    IF NOT is_member THEN
        RETURN json_build_object('success', false, 'error', 'Not a member of this family');
    END IF;

    SELECT json_agg(json_build_object(
        'id', p.id,
        'email', p.email,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'role', fm.role,
        'joined_at', fm.joined_at
    ) ORDER BY fm.joined_at ASC)
    INTO members_result
    FROM public.family_members fm
    JOIN public.profiles p ON p.id = fm.user_id
    WHERE fm.family_id = target_family_id;

    RETURN json_build_object(
        'success', true,
        'members', COALESCE(members_result, '[]'::json)
    );
END;
$$;

-- =============================================
-- STEP 9: UPDATE HANDLE_NEW_USER FUNCTION
-- =============================================
-- Update to also insert into family_members when creating a new user
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

    -- Create the user's profile
    INSERT INTO public.profiles (id, email, full_name, avatar_url, family_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        new_family_id
    );

    -- Add user as admin of their new family
    INSERT INTO public.family_members (user_id, family_id, role, joined_at)
    VALUES (NEW.id, new_family_id, 'admin', NOW());

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- =============================================
-- STEP 10: ENABLE REALTIME FOR FAMILY_MEMBERS
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_members;

-- Set REPLICA IDENTITY for realtime DELETE events
ALTER TABLE public.family_members REPLICA IDENTITY FULL;

-- =============================================
-- STEP 11: GRANT PERMISSIONS
-- =============================================
GRANT ALL ON public.family_members TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_families() TO authenticated;
GRANT EXECUTE ON FUNCTION create_new_family(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_family_members_by_id(UUID) TO authenticated;

-- =============================================
-- DONE! Multi-family support migration complete.
-- =============================================
SELECT 'Multi-family migration complete!' AS status;
