/**
 * Briques visuelles communes, reprises du design 2026 du site
 * (workyt-next : components/wk/primitives.tsx + ContentCard.tsx) :
 * papier, encre, orange, titres Funnel Display, surtitres en capitales.
 *
 * Tout est mémoïsé : ces composants sont rendus en masse dans des listes.
 */
import { memo, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    Animated,
    ViewStyle,
    StyleProp,
} from 'react-native';
import Icon from './Icon';
import { useColors } from '../lib/useColors';
import { radius, spacing, typography, type ThemeColors } from '../lib/theme';
import { subjectIcon } from '../lib/education';
import { getSiteOrigin } from '../lib/siteOrigin';
import RemoteImage from './RemoteImage';
import PaperDots from './PaperDots';

type IconName = string;

function useStyles() {
    const colors = useColors();
    return useMemo(() => ({ colors, s: createStyles(colors) }), [colors]);
}

/** Surtitre : trait + libellé en capitales espacées */
export const Eyebrow = memo(function Eyebrow({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
    const { s } = useStyles();
    return (
        <View style={[s.eyebrow, style]}>
            <View style={s.eyebrowLine} />
            <Text style={s.eyebrowText}>{children}</Text>
        </View>
    );
});

/** Matière avec son icône, en orange */
export const SubjectLabel = memo(function SubjectLabel({ subject }: { subject: string }) {
    const { colors, s } = useStyles();
    return (
        <View style={s.subject}>
            <Icon name={subjectIcon(subject) as IconName} size={13} color={colors.accent} />
            <Text style={s.subjectText} numberOfLines={1}>{subject}</Text>
        </View>
    );
});

/** Pastille de niveau */
export const LevelChip = memo(function LevelChip({ level }: { level: string }) {
    const { s } = useStyles();
    return (
        <View style={s.level}>
            <Text style={s.levelText} numberOfLines={1}>{level}</Text>
        </View>
    );
});

/** Pastille de statut colorée (icône + texte : l'info ne passe pas que par la couleur) */
export const StatusPill = memo(function StatusPill({ label, color, icon }: { label: string; color: string; icon?: IconName }) {
    const { s } = useStyles();
    return (
        <View style={[s.status, { backgroundColor: color + '1A' }]}>
            {icon ? <Icon name={icon} size={11} color={color} /> : null}
            <Text style={[s.statusText, { color }]}>{label}</Text>
        </View>
    );
});

/**
 * Statut d'une fiche (Certifiée / Vérifiée) avec le macaron officiel du site
 * (/badge/Certifiée.svg…) — rien pour « Non Certifiée », comme sur le site.
 */
export const FicheStatus = memo(function FicheStatus({ status }: { status?: string }) {
    const { colors, s } = useStyles();
    if (status !== 'Certifiée' && status !== 'Vérifiée') return null;
    const color = status === 'Certifiée' ? colors.success : colors.info;
    return (
        <View style={[s.status, { backgroundColor: color + '1A' }]}>
            <RemoteImage
                uri={`${getSiteOrigin()}/badge/${encodeURIComponent(status)}.svg`}
                width={16}
                height={16}
                fallback={<Icon name={status === 'Certifiée' ? 'ribbon' : 'checkmark-circle'} size={11} color={color} />}
            />
            <Text style={[s.statusText, { color }]}>{status}</Text>
        </View>
    );
});

/** Statut d'une question du forum */
export const QuestionStatus = memo(function QuestionStatus({ status }: { status?: string }) {
    const { colors } = useStyles();
    if (status === 'Résolue') return <StatusPill label="Résolue" color={colors.success} icon="checkmark-circle" />;
    if (status === 'Validée') return <StatusPill label="Validée" color={colors.info} icon="shield-checkmark" />;
    return <StatusPill label="En attente" color={colors.accent} icon="time-outline" />;
});

/** Compteur discret du pied de carte */
export const Stat = memo(function Stat({ icon, value, color }: { icon: IconName; value: number | string; color?: string }) {
    const { colors, s } = useStyles();
    return (
        <View style={s.stat}>
            <Icon name={icon} size={13} color={color ?? colors.textMuted} />
            <Text style={s.statText}>{value}</Text>
        </View>
    );
});

interface ContentCardProps {
    title: string;
    onPress: () => void;
    subject?: string;
    /** Remplace la matière (ex. : « Cours », « Question ») */
    kindLabel?: string;
    level?: string;
    status?: React.ReactNode;
    excerpt?: string;
    authorName?: string;
    meta?: string;
    avatar?: React.ReactNode;
    stats?: React.ReactNode;
    action?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

/**
 * Carte de contenu commune (questions, fiches, cours, favoris) — même coque
 * que la ContentCard du site : en-tête matière · niveau · statut, titre en
 * Funnel Display, extrait, pied auteur · date · compteurs.
 */
export const ContentCard = memo(function ContentCard({
    title, onPress, subject, kindLabel, level, status, excerpt, authorName, meta, avatar, stats, action, style,
}: ContentCardProps) {
    const { s } = useStyles();
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [s.card, pressed && s.cardPressed, style]}
            accessibilityRole="button"
            accessibilityLabel={title}
        >
            <View style={s.cardHead}>
                <View style={s.cardHeadLeft}>
                    {subject ? <SubjectLabel subject={subject} /> : kindLabel ? <Text style={s.kind}>{kindLabel}</Text> : null}
                    {level ? <LevelChip level={level} /> : null}
                </View>
                {status}
            </View>

            <Text style={s.cardTitle} numberOfLines={3}>{title}</Text>
            {excerpt ? <Text style={s.cardExcerpt} numberOfLines={3}>{excerpt}</Text> : null}

            {(authorName || meta || stats || action || avatar) ? (
                <View style={s.cardFoot}>
                    <View style={s.cardFootLeft}>
                        {avatar}
                        <View style={s.flexShrink}>
                            {authorName ? <Text style={s.author} numberOfLines={1}>{authorName}</Text> : null}
                            {meta ? <Text style={s.meta} numberOfLines={1}>{meta}</Text> : null}
                        </View>
                    </View>
                    <View style={s.cardFootRight}>
                        {stats}
                        {action}
                    </View>
                </View>
            ) : null}
        </Pressable>
    );
});

