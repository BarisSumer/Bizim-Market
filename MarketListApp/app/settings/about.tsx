import { useThemeStore } from '@/store/useThemeStore';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ChevronLeft, ExternalLink, FileText, Heart, Shield } from 'lucide-react-native';
import React from 'react';
import { Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AboutScreen() {
    const { resolvedTheme } = useThemeStore();
    const isDark = resolvedTheme === 'dark';

    const appVersion = Constants.expoConfig?.version ?? '1.0.0';

    const colors = {
        // Navy Blue & Yellow Theme
        background: isDark ? '#0A0F24' : '#F0F4F8',
        card: isDark ? '#141E3F' : '#FFFFFF',
        text: isDark ? '#EAEFF5' : '#0A0F24',
        textSecondary: isDark ? '#8A96B8' : '#4A5578',
        textMuted: isDark ? '#5C6A8A' : '#8A96B8',
        primary: '#FEE500',
        border: isDark ? '#232D53' : '#D1D9E6',
    };

    const handlePrivacyPress = () => {
        Linking.openURL('https://google.com'); // Placeholder
    };

    const handleTermsPress = () => {
        Linking.openURL('https://google.com'); // Placeholder
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                }}
            >
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
                    <ChevronLeft size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>
                    Hakkında
                </Text>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ alignItems: 'center', paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
            >
                {/* App Logo */}
                <View
                    style={{
                        width: 100,
                        height: 100,
                        borderRadius: 24,
                        backgroundColor: colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 32,
                        marginBottom: 16,
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 16,
                        elevation: 8,
                    }}
                >
                    <Text style={{ fontSize: 48 }}>🛒</Text>
                </View>

                {/* App Name */}
                <Text
                    style={{
                        fontSize: 28,
                        fontWeight: 'bold',
                        color: colors.text,
                        marginBottom: 4,
                    }}
                >
                    Bizim Market
                </Text>

                {/* Version */}
                <Text
                    style={{
                        fontSize: 14,
                        color: colors.textMuted,
                        marginBottom: 24,
                    }}
                >
                    Sürüm {appVersion}
                </Text>

                {/* Description */}
                <Text
                    style={{
                        fontSize: 15,
                        color: colors.textSecondary,
                        textAlign: 'center',
                        paddingHorizontal: 32,
                        lineHeight: 22,
                        marginBottom: 32,
                    }}
                >
                    Ailenizle birlikte market listenizi yönetin. Anlık senkronizasyon ile herkes aynı sayfada!
                </Text>

                {/* Developer Info */}
                <View
                    style={{
                        backgroundColor: colors.card,
                        borderRadius: 16,
                        marginHorizontal: 16,
                        paddingVertical: 20,
                        paddingHorizontal: 24,
                        alignItems: 'center',
                        width: '90%',
                        marginBottom: 24,
                    }}
                >
                    <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 8 }}>
                        Geliştirici
                    </Text>
                    <Text
                        style={{
                            fontSize: 16,
                            fontWeight: '600',
                            color: colors.text,
                            marginBottom: 16,
                        }}
                    >
                        Bizim Market Team
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                            Made with
                        </Text>
                        <Heart size={16} color="#EF4444" fill="#EF4444" style={{ marginHorizontal: 4 }} />
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                            in Türkiye
                        </Text>
                    </View>
                </View>

                {/* Legal Links Section Header */}
                <Text
                    style={{
                        fontSize: 13,
                        fontWeight: '500',
                        color: colors.textMuted,
                        paddingTop: 8,
                        paddingBottom: 8,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        alignSelf: 'flex-start',
                        paddingHorizontal: 24,
                    }}
                >
                    Yasal
                </Text>

                {/* Legal Links */}
                <View
                    style={{
                        backgroundColor: colors.card,
                        borderRadius: 16,
                        marginHorizontal: 16,
                        overflow: 'hidden',
                        width: '90%',
                    }}
                >
                    <TouchableOpacity
                        onPress={handlePrivacyPress}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                        }}
                    >
                        <Shield size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
                        <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>
                            Gizlilik Politikası
                        </Text>
                        <ExternalLink size={18} color={colors.textMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleTermsPress}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                        }}
                    >
                        <FileText size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
                        <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>
                            Kullanım Koşulları
                        </Text>
                        <ExternalLink size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <Text
                    style={{
                        fontSize: 12,
                        color: colors.textMuted,
                        marginTop: 32,
                        textAlign: 'center',
                    }}
                >
                    © 2026 Bizim Market. Tüm hakları saklıdır.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}
