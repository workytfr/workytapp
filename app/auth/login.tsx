import { useMemo, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Image,
    ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Icon from '../../components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { useColors } from '../../lib/useColors';
import { spacing, radius, shadows, typography } from '../../lib/theme';
import DuoButton from '../../components/DuoButton';

const logo = require('../../assets/workyt-logo.png');

export default function LoginScreen() {
    const { signIn } = useAuth();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState<'email' | 'password' | null>(null);

    const canSubmit = email.trim().length > 0 && password.length > 0;

    const handleLogin = async () => {
        if (!canSubmit) {
            setError('Remplis tous les champs');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await signIn(email.trim(), password);
        } catch (e: any) {
            setError(e.message || 'Identifiants incorrects');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Halos décoratifs papier chaud */}
            <View style={[styles.blob, styles.blobTop]} />
            <View style={[styles.blob, styles.blobBottom]} />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.scroll,
                        { paddingTop: insets.top + spacing['3xl'], paddingBottom: insets.bottom + spacing.xl },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* En-tête : wordmark Workyt */}
                    <View style={styles.header}>
                        <Image source={logo} style={styles.logoImg} resizeMode="contain" />
                        <Text style={styles.tagline}>Connecte-toi pour continuer ton apprentissage</Text>
                    </View>

                    {/* Carte « feuille » */}
                    <View style={styles.card}>
                        {error ? (
                            <View style={styles.errorBox}>
                                <Icon name="alert-circle" size={18} color={colors.error} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Email */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Email</Text>
                            <View
                                style={[
                                    styles.inputRow,
                                    focused === 'email' && styles.inputRowFocused,
                                ]}
                            >
                                <Icon
                                    name="mail-outline"
                                    size={20}
                                    color={focused === 'email' ? colors.primary : colors.textMuted}
                                    style={styles.leadingIcon}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="ton@email.com"
                                    placeholderTextColor={colors.textMuted}
                                    value={email}
                                    onChangeText={setEmail}
                                    onFocus={() => setFocused('email')}
                                    onBlur={() => setFocused(null)}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    returnKeyType="next"
                                />
                            </View>
                        </View>

                        {/* Mot de passe */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Mot de passe</Text>
                            <View
                                style={[
                                    styles.inputRow,
                                    focused === 'password' && styles.inputRowFocused,
                                ]}
                            >
                                <Icon
                                    name="lock-closed-outline"
                                    size={20}
                                    color={focused === 'password' ? colors.primary : colors.textMuted}
                                    style={styles.leadingIcon}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.textMuted}
                                    value={password}
                                    onChangeText={setPassword}
                                    onFocus={() => setFocused('password')}
                                    onBlur={() => setFocused(null)}
                                    secureTextEntry={!showPassword}
                                    returnKeyType="done"
                                    onSubmitEditing={handleLogin}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword((v) => !v)}
                                    style={styles.eyeBtn}
                                    hitSlop={8}
                                >
                                    <Icon
                                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                        size={20}
                                        color={colors.textMuted}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.forgot} hitSlop={8}>
                            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
                        </TouchableOpacity>

                        <DuoButton
                            label={loading ? 'Connexion…' : 'Se connecter'}
                            icon="arrow-forward"
                            onPress={handleLogin}
                            disabled={loading || !canSubmit}
                        />

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>ou</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <TouchableOpacity style={styles.discordBtn} activeOpacity={0.85}>
                            <Icon name="logo-discord" size={20} color="#fff" />
                            <Text style={styles.discordText}>Continuer avec Discord</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Pas encore de compte ?</Text>
                        <TouchableOpacity hitSlop={8}>
                            <Text style={styles.footerLink}>S'inscrire</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function createStyles(colors: ReturnType<typeof useColors>) {
    return StyleSheet.create({
        flex: { flex: 1 },
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        blob: {
            position: 'absolute',
            borderRadius: radius.full,
            opacity: 0.35,
        },
        blobTop: {
            width: 320,
            height: 320,
            top: -120,
            right: -90,
            backgroundColor: colors.primaryLight,
        },
        blobBottom: {
            width: 260,
            height: 260,
            bottom: -100,
            left: -80,
            backgroundColor: colors.surfaceVariant,
            opacity: 0.7,
        },
        scroll: {
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: spacing.lg,
        },
        header: {
            alignItems: 'center',
            marginBottom: spacing['2xl'],
        },
        logoImg: {
            width: 220,
            height: 58,
            marginBottom: spacing.lg,
        },
        tagline: {
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.size.base,
            color: colors.textSecondary,
            textAlign: 'center',
            maxWidth: 280,
        },
        card: {
            backgroundColor: colors.surface,
            borderRadius: radius['2xl'],
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.xl,
            ...shadows.md,
        },
        errorBox: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.error + '14',
            borderWidth: 1,
            borderColor: colors.error + '33',
            padding: spacing.md,
            borderRadius: radius.md,
            marginBottom: spacing.lg,
        },
        errorText: {
            flex: 1,
            fontFamily: typography.fontFamily.medium,
            fontSize: typography.size.sm,
            color: colors.error,
        },
        field: {
            marginBottom: spacing.lg,
        },
        label: {
            fontFamily: typography.fontFamily.semiBold,
            fontSize: typography.size.sm,
            color: colors.textSecondary,
            marginBottom: spacing.sm,
        },
        inputRow: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.background,
            borderRadius: radius.lg,
            borderWidth: 1.5,
            borderColor: colors.border,
            minHeight: 52,
        },
        inputRowFocused: {
            borderColor: colors.primary,
            backgroundColor: colors.surface,
        },
        leadingIcon: {
            paddingLeft: spacing.md,
        },
        input: {
            flex: 1,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.size.lg,
            color: colors.text,
        },
        eyeBtn: {
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
        },
        forgot: {
            alignSelf: 'flex-end',
            marginBottom: spacing.xl,
        },
        forgotText: {
            fontFamily: typography.fontFamily.semiBold,
            fontSize: typography.size.sm,
            color: colors.primary,
        },
        divider: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            marginVertical: spacing.lg,
        },
        dividerLine: {
            flex: 1,
            height: 1,
            backgroundColor: colors.border,
        },
        dividerText: {
            fontFamily: typography.fontFamily.medium,
            fontSize: typography.size.sm,
            color: colors.textMuted,
        },
        discordBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            backgroundColor: '#5865F2',
            paddingVertical: spacing.md,
            minHeight: 52,
            borderRadius: radius.lg,
        },
        discordText: {
            fontFamily: typography.fontFamily.semiBold,
            color: '#fff',
            fontSize: typography.size.lg,
        },
        footer: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: spacing.xs,
            marginTop: spacing['2xl'],
        },
        footerText: {
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.size.base,
            color: colors.textSecondary,
        },
        footerLink: {
            fontFamily: typography.fontFamily.heading,
            fontSize: typography.size.base,
            color: colors.primary,
        },
    });
}