/**
 * En-tête d'écran façon catalogue du site : trame de points, surtitre mono,
 * grand titre Funnel Display avec le point orange, et en option une seconde
 * ligne en italique grise (« Une question ? / La communauté répond. »).
 * `right` accueille des actions (icônes).
 */
export function PageHeader({
    eyebrow, title, accent, subtitle, right, topInset, children,
}: {
    eyebrow?: string;
    title: string;
    /** Seconde ligne en italique grise ; le point orange passe alors après elle */
    accent?: string;
    subtitle?: string;
    right?: React.ReactNode;
    topInset: number;
    children?: React.ReactNode;
}) {
    const { s } = useStyles();
    return (
        <View style={[s.header, { paddingTop: topInset + spacing.md }]}>
            <PaperDots />
            <View style={s.headerRow}>
                <View style={s.flex}>
                    {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
                    <Text style={s.headerTitle}>
                        {title}{accent ? null : <Text style={s.dot}>.</Text>}
                    </Text>
                    {accent ? (
                        <Text style={[s.headerTitle, s.headerAccent]}>
                            {accent}<Text style={s.dot}>.</Text>
                        </Text>
                    ) : null}
                </View>
                {right ? <View style={s.headerRight}>{right}</View> : null}
            </View>
            {subtitle ? <Text style={s.headerSubtitle}>{subtitle}</Text> : null}
            {children}
        </View>
    );
}

/** Bouton icône rond (actions d'en-tête) */
export const IconButton = memo(function IconButton({
    icon, onPress, label, color, badge,
}: { icon: IconName; onPress: () => void; label: string; color?: string; badge?: number }) {
    const { colors, s } = useStyles();
    return (
        <Pressable
            onPress={onPress}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.6 }]}
        >
            <Icon name={icon} size={20} color={color ?? colors.text} />
            {badge ? (
                <View style={s.iconBadge}><Text style={s.iconBadgeText}>{badge > 9 ? '9+' : badge}</Text></View>
            ) : null}
        </Pressable>
    );
});

