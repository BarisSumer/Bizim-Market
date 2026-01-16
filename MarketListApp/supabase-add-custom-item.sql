-- =============================================
-- BIZIM MARKET - ADD CUSTOM ITEM FEATURE
-- Run this in the Supabase SQL Editor
-- Allows users to contribute new items to the catalog
-- =============================================

-- Step 1: Add INSERT policy for item_catalog
-- This allows authenticated users to add new items to the catalog
CREATE POLICY "item_catalog_insert"
  ON public.item_catalog FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 2: Add unique constraint on name to prevent duplicates
-- This enables ON CONFLICT DO NOTHING behavior
ALTER TABLE public.item_catalog 
  ADD CONSTRAINT item_catalog_name_unique UNIQUE (name);

-- Step 3: Grant INSERT permission to authenticated users
GRANT INSERT ON public.item_catalog TO authenticated;

-- Done!
SELECT 'item_catalog INSERT policy added successfully!' AS status;
