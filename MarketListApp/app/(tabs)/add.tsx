import { getEmojiForCategory, Suggestion, useGroceryStore } from '@/store/useGroceryStore';
import { useThemeStore } from '@/store/useThemeStore';
import { Check, ChevronLeft, MoreHorizontal, Plus, Search, X } from 'lucide-react-native';
import React from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    SectionList,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Available categories for custom items
const STATIC_CATEGORIES = [
    { name: 'Meyve', emoji: '🍎' },
    { name: 'Sebze', emoji: '🥬' },
    { name: 'Süt Ürünleri', emoji: '🥛' },
    { name: 'Kahvaltılık', emoji: '🍳' },
    { name: 'Et & Tavuk', emoji: '🍗' },
    { name: 'Kuru Gıda', emoji: '🌾' },
    { name: 'İçecek', emoji: '🥤' },
    { name: 'Fırın', emoji: '🍞' },
    { name: 'Temizlik', emoji: '🧴' },
    { name: 'Kişisel Bakım', emoji: '🧼' },
    { name: 'Atıştırmalık', emoji: '🍿' },
    { name: 'Genel', emoji: '🛒' },
];

// Category order for Browse All mode
const CATEGORY_ORDER = [
    'Meyve',
    'Sebze',
    'Süt Ürünleri',
    'Kahvaltılık',
    'Et & Tavuk',
    'Kuru Gıda',
    'İçecek',
    'Fırın',
    'Temizlik',
    'Kişisel Bakım',
    'Atıştırmalık',
    'Genel',
];