/** Rangée de filtres en pastilles (défilement horizontal) */
export function ChipTabs<T extends string>({
    options, value, onChange, style,
}: {
    options: { value: T; label: string; icon?: IconName }[];
    value: T;
    onChange: (v: T) => void;
    style?: StyleProp<ViewStyle>;
}) {
    const { colors, s } = useStyles();
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            // Une ScrollView a flexGrow: 1 par défaut : sous un contenu court ou en
            // flex: 1 (tchat, journal…), elle absorbait l'espace libre et étirait les
            // pastilles en hauteur. On fige donc sa taille sur son contenu.
            style={s.chipsScroll}
            contentContainerStyle={[s.chips, style]}
            keyboardShouldPersistTaps="handled"
        >
            {options.map((o) => {
                const active = o.value === value;
                return (
                    <Pressable
                        key={o.value}
                        onPress={() => onChange(o.value)}
                        style={[s.chip, active && s.chipActive]}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                    >
                        {o.icon ? <Icon name={o.icon} size={14} color={active ? colors.background : colors.textSecondary} /> : null}
                        <Text style={[s.chipText, active && s.chipTextActive]}>{o.label}</Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

/** État vide / erreur avec action optionnelle */
export function EmptyState({
    icon, title, text, actionLabel, onAction,
}: { icon: IconName; title: string; text?: string; actionLabel?: string; onAction?: () => void }) {
    const { colors, s } = useStyles();
    return (
        <View style={s.empty}>
            <View style={s.emptyIcon}><Icon name={icon} size={30} color={colors.accent} /></View>
            <Text style={s.emptyTitle}>{title}</Text>
            {text ? <Text style={s.emptyText}>{text}</Text> : null}
            {actionLabel && onAction ? (
                <Pressable onPress={onAction} style={({ pressed }) => [s.emptyBtn, pressed && { transform: [{ translateY: 2 }] }]}>
                    <Text style={s.emptyBtnText}>{actionLabel}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

/**
 * Squelettes de cartes pendant le chargement (plutôt qu'un spinner) :
 * une seule animation partagée, pilotée par le driver natif.
 */
export function SkeletonList({ count = 4 }: { count?: number }) {
    const { s } = useStyles();
    const opacity = useRef(new Animated.Value(0.5)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [opacity]);

    return (
        <Animated.View style={{ opacity, padding: spacing.lg, gap: spacing.md }}>
            {Array.from({ length: count }).map((_, i) => (
                <View key={i} style={s.skelCard}>
                    <View style={[s.skelLine, { width: '35%' }]} />
                    <View style={[s.skelLine, s.skelTitle, { width: '85%' }]} />
                    <View style={[s.skelLine, { width: '65%' }]} />
                </View>
            ))}
        </Animated.View>
    );
}

/** Barre d'XP (dégradé orange → miel remplacé par un aplat : pas de gradient natif à chaque ligne) */
export const XpBar = memo(function XpBar({ percent, color }: { percent: number; color?: string }) {
    const { colors, s } = useStyles();
    const pct = Math.max(0, Math.min(100, percent));
    return (
        <View style={s.xpTrack}>
            <View style={[s.xpFill, { width: `${pct}%`, backgroundColor: color ?? colors.primary }]} />
        </View>
    );
});

/** « il y a 3 h » compact */
export function timeAgo(dateStr?: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.max(0, Math.floor(diff / 60000));
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `il y a ${days} j`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Texte brut à partir d'un HTML (extraits de cartes) */
export function htmlToText(html?: string): string {
    if (!html) return '';
    return html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Extrait lisible d'un texte saisi en Markdown et/ou HTML (cartes, aperçus) */
export function plainExcerpt(text?: string, max = 180): string {
    const plain = htmlToText(text)
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')       // images
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')      // liens → texte
        .replace(/(\*\*|__|~~|`+)/g, '')              // gras, barré, code
        .replace(/(^|\s)[*_](\S)/g, '$1$2')           // italique ouvrant
        .replace(/(\S)[*_](?=\s|$)/g, '$1')           // italique fermant
        .replace(/(^|\s)#{1,6}\s+/g, '$1')            // titres
        .replace(/\$+/g, '')                          // délimiteurs LaTeX
        .replace(/\s+/g, ' ')
        .trim();
    return plain.length > max ? plain.slice(0, max).trimEnd() + '…' : plain;
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        flex: { flex: 1 },
        flexShrink: { flexShrink: 1, minWidth: 0 },

        eyebrow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        eyebrowLine: { width: 28, height: 1, backgroundColor: c.textMuted, opacity: 0.6 },
        eyebrowText: {
            fontFamily: typography.fontFamily.mono,
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: c.textSecondary,
        },

        subject: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1, minWidth: 0 },
        subjectText: {
            fontFamily: typography.fontFamily.heading,
            fontSize: 10.5,
            letterSpacing: 1.1,
            textTransform: 'uppercase',
            color: c.accent,
            flexShrink: 1,
        },
        kind: {
            fontFamily: typography.fontFamily.heading,
            fontSize: 10.5,
            letterSpacing: 1.1,
            textTransform: 'uppercase',
            color: c.accent,
        },
        level: { backgroundColor: c.surfaceVariant, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, flexShrink: 0 },
        levelText: { fontFamily: typography.fontFamily.semiBold, fontSize: 11, color: c.textSecondary },

        status: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
        statusText: { fontFamily: typography.fontFamily.semiBold, fontSize: 11 },

        stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
        statText: { fontFamily: typography.fontFamily.medium, fontSize: 12, color: c.textSecondary },

        card: {
            backgroundColor: c.surface,
            borderRadius: radius['2xl'],
            borderWidth: 1,
            borderColor: c.border,
            padding: spacing.lg + 2,
        },
        cardPressed: { transform: [{ scale: 0.985 }], borderColor: c.textMuted },
        cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        cardHeadLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
        cardTitle: {
            fontFamily: typography.fontFamily.display,
            fontSize: 21,
            lineHeight: 25,
            letterSpacing: -0.2,
            color: c.text,
            marginTop: spacing.md,
        },
        cardExcerpt: {
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.size.base,
            lineHeight: 20,
            color: c.textSecondary,
            marginTop: spacing.sm,
        },
        cardFoot: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginTop: spacing.lg,
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: c.divider,
        },
        cardFootLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
        cardFootRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        author: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.text },
        meta: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 1 },

        header: {
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.md,
            backgroundColor: c.background,
            borderBottomWidth: 1,
            borderBottomColor: c.border,
        },
        headerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
        headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: 4 },
        headerTitle: {
            fontFamily: typography.fontFamily.display,
            fontSize: 36,
            lineHeight: 40,
            color: c.text,
            marginTop: spacing.sm,
            letterSpacing: -0.7,
        },
        // L'italique de Funnel Display n'existe pas : on l'incline comme le navigateur
        headerAccent: {
            marginTop: 0,
            color: c.textMuted,
            transform: [{ skewX: '-8deg' }],
            paddingLeft: 4,
        },
        dot: { color: c.primary },
        headerSubtitle: {
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.size.base,
            lineHeight: 20,
            color: c.textSecondary,
            marginTop: spacing.xs,
        },

        iconBtn: {
            width: 42,
            height: 42,
            borderRadius: radius.full,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            alignItems: 'center',
            justifyContent: 'center',
        },
        iconBadge: {
            position: 'absolute',
            top: -3,
            right: -3,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: 9,
            backgroundColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: c.background,
        },
        iconBadgeText: { fontFamily: typography.fontFamily.heading, fontSize: 9, color: '#fff' },

        chipsScroll: { flexGrow: 0, flexShrink: 0 },
        chips: { gap: spacing.sm, paddingVertical: spacing.xs, alignItems: 'center' },
        chip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: radius.full,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
        },
        chipActive: { backgroundColor: c.text, borderColor: c.text },
        chipText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.textSecondary },
        chipTextActive: { color: c.background },

        empty: { alignItems: 'center', justifyContent: 'center', padding: spacing['3xl'], gap: spacing.sm },
        emptyIcon: {
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: c.surfaceVariant,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.sm,
        },
        emptyTitle: { fontFamily: typography.fontFamily.display, fontSize: 22, color: c.text, textAlign: 'center' },
        emptyText: {
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.size.base,
            lineHeight: 20,
            color: c.textSecondary,
            textAlign: 'center',
            maxWidth: 300,
        },
        emptyBtn: {
            marginTop: spacing.md,
            backgroundColor: c.primary,
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.md,
            borderRadius: radius.full,
            borderBottomWidth: 4,
            borderBottomColor: c.primaryDark,
        },
        emptyBtnText: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.base, color: '#fff' },

        skelCard: {
            backgroundColor: c.surface,
            borderRadius: radius['2xl'],
            borderWidth: 1,
            borderColor: c.border,
            padding: spacing.lg + 2,
            gap: spacing.md,
        },
        skelLine: { height: 10, borderRadius: 5, backgroundColor: c.surfaceVariant },
        skelTitle: { height: 18, borderRadius: 6 },

        xpTrack: { height: 10, borderRadius: radius.full, backgroundColor: c.surfaceVariant, overflow: 'hidden' },
        xpFill: { height: '100%', borderRadius: radius.full },
    });
}
