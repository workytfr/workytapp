/**
 * Badge — même tuile que BadgeTile du site (components/ui/BadgeDisplay) :
 * carré arrondi, contour et teinte selon la rareté, icône officielle du site,
 * cadenas si non obtenu, étoile orange s'il est mis en avant sur le profil.
 *
 * (Le nom du fichier est historique : l'app affichait des hexagones.)
 */
import { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Icon from './Icon';
import RemoteImage from './RemoteImage';
import { useColors } from '../lib/useColors';
import { radius, spacing, typography, type ThemeColors } from '../lib/theme';
import { getBadgeConfig, getRarityColor, useBadgeCatalog } from '../lib/badges';

interface BadgeTileProps {
    slug: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    showName?: boolean;
    showDescription?: boolean;
    isSelected?: boolean;
    isLocked?: boolean;
    onPress?: () => void;
}

const SIZES = { xs: 44, sm: 56, md: 68, lg: 80, xl: 96 };

function BadgeTile({ slug, size = 'md', showName = false, showDescription = false, isSelected = false, isLocked = false, onPress }: BadgeTileProps) {
    useBadgeCatalog();
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    const cfg = getBadgeConfig(slug);
    const rarity = getRarityColor(cfg?.rarity ?? 'commun');
    const px = SIZES[size];
    const inner = Math.round(px * 0.72);
    const earned = !isLocked;

    const tile = (
        <View
            style={[
                s.tile,
                { width: px, height: px, borderRadius: Math.round(px * 0.26) },
                earned
                    ? { borderColor: isSelected ? colors.primary : rarity.ring, backgroundColor: rarity.tint }
                    : { borderColor: colors.border, backgroundColor: colors.background, borderStyle: 'dashed' },
            ]}
        >
            {cfg?.icon ? (
                <RemoteImage uri={cfg.icon} width={inner} height={inner} grayscale={!earned} fallback={<Text style={{ fontSize: inner * 0.55 }}>🏅</Text>} />
            ) : (
                <Text style={{ fontSize: inner * 0.55, opacity: earned ? 1 : 0.3 }}>🏅</Text>
            )}
            {!earned ? (
                <View style={s.lock}><Icon name="lock-closed" size={11} color={colors.textMuted} /></View>
            ) : null}
            {isSelected ? (
                <View style={s.star}><Icon name="star" size={11} color="#fff" /></View>
            ) : null}
        </View>
    );

    const label = cfg?.name ?? slug;
    return (
        <Pressable
            onPress={onPress}
            disabled={!onPress}
            style={({ pressed }) => [s.wrap, { width: Math.max(px, showName ? px + 14 : px) }, pressed && onPress && { transform: [{ scale: 0.95 }] }]}
            accessibilityRole={onPress ? 'button' : 'image'}
            accessibilityLabel={`${label}${earned ? '' : ' (non obtenu)'}`}
        >
            {tile}
            {showName ? <Text style={s.name} numberOfLines={2}>{label}</Text> : null}
            {showName ? <Text style={[s.rarity, { color: rarity.color }]}>{rarity.label}</Text> : null}
            {showDescription && cfg?.description ? <Text style={s.desc} numberOfLines={3}>{cfg.description}</Text> : null}
        </Pressable>
    );
}

export default memo(BadgeTile);

/** Ligne de liste (sélecteur du badge affiché) */
export const BadgeListItem = memo(function BadgeListItem({
    slug, isSelected = false, isLocked = false, onPress,
}: { slug: string; isSelected?: boolean; isLocked?: boolean; onPress?: () => void }) {
    useBadgeCatalog();
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    const cfg = getBadgeConfig(slug);
    const rarity = getRarityColor(cfg?.rarity ?? 'commun');

    return (
        <Pressable onPress={onPress} style={({ pressed }) => [s.row, isSelected && { borderColor: colors.primary, backgroundColor: colors.primary + '0D' }, pressed && { opacity: 0.8 }]}>
            <View style={[s.rowIcon, { borderColor: rarity.ring, backgroundColor: rarity.tint }]}>
                {cfg?.icon ? <RemoteImage uri={cfg.icon} width={34} height={34} grayscale={isLocked} fallback={<Text>🏅</Text>} /> : <Text>🏅</Text>}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.rowName} numberOfLines={1}>{cfg?.name ?? slug}</Text>
                <Text style={s.rowDesc} numberOfLines={2}>{cfg?.description}</Text>
                <Text style={[s.rarity, { color: rarity.color, textAlign: 'left' }]}>{rarity.label}</Text>
            </View>
            {isSelected ? <Icon name="checkmark-circle" size={20} color={colors.primary} /> : null}
        </Pressable>
    );
});

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        wrap: { alignItems: 'center', gap: 4 },
        tile: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
        lock: {
            position: 'absolute', right: 3, bottom: 3, width: 18, height: 18, borderRadius: 9,
            backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
        },
        star: {
            position: 'absolute', right: -6, top: -6, width: 20, height: 20, borderRadius: 10,
            backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
        },
        name: { fontFamily: typography.fontFamily.semiBold, fontSize: 11, lineHeight: 13, color: c.text, textAlign: 'center', marginTop: 2 },
        rarity: { fontFamily: typography.fontFamily.semiBold, fontSize: 9.5, letterSpacing: 0.5, textAlign: 'center' },
        desc: { fontFamily: typography.fontFamily.regular, fontSize: 11, color: c.textSecondary, textAlign: 'center' },
        row: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
            borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
        },
        rowIcon: { width: 48, height: 48, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
        rowName: { fontFamily: typography.fontFamily.heading, fontSize: 14, color: c.text },
        rowDesc: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textSecondary, marginTop: 1 },
    });
}
