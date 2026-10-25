/**
 * Série de jours (streak) — reprend StreakIndicator du site en plein écran :
 * gros compteur flamme, record, et frise verticale des paliers 3 → 100 jours
 * avec leurs récompenses à réclamer.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from '../../components/Icon';
import { SkeletonList, XpBar, Eyebrow } from '../../components/wk';
import { PrimaryButton, BottomSheet } from '../../components/mobile';
import { GameScreen, UnavailableState, ErrorBanner, RewardChip, PaperCard } from '../../components/gameKit';
import { useColors } from '../../lib/useColors';
import { radius, spacing, typography, type ThemeColors } from '../../lib/theme';
import { success, error as hapticError } from '../../lib/haptics';
import { getStreak, claimStreakMilestone, isUnavailable, rewardLabel, type Streak, type StreakMilestone } from '../../lib/gamification';

type Rewards = { points: number; gems: number; mushrooms: number };

function rewardChips(r: Rewards) {
    return (['points', 'gems', 'mushrooms'] as const)
        .filter((k) => r[k] > 0)
        .map((k) => ({ type: k, label: rewardLabel({ type: k, amount: r[k] }) }));
}

export default function SerieScreen() {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);

    const [data, setData] = useState<Streak | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unavailable, setUnavailable] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [claiming, setClaiming] = useState<number | null>(null);
    const [won, setWon] = useState<{ milestone: StreakMilestone; rewards: Rewards; badge: string | null } | null>(null);

    const load = useCallback(async () => {
        try {
            setData(await getStreak());
            setUnavailable(false);
        } catch (e) {
            if (isUnavailable(e)) setUnavailable(true);
            else setMessage((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    const claim = useCallback(async (m: StreakMilestone) => {
        if (claiming) return;
        setClaiming(m.days);
        setMessage(null);
        try {
            const res = await claimStreakMilestone(m.days);
            success();
            setWon({ milestone: m, rewards: res.rewards, badge: res.badge });
            setData((d) => d ? { ...d, milestones: d.milestones.map((x) => x.days === m.days ? { ...x, claimed: true } : x) } : d);
        } catch (e) {
            hapticError();
            setMessage((e as Error).message);
        } finally {
            setClaiming(null);
        }
    }, [claiming]);

    const current = data?.currentStreak ?? 0;
    const milestones = data?.milestones ?? [];
    const next = milestones.find((m) => current < m.days);
    const prevDays = [...milestones].reverse().find((m) => current >= m.days)?.days ?? 0;
    const toClaim = milestones.filter((m) => m.reached && !m.claimed).length;

    return (
        <GameScreen
            eyebrow="Aventure · Série"
            title="Ta série"
            accent="jour après jour"
            subtitle="Reviens chaque jour (cours, quiz, calendrier) pour faire grandir la flamme."
            refreshing={refreshing}
            onRefresh={unavailable ? undefined : onRefresh}
            footer={
                <BottomSheet
                    visible={!!won}
                    onClose={() => setWon(null)}
                    title="Palier réclamé !"
                    footer={<PrimaryButton label="Super !" icon="checkmark" onPress={() => setWon(null)} />}
                >
                    {won ? (
                        <View style={s.wonBody}>
                            <Text style={s.wonEmoji}>🔥</Text>
                            <Text style={s.wonTitle}>{won.milestone.name}</Text>
                            <Text style={s.wonSub}>{won.milestone.days} jours d'affilée</Text>
                            <View style={s.chips}>
                                {rewardChips(won.rewards).map((c) => <RewardChip key={c.type} {...c} />)}
                            </View>
                            {won.badge ? <Text style={s.wonBadge}>Nouveau badge débloqué : {won.badge}</Text> : null}
                        </View>
                    ) : null}
                </BottomSheet>
            }
        >
            {loading ? (
                <SkeletonList count={3} />
            ) : unavailable ? (
                <UnavailableState sitePath="/recompenses" what="Ta série de jours" />
            ) : !data ? (
                <>
                    <ErrorBanner message={message} onClose={() => setMessage(null)} />
                    <UnavailableState sitePath="/recompenses" what="Ta série de jours" />
                </>
            ) : (
                <View style={s.body}>
                    <ErrorBanner message={message} onClose={() => setMessage(null)} />

                    {/* Compteur */}
                    <View style={s.hero}>
                        <View style={[s.flameRing, current > 0 ? s.flameOn : s.flameOff]}>
                            <Icon name="flame" size={56} color={current > 0 ? colors.primary : colors.textMuted} />
                        </View>
                        <Text style={s.count} accessibilityLabel={`${current} jours de série`}>{current}</Text>
                        <Text style={s.countLabel}>jour{current > 1 ? 's' : ''} d'affilée</Text>
                        <View style={s.recordPill}>
                            <Icon name="trophy" size={14} color={colors.accent} />
                            <Text style={s.recordText}>Record : {data.longestStreak} j</Text>
                        </View>
                        {next ? (
                            <View style={s.nextBox}>
                                <View style={s.nextRow}>
                                    <Text style={s.nextText}>Prochain palier : {next.name}</Text>
                                    <Text style={s.nextCount}>{current}/{next.days}</Text>
                                </View>
                                <XpBar percent={((current - prevDays) / Math.max(1, next.days - prevDays)) * 100} />
                                <Text style={s.nextHint}>
                                    Encore {next.days - current} jour{next.days - current > 1 ? 's' : ''}
                                </Text>
                            </View>
                        ) : (
                            <Text style={s.nextHint}>Tous les paliers sont atteints. Légendaire !</Text>
                        )}
                        {current === 0 ? (
                            <Text style={s.nextHint}>Ta flamme est éteinte : une activité aujourd'hui la rallume.</Text>
                        ) : null}
                    </View>

                    {/* Frise des paliers */}
                    <View style={s.sectionHead}>
                        <Eyebrow>Paliers</Eyebrow>
                        {toClaim > 0 ? (
                            <View style={s.toClaim}><Text style={s.toClaimText}>{toClaim} à réclamer</Text></View>
                        ) : null}
                    </View>
                    <View>
                        {milestones.map((m, i) => {
                            const last = i === milestones.length - 1;
                            const claimable = m.reached && !m.claimed;
                            const nodeColor = m.claimed ? colors.success : m.reached ? colors.primary : colors.border;
                            return (
                                <View key={m.days} style={s.stepRow}>
                                    <View style={s.rail}>
                                        <View style={[s.node, { backgroundColor: m.reached ? nodeColor : colors.surface, borderColor: nodeColor }]}>
                                            {m.claimed ? <Icon name="checkmark" size={16} color="#fff" />
                                                : m.reached ? <Icon name="flame" size={16} color="#fff" />
                                                    : <Icon name="lock-closed" size={14} color={colors.textMuted} />}
                                        </View>
                                        {!last ? <View style={[s.line, { backgroundColor: milestones[i + 1].reached ? colors.primary : colors.border }]} /> : null}
                                    </View>
                                    <PaperCard style={[s.stepCard, claimable && s.stepCardHot, !m.reached && s.stepCardLocked]}>
                                        <View style={s.stepHead}>
                                            <Text style={s.stepDays}>{m.days} j</Text>
                                            <Text style={s.stepName} numberOfLines={1}>{m.name}</Text>
                                        </View>
                                        <View style={s.chips}>
                                            {rewardChips(m.rewards).map((c) => <RewardChip key={c.type} {...c} />)}
                                            {m.badge ? <RewardChip type="badge" label="Badge" /> : null}
                                        </View>
                                        {claimable ? (
                                            claiming === m.days ? (
                                                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
                                            ) : (
                                                <PrimaryButton label="Réclamer" icon="gift" onPress={() => claim(m)} style={s.stepBtn} />
                                            )
                                        ) : (
                                            <Text style={[s.stepState, m.claimed && { color: colors.success }]}>
                                                {m.claimed ? 'Réclamé' : `Encore ${m.days - current} j`}
                                            </Text>
                                        )}
                                    </PaperCard>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}
        </GameScreen>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        body: { paddingBottom: spacing.lg },
        hero: {
            margin: spacing.lg,
            padding: spacing.xl,
            alignItems: 'center',
            backgroundColor: c.surface,
            borderRadius: radius['2xl'],
            borderWidth: 1,
            borderColor: c.border,
        },
        flameRing: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center' },
        flameOn: { backgroundColor: c.primary + '1A', borderWidth: 2, borderColor: c.primary + '40' },
        flameOff: { backgroundColor: c.surfaceVariant },
        count: { fontFamily: typography.fontFamily.displayBold, fontSize: 76, lineHeight: 84, color: c.text, marginTop: spacing.sm, letterSpacing: -2 },
        countLabel: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: c.textSecondary, marginTop: -4 },
        recordPill: {
            flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md,
            paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: c.surfaceVariant,
        },
        recordText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.text },
        nextBox: { alignSelf: 'stretch', marginTop: spacing.xl, gap: spacing.sm },
        nextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        nextText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.text, flexShrink: 1 },
        nextCount: { fontFamily: typography.fontFamily.displayBold, fontSize: 15, color: c.accent },
        nextHint: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textSecondary, textAlign: 'center', marginTop: spacing.sm },

        sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
        toClaim: { backgroundColor: c.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
        toClaimText: { fontFamily: typography.fontFamily.heading, fontSize: 11, color: '#fff' },

        stepRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.md },
        rail: { width: 34, alignItems: 'center' },
        node: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
        line: { width: 3, flex: 1, borderRadius: 2, marginVertical: 2 },
        stepCard: { flex: 1, marginBottom: spacing.md },
        stepCardHot: { borderColor: c.primary, borderWidth: 2 },
        stepCardLocked: { opacity: 0.75 },
        stepHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
        stepDays: { fontFamily: typography.fontFamily.displayBold, fontSize: 24, color: c.text },
        stepName: { flex: 1, fontFamily: typography.fontFamily.display, fontSize: 17, color: c.textSecondary },
        chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
        stepBtn: { flex: 0, marginTop: spacing.md },
        stepState: { fontFamily: typography.fontFamily.semiBold, fontSize: 12, color: c.textMuted, marginTop: spacing.md },

        wonBody: { alignItems: 'center', paddingVertical: spacing.md, gap: spacing.xs },
        wonEmoji: { fontSize: 54 },
        wonTitle: { fontFamily: typography.fontFamily.display, fontSize: 26, color: c.text, textAlign: 'center' },
        wonSub: { fontFamily: typography.fontFamily.medium, fontSize: 14, color: c.textSecondary },
        wonBadge: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.accent, marginTop: spacing.sm },
    });
}
