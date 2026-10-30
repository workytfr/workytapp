/**
 * Briques des écrans d'inscription et de mot de passe oublié, au même
 * style que l'écran de connexion (papier chaud, carte « feuille »).
 */
import { useMemo, useState, type ReactNode } from 'react';
import {
    View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, type TextInputProps,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from './Icon';
import { useColors } from '../lib/useColors';
import { radius, shadows, spacing, typography, type ThemeColors } from '../lib/theme';

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);
    return (
        <View style={s.container}>
            <StatusBar style="dark" />
            <View style={[s.blob, s.blobTop]} />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    contentContainerStyle={[s.scroll, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Pressable onPress={() => router.back()} hitSlop={10} style={s.back} accessibilityLabel="Retour">
                        <Icon name="arrow-back" size={20} color={colors.text} />
                    </Pressable>
                    <Text style={s.title}>{title}</Text>
                    {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
                    <View style={s.card}>{children}</View>
                    {footer}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

export function AuthField({ label, icon, secure, hint, ...input }: TextInputProps & { label: string; icon: string; secure?: boolean; hint?: string }) {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    const [focused, setFocused] = useState(false);
    const [show, setShow] = useState(false);
    return (
        <View style={s.field}>
            <Text style={s.label}>{label}</Text>
            <View style={[s.inputRow, focused && s.inputRowFocused]}>
                <Icon name={icon} size={20} color={focused ? colors.primary : colors.textMuted} style={{ paddingLeft: spacing.md }} />
                <TextInput
                    style={s.input}
                    placeholderTextColor={colors.textMuted}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    secureTextEntry={secure && !show}
                    autoCorrect={false}
                    {...input}
                />
                {secure ? (
                    <Pressable onPress={() => setShow((v) => !v)} hitSlop={8} style={{ paddingHorizontal: spacing.md }} accessibilityLabel={show ? 'Masquer' : 'Afficher'}>
                        <Icon name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                    </Pressable>
                ) : null}
            </View>
            {hint ? <Text style={s.hint}>{hint}</Text> : null}
        </View>
    );
}

export function AuthMessage({ kind, text }: { kind: 'error' | 'success'; text: string }) {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    const color = kind === 'error' ? colors.error : colors.success;
    return (
        <View style={[s.msg, { backgroundColor: color + '14', borderColor: color + '33' }]}>
            <Icon name={kind === 'error' ? 'alert-circle' : 'checkmark-circle'} size={18} color={color} />
            <Text style={[s.msgText, { color }]}>{text}</Text>
        </View>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        blob: { position: 'absolute', borderRadius: radius.full, opacity: 0.35 },
        blobTop: { width: 320, height: 320, top: -120, right: -90, backgroundColor: c.primaryLight },
        scroll: { flexGrow: 1, paddingHorizontal: spacing.lg },
        back: {
            width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
            backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, marginBottom: spacing.xl,
        },
        title: { fontFamily: typography.fontFamily.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.5, color: c.text },
        subtitle: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: c.textSecondary, marginTop: spacing.sm },
        card: {
            marginTop: spacing.xl, backgroundColor: c.surface, borderRadius: radius['2xl'],
            borderWidth: 1, borderColor: c.border, padding: spacing.xl, ...shadows.md,
        },
        field: { marginBottom: spacing.lg },
        label: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.sm, color: c.textSecondary, marginBottom: spacing.sm },
        inputRow: {
            flexDirection: 'row', alignItems: 'center', backgroundColor: c.background,
            borderRadius: radius.lg, borderWidth: 1.5, borderColor: c.border, minHeight: 52,
        },
        inputRowFocused: { borderColor: c.primary, backgroundColor: c.surface },
        input: {
            flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.md,
            fontFamily: typography.fontFamily.regular, fontSize: typography.size.lg, color: c.text,
        },
        hint: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 6 },
        msg: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg },
        msgText: { flex: 1, fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm },
    });
}
