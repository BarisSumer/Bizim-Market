-- =============================================
-- ADD DELETE POLICY FOR PURCHASE HISTORY
-- Run this in the Supabase SQL Editor
-- =============================================

-- Allow family members to delete their own purchase history entries
CREATE POLICY "Family members can delete history"
  ON public.purchase_history FOR DELETE
  TO authenticated
  USING (family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

-- Verify the policy was created
SELECT 'DELETE policy for purchase_history created!' AS status;
