import { StatisticsData, useGroceryStore } from '@/store/useGroceryStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useFocusEffect } from 'expo-router';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G, Path } from 'react-native-svg';

// Turkish month names
const TURKISH_MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export default function StatisticsScreen() {
    const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
    const isDark = resolvedTheme === 'dark';
    const fetchStatistics = useGroceryStore((state) => state.fetchStatistics);

    // State for current date (month/year selection)
    const [currentDate, setCurrentDate] = useState(new Date());
    const [statistics, setStatistics] = useState<StatisticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const colors = {
        // Midnight Gold (Dark) / Navy Accent (Light) Theme
        background: isDark ? '#0B1120' : '#F0F4F8',
        card: isDark ? '#151F32' : '#FFFFFF',
        surface: isDark ? '#1C2A42' : '#E8EDF4',
        text: isDark ? '#FFFFFF' : '#0B1120',
        textSecondary: isDark ? '#64748B' : '#475569',
        textMuted: isDark ? '#475569' : '#64748B',
        primary: isDark ? '#FFC107' : '#0B1120',  // Yellow (dark) / Navy (light)
        border: isDark ? '#1E293B' : '#D1D9E6',
    };

    // Get start and end of month for date range
    const getMonthRange = useCallback((date: Date) => {
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
        return { startDate, endDate };
    }, []);

    // Format month display
    const formatMonth = useCallback((date: Date) => {
        const month = TURKISH_MONTHS[date.getMonth()];
        const year = date.getFullYear();
        return `${month} ${year}`;
    }, []);

    // Check if we can go to next month (not future)
    const canGoNext = useMemo(() => {
        const now = new Date();
        return currentDate.getFullYear() < now.getFullYear() ||
            (currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() < now.getMonth());
    }, [currentDate]);

    // Navigate to previous month
    const goToPreviousMonth = useCallback(() => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }, []);

    // Navigate to next month
    const goToNextMonth = useCallback(() => {
        if (canGoNext) {
            setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
        }
    }, [canGoNext]);

    // Load statistics function - extracted for reuse
    const loadStatistics = useCallback(async () => {
        setIsLoading(true);
        try {
            const { startDate, endDate } = getMonthRange(currentDate);
            const data = await fetchStatistics(startDate, endDate);
            setStatistics(data);
        } catch (error) {
            console.error('Error loading statistics:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentDate, fetchStatistics, getMonthRange]);

    // Auto-refresh when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadStatistics();
        }, [loadStatistics])
    );

    // Pie chart calculations
    const size = 180;
    const center = size / 2;
    const radius = 70;

    const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
        const rad = (angle - 90) * (Math.PI / 180);
        return {
            x: cx + r * Math.cos(rad),
            y: cy + r * Math.sin(rad),
        };
    };

    const createPieSlice = (startAngle: number, endAngle: number, color: string) => {
        const start = polarToCartesian(center, center, radius, endAngle);
        const end = polarToCartesian(center, center, radius, startAngle);
        const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
        return `M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
    };

    // Generate pie chart slices from statistics
    const slices = useMemo(() => {
        if (!statistics || statistics.categoryData.length === 0) return [];

        let currentAngle = 0;
        return statistics.categoryData.map((item) => {
            const startAngle = currentAngle;
            const endAngle = currentAngle + (item.percentage / 100) * 360;
            currentAngle = endAngle;
            return {
                ...item,
                path: createPieSlice(startAngle, endAngle, item.color),
            };
        });
    }, [statistics]);

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

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
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
                    İstatistikler
                </Text>

                {/* Month Selector */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 12,
                        marginHorizontal: 16,
                        backgroundColor: colors.card,
                        borderRadius: 12,
                        marginBottom: 24,
                    }}
                >
                    <TouchableOpacity
                        style={{ padding: 8 }}
                        onPress={goToPreviousMonth}
                    >
                        <ChevronLeft size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <Text
                        style={{
                            fontSize: 15,
                            fontWeight: '500',
                            color: colors.text,
                            marginHorizontal: 20,
                        }}
                    >
                        {formatMonth(currentDate)} Raporu
                    </Text>
                    <TouchableOpacity
                        style={{ padding: 8, opacity: canGoNext ? 1 : 0.3 }}
                        onPress={goToNextMonth}
                        disabled={!canGoNext}
                    >
                        <ChevronRight size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Loading State */}
                {isLoading && (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
                            Yükleniyor...
                        </Text>
                    </View>
                )}

                {/* Empty State */}
                {!isLoading && (!statistics || statistics.totalPurchases === 0) && (
                    <View
                        style={{
                            backgroundColor: colors.card,
                            borderRadius: 16,
                            marginHorizontal: 16,
                            padding: 40,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ fontSize: 48, marginBottom: 16 }}>📊</Text>
                        <Text
                            style={{
                                fontSize: 18,
                                fontWeight: '600',
                                color: colors.text,
                                marginBottom: 8,
                                textAlign: 'center',
                            }}
                        >
                            Bu ay için veri yok
                        </Text>
                        <Text
                            style={{
                                fontSize: 14,
                                color: colors.textSecondary,
                                textAlign: 'center',
                            }}
                        >
                            Alışveriş listesinden ürün aldıkça{'\n'}istatistikler burada görünecek.
                        </Text>
                    </View>
                )}

                {/* Pie Chart Section */}
                {!isLoading && statistics && statistics.totalPurchases > 0 && (
                    <>
                        <View
                            style={{
                                backgroundColor: colors.card,
                                borderRadius: 16,
                                marginHorizontal: 16,
                                padding: 20,
                                marginBottom: 24,
                                // Shadow for premium depth
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.2,
                                shadowRadius: 8,
                                elevation: 4,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 18,
                                    fontWeight: '600',
                                    color: colors.text,
                                    marginBottom: 20,
                                }}
                            >
                                Kategori Dağılımı
                            </Text>

                            {/* Pie Chart */}
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <Svg width={size} height={size}>
                                    <G>
                                        {slices.map((slice, index) => (
                                            <Path key={index} d={slice.path} fill={slice.color} />
                                        ))}
                                    </G>
                                </Svg>
                            </View>

                            {/* Legend - 2 Column Grid */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    justifyContent: 'space-between',
                                    paddingHorizontal: 8,
                                }}
                            >
                                {statistics.categoryData.map((item, index) => (
                                    <View
                                        key={index}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            width: '48%',
                                            paddingVertical: 8,
                                            paddingHorizontal: 12,
                                            backgroundColor: colors.surface,
                                            borderRadius: 10,
                                            marginBottom: 8,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 14,
                                                height: 14,
                                                borderRadius: 7,
                                                backgroundColor: item.color,
                                                marginRight: 10,
                                            }}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={{
                                                    fontSize: 13,
                                                    color: colors.textSecondary,
                                                }}
                                                numberOfLines={1}
                                            >
                                                {item.label}
                                            </Text>
                                        </View>
                                        <Text
                                            style={{
                                                fontSize: 14,
                                                fontWeight: '700',
                                                color: colors.text,
                                            }}
                                        >
                                            {item.percentage}%
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {/* Total purchases count */}
                            <View
                                style={{
                                    marginTop: 16,
                                    paddingTop: 16,
                                    borderTopWidth: 1,
                                    borderTopColor: colors.border,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                                    Toplam {statistics.totalPurchases} ürün alındı
                                </Text>
                            </View>
                        </View>

                        {/* Top Items Section */}
                        <View
                            style={{
                                backgroundColor: colors.card,
                                borderRadius: 16,
                                marginHorizontal: 16,
                                marginBottom: 32,
                                overflow: 'hidden',
                                // Shadow for premium depth
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.2,
                                shadowRadius: 8,
                                elevation: 4,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 18,
                                    fontWeight: '600',
                                    color: colors.text,
                                    padding: 16,
                                    paddingBottom: 8,
                                }}
                            >
                                En Çok Alınanlar
                            </Text>

                            {statistics.topItems.length === 0 ? (
                                <Text
                                    style={{
                                        padding: 16,
                                        color: colors.textSecondary,
                                        textAlign: 'center',
                                    }}
                                >
                                    Henüz veri yok
                                </Text>
                            ) : (
                                statistics.topItems.map((item, index) => (
                                    <View
                                        key={index}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 14,
                                            paddingHorizontal: 16,
                                            borderTopWidth: index > 0 ? 1 : 0,
                                            borderTopColor: colors.border,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 16,
                                                fontWeight: '600',
                                                color: colors.text,
                                                marginRight: 12,
                                                width: 24,
                                            }}
                                        >
                                            {item.rank}.
                                        </Text>
                                        <Text style={{ fontSize: 20, marginRight: 8 }}>{item.emoji}</Text>
                                        <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>
                                            {item.name}
                                        </Text>
                                        <Text
                                            style={{
                                                fontSize: 16,
                                                fontWeight: '600',
                                                color: colors.primary,
                                            }}
                                        >
                                            x{item.count}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
