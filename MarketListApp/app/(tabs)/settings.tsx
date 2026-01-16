import { FamilyRequest, useAuthStore } from '@/store/useAuthStore';
import { useGroceryStore } from '@/store/useGroceryStore';
import { ThemeMode, useThemeStore } from '@/store/useThemeStore';
import { router } from 'expo-router';
import {
    Bell,
    BellOff,
    Check,
    ChevronLeft,
    ChevronRight,
    Copy,
    HelpCircle,
    Info,
    LogOut,
    Moon,
    Pencil,
    UserCheck,
    UserPlus,
    Users,
    X
} from 'lucide-react-native';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    const { theme, setTheme, resolvedTheme } = useThemeStore();
    const {
        profile, family, familyMembers, pendingRequests,
        signOut, session, joinFamily, fetchFamily, fetchPendingRequests,
        handleFamilyRequest, isLoading, registerPushToken, removePushToken
    } = useAuthStore();
    const { fetchItems, unsubscribe, subscribeToChanges } = useGroceryStore();
    const isDark = resolvedTheme === 'dark';

    // Notification toggle state - derived from profile
    const [notificationsEnabled, setNotificationsEnabled] = React.useState(false);
    const [isTogglingNotifications, setIsTogglingNotifications] = React.useState(false);
    const [inviteCode, setInviteCode] = React.useState('');
    const [isJoining, setIsJoining] = React.useState(false);
    const [codeCopied, setCodeCopied] = React.useState(false);

    // Sync notification state with profile
    React.useEffect(() => {
        setNotificationsEnabled(!!profile?.expo_push_token);
    }, [profile?.expo_push_token]);

    // Fetch data on mount
    React.useEffect(() => {
        if (profile?.family_id && !family) {
            fetchFamily();
        }
        fetchPendingRequests();
    }, [profile?.family_id, family]);

    const handleSignOut = () => {
        Alert.alert(
            'Çıkış Yap',
            'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                { text: 'Çıkış Yap', style: 'destructive', onPress: signOut },
            ]
        );
    };

    const handleCopyCode = () => {
        if (family?.invite_code) {
            Alert.alert(
                'Davet Kodu',
                family.invite_code,
                [{ text: 'Tamam' }]
            );
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        }
    };

    const handleJoinFamily = async () => {
        const code = inviteCode.trim().toUpperCase();
        if (code.length < 4) {
            Alert.alert('Hata', 'Lütfen geçerli bir davet kodu girin.');
            return;
        }

        setIsJoining(true);
        try {
            const result = await joinFamily(code);

            if (result.success) {
                if (result.pending) {
                    // Request sent, waiting for approval
                    Alert.alert(
                        '📨 İstek Gönderildi!',
                        'Aile yöneticisi onayladığında listeniz güncellenecektir.',
                        [{ text: 'Tamam' }]
                    );
                } else {
                    // Direct join (legacy)
                    Alert.alert(
                        '✅ Başarılı!',
                        'Aileye başarıyla katıldınız.',
                        [
                            {
                                text: 'Tamam',
                                onPress: async () => {
                                    unsubscribe();
                                    await fetchItems();
                                    subscribeToChanges();
                                },
                            },
                        ]
                    );
                }
                setInviteCode('');
            } else {
                let errorMessage = 'Bir hata oluştu.';
                if (result.error === 'Invalid invite code') {
                    errorMessage = 'Geçersiz davet kodu. Lütfen kontrol edin.';
                } else if (result.error === 'Already in this family') {
                    errorMessage = 'Zaten bu ailenin üyesisiniz.';
                } else if (result.error === 'Request already pending') {
                    errorMessage = 'Bu aileye zaten istek gönderdiniz. Onay bekleniyor.';
                } else if (result.error) {
                    errorMessage = result.error;
                }
                Alert.alert('Hata', errorMessage);
            }
        } finally {
            setIsJoining(false);
        }
    };

    const handleApproveRequest = async (request: FamilyRequest) => {
        Alert.alert(
            'Onay',
            `${request.full_name || request.email} ailenize katılmak istiyor. Onaylıyor musunuz?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Onayla',
                    onPress: async () => {
                        const result = await handleFamilyRequest(request.id, 'approve');
                        if (result.success) {
                            Alert.alert('✅ Onaylandı', 'Kullanıcı aileye eklendi.');
                        } else {
                            Alert.alert('Hata', result.error || 'Bir hata oluştu.');
                        }
                    },
                },
            ]
        );
    };

    const handleRejectRequest = async (request: FamilyRequest) => {
        Alert.alert(
            'Reddet',
            `${request.full_name || request.email} istek reddedilsin mi?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Reddet',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await handleFamilyRequest(request.id, 'reject');
                        if (result.success) {
                            Alert.alert('❌ Reddedildi', 'İstek reddedildi.');
                        } else {
                            Alert.alert('Hata', result.error || 'Bir hata oluştu.');
                        }
                    },
                },
            ]
        );
    };

    // Get user display info
    const userName = profile?.full_name || session?.user?.email?.split('@')[0] || 'Kullanıcı';
    const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const colors = {
        // Midnight Gold (Dark) / Navy Accent (Light) Theme
        background: isDark ? '#0B1120' : '#F0F4F8',
        card: isDark ? '#151F32' : '#FFFFFF',
        surface: isDark ? '#1C2A42' : '#E8EDF4',
        text: isDark ? '#FFFFFF' : '#0B1120',
        textSecondary: isDark ? '#64748B' : '#475569',
        textMuted: isDark ? '#475569' : '#64748B',
        primary: isDark ? '#FFC107' : '#0B1120',  // Yellow (dark) / Navy (light)
        danger: '#EF4444',
        border: isDark ? '#1E293B' : '#D1D9E6',
        segmentBg: isDark ? '#1C2A42' : '#E8EDF4',
        segmentActive: isDark ? '#FFC107' : '#0B1120',
        segmentActiveText: isDark ? '#0B1120' : '#FFFFFF',
        inputBg: isDark ? '#1C2A42' : '#E8EDF4',
        requestBg: isDark ? '#1C2A42' : '#FEF3C7',
    };

    const ThemeButton = ({ mode, label }: { mode: ThemeMode; label: string }) => {
        const isActive = theme === mode;
        return (
            <TouchableOpacity
                onPress={() => setTheme(mode)}
                style={{
                    flex: 1,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    backgroundColor: isActive ? colors.segmentActive : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Text
                    style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: isActive ? colors.segmentActiveText : colors.textSecondary,
                    }}
                >
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    const SectionHeader = ({ title }: { title: string }) => (
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
            {title}
        </Text>
    );

    // Render a pending request row
    const RequestRow = ({ request }: { request: FamilyRequest }) => {
        const initials = (request.full_name || request.email)
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

        return (
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: colors.requestBg,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                }}
            >
                <View
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: '#F59E0B',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                    }}
                >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFF' }}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text }}>
                        {request.full_name || 'Kullanıcı'}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>
                        {request.email}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => handleApproveRequest(request)}
                    style={{
                        backgroundColor: colors.primary,
                        borderRadius: 8,
                        padding: 8,
                        marginRight: 8,
                    }}
                >
                    <UserCheck size={18} color={isDark ? '#0B1120' : '#FFC107'} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => handleRejectRequest(request)}
                    style={{
                        backgroundColor: colors.danger,
                        borderRadius: 8,
                        padding: 8,
                    }}
                >
                    <X size={18} color="#FFF" />
                </TouchableOpacity>
            </View>
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
                <View style={{ position: 'absolute', right: 16, width: 24 }} />
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
                    Ayarlar
                </Text>

                {/* Pending Requests Section */}
                {pendingRequests.length > 0 && (
                    <>
                        <SectionHeader title={`Bekleyen İstekler (${pendingRequests.length})`} />
                        <View
                            style={{
                                backgroundColor: colors.card,
                                borderRadius: 16,
                                marginHorizontal: 16,
                                overflow: 'hidden',
                            }}
                        >
                            {pendingRequests.map((request) => (
                                <RequestRow key={request.id} request={request} />
                            ))}
                        </View>
                    </>
                )}

                {/* Appearance Section */}
                <SectionHeader title="Görünüm" />
                <View
                    style={{
                        backgroundColor: colors.card,
                        borderRadius: 16,
                        marginHorizontal: 16,
                        overflow: 'hidden',
                    }}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                        }}
                    >
                        <Moon size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
                        <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>Tema</Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginRight: 8 }}>
                            {theme === 'dark' ? 'Koyu' : theme === 'light' ? 'Açık' : 'Sistem'}
                        </Text>
                    </View>

                    {/* Theme Segment Control */}
                    <View
                        style={{
                            marginHorizontal: 16,
                            marginBottom: 16,
                            backgroundColor: colors.segmentBg,
                            borderRadius: 10,
                            padding: 4,
                            flexDirection: 'row',
                        }}
                    >
                        <ThemeButton mode="light" label="Açık" />
                        <ThemeButton mode="dark" label="Koyu" />
                        <ThemeButton mode="system" label="Sistem" />
                    </View>
                </View>

                {/* Family Section */}
                <SectionHeader title="Aile Ayarları" />
                <View
                    style={{
                        backgroundColor: colors.card,
                        borderRadius: 16,
                        marginHorizontal: 16,
                        overflow: 'hidden',
                    }}
                >
                    {/* Family Members Count */}
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                        }}
                    >
                        <Users size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
                        <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>Aile Üyeleri</Text>
                        <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600' }}>
                            {familyMembers.length} kişi
                        </Text>
                    </View>

                    {/* Current Family Invite Code */}
                    <View
                        style={{
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                        }}
                    >
                        <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>
                            Davet Kodu (Başkalarını davet edin)
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View
                                style={{
                                    flex: 1,
                                    backgroundColor: colors.inputBg,
                                    borderRadius: 8,
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    marginRight: 8,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 20,
                                        fontWeight: '700',
                                        color: colors.primary,
                                        letterSpacing: 4,
                                        textAlign: 'center',
                                    }}
                                >
                                    {family?.invite_code || '------'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={handleCopyCode}
                                disabled={!family?.invite_code}
                                style={{
                                    backgroundColor: codeCopied ? colors.primary : colors.inputBg,
                                    borderRadius: 8,
                                    padding: 12,
                                }}
                            >
                                {codeCopied ? (
                                    <Check size={20} color={isDark ? '#0B1120' : '#FFC107'} />
                                ) : (
                                    <Copy size={20} color={colors.textSecondary} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Join Family Section */}
                    <View
                        style={{
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                        }}
                    >
                        <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>
                            Başka bir aileye katıl
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TextInput
                                style={{
                                    flex: 1,
                                    backgroundColor: colors.inputBg,
                                    borderRadius: 8,
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    marginRight: 8,
                                    fontSize: 16,
                                    color: colors.text,
                                    textAlign: 'center',
                                    letterSpacing: 2,
                                }}
                                placeholder="Kodu girin"
                                placeholderTextColor={colors.textMuted}
                                value={inviteCode}
                                onChangeText={(text) => setInviteCode(text.toUpperCase())}
                                maxLength={6}
                                autoCapitalize="characters"
                            />
                            <TouchableOpacity
                                onPress={handleJoinFamily}
                                disabled={isJoining || inviteCode.length < 4}
                                style={{
                                    backgroundColor: inviteCode.length >= 4 ? colors.primary : colors.inputBg,
                                    borderRadius: 8,
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    opacity: isJoining ? 0.7 : 1,
                                }}
                            >
                                {isJoining ? (
                                    <ActivityIndicator size="small" color={isDark ? '#0B1120' : '#FFC107'} />
                                ) : (
                                    <UserPlus size={20} color={inviteCode.length >= 4 ? (isDark ? '#0B1120' : '#FFC107') : colors.textMuted} />
                                )}
                            </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }}>
                            ℹ️ İstek gönderilecek, yönetici onayladığında katılacaksınız.
                        </Text>
                    </View>
                </View>

                {/* Account Section */}
                <SectionHeader title="Hesap" />
                <View
                    style={{
                        backgroundColor: colors.card,
                        borderRadius: 16,
                        marginHorizontal: 16,
                        overflow: 'hidden',
                    }}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                        }}
                    >
                        <View
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: colors.primary,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12,
                            }}
                        >
                            <Text style={{ fontSize: 16, fontWeight: '600', color: isDark ? '#0B1120' : '#FFFFFF' }}>{userInitials}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, color: colors.text }}>{userName}</Text>
                            <Text style={{ fontSize: 12, color: colors.textMuted }}>
                                {session?.user?.email}
                            </Text>
                        </View>
                        <Pencil size={18} color={colors.textMuted} />
                    </View>
                </View>

                {/* Notifications Section */}
                <SectionHeader title="Bildirimler" />
                <View
                    style={{
                        backgroundColor: colors.card,
                        borderRadius: 16,
                        marginHorizontal: 16,
                        overflow: 'hidden',
                    }}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                        }}
                    >
                        {notificationsEnabled ? (
                            <Bell size={20} color={colors.primary} style={{ marginRight: 12 }} />
                        ) : (
                            <BellOff size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, color: colors.text }}>
                                Push Bildirimleri
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                                {notificationsEnabled
                                    ? 'Bildirimler etkin'
                                    : 'Bildirimleri etkinleştir'}
                            </Text>
                        </View>
                        {isTogglingNotifications ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={async (value) => {
                                    setIsTogglingNotifications(true);
                                    try {
                                        if (value) {
                                            const result = await registerPushToken();
                                            if (!result.success) {
                                                Alert.alert('Hata', result.error || 'Bildirimler etkinleştirilemedi');
                                            }
                                        } else {
                                            const result = await removePushToken();
                                            if (!result.success) {
                                                Alert.alert('Hata', result.error || 'Bildirimler kapatılamadı');
                                            }
                                        }
                                    } finally {
                                        setIsTogglingNotifications(false);
                                    }
                                }}
                                trackColor={{ false: colors.segmentBg, true: colors.primary }}
                                thumbColor="#FFFFFF"
                                disabled={isTogglingNotifications}
                            />
                        )}
                    </View>
                </View>

                {/* Other Section */}
                <SectionHeader title="Diğer" />
                <View
                    style={{
                        backgroundColor: colors.card,
                        borderRadius: 16,
                        marginHorizontal: 16,
                        marginBottom: 16,
                        overflow: 'hidden',
                    }}
                >
                    <TouchableOpacity
                        onPress={() => router.push('/settings/help')}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                        }}
                    >
                        <HelpCircle size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
                        <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>Yardım & Destek</Text>
                        <ChevronRight size={20} color={colors.textMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push('/settings/about')}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                        }}
                    >
                        <Info size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
                        <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>Hakkında</Text>
                        <ChevronRight size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Logout */}
                <TouchableOpacity
                    onPress={handleSignOut}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 14,
                        marginHorizontal: 16,
                        marginBottom: 32,
                    }}
                >
                    <LogOut size={20} color="#EF4444" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 16, fontWeight: '500', color: '#EF4444' }}>
                        Çıkış Yap
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
