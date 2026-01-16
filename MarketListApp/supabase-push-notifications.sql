-- =====================================================
-- PUSH NOTIFICATIONS: Add expo_push_token to profiles
-- =====================================================
-- Run this in your Supabase SQL Editor

-- 1. Add expo_push_token column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS expo_push_token TEXT DEFAULT NULL;

-- 2. Add comment for documentation
COMMENT ON COLUMN public.profiles.expo_push_token IS 'Expo push notification token for the user device';

-- 3. Create/update RLS policy to allow users to update their own expo_push_token
-- First, check if the policy exists and drop it if needed
DROP POLICY IF EXISTS "Users can update their own expo_push_token" ON public.profiles;

-- Create policy allowing users to update their own profile (including expo_push_token)
-- Note: This should work with existing update policies. If there's already an 
-- "Users can update own profile" policy, this additional one specifically for the token
-- provides explicit permission.
CREATE POLICY "Users can update their own expo_push_token"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Create an index for faster lookups when sending notifications
CREATE INDEX IF NOT EXISTS idx_profiles_expo_push_token 
ON public.profiles (expo_push_token) 
WHERE expo_push_token IS NOT NULL;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run this to verify the column was added:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name = 'expo_push_token';
