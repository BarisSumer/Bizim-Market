import { useThemeStore } from '@/store/useThemeStore';
import { router } from 'expo-router';
import { ChevronDown, ChevronLeft, ChevronUp, Mail } from 'lucide-react-native';
import React from 'react';
import { Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface FAQItem {
    question: string;
    answer: string;
}

const faqData: FAQItem[] = [
    {
        question: 'Aileye nasıl üye eklerim?',
        answer: 'Ayarlar ekranındaki "Davet Kodu" bölümünden kodunuzu paylaşabilirsiniz. Katılmak isteyen kişi bu kodu "Başka bir aileye katıl" bölümüne girerek istek gönderebilir. Siz de bu isteği onayladığınızda aile listenize eklenir.',
    },
    {
        question: 'Listeyi nasıl paylaşırım?',
        answer: 'Aile üyeleri aynı listeyi otomatik olarak görür. Yeni bir ürün eklediğinizde veya satın aldığınızı işaretlediğinizde, tüm aile üyelerinin listesi anında güncellenir.',
    },
    {
        question: 'Veriler anlık mı güncelleniyor?',
        answer: 'Evet! Tüm değişiklikler gerçek zamanlı olarak senkronize edilir. Bir aile üyesi bir ürün eklediğinde veya satın aldığını işaretlediğinde, diğer üyeler anında bu değişikliği görür.',
    },
    {
        question: 'Satın alınan ürünler ne zaman siliniyor?',
        answer: 'Satın alınan ürünler listeden otomatik olarak silinmez. Ana sayfadaki "Temizle" butonuyla satın alınan ürünleri toplu olarak silebilirsiniz.',
    },
    {
        question: 'Kategoriler nasıl çalışıyor?',
        answer: 'Ürün eklerken kategori seçebilirsiniz. Kategoriler, alışverişinizi daha düzenli yapmanıza yardımcı olur. Ana sayfadaki filtre ile belirli kategorileri görüntüleyebilirsiniz.',
    },
    {
        question: 'Bildirimleri nasıl açarım?',
        answer: 'Ayarlar ekranındaki "Bildirimler" bölümünden push bildirimlerini açıp kapatabilirsiniz. Bildirimlerin çalışması için uygulamanın bildirim iznine sahip olması gerekir.',
    },
];

export default function HelpScreen() {
    const { resolvedTheme } = useThemeStore();
    const isDark = resolvedTheme === 'dark';
    const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);

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

    const toggleExpand = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    const handleContactPress = () => {
        Linking.openURL('mailto:bizimmarket.destek@gmail.com?subject=Destek Talebi');
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
                    Yardım & Destek
                </Text>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {/* FAQ Section Header */}
                <Text
                    style={{
                        fontSize: 13,
                        fontWeight: '500',
                        color: colors.textMuted,
                        paddingHorizontal: 16,
                        paddingTop: 16,
                        paddingBottom: 8,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                    }}
                >
                    Sık Sorulan Sorular
                </Text>

                {/* FAQ Items */}
                <View
                    style={{
                        backgroundColor: colors.card,
                        borderRadius: 16,
                        marginHorizontal: 16,
                        overflow: 'hidden',
                    }}
                >
                    {faqData.map((item, index) => (
                        <View key={index}>
                            <TouchableOpacity
                                onPress={() => toggleExpand(index)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingVertical: 14,
                                    paddingHorizontal: 16,
                                    borderBottomWidth: index < faqData.length - 1 || expandedIndex === index ? 1 : 0,
                                    borderBottomColor: colors.border,
                                }}
                            >
                                <Text
                                    style={{
                                        flex: 1,
                                        fontSize: 15,
                                        fontWeight: '500',
                                        color: colors.text,
                                    }}
                                >
                                    {item.question}
                                </Text>
                                {expandedIndex === index ? (
                                    <ChevronUp size={20} color={colors.textMuted} />
                                ) : (
                                    <ChevronDown size={20} color={colors.textMuted} />
                                )}
                            </TouchableOpacity>
                            {expandedIndex === index && (
                                <View
                                    style={{
                                        paddingHorizontal: 16,
                                        paddingBottom: 14,
                                        borderBottomWidth: index < faqData.length - 1 ? 1 : 0,
                                        borderBottomColor: colors.border,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            color: colors.textSecondary,
                                            lineHeight: 20,
                                        }}
                                    >
                                        {item.answer}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* Contact Section Header */}
                <Text
                    style={{
                        fontSize: 13,
                        fontWeight: '500',
                        color: colors.textMuted,
                        paddingHorizontal: 16,
                        paddingTop: 24,
                        paddingBottom: 8,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                    }}
                >
                    İletişim
                </Text>

                {/* Contact Button */}
                <TouchableOpacity
                    onPress={handleContactPress}
                    style={{
                        backgroundColor: colors.card,
                        borderRadius: 16,
                        marginHorizontal: 16,
                        marginBottom: 32,
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                    }}
                >
                    <View
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: colors.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                        }}
                    >
                        <Mail size={20} color="#000" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                            Bize Ulaşın
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                            bizimmarket.destek@gmail.com
                        </Text>
                    </View>
                    <ChevronLeft
                        size={20}
                        color={colors.textMuted}
                        style={{ transform: [{ rotate: '180deg' }] }}
                    />
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
