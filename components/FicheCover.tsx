/**
 * Vignettes de fiches « à la Knowunity », aux couleurs de Workyt :
 * on voit la fiche avant de l'ouvrir. Si la fiche a une image jointe, elle
 * sert de couverture ; sinon on dessine une feuille de cours (papier teinté
 * par matière, lignes, premières phrases, gros titre en Funnel Display).
 */
import { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image, type StyleProp, type ViewStyle } from 'react-native';
import Icon from './Icon';
import Avatar from './Avatar';
import { useColors } from '../lib/useColors';
import { radius, spacing, typography, type ThemeColors } from '../lib/theme';
import { subjectIcon } from '../lib/education';
import { getSiteOrigin } from '../lib/siteOrigin';
import { plainExcerpt } from './wk';
import type { FicheListItem } from '../lib/api';

/** Teinte de papier + encre par matière (pastels, l'orange Workyt reste l'accent) */
const PALETTE: { match: RegExp; paper: string; ink: string; tab: string }[] = [
    { match: /math/i, paper: '#E8F0FE', ink: '#1E3A8A', tab: '#3B6FE0' },
    { match: /fran|litt/i, paper: '#FDECEC', ink: '#7F1D1D', tab: '#E0524F' },
    { match: /physique|chimie/i, paper: '#F1EAFE', ink: '#4C1D95', tab: '#8B5CF6' },
    { match: /svt|vie et de la terre|bio/i, paper: '#E7F6EC', ink: '#14532D', tab: '#2FA35C' },
    { match: /histoire|géo|geo|emc/i, paper: '#FBF0E1', ink: '#6B3A0A', tab: '#C98A2E' },
    { match: /philo/i, paper: '#ECEBFB', ink: '#312E81', tab: '#6366F1' },
    { match: /ses|écono|eco/i, paper: '#E3F5F3', ink: '#134E4A', tab: '#14A08F' },
    { match: /anglais|espagnol|allemand|langue|italien/i, paper: '#FCE9F3', ink: '#831843', tab: '#DB4F94' },
    { match: /info|nsi|numérique/i, paper: '#E6F4FA', ink: '#0C4A6E', tab: '#1E9BD7' },
];
const DEFAULT = { paper: '#FFF1E6', ink: '#5A2A10', tab: '#FF6A1A' };

export function subjectPalette(subject?: string) {
    return PALETTE.find((p) => subject && p.match.test(subject)) ?? DEFAULT;
}

function absolute(uri: string): string {
    return /^(https?:|data:)/.test(uri) ? uri : `${getSiteOrigin()}${uri.startsWith('/') ? '' : '/'}${uri}`;
}

