-- =============================================
-- BIZIM MARKET - FINAL FIX FOR RECURSION
-- This uses a SECURITY DEFINER function to bypass RLS
-- =============================================

-- Step 1: Create a helper function that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_my_family_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Step 2: Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view family members" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert for new users" ON public.profiles;

-- Step 3: Create simple, non-recursive policies
-- Policy for SELECT: Use the helper function
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()  -- Can always see own profile
    OR 
    family_id = public.get_my_family_id()  -- Can see family members
  );

-- Policy for UPDATE: Only own profile
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy for INSERT: Allow trigger to insert (already handled by SECURITY DEFINER on trigger)
CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Step 4: Fix grocery_items policies too
DROP POLICY IF EXISTS "Family members can view items" ON public.grocery_items;
DROP POLICY IF EXISTS "Family members can insert items" ON public.grocery_items;
DROP POLICY IF EXISTS "Family members can update items" ON public.grocery_items;
DROP POLICY IF EXISTS "Family members can delete items" ON public.grocery_items;

CREATE POLICY "grocery_items_select"
  ON public.grocery_items FOR SELECT
  TO authenticated
  USING (family_id = public.get_my_family_id());

CREATE POLICY "grocery_items_insert"
  ON public.grocery_items FOR INSERT
  TO authenticated
  WITH CHECK (family_id = public.get_my_family_id());

CREATE POLICY "grocery_items_update"
  ON public.grocery_items FOR UPDATE
  TO authenticated
  USING (family_id = public.get_my_family_id());

CREATE POLICY "grocery_items_delete"
  ON public.grocery_items FOR DELETE
  TO authenticated
  USING (family_id = public.get_my_family_id());

-- Step 5: Fix purchase_history policies
DROP POLICY IF EXISTS "Family members can view history" ON public.purchase_history;
DROP POLICY IF EXISTS "Family members can insert history" ON public.purchase_history;

CREATE POLICY "purchase_history_select"
  ON public.purchase_history FOR SELECT
  TO authenticated
  USING (family_id = public.get_my_family_id());

CREATE POLICY "purchase_history_insert"
  ON public.purchase_history FOR INSERT
  TO authenticated
  WITH CHECK (family_id = public.get_my_family_id());

-- Step 6: Fix families policies
DROP POLICY IF EXISTS "Users can view own family" ON public.families;
DROP POLICY IF EXISTS "Allow insert for new users" ON public.families;
DROP POLICY IF EXISTS "Service role can insert families" ON public.families;

CREATE POLICY "families_select"
  ON public.families FOR SELECT
  TO authenticated
  USING (id = public.get_my_family_id());

-- Grant execute on the function
GRANT EXECUTE ON FUNCTION public.get_my_family_id() TO authenticated;

-- Done!
SELECT 'RLS recursion fixed with SECURITY DEFINER function!' AS status;
