-- =============================================
-- FAMILY INVITE CODE SYSTEM
-- Run this in the Supabase SQL Editor
-- =============================================

-- 1. Add invite_code column to families table
ALTER TABLE public.families 
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- 2. Create function to generate random 6-character alphanumeric code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed confusing chars like 0, O, 1, I
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- 3. Update existing families to have invite codes
UPDATE public.families 
SET invite_code = generate_invite_code() 
WHERE invite_code IS NULL;

-- 4. Make invite_code NOT NULL and add default for new families
ALTER TABLE public.families 
ALTER COLUMN invite_code SET DEFAULT generate_invite_code();

ALTER TABLE public.families
ALTER COLUMN invite_code SET NOT NULL;

-- 5. Create the RPC function to join a family by invite code
CREATE OR REPLACE FUNCTION join_family_by_code(code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_family_id UUID;
    current_user_id UUID := auth.uid();
    old_family_id UUID;
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
    SELECT family_id INTO old_family_id 
    FROM public.profiles 
    WHERE id = current_user_id;

    -- Don't allow joining the same family
    IF old_family_id = target_family_id THEN
        RETURN json_build_object('success', false, 'error', 'Already in this family');
    END IF;

    -- Update the user's family_id to the new family
    UPDATE public.profiles 
    SET family_id = target_family_id, updated_at = NOW()
    WHERE id = current_user_id;

    -- Optionally: Delete the old family if it has no more members
    -- (Only if this user was the only member)
    IF old_family_id IS NOT NULL THEN
        DELETE FROM public.families 
        WHERE id = old_family_id 
        AND NOT EXISTS (
            SELECT 1 FROM public.profiles WHERE family_id = old_family_id
        );
    END IF;

    RETURN json_build_object(
        'success', true, 
        'family_id', target_family_id,
        'message', 'Successfully joined family'
    );
END;
$$;

-- 6. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION join_family_by_code(TEXT) TO authenticated;

-- 7. Create index for faster invite code lookups
CREATE INDEX IF NOT EXISTS idx_families_invite_code ON public.families(invite_code);

-- =============================================
-- DONE! The invite system is ready.
-- =============================================
SELECT 'Family invite code system setup complete!' AS status;
