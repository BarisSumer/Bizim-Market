-- =============================================
-- ENABLE SUPABASE REALTIME FOR ALL TABLES
-- Run this in the Supabase SQL Editor
-- THIS IS CRITICAL FOR REAL-TIME SYNC TO WORK!
-- =============================================

-- Step 1: Check current publication status
SELECT 
    schemaname, 
    tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Step 2: Add tables to the realtime publication
-- (This will error if already added - that's OK, just continue)

-- Try to add grocery_items
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_items;
    RAISE NOTICE 'Added grocery_items to supabase_realtime';
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'grocery_items already in supabase_realtime';
END $$;

-- Try to add profiles
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    RAISE NOTICE 'Added profiles to supabase_realtime';
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'profiles already in supabase_realtime';
END $$;

-- Try to add family_requests
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.family_requests;
    RAISE NOTICE 'Added family_requests to supabase_realtime';
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'family_requests already in supabase_realtime';
END $$;

-- Try to add families
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.families;
    RAISE NOTICE 'Added families to supabase_realtime';
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'families already in supabase_realtime';
END $$;

-- Step 3: Set REPLICA IDENTITY FULL for proper DELETE event handling
-- This ensures DELETE events include the old record data (including id)
ALTER TABLE public.grocery_items REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.family_requests REPLICA IDENTITY FULL;
ALTER TABLE public.families REPLICA IDENTITY FULL;

-- Step 4: Verify the publication now includes our tables
SELECT 
    'PUBLICATION CHECK' as step,
    schemaname, 
    tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('grocery_items', 'profiles', 'family_requests', 'families');

-- Step 5: Verify replica identity is set to FULL
SELECT 
    'REPLICA IDENTITY CHECK' as step,
    c.relname as table_name,
    CASE c.relreplident
        WHEN 'd' THEN 'default (WARNING: DELETE wont work!)'
        WHEN 'n' THEN 'nothing (WARNING: no events!)'
        WHEN 'f' THEN 'full (CORRECT!)'
        WHEN 'i' THEN 'index'
    END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND c.relname IN ('grocery_items', 'profiles', 'family_requests', 'families');

-- =============================================
-- DONE! Real-time should now work for all tables.
-- If you see 4 tables in the publication check, you're good!
-- If replica_identity shows 'full (CORRECT!)' for all, DELETE events will work!
-- =============================================
SELECT '✅ Realtime publication setup complete! Restart your app to test.' AS status;
