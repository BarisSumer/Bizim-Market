-- =============================================
-- BIZIM MARKET - CATEGORIES TABLE
-- Run this in the Supabase SQL Editor
-- Creates categories table with default data
-- =============================================

-- Step 1: Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '🏷️',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint on name to prevent duplicates
    CONSTRAINT categories_name_unique UNIQUE (name)
);

-- Step 2: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);

-- Step 3: Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies - All authenticated users can read and add categories
CREATE POLICY "categories_select"
    ON public.categories FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "categories_insert"
    ON public.categories FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Step 5: Grant permissions
GRANT SELECT, INSERT ON public.categories TO authenticated;

-- Step 6: Seed default categories
INSERT INTO public.categories (name, emoji) VALUES
    ('Meyve', '🍎'),
    ('Sebze', '🥦'),
    ('Süt Ürünleri', '🥛'),
    ('Kahvaltılık', '🍳'),
    ('Et & Tavuk', '🥩'),
    ('Kuru Gıda', '🌾'),
    ('İçecek', '🥤'),
    ('Fırın', '🍞'),
    ('Temizlik', '🧴'),
    ('Kişisel Bakım', '🧼'),
    ('Atıştırmalık', '🍿'),
    ('Genel', '🛒')
ON CONFLICT (name) DO NOTHING;

-- Done!
SELECT 'Categories table created and seeded successfully!' AS status;
