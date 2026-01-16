import { GroceryItemDB, supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealtimeChannel } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';

export interface GroceryItem {
    id: string;
    name: string;
    emoji: string;
    category: string;
    isBought: boolean;
    quantity?: number;
    unit?: string;
}

export interface Suggestion {
    name: string;
    emoji: string;
    category: string;
}

// Category type from database
export interface Category {
    id?: string;
    name: string;
    emoji: string;
}

// Statistics data types
export interface CategoryStat {
    label: string;
    count: number;
    percentage: number;
    color: string;
}

export interface TopItem {
    rank: number;
    name: string;
    emoji: string;
    count: number;
}

export interface StatisticsData {
    categoryData: CategoryStat[];
    topItems: TopItem[];
    totalPurchases: number;
}

interface GroceryState {
    items: GroceryItem[];
    suggestions: Suggestion[];
    categories: Category[];
    isLoading: boolean;
    subscription: RealtimeChannel | null;

    // Actions
    fetchItems: () => Promise<void>;
    fetchSuggestions: () => Promise<void>;
    fetchCategories: () => Promise<void>;
    addItem: (item: Omit<GroceryItem, 'id' | 'isBought'>) => Promise<void>;
    addNewCatalogItem: (name: string, category: string) => Promise<void>;
    deleteCatalogItem: (name: string) => Promise<void>;
    addCustomCategory: (name: string, emoji: string) => Promise<void>;
    toggleItem: (id: string) => Promise<void>;
    removeItem: (id: string) => Promise<void>;
    clearBoughtItems: () => Promise<void>;
    subscribeToChanges: () => void;
    unsubscribe: () => void;
    fetchStatistics: (startDate: Date, endDate: Date) => Promise<StatisticsData>;
}

// Transform database item to app item
const transformItem = (dbItem: GroceryItemDB): GroceryItem => ({
    id: dbItem.id,
    name: dbItem.name,
    emoji: dbItem.emoji,
    category: dbItem.category,
    isBought: dbItem.is_bought,
    quantity: dbItem.quantity,
    unit: dbItem.unit,
});

// Local fallback data - EMPTY to avoid ghost data issues
const localItems: GroceryItem[] = [];

const localSuggestions: Suggestion[] = [
    { name: 'Patates', emoji: '🥔', category: 'Sebze' },
    { name: 'Patlıcan', emoji: '🍆', category: 'Sebze' },
    { name: 'Peynir', emoji: '🧀', category: 'Süt Ürünleri' },
    { name: 'Pirinç', emoji: '🍚', category: 'Kuru Gıda' },
    { name: 'Portakal', emoji: '🍊', category: 'Meyve' },
    { name: 'Elma', emoji: '🍎', category: 'Meyve' },
    { name: 'Muz', emoji: '🍌', category: 'Meyve' },
    { name: 'Salatalık', emoji: '🥒', category: 'Sebze' },
    { name: 'Biber', emoji: '🫑', category: 'Sebze' },
    { name: 'Havuç', emoji: '🥕', category: 'Sebze' },
    { name: 'Limon', emoji: '🍋', category: 'Meyve' },
    { name: 'Yogurt', emoji: '🥛', category: 'Süt Ürünleri' },
    { name: 'Bal', emoji: '🍯', category: 'Kahvaltılık' },
    { name: 'Zeytin', emoji: '🫒', category: 'Kahvaltılık' },
    { name: 'Çay', emoji: '🍵', category: 'İçecek' },
    { name: 'Kahve', emoji: '☕', category: 'İçecek' },
    { name: 'Şeker', emoji: '🍬', category: 'Kuru Gıda' },
    { name: 'Tuz', emoji: '🧂', category: 'Kuru Gıda' },
    { name: 'Un', emoji: '🌾', category: 'Kuru Gıda' },
    { name: 'Ekmek', emoji: '🍞', category: 'Fırın' },
];

// Helper to check if an ID is a valid UUID (from database)
const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};

