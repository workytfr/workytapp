/**
 * Missions du jour / de la semaine / du mois — équivalent mobile de
 * QuestsPanel et GuildQuests du site : progression, récompenses, bouton
 * « Récupérer », fin de période, et catalogue des coffres repliable.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import Icon from '../../components/Icon';
import { ChipTabs, SkeletonList, XpBar, Eyebrow, EmptyState } from '../../components/wk';
import { PrimaryButton, BottomSheet } from '../../components/mobile';
import { GameScreen, UnavailableState, ErrorBanner, RewardChip, PaperCard } from '../../components/gameKit';
import { useColors } from '../../lib/useColors';
import { radius, spacing, typography, type ThemeColors } from '../../lib/theme';
import { success, error as hapticError, tapLight } from '../../lib/haptics';
import {
    getQuests, claimQuest, getChests, isUnavailable, rewardLabel, CHEST_LABEL,
    type Quest, type QuestType, type ClaimedReward, type ChestInfo, type ChestType,
} from '../../lib/gamification';

const TABS: { value: QuestType; label: string; icon: string }[] = [
    { value: 'daily', label: 'Jour', icon: 'sunny' },
    { value: 'weekly', label: 'Semaine', icon: 'calendar' },
    { value: 'monthly', label: 'Mois', icon: 'trophy' },
];

/** « se termine dans 5 h » */
function endsIn(iso?: string): string | null {
    if (!iso) return null;
    const ms = new Date(iso).getTime() - Date.now();
    if (!Number.isFinite(ms)) return null;
    if (ms <= 0) return 'Période terminée';
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `Se termine dans ${Math.max(1, mins)} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 48) return `Se termine dans ${hours} h`;
    return `Se termine dans ${Math.floor(hours / 24)} j`;
}

const CHEST_TINT: Record<ChestType, keyof ThemeColors['rarity']> = {
    common: 'commun', rare: 'rare', epic: 'epique', legendary: 'legendaire',
};

/** Libellé d'un gain ouvert dans un coffre */
function chestRewardLabel(r: { rewardType?: string; type?: string; amount?: number; cosmeticType?: string }): string {
    const t = r.rewardType ?? r.type ?? '';
    if (t === 'cosmetic') {
        const kind: Record<string, string> = {
            profile_image: 'Image de profil', profile_border: 'Contour', username_color: 'Couleur de pseudo', avatar_accessory: "Accessoire d'avatar",
        };
        return kind[r.cosmeticType ?? ''] ?? 'Cosmétique';
    }
    return rewardLabel({ type: t, amount: r.amount });
}

export default function QuetesScreen() {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);

    const [tab, setTab] = useState<QuestType>('daily');
    const [byTab, setByTab] = useState<Partial<Record<QuestType, Quest[]>>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unavailable, setUnavailable] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [claiming, setClaiming] = useState<string | null>(null);
    const [won, setWon] = useState<{ quest: Quest; rewards: ClaimedReward[] } | null>(null);

    const [chestsOpen, setChestsOpen] = useState(false);
    const [chests, setChests] = useState<ChestInfo[] | null>(null);
    const [chestsLoading, setChestsLoading] = useState(false);

    const load = useCallback(async (t: QuestType) => {
        try {
            const list = await getQuests(t);
            setByTab((prev) => ({ ...prev, [t]: list }));
            setUnavailable(false);
        } catch (e) {
            if (isUnavailable(e)) setUnavailable(true);
            else setMessage((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!byTab[tab]) { setLoading(true); load(tab); }
    }, [tab, byTab, load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load(tab);
        setRefreshing(false);
    }, [load, tab]);

    const claim = useCallback(async (q: Quest) => {
        if (claiming) return;
        setClaiming(q.id);
        setMessage(null);
        try {
            const res = await claimQuest(q.id);
            success();
            setWon({ quest: q, rewards: res.rewards ?? [] });
            setByTab((prev) => ({ ...prev, [q.type]: (prev[q.type] ?? []).map((x) => x.id === q.id ? { ...x, status: 'claimed' as const } : x) }));
        } catch (e) {
            hapticError();
            setMessage((e as Error).message);
        } finally {
            setClaiming(null);
        }
    }, [claiming]);

    const toggleChests = useCallback(async () => {
        tapLight();
        const open = !chestsOpen;
        setChestsOpen(open);
        if (open && !chests && !chestsLoading) {
            setChestsLoading(true);
            try { setChests(await getChests()); } catch (e) {
                setChests([]);
                if (!isUnavailable(e)) setMessage((e as Error).message);
            } finally { setChestsLoading(false); }
        }
    }, [chestsOpen, chests, chestsLoading]);

    const quests = byTab[tab] ?? [];
    const ready = quests.filter((q) => q.status === 'completed').length;
    const done = quests.filter((q) => q.status !== 'in_progress').length;
    const end = endsIn(quests[0]?.periodEnd);

    return (
        <GameScreen
            eyebrow="Aventure · Missions"
            title="Tes quêtes"
            accent="une à une"
            subtitle="Accomplis tes missions sur Workyt et récupère points, gemmes et coffres."
            refreshing={refreshing}
            onRefresh={unavailable ? undefined : onRefresh}
            footer={
                <BottomSheet
                    visible={!!won}
                    onClose={() => setWon(null)}
                    title="Mission accomplie !"
                    footer={<PrimaryButton label="Super !" icon="checkmark" onPress={() => setWon(null)} />}
                >
                    {won ? (
                        <View style={s.wonBody}>
                            <View style={s.wonIcon}><Icon name="trophy" size={34} color={colors.primary} /></View>
                            <Text style={s.wonTitle}>{won.quest.name}</Text>
                            {won.rewards.map((r, i) => (
                                <View key={i} style={s.wonRow}>
                                    {r.type === 'chest' ? (
                                        <>
                                            <RewardChip type="chest" label={CHEST_LABEL[r.chestType] ?? 'Coffre'} />
                                            <Icon name="arrow-forward" size={14} color={colors.textMuted} />
                                            <RewardChip type={r.reward.rewardType} label={chestRewardLabel(r.reward)} />
                                        </>
                                    ) : (
                                        <RewardChip type={r.type} label={rewardLabel(r)} />
                                    )}
                                </View>
                            ))}
                        </View>
                    ) : null}
                </BottomSheet>
            }
        >
            {unavailable ? (
                <UnavailableState sitePath="/recompenses" what="Le tableau des quêtes" />
            ) : (
                <>
                    <View style={s.tabs}>
                        <ChipTabs options={TABS} value={tab} onChange={(v) => { tapLight(); setTab(v); }} />
                    </View>
                    <ErrorBanner message={message} onClose={() => setMessage(null)} />

                    {loading && !byTab[tab] ? (
                        <SkeletonList count={3} />
                    ) : quests.length === 0 ? (
                        <EmptyState icon="target" title="Aucune mission" text="Les missions de cette période arrivent bientôt. Reviens un peu plus tard !" />
                    ) : (
                        <View style={s.list}>
                            <View style={s.periodRow}>
                                {end ? (
                                    <View style={s.period}>
                                        <Icon name="timer" size={14} color={colors.textSecondary} />
                                        <Text style={s.periodText}>{end}</Text>
                                    </View>
                                ) : <View />}
                                <Text style={s.periodCount}>{done}/{quests.length} faites</Text>
                            </View>
                            {ready > 0 ? (
                                <Text style={s.readyHint}>{ready} récompense{ready > 1 ? 's' : ''} à récupérer</Text>
                            ) : null}

                            {quests.map((q) => {
                                const pct = (Math.min(q.progress, q.target) / Math.max(1, q.target)) * 100;
                                const isReady = q.status === 'completed';
                                const isClaimed = q.status === 'claimed';
                                return (
                                    <PaperCard key={q.id} style={[s.card, isReady && s.cardReady, isClaimed && s.cardClaimed]}>
                                        <View style={s.cardHead}>
                                            <View style={[s.qIcon, { backgroundColor: (isClaimed ? colors.success : colors.primary) + '18' }]}>
                                                <Icon name={isClaimed ? 'checkmark-circle' : 'target'} size={20} color={isClaimed ? colors.success : colors.primary} />
                                            </View>
                                            <View style={s.flex}>
                                                <Text style={s.qName}>{q.name}</Text>
                                                {q.description ? <Text style={s.qDesc}>{q.description}</Text> : null}
                                            </View>
                                        </View>
                                        <View style={s.progressRow}>
                                            <View style={s.flex}><XpBar percent={pct} color={isClaimed ? colors.success : undefined} /></View>
                                            <Text style={s.progressText}>{Math.min(q.progress, q.target)}/{q.target}</Text>
                                        </View>
                                        <View style={s.chips}>
                                            {q.rewards.map((r, i) => <RewardChip key={i} type={r.type} label={rewardLabel(r)} />)}
                                        </View>
                                        {isReady ? (
                                            claiming === q.id ? (
                                                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
                                            ) : (
                                                <PrimaryButton label="Récupérer" icon="gift" onPress={() => claim(q)} style={s.btn} />
                                            )
                                        ) : isClaimed ? (
                                            <View style={s.claimed}>
                                                <Icon name="checkmark" size={14} color={colors.success} />
                                                <Text style={s.claimedText}>Récupérée</Text>
                                            </View>
                                        ) : null}
                                    </PaperCard>
                                );
                            })}
                        </View>
                    )}

                    {/* Catalogue des coffres */}
                    <View style={s.chestWrap}>
                        <Pressable
                            onPress={toggleChests}
                            style={({ pressed }) => [s.chestHead, pressed && { opacity: 0.7 }]}
                            accessibilityRole="button"
                            accessibilityState={{ expanded: chestsOpen }}
                        >
                            <View style={s.qIcon}><Icon name="cube" size={20} color={colors.accent} /></View>
                            <View style={s.flex}>
                                <Text style={s.chestTitle}>Les coffres</Text>
                                <Text style={s.qDesc}>Ce que chaque coffre peut contenir</Text>
                            </View>
                            <Icon name={chestsOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                        </Pressable>
                        {chestsOpen ? (
                            chestsLoading ? (
                                <ActivityIndicator color={colors.primary} style={{ margin: spacing.lg }} />
                            ) : !chests || chests.length === 0 ? (
                                <Text style={s.chestEmpty}>Catalogue indisponible pour le moment.</Text>
                            ) : (
                                chests.map((c) => {
                                    const tint = colors.rarity[CHEST_TINT[c.type] ?? 'commun'];
                                    return (
                                        <View key={c._id} style={[s.chest, { borderColor: tint.border }]}>
                                            <View style={s.chestTop}>
                                                <View style={[s.chestBadge, { backgroundColor: tint.bg }]}>
                                                    <Icon name="cube" size={16} color={tint.text} />
                                                </View>
                                                <View style={s.flex}>
                                                    <Text style={s.chestName}>{c.name || CHEST_LABEL[c.type]}</Text>
                                                    {c.description ? <Text style={s.qDesc}>{c.description}</Text> : null}
                                                </View>
                                            </View>
                                            {[...c.possibleRewards].sort((a, b) => b.probability - a.probability).map((r, i) => (
                                                <View key={i} style={s.oddsRow}>
                                                    <RewardChip type={r.type} label={chestRewardLabel(r)} />
                                                    <View style={s.oddsBar}>
                                                        <View style={[s.oddsFill, { width: `${Math.max(2, Math.min(100, r.probability))}%`, backgroundColor: tint.dot }]} />
                                                    </View>
                                                    <Text style={s.oddsPct}>{r.probability} %</Text>
                                                </View>
                                            ))}
                                        </View>
                                    );
                                })
                            )
                        ) : null}
                    </View>
                </>
            )}
        </GameScreen>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        flex: { flex: 1, minWidth: 0 },
        tabs: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
        list: { padding: spacing.lg, gap: spacing.md },
        periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        period: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        periodText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.textSecondary },
        periodCount: { fontFamily: typography.fontFamily.mono, fontSize: 12, color: c.textSecondary },
        readyHint: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.accent, marginTop: -4 },

        card: { gap: spacing.md },
        cardReady: { borderColor: c.primary, borderWidth: 2 },
        cardClaimed: { opacity: 0.7 },
        cardHead: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
        qIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceVariant },
        qName: { fontFamily: typography.fontFamily.display, fontSize: 19, lineHeight: 23, color: c.text },
        qDesc: { fontFamily: typography.fontFamily.regular, fontSize: 13, lineHeight: 18, color: c.textSecondary, marginTop: 2 },
        progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        progressText: { fontFamily: typography.fontFamily.displayBold, fontSize: 15, color: c.text, minWidth: 44, textAlign: 'right' },
        chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
        btn: { flex: 0 },
        claimed: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, backgroundColor: c.success + '14' },
        claimedText: { fontFamily: typography.fontFamily.semiBold, fontSize: 12, color: c.success },

        chestWrap: { marginHorizontal: spacing.lg, marginTop: spacing.sm, backgroundColor: c.surface, borderRadius: radius.xl + 2, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
        chestHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, minHeight: 64 },
        chestTitle: { fontFamily: typography.fontFamily.display, fontSize: 20, color: c.text },
        chestEmpty: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: c.textSecondary, padding: spacing.lg, paddingTop: 0 },
        chest: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm },
        chestTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
        chestBadge: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
        chestName: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: c.text },
        oddsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        oddsBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: c.surfaceVariant, overflow: 'hidden' },
        oddsFill: { height: '100%', borderRadius: 3 },
        oddsPct: { fontFamily: typography.fontFamily.mono, fontSize: 12, color: c.textSecondary, minWidth: 40, textAlign: 'right' },

        wonBody: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
        wonIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.primary + '18', alignItems: 'center', justifyContent: 'center' },
        wonTitle: { fontFamily: typography.fontFamily.display, fontSize: 22, color: c.text, textAlign: 'center', marginBottom: spacing.sm },
        wonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    });
}
