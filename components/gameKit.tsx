/**
 * Ossature commune des écrans de gamification (calendrier, quêtes, série,
 * inventaire) : en-tête du site avec bouton retour flottant, défilement avec
 * « tirer pour rafraîchir », état « bientôt disponible » quand la route n'est
 * pas encore ouverte au jeton de l'app, et bandeau d'erreur métier.
 */
import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl, StyleSheet, Linking, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Icon from './Icon';
import { PageHeader, EmptyState } from './wk';
import { useColors } from '../lib/useColors';
import { radius, spacing, typography, type ThemeColors } from '../lib/theme';
import { getSiteOrigin } from '../lib/siteOrigin';
import { tapLight } from '../lib/haptics';

export function openOnSite(path: string) {
    Linking.openURL(`${getSiteOrigin()}${path}`).catch(() => {});
}

/** Écran plein : en-tête + contenu défilant (pull-to-refresh) + bouton retour */
export function GameScreen({
    eyebrow, title, accent, subtitle, right, refreshing, onRefresh, children, footer,
}: {
    eyebrow?: string;
    title: string;
    accent?: string;
    subtitle?: string;
    right?: React.ReactNode;
    refreshing?: boolean;
    onRefresh?: () => void;
    children: React.ReactNode;
    /** Contenu hors défilement (feuilles du bas, modales) */
    footer?: React.ReactNode;
}) {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const back = () => {
        tapLight();
        if (router.canGoBack()) router.back();
        else router.replace('/');
    };
    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + spacing['3xl'] }}
                showsVerticalScrollIndicator={false}
                refreshControl={onRefresh ? (
                    <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
                ) : undefined}
            >
                <PageHeader
                    eyebrow={eyebrow}
                    title={title}
                    accent={accent}
                    subtitle={subtitle}
                    right={right}
                    topInset={insets.top + 42 + spacing.sm}
                />
                {children}
            </ScrollView>
            <Pressable
                onPress={back}
                hitSlop={8}
                style={({ pressed }) => [s.back, { top: insets.top + spacing.sm }, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="Retour"
            >
                <Icon name="arrow-back" size={20} color={colors.text} />
            </Pressable>
            {footer}
        </View>
    );
}

/** La route n'accepte pas encore le jeton de l'app (patch non déployé) */
export function UnavailableState({ sitePath, what }: { sitePath: string; what: string }) {
    return (
        <EmptyState
            icon="cloud-offline"
            title="Bientôt disponible dans l'app"
            text={`${what} arrive très vite ici. En attendant, retrouve-le sur workyt.fr.`}
            actionLabel="Ouvrir sur workyt.fr"
            onAction={() => openOnSite(sitePath)}
        />
    );
}

/** Bandeau d'erreur fermable (Alert n'affiche rien sur le web) */
export function ErrorBanner({ message, onClose }: { message: string | null; onClose: () => void }) {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    if (!message) return null;
    return (
        <View style={s.banner} accessibilityRole="alert">
            <Icon name="alert-circle" size={18} color={colors.error} />
            <Text style={s.bannerText}>{message}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fermer le message">
                <Icon name="close" size={18} color={colors.textSecondary} />
            </Pressable>
        </View>
    );
}

/** Icône (nom Icon) ou emoji d'un type de récompense */
export function rewardVisual(type: string, colors: ThemeColors): { icon?: string; emoji?: string; color: string } {
    switch (type) {
        case 'gems': return { icon: 'gem', color: colors.info };
        case 'chest': return { icon: 'cube', color: colors.accent };
        case 'mushrooms': return { emoji: '🍄', color: colors.error };
        case 'cosmetic': return { icon: 'shirt', color: '#9333ea' };
        case 'badge': return { icon: 'medal', color: '#9333ea' };
        default: return { icon: 'star', color: colors.accent2 };
    }
}

/** Pastille de récompense : icône + libellé */
export function RewardChip({ type, label }: { type: string; label: string }) {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    const v = rewardVisual(type, colors);
    return (
        <View style={[s.chip, { backgroundColor: v.color + '14' }]}>
            {v.emoji ? <Text style={s.chipEmoji}>{v.emoji}</Text> : <Icon name={v.icon!} size={13} color={v.color} />}
            <Text style={[s.chipText, { color: colors.text }]}>{label}</Text>
        </View>
    );
}

/** Carte blanche bordée du site */
export function PaperCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    return <View style={[s.card, style]}>{children}</View>;
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        back: {
            position: 'absolute',
            left: spacing.lg,
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
        },
        banner: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginHorizontal: spacing.lg,
            marginTop: spacing.md,
            padding: spacing.md,
            borderRadius: radius.lg,
            backgroundColor: c.error + '12',
            borderWidth: 1,
            borderColor: c.error + '33',
        },
        bannerText: { flex: 1, fontFamily: typography.fontFamily.medium, fontSize: 13, lineHeight: 18, color: c.text },
        chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full },
        chipEmoji: { fontSize: 12 },
        chipText: { fontFamily: typography.fontFamily.semiBold, fontSize: 12 },
        card: {
            backgroundColor: c.surface,
            borderRadius: radius.xl + 2,
            borderWidth: 1,
            borderColor: c.border,
            padding: spacing.lg,
        },
    });
}