// Category to emoji mapping for custom items
const CATEGORY_EMOJI_MAP: Record<string, string> = {
    'Meyve': '🍎',
    'Sebze': '🥦',
    'Süt Ürünleri': '🥛',
    'Kahvaltılık': '🍳',
    'Et & Tavuk': '🥩',
    'Kuru Gıda': '🌾',
    'İçecek': '🥤',
    'Fırın': '🍞',
    'Temizlik': '🧴',
    'Kişisel Bakım': '🧼',
    'Atıştırmalık': '🍿',
    'Genel': '🛒',
};

// Helper to get emoji for a category
export const getEmojiForCategory = (category: string): string => {
    return CATEGORY_EMOJI_MAP[category] || '🛒';
};

export const useGroceryStore = create<GroceryState>()(
    persist(
        (set, get) => ({
            items: [], // Persisted - will show cached data instantly
            suggestions: localSuggestions,
            categories: [], // Will be fetched from Supabase
            isLoading: false,
            subscription: null,

            fetchItems: async () => {
                const profile = useAuthStore.getState().profile;
                if (!profile?.family_id) {
                    // Not authenticated - show empty list
                    set({ items: [] });
                    return;
                }

                set({ isLoading: true });
                try {
                    const { data, error } = await supabase
                        .from('grocery_items')
                        .select('*')
                        .eq('family_id', profile.family_id)
                        .order('created_at', { ascending: false });

                    if (error) {
                        console.error('Fetch items error:', error);
                        set({ items: [] }); // Empty list, not fallback
                        return;
                    }

                    // For authenticated users, show actual DB items (even if empty)
                    const items = data.map(transformItem);
                    set({ items });
                } catch (error) {
                    console.error('Fetch items error:', error);
                    set({ items: [] });
                } finally {
                    set({ isLoading: false });
                }
            },

            fetchSuggestions: async () => {
                try {
                    const { data, error } = await supabase
                        .from('item_catalog')
                        .select('name, emoji, category')
                        .order('name');

                    if (error) {
                        console.error('Fetch suggestions error:', error);
                        return;
                    }

                    if (data && data.length > 0) {
                        set({ suggestions: data });
                    }
                } catch (error) {
                    console.error('Fetch suggestions error:', error);
                }
            },

            fetchCategories: async () => {
                try {
                    const { data, error } = await supabase
                        .from('categories')
                        .select('id, name, emoji')
                        .order('name');

                    if (error) {
                        console.error('Fetch categories error:', error);
                        return;
                    }

                    if (data && data.length > 0) {
                        set({ categories: data });
                        // Update emoji map with fetched categories
                        data.forEach((cat: Category) => {
                            CATEGORY_EMOJI_MAP[cat.name] = cat.emoji;
                        });
                    }
                } catch (error) {
                    console.error('Fetch categories error:', error);
                }
            },

            addItem: async (newItem) => {
                const profile = useAuthStore.getState().profile;

                // Generate a temporary ID for optimistic update
                const tempId = `temp-${Date.now()}`;
                const optimisticItem: GroceryItem = {
                    ...newItem,
                    id: tempId,
                    isBought: false,
                };

                // Optimistically add to local state immediately
                set((state) => ({
                    items: [optimisticItem, ...state.items],
                }));

                if (!profile?.family_id) {
                    // Local mode: keep the temp item
                    return;
                }

                try {
                    const { data, error } = await supabase
                        .from('grocery_items')
                        .insert({
                            name: newItem.name,
                            emoji: newItem.emoji,
                            category: newItem.category,
                            quantity: newItem.quantity || 1,
                            unit: newItem.unit || 'adet',
                            family_id: profile.family_id,
                            created_by: profile.id,
                        })
                        .select()
                        .single();

                    if (error) {
                        console.error('Add item error:', error);
                        // Rollback: remove the optimistic item
                        set((state) => ({
                            items: state.items.filter((item) => item.id !== tempId),
                        }));
                        return;
                    }

                    // Replace optimistic item with real item from DB
                    if (data) {
                        const realItem = transformItem(data);
                        set((state) => ({
                            items: state.items.map((item) =>
                                item.id === tempId ? realItem : item
                            ),
                        }));
                    }
                } catch (error) {
                    console.error('Add item error:', error);
                    // Rollback on exception
                    set((state) => ({
                        items: state.items.filter((item) => item.id !== tempId),
                    }));
                }
            },

            addNewCatalogItem: async (name, category) => {
                // Get the appropriate emoji for this category
                const emoji = getEmojiForCategory(category);

                // Create suggestion object for optimistic update
                const newSuggestion: Suggestion = {
                    name: name.trim(),
                    emoji,
                    category,
                };

                // Optimistically add to local suggestions
                set((state) => ({
                    suggestions: [...state.suggestions, newSuggestion].sort((a, b) =>
                        a.name.localeCompare(b.name)
                    ),
                }));

                try {
                    // Use upsert with ON CONFLICT DO NOTHING behavior
                    const { error } = await supabase.from('item_catalog').upsert(
                        {
                            name: name.trim(),
                            emoji,
                            category,
                            search_keywords: [name.toLowerCase().trim()],
                        },
                        {
                            onConflict: 'name',
                            ignoreDuplicates: true,
                        }
                    );

                    if (error) {
                        console.error('Add catalog item error:', error);
                        // Don't revert - the item might already exist, which is fine
                    }
                } catch (error) {
                    console.error('Add catalog item error:', error);
                    // Silent fail - catalog insert is secondary to grocery list add
                }
            },

            deleteCatalogItem: async (name) => {
                // Optimistically remove from local suggestions
                const originalSuggestions = get().suggestions;
                set((state) => ({
                    suggestions: state.suggestions.filter(
                        (s) => s.name.toLowerCase() !== name.toLowerCase()
                    ),
                }));

                try {
                    const { error } = await supabase
                        .from('item_catalog')
                        .delete()
                        .ilike('name', name);

                    if (error) {
                        console.error('Delete catalog item error:', error);
                        // Revert on error
                        set({ suggestions: originalSuggestions });
                    }
                } catch (error) {
                    console.error('Delete catalog item error:', error);
                    set({ suggestions: originalSuggestions });
                }
            },

            addCustomCategory: async (name, emoji) => {
                const trimmedName = name.trim();
                const trimmedEmoji = emoji.trim() || '🏷️';

                // Check if category already exists locally
                const existing = get().categories.find(
                    (c: Category) => c.name.toLowerCase() === trimmedName.toLowerCase()
                );
                if (existing) return;

                // Optimistically add to local state
                const optimisticCategory: Category = { name: trimmedName, emoji: trimmedEmoji };
                set((state) => ({
                    categories: [...state.categories, optimisticCategory],
                }));

                // Update emoji map immediately
                CATEGORY_EMOJI_MAP[trimmedName] = trimmedEmoji;

                try {
                    // Insert into Supabase with conflict handling
                    const { data, error } = await supabase
                        .from('categories')
                        .insert({ name: trimmedName, emoji: trimmedEmoji })
                        .select()
                        .single();

                    if (error) {
                        // If duplicate, just log and continue (category exists in DB)
                        if (error.code === '23505') {
                            console.log('Category already exists in database');
                        } else {
                            console.error('Add category error:', error);
                        }
                    } else if (data) {
                        // Update local state with the real ID from database
                        set((state) => ({
                            categories: state.categories.map((c) =>
                                c.name === trimmedName ? { ...c, id: data.id } : c
                            ),
                        }));
                    }
                } catch (error) {
                    console.error('Add category error:', error);
                }
            },

            toggleItem: async (id) => {
                const profile = useAuthStore.getState().profile;
                const item = get().items.find((i) => i.id === id);
                if (!item) return;

                // Always update local state immediately for responsiveness
                set((state) => ({
                    items: state.items.map((i) =>
                        i.id === id ? { ...i, isBought: !i.isBought } : i
                    ),
                }));

                // If not authenticated or ID is not a valid UUID, stop here (local only)
                if (!profile?.family_id || !isValidUUID(id)) {
                    return;
                }

                // Sync to database
                try {
                    const newIsBought = !item.isBought;
                    const { error } = await supabase
                        .from('grocery_items')
                        .update({
                            is_bought: newIsBought,
                            bought_by: newIsBought ? profile.id : null,
                            bought_at: newIsBought ? new Date().toISOString() : null,
                        })
                        .eq('id', id);

                    if (error) {
                        console.error('Toggle item error:', error);
                        // Revert local state on error
                        set((state) => ({
                            items: state.items.map((i) =>
                                i.id === id ? { ...i, isBought: item.isBought } : i
                            ),
                        }));
                    }

                    // If item is bought, also log to purchase history
                    if (newIsBought && !error) {
                        await supabase.from('purchase_history').insert({
                            item_name: item.name,
                            category: item.category,
                            quantity: item.quantity || 1,
                            family_id: profile.family_id,
                            purchased_by: profile.id,
                        });
                    }

                    // If item is UNCHECKED, remove the most recent history entry
                    if (!newIsBought && !error) {
                        // Find and delete the most recent purchase history entry for this item
                        const { data: historyEntries } = await supabase
                            .from('purchase_history')
                            .select('id')
                            .eq('item_name', item.name)
                            .eq('family_id', profile.family_id)
                            .order('purchased_at', { ascending: false })
                            .limit(1);

                        if (historyEntries && historyEntries.length > 0) {
                            await supabase
                                .from('purchase_history')
                                .delete()
                                .eq('id', historyEntries[0].id);
                        }
                    }
                } catch (error) {
                    console.error('Toggle item error:', error);
                }
            },

            removeItem: async (id) => {
                const profile = useAuthStore.getState().profile;

                // Always remove from local state first
                const originalItems = get().items;
                set((state) => ({
                    items: state.items.filter((item) => item.id !== id),
                }));

                // If not authenticated or not a valid UUID, stop here (local only)
                if (!profile?.family_id || !isValidUUID(id)) {
                    return;
                }

                try {
                    const { error } = await supabase
                        .from('grocery_items')
                        .delete()
                        .eq('id', id);

                    if (error) {
                        console.error('Remove item error:', error);
                        // Revert on error
                        set({ items: originalItems });
                    }
                } catch (error) {
                    console.error('Remove item error:', error);
                    set({ items: originalItems });
                }
            },

            subscribeToChanges: () => {
                const profile = useAuthStore.getState().profile;
                const familyId = profile?.family_id;

                // CRITICAL: Don't subscribe without a valid family_id
                if (!familyId) {
                    console.warn('[Realtime] ⚠️ No family_id available - cannot subscribe');
                    console.warn('[Realtime] Profile state:', profile);
                    return;
                }

                // Unsubscribe from any existing subscription first
                const existingSub = get().subscription;
                if (existingSub) {
                    console.log('[Realtime] 🔄 Removing existing subscription before creating new one');
                    supabase.removeChannel(existingSub);
                    set({ subscription: null });
                }

                const channelName = `realtime:grocery_items:${familyId}`;
                console.log('[Realtime] 🚀 Creating subscription...');
                console.log('[Realtime] Channel name:', channelName);
                console.log('[Realtime] Family ID:', familyId);

                const subscription = supabase
                    .channel(channelName)
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'grocery_items',
                            filter: `family_id=eq.${familyId}`,
                        },
                        (payload) => {
                            console.log('[Realtime] 📥 INSERT event received');

                            const newRecord = payload.new as GroceryItemDB;
                            if (!newRecord || !newRecord.id) {
                                console.error('[Realtime] ❌ INSERT: Invalid payload - no new record');
                                return;
                            }

                            const newItem = transformItem(newRecord);

                            set((state) => {
                                // 🛡️ DEDUPLICATION CHECK 1: Check if exact ID already exists
                                const existsById = state.items.some((item) => item.id === newItem.id);
                                if (existsById) {
                                    console.log('[Realtime] ⏭️ INSERT skipped - ID already exists:', newItem.id);
                                    return state;
                                }

                                // 🛡️ DEDUPLICATION CHECK 2: Check if there's a temp item with same name
                                // (This handles race condition between optimistic add and realtime event)
                                const tempItemIndex = state.items.findIndex(
                                    (item) => item.id.startsWith('temp-') && item.name === newItem.name
                                );

                                if (tempItemIndex !== -1) {
                                    // Replace the temp item with the real one from the server
                                    console.log('[Realtime] 🔄 Replacing temp item with real item:', newItem.name);
                                    const updatedItems = [...state.items];
                                    updatedItems[tempItemIndex] = newItem;
                                    return { items: updatedItems };
                                }

                                // No duplicates found - add the new item
                                console.log('[Realtime] ✅ INSERT applied:', newItem.name);
                                return {
                                    items: [newItem, ...state.items],
                                };
                            });
                        }
                    )
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'grocery_items',
                            filter: `family_id=eq.${familyId}`,
                        },
                        (payload) => {
                            console.log('[Realtime] 🔄 UPDATE event received');
                            console.log('[Realtime] Payload:', JSON.stringify(payload.new, null, 2));

                            const newRecord = payload.new as GroceryItemDB;
                            if (!newRecord || !newRecord.id) {
                                console.error('[Realtime] ❌ UPDATE: Invalid payload - no new record');
                                return;
                            }

                            const updatedItem = transformItem(newRecord);
                            console.log('[Realtime] ✅ UPDATE applied:', updatedItem.name, '| isBought:', updatedItem.isBought);

                            set((state) => ({
                                items: state.items.map((item) =>
                                    item.id === updatedItem.id ? updatedItem : item
                                ),
                            }));
                        }
                    )
                    .on(
                        'postgres_changes',
                        {
                            event: 'DELETE',
                            schema: 'public',
                            table: 'grocery_items',
                            filter: `family_id=eq.${familyId}`,
                        },
                        (payload) => {
                            console.log('[Realtime] 🗑️ DELETE event received');
                            console.log('[Realtime] Old record:', JSON.stringify(payload.old, null, 2));

                            const oldRecord = payload.old as { id?: string } | undefined;
                            const deletedId = oldRecord?.id;

                            if (deletedId) {
                                console.log('[Realtime] ✅ DELETE applied for id:', deletedId);
                                set((state) => ({
                                    items: state.items.filter((item) => item.id !== deletedId),
                                }));
                            } else {
                                console.error('[Realtime] ❌ DELETE: No id in old record - refetching all items');
                                console.error('[Realtime] This usually means REPLICA IDENTITY is not set to FULL');
                                get().fetchItems();
                            }
                        }
                    )
                    .subscribe((status, err) => {
                        console.log('[Realtime] 📡 Subscription status:', status);

                        if (status === 'SUBSCRIBED') {
                            console.log('[Realtime] ✅ Successfully subscribed to real-time changes!');
                            console.log('[Realtime] Listening for INSERT, UPDATE, DELETE on grocery_items');
                        } else if (status === 'CHANNEL_ERROR') {
                            console.error('[Realtime] ❌ Channel error:', err);
                            console.error('[Realtime] Retrying subscription in 5 seconds...');
                            set({ subscription: null });
                            setTimeout(() => {
                                console.log('[Realtime] 🔄 Retry attempt...');
                                get().subscribeToChanges();
                            }, 5000);
                        } else if (status === 'TIMED_OUT') {
                            console.error('[Realtime] ⏱️ Connection timed out');
                            console.error('[Realtime] Retrying subscription in 3 seconds...');
                            set({ subscription: null });
                            setTimeout(() => {
                                console.log('[Realtime] 🔄 Retry attempt after timeout...');
                                get().subscribeToChanges();
                            }, 3000);
                        } else if (status === 'CLOSED') {
                            console.warn('[Realtime] 🔒 Channel closed');
                        }
                    });

                set({ subscription });
                console.log('[Realtime] 📌 Subscription object stored');
            },

            unsubscribe: () => {
                const { subscription } = get();
                if (subscription) {
                    console.log('[Realtime] 🛑 Unsubscribing from channel');
                    supabase.removeChannel(subscription);
                    set({ subscription: null });
                }
            },

            fetchStatistics: async (startDate: Date, endDate: Date): Promise<StatisticsData> => {
                const profile = useAuthStore.getState().profile;
                const emptyStats: StatisticsData = {
                    categoryData: [],
                    topItems: [],
                    totalPurchases: 0,
                };

                if (!profile?.family_id) {
                    return emptyStats;
                }

                try {
                    // Fetch purchase history for the date range
                    const { data, error } = await supabase
                        .from('purchase_history')
                        .select('item_name, category, quantity')
                        .eq('family_id', profile.family_id)
                        .gte('purchased_at', startDate.toISOString())
                        .lte('purchased_at', endDate.toISOString());

                    if (error || !data) {
                        console.error('Fetch statistics error:', error);
                        return emptyStats;
                    }

                    if (data.length === 0) {
                        return emptyStats;
                    }

                    // Category color palette
                    const categoryColors: Record<string, string> = {
                        'Süt Ürünleri': '#86EFAC',
                        'Kahvaltılık': '#FCD34D',
                        'Sebze': '#4ADE80',
                        'Meyve': '#FB923C',
                        'Et & Tavuk': '#F87171',
                        'Kuru Gıda': '#A78BFA',
                        'İçecek': '#38BDF8',
                        'Fırın': '#FBBF24',
                        'Temizlik': '#D8B4FE',
                        'Kişisel Bakım': '#F9A8D4',
                        'Atıştırmalık': '#A5F3FC',
                        'Genel': '#9CA3AF',
                    };

                    // Aggregate by category
                    const categoryMap = new Map<string, number>();
                    data.forEach((item) => {
                        const current = categoryMap.get(item.category) || 0;
                        categoryMap.set(item.category, current + 1);
                    });

                    const totalPurchases = data.length;
                    const categoryData: CategoryStat[] = Array.from(categoryMap.entries())
                        .map(([label, count]) => ({
                            label,
                            count,
                            percentage: Math.round((count / totalPurchases) * 100),
                            color: categoryColors[label] || '#9CA3AF',
                        }))
                        .sort((a, b) => b.count - a.count);

                    // Aggregate by item name for top items
                    const itemMap = new Map<string, { count: number; category: string }>();
                    data.forEach((item) => {
                        const current = itemMap.get(item.item_name);
                        if (current) {
                            current.count += 1;
                        } else {
                            itemMap.set(item.item_name, { count: 1, category: item.category });
                        }
                    });

                    const topItems: TopItem[] = Array.from(itemMap.entries())
                        .map(([name, info], index) => ({
                            rank: index + 1,
                            name,
                            emoji: getEmojiForCategory(info.category),
                            count: info.count,
                        }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 10)
                        .map((item, index) => ({ ...item, rank: index + 1 }));

                    return {
                        categoryData,
                        topItems,
                        totalPurchases,
                    };
                } catch (error) {
                    console.error('Fetch statistics error:', error);
                    return emptyStats;
                }
            },

            clearBoughtItems: async () => {
                const profile = useAuthStore.getState().profile;
                const boughtItems = get().items.filter((item) => item.isBought);

                if (boughtItems.length === 0) return;

                // Optimistically remove from local state
                const originalItems = get().items;
                set((state) => ({
                    items: state.items.filter((item) => !item.isBought),
                }));

                if (!profile?.family_id) {
                    // Local mode only
                    return;
                }

                try {
                    // Get IDs of bought items that are valid UUIDs
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    const boughtItemIds = boughtItems
                        .filter((item) => uuidRegex.test(item.id))
                        .map((item) => item.id);

                    if (boughtItemIds.length > 0) {
                        // Delete bought items from database
                        // Note: purchase_history is NOT deleted - kept for statistics
                        const { error } = await supabase
                            .from('grocery_items')
                            .delete()
                            .in('id', boughtItemIds);

                        if (error) {
                            console.error('Clear bought items error:', error);
                            // Revert on error
                            set({ items: originalItems });
                        }
                    }
                } catch (error) {
                    console.error('Clear bought items error:', error);
                    set({ items: originalItems });
                }
            },
        }),
        {
            name: 'bizim-market-storage-v1',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                items: state.items,
                categories: state.categories,
                // Don't persist: suggestions (static), isLoading, subscription
            }),
        }
    ));
