/** Carte de résultat encre : moyenne, verdict, mention et détails (portage de kits/_components/ResultCard du site). */
import { StyleSheet, Text, View } from 'react-native';
import { fmt, mentionFor } from '../../lib/kits/common';
import { radius, spacing, typography } from '../../lib/theme';

const INK = '#1A1512';
const PAPER = '#FDFAF4';

export type Verdict = { label: string; tone: 'ok' | 'warn' | 'ko' } | null;

const TONES = {
    ok: { bg: '#e9f8e1', fg: '#2f6b1a' },
    warn: { bg: '#fff1d6', fg: '#8a5a00' },
    ko: { bg: '#fde4e1', fg: '#9b2c1f' },
} as const;

export default function ResultCard({ average, partial, verdict, children }: {
    average: number | null;
    partial: boolean;
    verdict?: Verdict;
    children?: React.ReactNode;
}) {
    const mention = average !== null ? mentionFor(average) : null;
    return (
        <View style={s.card} accessibilityLiveRegion="polite">
            <Text style={s.kicker}>{partial ? 'Moyenne provisoire' : 'Moyenne finale'}</Text>
            <View style={s.avgRow}>
                <Text style={s.avg}>{average !== null ? fmt(average) : '—'}</Text>
                <Text style={s.over}>/20</Text>
            </View>
            {average !== null ? (
                <View style={s.pills}>
                    {verdict ? (
                        <View style={[s.pill, { backgroundColor: TONES[verdict.tone].bg }]}>
                            <Text style={[s.pillText, { color: TONES[verdict.tone].fg }]}>{verdict.label}</Text>
                        </View>
                    ) : null}
                    {mention && mention.min >= 12 ? (
                        <View style={[s.pill, { backgroundColor: '#FF6A1A' }]}>
                            <Text style={[s.pillText, { color: '#fff' }]}>Mention {mention.label.toLowerCase()}</Text>
                        </View>
                    ) : null}
                </View>
            ) : null}
            {partial && average !== null ? (
                <Text style={s.small}>Calculée sur les notes déjà saisies uniquement.</Text>
            ) : null}
            {children ? <View style={s.details}>{children}</View> : null}
        </View>
    );
}

/** Texte des détails (blanc atténué) */
export function ResultText({ children, strong, style }: { children: React.ReactNode; strong?: boolean; style?: object }) {
    return <Text style={[s.detail, strong && s.detailStrong, style]}>{children}</Text>;
}

/** Ligne libellé / valeur des détails */
export function ResultLine({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
    return (
        <View style={s.line}>
            <Text style={[s.detail, muted && s.muted, { flex: 1 }]}>{label}</Text>
            <Text style={[s.detail, s.detailStrong, muted && s.muted]}>{value}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    card: { backgroundColor: INK, borderRadius: radius['3xl'], padding: spacing['2xl'] },
    kicker: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: 11,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.55)',
    },
    avgRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.md },
    avg: { fontFamily: typography.fontFamily.display, fontSize: 60, lineHeight: 64, color: PAPER },
    over: { fontFamily: typography.fontFamily.regular, fontSize: 16, color: 'rgba(255,255,255,0.5)' },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
    pill: { borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 5 },
    pillText: { fontFamily: typography.fontFamily.semiBold, fontSize: 12 },
    small: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: spacing.md },
    details: { marginTop: spacing.xl, paddingTop: spacing.xl, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', gap: 6 },
    detail: { fontFamily: typography.fontFamily.regular, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.8)' },
    detailStrong: { fontFamily: typography.fontFamily.semiBold, color: '#fff' },
    muted: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
    line: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
});

/**
 * Rappel collant de la moyenne en bas d'écran, quand la grande carte est
 * sortie de l'écran (sur téléphone, la colonne de résultat du site n'existe pas).
 */
export function ResultBar({ visible, average, partial, bottomInset }: {
    visible: boolean;
    average: number | null;
    partial: boolean;
    bottomInset: number;
}) {
    if (!visible || average === null) return null;
    const mention = mentionFor(average);
    return (
        <View style={[bs.bar, { pointerEvents: 'none', bottom: bottomInset + spacing.md }]} accessibilityLiveRegion="polite">
            <Text style={bs.barKicker}>{partial ? 'Provisoire' : 'Finale'}</Text>
            <Text style={bs.barAvg}>{fmt(average)}<Text style={bs.barOver}> /20</Text></Text>
            {mention && mention.min >= 12 ? <Text style={bs.barMention} numberOfLines={1}>Mention {mention.label.toLowerCase()}</Text> : null}
        </View>
    );
}

const bs = StyleSheet.create({
    bar: {
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: INK,
        borderRadius: radius.full,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
    barKicker: { fontFamily: typography.fontFamily.semiBold, fontSize: 10.5, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' },
    barAvg: { fontFamily: typography.fontFamily.display, fontSize: 22, color: PAPER },
    barOver: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: 'rgba(255,255,255,0.5)' },
    barMention: { flex: 1, textAlign: 'right', fontFamily: typography.fontFamily.semiBold, fontSize: 12, color: '#FFB547' },
});
