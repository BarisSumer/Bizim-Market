import { useAuthStore } from '@/store/useAuthStore';
import { GroceryItem, useGroceryStore } from '@/store/useGroceryStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useRouter } from 'expo-router';
import { Check, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Category order for display
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
  'Diğer',
];

interface GrocerySection {
  title: string;
  data: GroceryItem[];
}

// Aggregated bought item type
interface AggregatedBoughtItem {
  name: string;
  emoji: string;
  category: string;
  count: number;
  ids: string[]; // Track all IDs for this grouped item
}

export default function DashboardScreen() {
  const router = useRouter();
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const { profile, familyMembers, fetchFamilyMembers } = useAuthStore();
  const { items, toggleItem, fetchItems, fetchSuggestions, subscribeToChanges, unsubscribe, clearBoughtItems } = useGroceryStore();
  const isDark = resolvedTheme === 'dark';

  // State for bought items section collapse
  const [isBoughtSectionExpanded, setIsBoughtSectionExpanded] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    fetchItems();
    fetchSuggestions();
    fetchFamilyMembers();
    subscribeToChanges();

    return () => {
      unsubscribe();
    };
  }, [profile?.family_id]);

  // Avatar gradient colors for family members
  const avatarGradients = [
    '#6366F1', // Indigo
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#10B981', // Emerald
  ];

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
    checkboxBorder: isDark ? '#475569' : '#CBD5E1',
    sectionBg: isDark ? '#0B1120' : '#E8EDF4',
    danger: '#EF4444',
  };

  // Handle avatar tap to show member name
  const handleAvatarPress = (member: { id: string; full_name: string | null; email: string }) => {
    const displayName = member.full_name || member.email.split('@')[0];
    const isCurrentUser = member.id === profile?.id;
    Alert.alert(
      isCurrentUser ? '👤 Sen' : '👥 Aile Üyesi',
      displayName
    );
  };

  // Get initials for avatar fallback
  const getInitials = (name: string | null, email: string) => {
    const displayName = name || email.split('@')[0];
    return displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Separate active and bought items
  const { activeItems, boughtItems } = useMemo(() => {
    const active = items.filter((item) => !item.isBought);
    const bought = items.filter((item) => item.isBought);
    return { activeItems: active, boughtItems: bought };
  }, [items]);

  // Aggregate bought items by name
  const aggregatedBoughtItems = useMemo((): AggregatedBoughtItem[] => {
    const grouped: Record<string, AggregatedBoughtItem> = {};

    boughtItems.forEach((item) => {
      const key = item.name.toLowerCase();
      if (grouped[key]) {
        grouped[key].count += 1;
        grouped[key].ids.push(item.id);
      } else {
        grouped[key] = {
          name: item.name,
          emoji: item.emoji,
          category: item.category,
          count: 1,
          ids: [item.id],
        };
      }
    });

    // Sort by name
    return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
  }, [boughtItems]);

  // Group active items by category into sections (no bought items here)
  const groupedSections = useMemo((): GrocerySection[] => {
    // Group active items by category
    const categoryGroups: Record<string, GroceryItem[]> = {};
    activeItems.forEach((item) => {
      const category = item.category || 'Diğer';
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(item);
    });

    // Sort items within each category alphabetically
    Object.keys(categoryGroups).forEach((cat) => {
      categoryGroups[cat].sort((a, b) => a.name.localeCompare(b.name));
    });

    // Build sections in category order
    const sections: GrocerySection[] = CATEGORY_ORDER
      .filter((cat) => categoryGroups[cat]?.length > 0)
      .map((category) => ({
        title: category,
        data: categoryGroups[category],
      }));

    // Add any remaining categories not in our predefined order
    Object.keys(categoryGroups).forEach((cat) => {
      if (!CATEGORY_ORDER.includes(cat)) {
        sections.push({
          title: cat,
          data: categoryGroups[cat],
        });
      }
    });

    return sections;
  }, [activeItems]);

  const handleToggleItem = (id: string) => {
    toggleItem(id);
  };

  const handleClearBoughtItems = () => {
    Alert.alert(
      'Alınanları Temizle',
      'Tüm satın alınan ürünler listeden kaldırılacak. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: () => clearBoughtItems(),
        },
      ]
    );
  };

  // Uncheck one instance of an aggregated bought item
  const handleUncheckBoughtItem = (aggregatedItem: AggregatedBoughtItem) => {
    // Toggle the first ID (uncheck one instance)
    if (aggregatedItem.ids.length > 0) {
      toggleItem(aggregatedItem.ids[0]);
    }
  };

  const GroceryItemRow = ({ item }: { item: GroceryItem }) => {
    const opacity = item.isBought ? 0.6 : 1;

    return (
      <TouchableOpacity
        onPress={() => handleToggleItem(item.id)}
        style={[
          styles.itemRow,
          {
            backgroundColor: colors.card,
            opacity,
          },
        ]}
      >
        {/* Checkbox */}
        <View
          style={[
            styles.checkbox,
            {
              borderColor: item.isBought ? colors.primary : colors.checkboxBorder,
              backgroundColor: item.isBought ? colors.primary : 'transparent',
            },
          ]}
        >
          {item.isBought && <Check size={16} color="#000000" strokeWidth={3} />}
        </View>

        {/* Item Content - Simple: Name + Emoji + Category */}
        <View style={styles.itemContent}>
          <View style={styles.itemNameRow}>
            <Text
              style={[
                styles.itemName,
                {
                  color: colors.text,
                  textDecorationLine: item.isBought ? 'line-through' : 'none',
                },
              ]}
            >
              {item.name}
            </Text>
            <Text style={styles.itemEmoji}>{item.emoji}</Text>
          </View>
          <Text style={[styles.itemCategory, { color: colors.textMuted }]}>
            {item.category}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render section header - UPPERCASE golden headers
  const renderSectionHeader = ({ section }: { section: GrocerySection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.sectionBg }]}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>
        {section.title.toUpperCase()}
      </Text>
      <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
        {section.data.length} ürün
      </Text>
    </View>
  );

  // Render bought items footer component
  const renderBoughtItemsFooter = () => {
    if (boughtItems.length === 0) return null;

    return (
      <View style={[styles.boughtSection, { backgroundColor: colors.card }]}>
        {/* Collapsible Header */}
        <TouchableOpacity
          onPress={() => setIsBoughtSectionExpanded(!isBoughtSectionExpanded)}
          style={[styles.boughtHeader, { borderBottomColor: colors.border }]}
        >
          <View style={styles.boughtHeaderLeft}>
            {isBoughtSectionExpanded ? (
              <ChevronUp size={20} color={colors.textSecondary} />
            ) : (
              <ChevronDown size={20} color={colors.textSecondary} />
            )}
            <Text style={[styles.boughtHeaderTitle, { color: colors.text }]}>
              Satın Alınanlar ({boughtItems.length})
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleClearBoughtItems}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={18} color={colors.danger} />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Collapsible Content */}
        {isBoughtSectionExpanded && (
          <View style={styles.boughtContent}>
            {aggregatedBoughtItems.map((item) => (
              <TouchableOpacity
                key={item.name}
                onPress={() => handleUncheckBoughtItem(item)}
                style={[styles.boughtItemRow, { borderBottomColor: colors.border }]}
              >
                <View style={styles.boughtItemLeft}>
                  <Text style={[styles.boughtItemName, { color: colors.textMuted }]}>
                    {item.name}
                  </Text>
                  <Text style={styles.boughtItemEmoji}>{item.emoji}</Text>
                </View>
                {item.count > 1 ? (
                  <Text style={[styles.boughtItemCount, { color: colors.primary }]}>
                    x{item.count}
                  </Text>
                ) : (
                  <Check size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            <Text style={[styles.boughtHint, { color: colors.textMuted }]}>
              Listeye geri eklemek için dokunun
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Section (not in SectionList to keep it fixed) */}
      <View style={styles.headerSection}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>
            Ev İhtiyaçları
          </Text>
          <Text style={styles.titleEmoji}>🏠</Text>
        </View>

        {/* Family Avatars */}
        <View style={styles.avatarRow}>
          {familyMembers.slice(0, 5).map((member, index) => {
            const isCurrentUser = member.id === profile?.id;
            const hasAvatar = !!member.avatar_url;
            const initials = getInitials(member.full_name, member.email);

            return (
              <TouchableOpacity
                key={member.id}
                onPress={() => handleAvatarPress(member)}
                style={[
                  styles.avatarContainer,
                  {
                    marginLeft: index > 0 ? -10 : 0,
                    borderColor: isCurrentUser ? colors.primary : colors.background,
                    borderWidth: isCurrentUser ? 3 : 2,
                  },
                ]}
              >
                {hasAvatar ? (
                  <Image
                    source={{ uri: member.avatar_url! }}
                    style={[
                      styles.avatar,
                      { borderColor: isCurrentUser ? colors.primary : colors.border }
                    ]}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      styles.avatarFallback,
                      {
                        backgroundColor: isCurrentUser
                          ? colors.primary
                          : avatarGradients[index % avatarGradients.length],
                        borderColor: isCurrentUser ? colors.primary : colors.border,
                      }
                    ]}
                  >
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          {familyMembers.length > 5 && (
            <View
              style={[
                styles.avatarContainer,
                { marginLeft: -10, borderColor: colors.background }
              ]}
            >
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.textMuted }]}>
                <Text style={styles.avatarInitials}>+{familyMembers.length - 5}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Item count summary */}
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryText, { color: colors.textMuted }]}>
            {activeItems.length} bekleyen • {boughtItems.length} alındı
          </Text>
        </View>
      </View>

      {/* Categorized Grocery List */}
      <SectionList
        sections={groupedSections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GroceryItemRow item={item} />}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={renderBoughtItemsFooter}
        ListEmptyComponent={
          boughtItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Listeniz boş
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                "+" butonuna tıklayarak ürün ekleyin
              </Text>
            </View>
          ) : null
        }
      />

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.background }]}>
        {/* FAB Button - Inverted colors per theme */}
        <TouchableOpacity
          onPress={() => router.push('/add')}
          style={[styles.fab, { backgroundColor: colors.primary }]}
        >
          <Plus size={28} color={isDark ? '#0B1120' : '#FFC107'} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  titleEmoji: {
    fontSize: 28,
    marginLeft: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    borderWidth: 3,
    borderRadius: 22,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryRow: {
    marginTop: 12,
  },
  summaryText: {
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 120,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionCount: {
    fontSize: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 5,
    borderRadius: 16,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,  // Full circle for circular checkbox
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemContent: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemEmoji: {
    fontSize: 16,
    marginLeft: 8,
  },
  itemCategory: {
    fontSize: 11,
    marginTop: 1,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
  // Bought items section styles
  boughtSection: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  boughtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  boughtHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boughtHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  clearButton: {
    padding: 4,
  },
  boughtContent: {
    paddingBottom: 8,
  },
  boughtItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  boughtItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  boughtItemName: {
    fontSize: 15,
    textDecorationLine: 'line-through',
  },
  boughtItemEmoji: {
    fontSize: 15,
    marginLeft: 8,
  },
  boughtItemCount: {
    fontSize: 15,
    fontWeight: '700',
  },
  boughtHint: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
  // Bottom bar styles
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingTop: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
      },
    }),
  },
});
