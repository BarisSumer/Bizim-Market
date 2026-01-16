-- =============================================
-- BIZIM MARKET - CLEAN SLATE SQL SCRIPT
-- Run this in the Supabase SQL Editor
-- This will DROP all existing tables and recreate them
-- =============================================

-- =============================================
-- STEP 1: DROP EXISTING OBJECTS (Clean Slate)
-- =============================================

-- Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS public.purchase_history CASCADE;
DROP TABLE IF EXISTS public.grocery_items CASCADE;
DROP TABLE IF EXISTS public.item_catalog CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.families CASCADE;

-- =============================================
-- STEP 2: ENABLE EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- STEP 3: CREATE TABLES
-- =============================================

-- 3.1 FAMILIES TABLE
CREATE TABLE public.families (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Ailem',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 GROCERY ITEMS TABLE
CREATE TABLE public.grocery_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🛒',
  category TEXT NOT NULL DEFAULT 'Diğer',
  quantity INTEGER DEFAULT 1,
  unit TEXT DEFAULT 'adet',
  is_bought BOOLEAN DEFAULT FALSE,
  bought_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  bought_at TIMESTAMPTZ,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.4 ITEM CATALOG TABLE (Suggestions)
CREATE TABLE public.item_catalog (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🛒',
  category TEXT NOT NULL,
  search_keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.5 PURCHASE HISTORY TABLE
CREATE TABLE public.purchase_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  purchased_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STEP 4: CREATE INDEXES
-- =============================================
CREATE INDEX idx_grocery_items_family ON public.grocery_items(family_id);
CREATE INDEX idx_grocery_items_is_bought ON public.grocery_items(is_bought);
CREATE INDEX idx_profiles_family ON public.profiles(family_id);
CREATE INDEX idx_item_catalog_name ON public.item_catalog(name);
CREATE INDEX idx_purchase_history_family ON public.purchase_history(family_id);

-- =============================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grocery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 6: CREATE THE NEW USER HANDLER FUNCTION
-- This runs BEFORE RLS kicks in using SECURITY DEFINER
-- =============================================
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
  INSERT INTO public.families (name)
  VALUES ('Ailem')
  RETURNING id INTO new_family_id;

  -- Create the user's profile with the new family
  INSERT INTO public.profiles (id, email, full_name, avatar_url, family_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    new_family_id
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- =============================================
-- STEP 7: CREATE THE TRIGGER
-- =============================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- STEP 8: RLS POLICIES
-- =============================================

-- FAMILIES: Allow authenticated users to see their family
CREATE POLICY "Users can view own family"
  ON public.families FOR SELECT
  TO authenticated
  USING (id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Service role can insert families"
  ON public.families FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Also allow the function to insert (via SECURITY DEFINER, it runs as owner)
CREATE POLICY "Allow insert for new users"
  ON public.families FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- PROFILES: Users can view and update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can view family members"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Allow insert for new users"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- GROCERY ITEMS: Family members can CRUD
CREATE POLICY "Family members can view items"
  ON public.grocery_items FOR SELECT
  TO authenticated
  USING (family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Family members can insert items"
  ON public.grocery_items FOR INSERT
  TO authenticated
  WITH CHECK (family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Family members can update items"
  ON public.grocery_items FOR UPDATE
  TO authenticated
  USING (family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Family members can delete items"
  ON public.grocery_items FOR DELETE
  TO authenticated
  USING (family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

-- ITEM CATALOG: Everyone authenticated can read
CREATE POLICY "Anyone authenticated can view catalog"
  ON public.item_catalog FOR SELECT
  TO authenticated
  USING (true);

-- PURCHASE HISTORY: Family members can view/insert
CREATE POLICY "Family members can view history"
  ON public.purchase_history FOR SELECT
  TO authenticated
  USING (family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Family members can insert history"
  ON public.purchase_history FOR INSERT
  TO authenticated
  WITH CHECK (family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

-- =============================================
-- STEP 9: GRANT PERMISSIONS
-- =============================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT ALL ON public.families TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.grocery_items TO authenticated;
GRANT SELECT ON public.item_catalog TO authenticated;
GRANT ALL ON public.purchase_history TO authenticated;

-- =============================================
-- STEP 10: SEED ITEM CATALOG
-- =============================================
INSERT INTO public.item_catalog (name, emoji, category, search_keywords) VALUES
  -- Süt Ürünleri
  ('Süt', '🥛', 'Süt Ürünleri', ARRAY['milk', 'süt']),
  ('Yoğurt', '🥛', 'Süt Ürünleri', ARRAY['yogurt', 'yoğurt']),
  ('Peynir', '🧀', 'Süt Ürünleri', ARRAY['cheese', 'peynir']),
  ('Tereyağı', '🧈', 'Süt Ürünleri', ARRAY['butter', 'tereyağ']),
  ('Kaşar', '🧀', 'Süt Ürünleri', ARRAY['kasar', 'kaşar']),
  
  -- Kahvaltılık
  ('Yumurta', '🥚', 'Kahvaltılık', ARRAY['egg', 'yumurta']),
  ('Bal', '🍯', 'Kahvaltılık', ARRAY['honey', 'bal']),
  ('Zeytin', '🫒', 'Kahvaltılık', ARRAY['olive', 'zeytin']),
  ('Reçel', '🍓', 'Kahvaltılık', ARRAY['jam', 'reçel']),
  
  -- Sebze
  ('Domates', '🍅', 'Sebze', ARRAY['tomato', 'domates']),
  ('Patates', '🥔', 'Sebze', ARRAY['potato', 'patates']),
  ('Soğan', '🧅', 'Sebze', ARRAY['onion', 'soğan']),
  ('Salatalık', '🥒', 'Sebze', ARRAY['cucumber', 'salatalık']),
  ('Biber', '🫑', 'Sebze', ARRAY['pepper', 'biber']),
  ('Havuç', '🥕', 'Sebze', ARRAY['carrot', 'havuç']),
  ('Patlıcan', '🍆', 'Sebze', ARRAY['eggplant', 'patlıcan']),
  ('Marul', '🥬', 'Sebze', ARRAY['lettuce', 'marul']),
  
  -- Meyve
  ('Elma', '🍎', 'Meyve', ARRAY['apple', 'elma']),
  ('Muz', '🍌', 'Meyve', ARRAY['banana', 'muz']),
  ('Portakal', '🍊', 'Meyve', ARRAY['orange', 'portakal']),
  ('Limon', '🍋', 'Meyve', ARRAY['lemon', 'limon']),
  ('Üzüm', '🍇', 'Meyve', ARRAY['grape', 'üzüm']),
  
  -- Et & Tavuk
  ('Tavuk Göğsü', '🍗', 'Et & Tavuk', ARRAY['chicken', 'tavuk']),
  ('Kıyma', '🥩', 'Et & Tavuk', ARRAY['ground beef', 'kıyma']),
  ('Dana Eti', '🥩', 'Et & Tavuk', ARRAY['beef', 'dana']),
  
  -- Kuru Gıda
  ('Makarna', '🍝', 'Kuru Gıda', ARRAY['pasta', 'makarna']),
  ('Pirinç', '🍚', 'Kuru Gıda', ARRAY['rice', 'pirinç']),
  ('Un', '🌾', 'Kuru Gıda', ARRAY['flour', 'un']),
  ('Şeker', '🍬', 'Kuru Gıda', ARRAY['sugar', 'şeker']),
  ('Tuz', '🧂', 'Kuru Gıda', ARRAY['salt', 'tuz']),
  
  -- İçecek
  ('Su', '💧', 'İçecek', ARRAY['water', 'su']),
  ('Çay', '🍵', 'İçecek', ARRAY['tea', 'çay']),
  ('Kahve', '☕', 'İçecek', ARRAY['coffee', 'kahve']),
  ('Ayran', '🥛', 'İçecek', ARRAY['ayran']),
  
  -- Fırın
  ('Ekmek', '🍞', 'Fırın', ARRAY['bread', 'ekmek']),
  ('Simit', '🥯', 'Fırın', ARRAY['simit', 'bagel']),
  
  -- Temizlik
  ('Bulaşık Deterjanı', '🧴', 'Temizlik', ARRAY['dish soap', 'bulaşık']),
  ('Çamaşır Deterjanı', '🧴', 'Temizlik', ARRAY['laundry', 'çamaşır']),
  ('Tuvalet Kağıdı', '🧻', 'Temizlik', ARRAY['toilet paper', 'tuvalet']),
  
  -- Kişisel Bakım
  ('Şampuan', '🧴', 'Kişisel Bakım', ARRAY['shampoo', 'şampuan']),
  ('Sabun', '🧼', 'Kişisel Bakım', ARRAY['soap', 'sabun']),
  ('Diş Macunu', '🦷', 'Kişisel Bakım', ARRAY['toothpaste', 'diş macunu']),
  
  -- Atıştırmalık
  ('Cips', '🍟', 'Atıştırmalık', ARRAY['chips', 'cips']),
  ('Çikolata', '🍫', 'Atıştırmalık', ARRAY['chocolate', 'çikolata']),
  ('Bisküvi', '🍪', 'Atıştırmalık', ARRAY['cookie', 'bisküvi']);

-- =============================================
-- DONE! Your database is ready.
-- =============================================
SELECT 'Database setup complete!' AS status;