/** Couverture seule, au format portrait 3:4 */
export const FicheCover = memo(function FicheCover({
    fiche, style, compact,
}: {
    fiche: Pick<FicheListItem, 'title' | 'subject' | 'content' | 'cover' | 'hasPdf' | 'fileCount' | 'status' | 'level'>;
    style?: StyleProp<ViewStyle>;
    compact?: boolean;
}) {
    const pal = subjectPalette(fiche.subject);
    const lines = useMemo(() => plainExcerpt(fiche.content, compact ? 120 : 200), [fiche.content, compact]);
    const certified = fiche.status === 'Certifiée';
    const verified = fiche.status === 'Vérifiée';

    return (
        <View style={[styles.cover, { backgroundColor: pal.paper }, style]}>
            {fiche.cover ? (
                <Image source={{ uri: absolute(fiche.cover) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
                <>
                    {/* Lignes de cahier + marge */}
                    {Array.from({ length: 14 }).map((_, i) => (
                        <View key={i} style={[styles.rule, { top: 44 + i * 16, borderColor: pal.ink + '14' }]} />
                    ))}
                    <View style={[styles.margin, { backgroundColor: pal.tab + '40' }]} />
                    <View style={styles.sheet}>
                        <Icon name={subjectIcon(fiche.subject || '')} size={compact ? 16 : 20} color={pal.tab} />
                        <Text style={[styles.sheetTitle, { color: pal.ink }, compact && styles.sheetTitleCompact]} numberOfLines={3}>
                            {fiche.title}
                        </Text>
                        <View style={[styles.underline, { backgroundColor: pal.tab }]} />
                        {lines ? (
                            <Text style={[styles.sheetBody, { color: pal.ink + 'B0' }]} numberOfLines={compact ? 3 : 6}>{lines}</Text>
                        ) : null}
                    </View>
                    <View style={styles.watermark} pointerEvents="none">
                        <Icon name={subjectIcon(fiche.subject || '')} size={compact ? 64 : 92} color={pal.tab + '22'} />
                    </View>
                </>
            )}

            {/* Pastilles en surimpression */}
            <View style={styles.badges}>
                {certified || verified ? (
                    <View style={[styles.badge, { backgroundColor: certified ? '#2E7D32' : '#1565C0' }]}>
                        <Icon name={certified ? 'ribbon' : 'checkmark-circle'} size={11} color="#fff" />
                        <Text style={styles.badgeText}>{certified ? 'Certifiée' : 'Vérifiée'}</Text>
                    </View>
                ) : <View />}
                {fiche.hasPdf ? (
                    <View style={[styles.badge, styles.badgeInk]}>
                        <Text style={styles.badgeText}>PDF</Text>
                    </View>
                ) : (fiche.fileCount ?? 0) > 1 ? (
                    <View style={[styles.badge, styles.badgeInk]}>
                        <Icon name="image" size={11} color="#fff" />
                        <Text style={styles.badgeText}>{fiche.fileCount}</Text>
                    </View>
                ) : null}
            </View>
            {fiche.level ? (
                <View style={styles.levelTag}><Text style={styles.levelText}>{fiche.level}</Text></View>
            ) : null}
        </View>
    );
});

/** Carte de grille : couverture + titre + auteur + likes */
export const FicheGridCard = memo(function FicheGridCard({
    fiche, width, onPress,
}: { fiche: FicheListItem; width: number; onPress: () => void }) {
    const colors = useColors();
    const s = useMemo(() => cardStyles(colors), [colors]);
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [{ width }, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}>
            <FicheCover fiche={fiche} compact style={{ width, height: Math.round(width * 4 / 3) }} />
            <Text style={s.title} numberOfLines={2}>{fiche.title}</Text>
            <View style={s.row}>
                {fiche.authors?.username ? (
                    <>
                        <Avatar name={fiche.authors.username} userId={fiche.authors._id} size="xs" />
                        <Text style={s.author} numberOfLines={1}>{fiche.authors.username}</Text>
                    </>
                ) : <View style={{ flex: 1 }} />}
                <Icon name="heart" size={12} color={colors.primary} />
                <Text style={s.count}>{fiche.likes}</Text>
            </View>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    cover: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(26,21,18,0.08)' },
    rule: { position: 'absolute', left: 0, right: 0, borderBottomWidth: 1 },
    margin: { position: 'absolute', top: 0, bottom: 0, left: 18, width: 1.5 },
    sheet: { paddingTop: 30, paddingLeft: 28, paddingRight: spacing.md, gap: 6 },
    sheetTitle: { fontFamily: typography.fontFamily.display, fontSize: 22, lineHeight: 24, letterSpacing: -0.3 },
    sheetTitleCompact: { fontSize: 16, lineHeight: 18 },
    underline: { width: 34, height: 3, borderRadius: 2 },
    sheetBody: { fontFamily: typography.fontFamily.regular, fontSize: 10.5, lineHeight: 16 },
    watermark: { position: 'absolute', right: -10, bottom: -8 },
    badges: { position: 'absolute', top: 6, left: 6, right: 6, flexDirection: 'row', justifyContent: 'space-between' },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
    badgeInk: { backgroundColor: 'rgba(26,21,18,0.78)' },
    badgeText: { fontFamily: typography.fontFamily.semiBold, fontSize: 10, color: '#fff' },
    levelTag: { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(253,250,244,0.92)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
    levelText: { fontFamily: typography.fontFamily.semiBold, fontSize: 10, color: '#1A1512' },
});

function cardStyles(c: ThemeColors) {
    return StyleSheet.create({
        title: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, lineHeight: 18, color: c.text, marginTop: spacing.sm },
        row: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
        author: { flex: 1, fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textSecondary },
        count: { fontFamily: typography.fontFamily.semiBold, fontSize: 12, color: c.textSecondary },
    });
}