export default function AddScreen() {
    const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
    const { items, suggestions, categories, addItem, addNewCatalogItem, deleteCatalogItem, addCustomCategory, fetchCategories } = useGroceryStore();
    const isDark = resolvedTheme === 'dark';

    const [searchQuery, setSearchQuery] = React.useState('');
    const [showCategoryModal, setShowCategoryModal] = React.useState(false);
    const [recentlyAdded, setRecentlyAdded] = React.useState<Set<string>>(new Set());

    // Category creation form state
    const [showCreateForm, setShowCreateForm] = React.useState(false);
    const [newCategoryName, setNewCategoryName] = React.useState('');
    const [newCategoryEmoji, setNewCategoryEmoji] = React.useState('');

    // Fetch categories on mount
    React.useEffect(() => {
        fetchCategories();
    }, []);

    // Use categories from store (fetched from Supabase)
    const allCategories = React.useMemo(() => {
        // If no categories loaded yet, use static defaults
        if (categories.length === 0) {
            return STATIC_CATEGORIES;
        }
        return categories;
    }, [categories]);

    // Check if item is already in the active grocery list (not bought)
    const isAlreadyInList = (name: string): boolean => {
        return items.some(
            (i) => i.name.toLowerCase() === name.toLowerCase() && !i.isBought
        );
    };

    const colors = {
        // Midnight Gold (Dark) / Navy Accent (Light) Theme
        background: isDark ? '#0B1120' : '#F0F4F8',
        card: isDark ? '#151F32' : '#FFFFFF',
        surface: isDark ? '#1C2A42' : '#E8EDF4',
        text: isDark ? '#FFFFFF' : '#0B1120',
        textSecondary: isDark ? '#64748B' : '#475569',
        textMuted: isDark ? '#475569' : '#64748B',
        primary: isDark ? '#FFC107' : '#0B1120',  // Yellow (dark) / Navy (light)
        primaryDark: isDark ? '#D4A106' : '#1E293B',
        border: isDark ? '#1E293B' : '#D1D9E6',
        inputBg: isDark ? '#1C2A42' : '#E8EDF4',
        modalBg: isDark ? '#151F32' : '#FFFFFF',
        overlay: 'rgba(11, 17, 32, 0.85)',
        danger: '#EF4444',
        sectionBg: isDark ? '#0B1120' : '#E8EDF4',
    };

    // Check if in "Browse All" mode
    const isBrowseAllMode = searchQuery.toLowerCase().trim() === 'all';

    // Enhanced filtering: match by name OR category
    const filteredSuggestions = React.useMemo(() => {
        if (isBrowseAllMode) return suggestions;

        const query = searchQuery.toLowerCase().trim();
        if (!query) return [];

        // Filter items that match by name OR category
        const matches = suggestions.filter((s) =>
            s.name.toLowerCase().includes(query) ||
            s.category.toLowerCase().includes(query)
        );

        // Sort: name matches first, then category matches
        return matches.sort((a, b) => {
            const aNameMatch = a.name.toLowerCase().includes(query);
            const bNameMatch = b.name.toLowerCase().includes(query);

            // Name matches come before category-only matches
            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;

            // Within same match type, sort alphabetically
            return a.name.localeCompare(b.name);
        });
    }, [suggestions, searchQuery, isBrowseAllMode]);

    // Group suggestions by category for SectionList
    const groupedSuggestions = React.useMemo(() => {
        if (!isBrowseAllMode) return [];

        const groups: Record<string, Suggestion[]> = {};
        suggestions.forEach((s) => {
            if (!groups[s.category]) {
                groups[s.category] = [];
            }
            groups[s.category].push(s);
        });

        // Sort into sections by category order
        return CATEGORY_ORDER.filter((cat) => groups[cat]?.length > 0).map((category) => ({
            title: category,
            data: groups[category].sort((a, b) => a.name.localeCompare(b.name)),
        }));
    }, [suggestions, isBrowseAllMode]);

    // Regular add - now also keeps search open for continuous adding
    const handleAddItem = (suggestion: Suggestion) => {
        addItem({
            name: suggestion.name,
            emoji: suggestion.emoji,
            category: suggestion.category,
            quantity: 1,
            unit: 'adet',
        });

        // Show visual feedback (same as bulk mode)
        setRecentlyAdded((prev) => new Set(prev).add(suggestion.name));
        setTimeout(() => {
            setRecentlyAdded((prev) => {
                const next = new Set(prev);
                next.delete(suggestion.name);
                return next;
            });
        }, 1500);
        // Note: We no longer clear searchQuery here to enable bulk adding
    };

    // Bulk add for Browse All mode (keeps search, shows feedback)
    const handleBulkAddItem = (suggestion: Suggestion) => {
        addItem({
            name: suggestion.name,
            emoji: suggestion.emoji,
            category: suggestion.category,
            quantity: 1,
            unit: 'adet',
        });

        // Show visual feedback
        setRecentlyAdded((prev) => new Set(prev).add(suggestion.name));
        setTimeout(() => {
            setRecentlyAdded((prev) => {
                const next = new Set(prev);
                next.delete(suggestion.name);
                return next;
            });
        }, 1500);
    };

    const handleAddCustomItem = (category: string) => {
        const trimmedQuery = searchQuery.trim();
        if (!trimmedQuery) return;

        // 1. Add to grocery list with category-specific emoji
        addItem({
            name: trimmedQuery,
            emoji: getEmojiForCategory(category),
            category,
            quantity: 1,
            unit: 'adet',
        });

        // 2. Add to catalog (auto-learn)
        addNewCatalogItem(trimmedQuery, category);

        // 3. Clear input and close modal
        setSearchQuery('');
        setShowCategoryModal(false);

        // 4. Show success feedback
        Alert.alert('✅ Eklendi!', `"${trimmedQuery}" listenize eklendi.`);
    };

    const handleDeleteItem = (suggestion: Suggestion) => {
        Alert.alert(
            'Ürünü Sil',
            `'${suggestion.name}' katalogdan silinsin mi? Bu işlem geri alınamaz.`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: () => deleteCatalogItem(suggestion.name),
                },
            ]
        );
    };

    // Render a single suggestion item
    const renderSuggestionItem = (suggestion: Suggestion, isBulkMode: boolean) => {
        const isAdded = recentlyAdded.has(suggestion.name);
        const alreadyInList = isAlreadyInList(suggestion.name);

        const handlePress = () => {
            if (alreadyInList) {
                // Item already in list - show toast instead of adding
                Alert.alert('', 'Bu ürün zaten listenizde');
                return;
            }
            // Always use handleAddItem (which now has bulk behavior)
            handleAddItem(suggestion);
        };

        return (
            <TouchableOpacity
                key={suggestion.name}
                onPress={handlePress}
                onLongPress={() => handleDeleteItem(suggestion)}
                delayLongPress={500}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    marginHorizontal: 16,
                    backgroundColor: isAdded ? colors.primaryDark : colors.card,
                    borderRadius: 16,
                    marginBottom: 10,
                    opacity: alreadyInList ? 0.5 : 1,
                    // Shadow for depth
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    elevation: 2,
                }}
            >
                <Text style={{ fontSize: 28, marginRight: 14 }}>
                    {alreadyInList ? '✓' : isAdded ? '✓' : suggestion.emoji}
                </Text>
                <View style={{ flex: 1 }}>
                    <Text
                        style={{
                            fontSize: 16,
                            fontWeight: '500',
                            color: isAdded ? '#FFFFFF' : colors.text,
                        }}
                    >
                        {suggestion.name}
                    </Text>
                    {alreadyInList && (
                        <Text
                            style={{
                                fontSize: 12,
                                color: colors.primary,
                                marginTop: 2,
                            }}
                        >
                            Listede Var
                        </Text>
                    )}
                </View>
                {(isAdded || alreadyInList) && !alreadyInList && (
                    <Check size={20} color="#FFFFFF" />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    position: 'relative',
                }}
            >
                <TouchableOpacity style={{ position: 'absolute', left: 16 }}>
                    <ChevronLeft size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={{ fontSize: 17, fontWeight: '600', color: colors.primary }}>
                    Bizim Market
                </Text>
                <TouchableOpacity style={{ position: 'absolute', right: 16 }}>
                    <MoreHorizontal size={24} color={colors.textMuted} />
                </TouchableOpacity>
            </View>

            {/* Page Title */}
            <Text
                style={{
                    fontSize: 28,
                    fontWeight: 'bold',
                    color: colors.text,
                    paddingHorizontal: 16,
                    paddingTop: 8,
                    paddingBottom: 16,
                }}
            >
                Ürün Ekle
            </Text>

            {/* Search Input */}
            <View
                style={{
                    marginHorizontal: 16,
                    marginBottom: 16,
                    backgroundColor: colors.inputBg,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                }}
            >
                <Search size={20} color={colors.textMuted} />
                <TextInput
                    style={{
                        flex: 1,
                        paddingVertical: 14,
                        paddingHorizontal: 10,
                        fontSize: 16,
                        color: colors.text,
                    }}
                    placeholder='Ürün ara...'
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <X size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Browse All Mode - SectionList */}
            {isBrowseAllMode && (
                <>
                    <View
                        style={{
                            paddingHorizontal: 16,
                            paddingBottom: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                            📋 Tüm Katalog
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.textMuted }}>
                            Uzun basarak silin
                        </Text>
                    </View>
                    <SectionList
                        sections={groupedSuggestions}
                        keyExtractor={(item) => item.name}
                        renderItem={({ item }) => renderSuggestionItem(item, true)}
                        renderSectionHeader={({ section: { title } }) => (
                            <View
                                style={{
                                    backgroundColor: colors.sectionBg,
                                    paddingVertical: 8,
                                    paddingHorizontal: 16,
                                    marginTop: 8,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: '600',
                                        color: colors.textSecondary,
                                    }}
                                >
                                    {getEmojiForCategory(title)} {title}
                                </Text>
                            </View>
                        )}
                        stickySectionHeadersEnabled
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                    />
                </>
            )}

            {/* Regular Search Mode */}
            {!isBrowseAllMode && (
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    {/* Suggestions Section */}
                    {searchQuery.length > 0 && (
                        <>
                            <View
                                style={{
                                    paddingHorizontal: 16,
                                    paddingBottom: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Text
                                    style={{ fontSize: 16, fontWeight: '600', color: colors.text }}
                                >
                                    Öneriler
                                </Text>
                                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                                    Uzun basarak silin
                                </Text>
                            </View>

                            {filteredSuggestions.map((suggestion) =>
                                renderSuggestionItem(suggestion, false)
                            )}

                            {/* Add Custom Item Button - show unless exact match exists */}
                            {!filteredSuggestions.some(
                                (s) => s.name.toLowerCase() === searchQuery.trim().toLowerCase()
                            ) && (
                                    <View
                                        style={{
                                            paddingVertical: 16,
                                            alignItems: 'center',
                                            paddingHorizontal: 16,
                                            marginTop: filteredSuggestions.length > 0 ? 8 : 0,
                                            borderTopWidth: filteredSuggestions.length > 0 ? 1 : 0,
                                            borderTopColor: colors.border,
                                        }}
                                    >
                                        {filteredSuggestions.length === 0 && (
                                            <Text
                                                style={{
                                                    fontSize: 14,
                                                    color: colors.textMuted,
                                                    marginBottom: 12,
                                                }}
                                            >
                                                Öneri bulunamadı
                                            </Text>
                                        )}
                                        {filteredSuggestions.length > 0 && (
                                            <Text
                                                style={{
                                                    fontSize: 13,
                                                    color: colors.textMuted,
                                                    marginBottom: 10,
                                                }}
                                            >
                                                veya yeni ürün ekle
                                            </Text>
                                        )}
                                        <TouchableOpacity
                                            onPress={() => setShowCategoryModal(true)}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                backgroundColor: colors.primary,
                                                paddingVertical: 14,
                                                paddingHorizontal: 24,
                                                borderRadius: 12,
                                                gap: 8,
                                            }}
                                        >
                                            <Plus size={20} color={isDark ? '#0B1120' : '#FFC107'} strokeWidth={2.5} />
                                            <Text
                                                style={{
                                                    fontSize: 16,
                                                    fontWeight: '600',
                                                    color: isDark ? '#0B1120' : '#FFC107',
                                                }}
                                            >
                                                "{searchQuery.trim()}" Ekle
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                        </>
                    )}

                    {/* Empty state when no search */}
                    {searchQuery.length === 0 && (
                        <View
                            style={{
                                paddingVertical: 60,
                                alignItems: 'center',
                            }}
                        >
                            <Search
                                size={48}
                                color={colors.textMuted}
                                style={{ marginBottom: 16 }}
                            />
                            <Text
                                style={{
                                    fontSize: 16,
                                    color: colors.textMuted,
                                    textAlign: 'center',
                                    paddingHorizontal: 32,
                                }}
                            >
                                Ürün arayın veya "all" yazarak tüm kataloğu görüntüleyin
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Category Selection Modal */}
            <Modal
                visible={showCategoryModal}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    setShowCategoryModal(false);
                    setShowCreateForm(false);
                }}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: colors.overlay,
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 24,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 340,
                            backgroundColor: colors.modalBg,
                            borderRadius: 20,
                            overflow: 'hidden',
                        }}
                    >
                        {/* Modal Header */}
                        <View
                            style={{
                                padding: 20,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border,
                                alignItems: 'center',
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 18,
                                    fontWeight: '600',
                                    color: colors.text,
                                }}
                            >
                                {showCreateForm ? 'Yeni Kategori' : 'Kategori Seçin'}
                            </Text>
                            {!showCreateForm && (
                                <Text
                                    style={{
                                        fontSize: 14,
                                        color: colors.textMuted,
                                        marginTop: 4,
                                    }}
                                >
                                    "{searchQuery}" için kategori
                                </Text>
                            )}
                        </View>

                        {/* Category List View */}
                        {!showCreateForm && (
                            <>
                                <ScrollView style={{ maxHeight: 280 }}>
                                    {allCategories.map((category: { name: string; emoji: string }, index: number) => (
                                        <TouchableOpacity
                                            key={`${category.name}-${index}`}
                                            onPress={() => handleAddCustomItem(category.name)}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                paddingVertical: 14,
                                                paddingHorizontal: 20,
                                                borderBottomWidth: 1,
                                                borderBottomColor: colors.border,
                                            }}
                                        >
                                            <Text style={{ fontSize: 24, marginRight: 12 }}>
                                                {category.emoji}
                                            </Text>
                                            <Text
                                                style={{
                                                    fontSize: 16,
                                                    color: colors.text,
                                                    flex: 1,
                                                }}
                                            >
                                                {category.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {/* Create New Category Button */}
                                <TouchableOpacity
                                    onPress={() => setShowCreateForm(true)}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        paddingVertical: 14,
                                        paddingHorizontal: 20,
                                        backgroundColor: colors.primary,
                                        gap: 8,
                                    }}
                                >
                                    <Plus size={20} color={isDark ? '#0B1120' : '#FFC107'} strokeWidth={2.5} />
                                    <Text
                                        style={{
                                            fontSize: 16,
                                            fontWeight: '600',
                                            color: isDark ? '#0B1120' : '#FFC107',
                                        }}
                                    >
                                        Yeni Kategori Oluştur
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* Create Category Form View */}
                        {showCreateForm && (
                            <View style={{ padding: 20 }}>
                                {/* Category Name Input */}
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: '600',
                                        color: colors.textSecondary,
                                        marginBottom: 8,
                                    }}
                                >
                                    Kategori Adı
                                </Text>
                                <TextInput
                                    style={{
                                        backgroundColor: colors.inputBg,
                                        borderRadius: 10,
                                        paddingVertical: 12,
                                        paddingHorizontal: 16,
                                        fontSize: 16,
                                        color: colors.text,
                                        marginBottom: 16,
                                    }}
                                    placeholder="örn: Soslar"
                                    placeholderTextColor={colors.textMuted}
                                    value={newCategoryName}
                                    onChangeText={setNewCategoryName}
                                    autoFocus
                                />

                                {/* Emoji Input */}
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: '600',
                                        color: colors.textSecondary,
                                        marginBottom: 8,
                                    }}
                                >
                                    Emoji
                                </Text>
                                <TextInput
                                    style={{
                                        backgroundColor: colors.inputBg,
                                        borderRadius: 10,
                                        paddingVertical: 12,
                                        paddingHorizontal: 16,
                                        fontSize: 24,
                                        color: colors.text,
                                        marginBottom: 20,
                                        textAlign: 'center',
                                    }}
                                    placeholder="🏷️"
                                    placeholderTextColor={colors.textMuted}
                                    value={newCategoryEmoji}
                                    onChangeText={(text) => setNewCategoryEmoji(text.slice(0, 2))}
                                    maxLength={2}
                                />

                                {/* Save Button */}
                                <TouchableOpacity
                                    onPress={() => {
                                        if (!newCategoryName.trim()) {
                                            Alert.alert('Hata', 'Kategori adı gerekli');
                                            return;
                                        }
                                        // Add the custom category
                                        addCustomCategory(newCategoryName, newCategoryEmoji || '🏷️');
                                        // Select it immediately
                                        handleAddCustomItem(newCategoryName.trim());
                                        // Reset form
                                        setNewCategoryName('');
                                        setNewCategoryEmoji('');
                                        setShowCreateForm(false);
                                    }}
                                    style={{
                                        backgroundColor: colors.primary,
                                        paddingVertical: 14,
                                        borderRadius: 12,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 16,
                                            fontWeight: '600',
                                            color: isDark ? '#0B1120' : '#FFC107',
                                        }}
                                    >
                                        Kaydet ve Seç
                                    </Text>
                                </TouchableOpacity>

                                {/* Back Button */}
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowCreateForm(false);
                                        setNewCategoryName('');
                                        setNewCategoryEmoji('');
                                    }}
                                    style={{
                                        paddingVertical: 12,
                                        alignItems: 'center',
                                        marginTop: 8,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            color: colors.textMuted,
                                        }}
                                    >
                                        ← Geri Dön
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Cancel Button (only when not in create form) */}
                        {!showCreateForm && (
                            <TouchableOpacity
                                onPress={() => setShowCategoryModal(false)}
                                style={{
                                    padding: 16,
                                    borderTopWidth: 1,
                                    borderTopColor: colors.border,
                                    alignItems: 'center',
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 16,
                                        fontWeight: '600',
                                        color: colors.textMuted,
                                    }}
                                >
                                    İptal
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
