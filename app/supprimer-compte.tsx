import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Icon from '../components/Icon';
import { useColors } from '../lib/useColors';
import { radius, spacing, typography, type ThemeColors } from '../lib/theme';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';
import { error as hapticError } from '../lib/haptics';

const CONFIRM = 'SUPPRIMER';

/**
 * Suppression du compte depuis l'app (exigence Google Play) :
 * DELETE /api/user/me. Le compte et les données personnelles sont effacés ;
 * les questions, réponses et fiches restent, signées « Utilisateur supprimé ».
 */
export default function DeleteAccountScreen() {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user, signOut } = useAuth();
    const s = useMemo(() => createStyles(colors), [colors]);
    const [typed, setTyped] = useState('');
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');

    const ready = typed.trim().toUpperCase() === CONFIRM;

    const remove = async () => {
        if (!ready || loading) return;
        setLoading(true);
        setErr('');
        try {
            await apiFetch('/user/me', { method: 'DELETE', body: JSON.stringify({ confirm: CONFIRM }) });
            hapticError();
            await signOut(); // renvoie vers l'écran de connexion
        } catch (e: any) {
            setErr(e?.message || 'La suppression a échoué. Réessaie ou écris-nous.');
            setLoading(false);
        }
    };

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing['3xl'] }} keyboardShouldPersistTaps="handled">
                <Pressable onPress={() => router.back()} hitSlop={10} style={s.back} accessibilityLabel="Retour">
                    <Icon name="arrow-back" size={20} color={colors.text} />
                </Pressable>

                <Text style={s.title}>Supprimer mon compte</Text>
                <Text style={s.lead}>
                    {user?.username ? `Compte « ${user.username} ». ` : ''}La suppression est immédiate et définitive.
                </Text>

                <View style={s.card}>
                    <Text style={s.cardTitle}>Ce qui est effacé</Text>
                    {[
                        'Ton compte : e-mail, mot de passe, pseudo, photo',
                        'Ta progression : points, badges, série, aventure, clan, inventaire',
                        'Tes amis, favoris, notifications et réglages',
                    ].map((t) => <Row key={t} icon="trash" text={t} color={colors.error} s={s} />)}
                </View>

                <View style={s.card}>
                    <Text style={s.cardTitle}>Ce qui reste, sans ton nom</Text>
                    <Row icon="chatbubble-outline" text="Tes questions, réponses, fiches et commentaires restent visibles pour aider les autres, signés « Utilisateur supprimé »." color={colors.textSecondary} s={s} />
                </View>

                <Text style={s.label}>Pour confirmer, écris {CONFIRM}</Text>
                <TextInput
                    value={typed}
                    onChangeText={setTyped}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder={CONFIRM}
                    placeholderTextColor={colors.textMuted}
                    style={[s.input, ready && { borderColor: colors.error }]}
                />
                {err ? <Text style={s.err}>{err}</Text> : null}

                <Pressable
                    onPress={remove}
                    disabled={!ready || loading}
                    style={({ pressed }) => [s.danger, (!ready || loading) && { opacity: 0.45 }, pressed && { opacity: 0.8 }]}
                    accessibilityRole="button"
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Icon name="trash" size={18} color="#fff" />}
                    <Text style={s.dangerText}>{loading ? 'Suppression…' : 'Supprimer définitivement'}</Text>
                </Pressable>
                <Pressable onPress={() => router.back()} style={s.cancel}>
                    <Text style={s.cancelText}>Annuler</Text>
                </Pressable>
            </ScrollView>
        </View>
    );
}

function Row({ icon, text, color, s }: { icon: string; text: string; color: string; s: ReturnType<typeof createStyles> }) {
    return (
        <View style={s.row}>
            <Icon name={icon} size={16} color={color} style={{ marginTop: 2 }} />
            <Text style={s.rowText}>{text}</Text>
        </View>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        back: {
            width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
            backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, marginBottom: spacing.xl,
        },
        title: { fontFamily: typography.fontFamily.display, fontSize: 32, letterSpacing: -0.4, color: c.text },
        lead: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: c.textSecondary, marginTop: spacing.sm, marginBottom: spacing.lg },
        card: { backgroundColor: c.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: c.border, padding: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
        cardTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: c.text, marginBottom: 2 },
        row: { flexDirection: 'row', gap: spacing.sm },
        rowText: { flex: 1, fontFamily: typography.fontFamily.regular, fontSize: 14, lineHeight: 20, color: c.textSecondary },
        label: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm },
        input: {
            borderWidth: 1.5, borderColor: c.border, borderRadius: radius.lg, backgroundColor: c.surface,
            paddingHorizontal: spacing.md, minHeight: 50, fontFamily: typography.fontFamily.semiBold, fontSize: 16, letterSpacing: 2, color: c.text,
        },
        err: { fontFamily: typography.fontFamily.medium, fontSize: 13, color: c.error, marginTop: spacing.sm },
        danger: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
            backgroundColor: c.error, borderRadius: radius.full, minHeight: 52, marginTop: spacing.xl,
        },
        dangerText: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: '#fff' },
        cancel: { alignItems: 'center', padding: spacing.md, marginTop: spacing.sm },
        cancelText: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.textSecondary },
    });
}
