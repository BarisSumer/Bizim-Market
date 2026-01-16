import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Environment variables - replace these with your Supabase project credentials
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oirtgtbsfyezmdusaoly.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_TeZOSkMvMmb2qVFpG-hcHg_vCuDAA7k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// Database types (matching our schema)
export interface Family {
    id: string;
    name: string;
    invite_code: string;
    created_at: string;
    updated_at: string;
}

export interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    family_id: string | null;
    expo_push_token: string | null;
    created_at: string;
    updated_at: string;
}

export interface GroceryItemDB {
    id: string;
    name: string;
    emoji: string;
    category: string;
    quantity: number;
    unit: string;
    is_bought: boolean;
    bought_by: string | null;
    bought_at: string | null;
    family_id: string;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface ItemCatalog {
    id: string;
    name: string;
    emoji: string;
    category: string;
    search_keywords: string[] | null;
    created_at: string;
}

export interface PurchaseHistory {
    id: string;
    item_name: string;
    category: string;
    quantity: number;
    family_id: string;
    purchased_by: string | null;
    purchased_at: string;
}
