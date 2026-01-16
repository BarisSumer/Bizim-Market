import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResetPasswordScreen() {
    const router = useRouter();
    const { updatePassword, isLoading } = useAuthStore();
    const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
    const isDark = resolvedTheme === 'dark';

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const colors = {
        background: isDark ? '#121212' : '#F5F5F5',
        card: isDark ? '#1E1E1E' : '#FFFFFF',
        text: isDark ? '#FFFFFF' : '#1A1A1A',
        textSecondary: isDark ? '#9CA3AF' : '#6B7280',
        textMuted: isDark ? '#6B7280' : '#9CA3AF',
        primary: '#4ADE80',
        border: isDark ? '#2A2A2A' : '#E5E5E5',
        inputBg: isDark ? '#2A2A2A' : '#F0F0F0',
        error: '#EF4444',
    };

    const handleSubmit = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Hata', 'Şifreler eşleşmiyor.');
            return;
        }

        const result = await updatePassword(newPassword);

        if (result.success) {
            Alert.alert(
                '✅ Şifre Güncellendi',
                'Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.',
                [{ text: 'Tamam', onPress: () => router.replace('/(tabs)') }]
            );
        } else {
            Alert.alert('Hata', result.error || 'Bir hata oluştu. Lütfen tekrar deneyin.');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {/* Header Icon */}
                    <View style={styles.header}>
                        <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
                            <ShieldCheck size={48} color={colors.primary} />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>
                            Yeni Şifre Belirle
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Hesabınız için yeni bir şifre oluşturun
                        </Text>
                    </View>

                    {/* Form Card */}
                    <View style={[styles.formCard, { backgroundColor: colors.card }]}>
                        {/* New Password Input */}
                        <View style={[styles.inputContainer, { backgroundColor: colors.inputBg }]}>
                            <Lock size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Yeni Şifre"
                                placeholderTextColor={colors.textMuted}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                {showPassword ? (
                                    <EyeOff size={20} color={colors.textMuted} />
                                ) : (
                                    <Eye size={20} color={colors.textMuted} />
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Confirm Password Input */}
                        <View style={[styles.inputContainer, { backgroundColor: colors.inputBg }]}>
                            <Lock size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Şifreyi Onayla"
                                placeholderTextColor={colors.textMuted}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                        </View>

                        <Text style={[styles.hint, { color: colors.textMuted }]}>
                            Şifreniz en az 6 karakter uzunluğunda olmalıdır.
                        </Text>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[styles.submitButton, { backgroundColor: colors.primary }]}
                            onPress={handleSubmit}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#000000" />
                            ) : (
                                <Text style={styles.submitButtonText}>
                                    Şifreyi Güncelle
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    formCard: {
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    hint: {
        fontSize: 13,
        marginBottom: 16,
        textAlign: 'center',
    },
    submitButton: {
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    submitButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
    },
});
