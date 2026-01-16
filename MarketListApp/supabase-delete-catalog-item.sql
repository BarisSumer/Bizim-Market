-- =============================================
-- BIZIM MARKET - DELETE CATALOG ITEM POLICY
-- Run this in the Supabase SQL Editor
-- Allows users to delete items from the catalog
-- =============================================

-- Add DELETE policy for item_catalog
-- This allows authenticated users to remove items they no longer want
CREATE POLICY "item_catalog_delete"
  ON public.item_catalog FOR DELETE
  TO authenticated
  USING (true);

-- Grant DELETE permission to authenticated users
GRANT DELETE ON public.item_catalog TO authenticated;

-- Done!
SELECT 'item_catalog DELETE policy added successfully!' AS status;
