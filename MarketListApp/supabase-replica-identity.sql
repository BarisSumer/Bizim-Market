-- =============================================
-- ENABLE FULL REPLICA IDENTITY FOR REAL-TIME SYNC
-- Run this in the Supabase SQL Editor
-- =============================================

-- This ensures DELETE events include the full old record (including id)
-- Required for real-time sync to work correctly for deletions

-- 1. Set REPLICA IDENTITY FULL for grocery_items table
ALTER TABLE public.grocery_items REPLICA IDENTITY FULL;

-- 2. Set REPLICA IDENTITY FULL for family_requests table
ALTER TABLE public.family_requests REPLICA IDENTITY FULL;

-- 3. Set REPLICA IDENTITY FULL for profiles table
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- 4. Verify the changes
SELECT 
    c.relname as table_name,
    CASE c.relreplident
        WHEN 'd' THEN 'default'
        WHEN 'n' THEN 'nothing'
        WHEN 'f' THEN 'full'
        WHEN 'i' THEN 'index'
    END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND c.relname IN ('grocery_items', 'family_requests', 'profiles');

-- =============================================
-- DONE! Real-time DELETE events will now include full record data
-- =============================================
SELECT 'Replica identity set to FULL for all tables!' AS status;
