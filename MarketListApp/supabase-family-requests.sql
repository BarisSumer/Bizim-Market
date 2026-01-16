-- =============================================
-- FAMILY REQUEST & APPROVAL SYSTEM
-- Run this in the Supabase SQL Editor
-- =============================================

-- 1. Create family_requests table
CREATE TABLE IF NOT EXISTS public.family_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, family_id)
);

-- 2. Enable RLS
ALTER TABLE public.family_requests ENABLE ROW LEVEL SECURITY;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_family_requests_family ON public.family_requests(family_id);
CREATE INDEX IF NOT EXISTS idx_family_requests_user ON public.family_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_family_requests_status ON public.family_requests(status);

-- 4. RLS Policies for family_requests
-- Users can see their own requests
CREATE POLICY "Users can view own requests"
    ON public.family_requests FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Family members can see requests to their family
CREATE POLICY "Family members can view family requests"
    ON public.family_requests FOR SELECT
    TO authenticated
    USING (family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

-- Users can insert requests
CREATE POLICY "Users can create requests"
    ON public.family_requests FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Family members can delete/update requests (for approval/rejection)
CREATE POLICY "Family members can manage requests"
    ON public.family_requests FOR DELETE
    TO authenticated
    USING (family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

-- 5. Update join_family_by_code to create a REQUEST instead of joining immediately
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
    result JSON;
BEGIN
    -- Validate user is authenticated
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Find family with the given invite code (case insensitive)
    SELECT id INTO target_family_id 
    FROM public.families 
    WHERE UPPER(invite_code) = UPPER(code);

    -- If no family found, return error
    IF target_family_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid invite code');
    END IF;

    -- Get user's current family_id
    SELECT family_id INTO current_family_id 
    FROM public.profiles 
    WHERE id = current_user_id;

    -- Don't allow requesting to join the same family
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

    -- Create a join request instead of joining directly
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

-- 6. Create function to get pending requests for admin's family
CREATE OR REPLACE FUNCTION get_family_requests()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    user_family_id UUID;
    requests JSON;
BEGIN
    -- Get current user's family_id
    SELECT family_id INTO user_family_id 
    FROM public.profiles 
    WHERE id = current_user_id;

    IF user_family_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No family found');
    END IF;

    -- Get all pending requests for this family with user details
    SELECT json_agg(json_build_object(
        'id', fr.id,
        'user_id', fr.user_id,
        'full_name', p.full_name,
        'email', p.email,
        'avatar_url', p.avatar_url,
        'created_at', fr.created_at
    ))
    INTO requests
    FROM public.family_requests fr
    JOIN public.profiles p ON p.id = fr.user_id
    WHERE fr.family_id = user_family_id AND fr.status = 'pending';

    RETURN json_build_object(
        'success', true,
        'requests', COALESCE(requests, '[]'::json)
    );
END;
$$;

-- 7. Create function to handle (approve/reject) a family request
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
    -- Validate decision
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

-- 8. Grant execute permissions
GRANT EXECUTE ON FUNCTION join_family_by_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_family_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_family_request(UUID, TEXT) TO authenticated;
GRANT ALL ON public.family_requests TO authenticated;

-- =============================================
-- DONE! Family request system is ready.
-- =============================================
SELECT 'Family request & approval system setup complete!' AS status;
