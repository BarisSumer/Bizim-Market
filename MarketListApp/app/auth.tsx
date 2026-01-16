import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react-native';
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

type AuthMode = 'login' | 'signup' | 'forgot-password';

export default function AuthScreen() {
    const router = useRouter();
    const { signIn, signUp, sendPasswordResetEmail, isLoading } = useAuthStore();
    const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
    const isDark = resolvedTheme === 'dark';

    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const colors = {
        // Navy Blue & Yellow Theme
        background: isDark ? '#0A0F24' : '#F0F4F8',
        card: isDark ? '#141E3F' : '#FFFFFF',
        text: isDark ? '#EAEFF5' : '#0A0F24',
        textSecondary: isDark ? '#8A96B8' : '#4A5578',
        textMuted: isDark ? '#5C6A8A' : '#8A96B8',
        primary: '#FEE500',
        border: isDark ? '#232D53' : '#D1D9E6',
        inputBg: isDark ? '#1A2548' : '#E8EDF4',
        error: '#EF4444',
    };

    const handleSubmit = async () => {
        if (!email) {
            Alert.alert('Hata', 'Lütfen e-posta adresinizi girin.');
            return;
        }

        if (mode === 'forgot-password') {
            const result = await sendPasswordResetEmail(email);
            if (result.success) {
                Alert.alert(
                    '✅ E-posta Gönderildi',
                    'Şifre sıfırlama linki e-posta adresinize gönderildi. Lütfen e-postanızı kontrol edin.',
                    [{ text: 'Tamam', onPress: () => setMode('login') }]
                );
            } else {
                Alert.alert('Hata', result.error || 'Bir hata oluştu.');
            }
            return;
        }

        if (!password) {
            Alert.alert('Hata', 'Lütfen şifrenizi girin.');
            return;
        }

        if (mode === 'signup' && !fullName) {
            Alert.alert('Hata', 'Lütfen adınızı girin.');
            return;
        }

        let result;
        if (mode === 'login') {
            result = await signIn(email, password);
        } else {
            result = await signUp(email, password, fullName);
        }

        if (result.error) {
            Alert.alert(
                'Hata',
                result.error.message || 'Bir hata oluştu. Lütfen tekrar deneyin.'
            );
        } else if (mode === 'signup') {
            Alert.alert(
                'Başarılı',
                'Hesabınız oluşturuldu. E-posta adresinizi doğrulamanız gerekebilir.',
                [{ text: 'Tamam', onPress: () => setMode('login') }]
            );
        }
    };

    const getTitle = () => {
        switch (mode) {
            case 'login': return 'Giriş Yap';
            case 'signup': return 'Hesap Oluştur';
            case 'forgot-password': return 'Şifremi Unuttum';
        }
    };

    const getButtonText = () => {
        switch (mode) {
            case 'login': return 'Giriş Yap';
            case 'signup': return 'Kayıt Ol';
            case 'forgot-password': return 'Link Gönder';
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {/* Logo/Title */}
                    <View style={styles.header}>
                        <Text style={[styles.logo, { color: colors.primary }]}>🛒</Text>
                        <Text style={[styles.title, { color: colors.text }]}>Bizim Market</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Aile alışveriş listeniz
                        </Text>
                    </View>

                    {/* Form Card */}
                    <View style={[styles.formCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.formTitle, { color: colors.text }]}>
                            {getTitle()}
                        </Text>

                        {mode === 'forgot-password' && (
                            <Text style={[styles.forgotDescription, { color: colors.textSecondary }]}>
                                E-posta adresinizi girin, şifre sıfırlama linki göndereceğiz.
                            </Text>
                        )}

                        {/* Full Name Input (only for signup) */}
                        {mode === 'signup' && (
                            <View style={[styles.inputContainer, { backgroundColor: colors.inputBg }]}>
                                <User size={20} color={colors.textMuted} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="Adınız"
                                    placeholderTextColor={colors.textMuted}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    autoCapitalize="words"
                                />
                            </View>
                        )}

                        {/* Email Input */}
                        <View style={[styles.inputContainer, { backgroundColor: colors.inputBg }]}>
                            <Mail size={20} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="E-posta"
                                placeholderTextColor={colors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                            />
                        </View>

                        {/* Password Input (not for forgot-password) */}
                        {mode !== 'forgot-password' && (
                            <View style={[styles.inputContainer, { backgroundColor: colors.inputBg }]}>
                                <Lock size={20} color={colors.textMuted} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="Şifre"
                                    placeholderTextColor={colors.textMuted}
                                    value={password}
                                    onChangeText={setPassword}
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
                        )}

                        {/* Forgot Password Link (only for login) */}
                        {mode === 'login' && (
                            <TouchableOpacity
                                style={styles.forgotButton}
                                onPress={() => setMode('forgot-password')}
                            >
                                <Text style={[styles.forgotText, { color: colors.primary }]}>
                                    Şifremi Unuttum
                                </Text>
                            </TouchableOpacity>
                        )}

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
                                    {getButtonText()}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Toggle Login/Signup */}
                        {mode !== 'forgot-password' ? (
                            <TouchableOpacity
                                style={styles.toggleButton}
                                onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
                            >
                                <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
                                    {mode === 'login' ? 'Hesabınız yok mu? ' : 'Zaten hesabınız var mı? '}
                                    <Text style={{ color: colors.primary, fontWeight: '600' }}>
                                        {mode === 'login' ? 'Kayıt Ol' : 'Giriş Yap'}
                                    </Text>
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.toggleButton}
                                onPress={() => setMode('login')}
                            >
                                <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
                                    Geri dön:{' '}
                                    <Text style={{ color: colors.primary, fontWeight: '600' }}>
                                        Giriş Yap
                                    </Text>
                                </Text>
                            </TouchableOpacity>
                        )}
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
    logo: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
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
    formTitle: {
        fontSize: 24,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    forgotDescription: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
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
    forgotButton: {
        alignSelf: 'flex-end',
        marginBottom: 8,
        marginTop: -8,
    },
    forgotText: {
        fontSize: 14,
        fontWeight: '500',
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
    toggleButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    toggleText: {
        fontSize: 14,
    },
});
