import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import { useColors } from '../../lib/useColors';
import { spacing, radius, typography, type ThemeColors } from '../../lib/theme';
import {
    getHero, healHero, getDailyQuiz, getStreak, getBoosts, activateBoost, claimCalendarDay, isUnavailable,
    type HeroState, type DailyQuiz, type Streak, type BoostOffer, type ActiveBoost, type CalendarClaim,
} from '../../lib/gamification';
import { PageHeader, XpBar, EmptyState, SkeletonList, Eyebrow } from '../../components/wk';
import { BottomSheet, PrimaryButton } from '../../components/mobile';
import { success, tapLight } from '../../lib/haptics';
import { getSiteOrigin } from '../../lib/siteOrigin';
import { openWeb } from '../../lib/links';

/**
 * Hub de l'aventure (site : /recompenses → HeroPanel, AdventureBoard,
 * GuildQuests) : héros du jour, monstre à combattre, récompense du jour en
 * un tap, série, et accès aux quêtes, calendrier, inventaire et boosts.
 */
export default function AdventureHub() {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);

    const [hero, setHero] = useState<HeroState | null>(null);
    const [quiz, setQuiz] = useState<DailyQuiz | null>(null);
    const [streak, setStreak] = useState<Streak | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unavailable, setUnavailable] = useState(false);
    const [claiming, setClaiming] = useState(false);
    const [claimed, setClaimed] = useState<CalendarClaim | null>(null);
    const [boostsOpen, setBoostsOpen] = useState(false);
    const [boosts, setBoosts] = useState<{ balance: number; boosts: BoostOffer[]; activeBoosts: ActiveBoost[] } | null>(null);

    const load = useCallback(async () => {
        try {
            const [h, q, st] = await Promise.all([getHero(), getDailyQuiz().catch(() => null), getStreak().catch(() => null)]);
            setHero(h);
            setQuiz(q);
            setStreak(st);
            setUnavailable(false);
        } catch (e) {
            if (isUnavailable(e)) setUnavailable(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const heal = async () => {
        try {
            const r = await healHero();
            success();
            setHero((h) => (h ? { ...h, hero: { ...h.hero, hp: r.hp, fainted: false }, mushrooms: r.mushroomsLeft } : h));
        } catch (e) {
            Alert.alert('Soin impossible', (e as Error).message);
        }
    };

    const claimToday = async () => {
        setClaiming(true);
        try {
            const r = await claimCalendarDay();
            success();
            setClaimed(r);
        } catch (e) {
            const msg = (e as Error).message;
            if (/quiz/i.test(msg)) {
                Alert.alert('Récompense verrouillée', 'Réussis le quiz du jour pour la débloquer.', [
                    { text: 'Plus tard', style: 'cancel' },
                    { text: 'Combattre', onPress: () => router.push('/aventure/quiz') },
                ]);
            } else {
                Alert.alert('Récompense du jour', msg);
            }
        } finally {
            setClaiming(false);
        }
    };

    const openBoosts = async () => {
        tapLight();
        setBoostsOpen(true);
        try { setBoosts(await getBoosts()); } catch (e) { Alert.alert('Boosts', (e as Error).message); }
    };

    const activate = async (b: BoostOffer) => {
        try {
            await activateBoost(b.type);
            success();
            setBoosts(await getBoosts());
            getHero().then(setHero).catch(() => {});
        } catch (e) {
            Alert.alert('Boost', (e as Error).message);
        }
    };

    const quizSolved = !!(quiz && quiz.available && quiz.solved);
    const h = hero?.hero;
    const m = hero?.monster;

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + spacing['3xl'] }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
                showsVerticalScrollIndicator={false}
            >
                <PageHeader
                    topInset={insets.top}
                    eyebrow="Aventure"
                    title="Ton aventure"
                    accent="du jour"
                    subtitle="Un combat, une récompense, des quêtes : reviens chaque jour pour faire grandir ta série."
                    right={
                        <Pressable onPress={() => router.back()} style={s.roundBtn} accessibilityLabel="Retour">
                            <Icon name="close" size={20} color={colors.text} />
                        </Pressable>
                    }
                />

                {loading ? (
                    <SkeletonList count={3} />
                ) : unavailable ? (
                    <EmptyState
                        icon="sparkles"
                        title="Bientôt dans l'app"
                        text="L'aventure (héros, quiz du jour, calendrier, quêtes) arrive dans l'application. En attendant, elle t'attend sur workyt.fr."
                        actionLabel="Ouvrir sur workyt.fr"
                        onAction={() => openWeb(`${getSiteOrigin()}/recompenses`, 'Récompenses')}
                    />
                ) : (
                    <View style={s.body}>
                        {/* Série */}
                        {streak ? (
                            <Pressable style={({ pressed }) => [s.streak, pressed && s.pressed]} onPress={() => router.push('/aventure/serie')}>
                                <Text style={s.streakFlame}>🔥</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.streakValue}>{streak.currentStreak} jour{streak.currentStreak > 1 ? 's' : ''}</Text>
                                    <Text style={s.streakLabel}>de série · record {streak.longestStreak}</Text>
                                </View>
                                <Icon name="chevron-forward" size={18} color={colors.textMuted} />
                            </Pressable>
                        ) : null}

                        {/* Combat du jour */}
                        <View style={s.battle}>
                            <View style={s.battleTop}>
                                <Text style={s.monsterEmoji}>{m?.emoji ?? '👾'}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.battleKicker}>{m?.isBoss ? 'Boss du jour' : 'Monstre du jour'}</Text>
                                    <Text style={s.battleTitle}>{m?.name ?? 'Un monstre rôde'}</Text>
                                    {m?.powerLabel ? <Text style={s.battlePower}>{m.powerLabel}</Text> : null}
                                </View>
                            </View>
                            {quiz && !quiz.available ? (
                                <Text style={s.battleNote}>Pas de quiz publié aujourd'hui. Reviens demain !</Text>
                            ) : quizSolved ? (
                                <View style={s.won}>
                                    <Icon name="checkmark-circle" size={18} color={colors.success} />
                                    <Text style={s.wonText}>Vaincu aujourd'hui, bravo !</Text>
                                </View>
                            ) : (
                                <PrimaryButton label="Combattre (quiz du jour)" icon="swords" variant="ink" onPress={() => router.push('/aventure/quiz')} style={{ flex: 0 }} />
                            )}
                        </View>

                        {/* Récompense du jour */}
                        <View style={s.card}>
                            <View style={s.row}>
                                <View style={[s.tileIcon, { backgroundColor: colors.primary }]}><Icon name="gift" size={20} color="#fff" /></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.cardTitle}>Récompense du jour</Text>
                                    <Text style={s.cardText}>{quizSolved ? 'Débloquée : récupère-la !' : 'Se débloque en gagnant le combat.'}</Text>
                                </View>
                            </View>
                            {claimed ? (
                                <View style={s.won}>
                                    <Icon name="sparkles" size={18} color={colors.accent} />
                                    <Text style={s.wonText}>
                                        +{claimed.amount} {claimed.rewardType === 'gems' ? 'gemmes' : claimed.rewardType === 'chest' ? 'coffre' : 'points'}
                                        {claimed.cardEarned ? ' · carte de la semaine gagnée !' : ''}
                                    </Text>
                                </View>
                            ) : (
                                <View style={s.rowGap}>
                                    <PrimaryButton label="Calendrier" variant="ghost" icon="calendar" onPress={() => router.push('/aventure/calendrier')} />
                                    <PrimaryButton label={claiming ? '…' : 'Récupérer'} icon="gift" onPress={claimToday} disabled={claiming || !quizSolved} />
                                </View>
                            )}
                        </View>

                        {/* Héros */}
                        {h ? (
                            <View style={s.card}>
                                <View style={s.row}>
                                    <Text style={s.heroEmoji}>🦊</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.cardTitle}>Ton héros · niveau {h.level}</Text>
                                        <Text style={s.cardText}>⚔️ {h.attack} · 🛡️ {h.defense} · {h.dungeonKills} monstres vaincus</Text>
                                    </View>
                                </View>
                                <View style={s.statLine}>
                                    <Text style={s.statLabel}>PV</Text>
                                    <View style={{ flex: 1 }}><XpBar percent={(h.hp / h.hpMax) * 100} color={colors.error} /></View>
                                    <Text style={s.statVal}>{h.hp}/{h.hpMax}</Text>
                                </View>
                                <View style={s.statLine}>
                                    <Text style={s.statLabel}>XP</Text>
                                    <View style={{ flex: 1 }}><XpBar percent={h.xpProgress * 100} /></View>
                                    <Text style={s.statVal}>{h.xp}/{h.xpForNext}</Text>
                                </View>
                                <View style={s.equip}>
                                    {(['weapon', 'armor', 'amulet'] as const).map((slot) => {
                                        const it = h.equipped[slot];
                                        return (
                                            <View key={slot} style={s.slot}>
                                                <Text style={s.slotEmoji}>{it?.emoji ?? '·'}</Text>
                                                <Text style={s.slotName} numberOfLines={1}>{it?.name ?? (slot === 'weapon' ? 'Arme' : slot === 'armor' ? 'Armure' : 'Amulette')}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                                {h.hp < h.hpMax ? (
                                    <PrimaryButton
                                        label={`Soigner (1 🍄) · ${hero?.mushrooms ?? 0} dispo`}
                                        icon="heart-pulse"
                                        variant={h.fainted ? 'orange' : 'ghost'}
                                        onPress={heal}
                                        disabled={(hero?.mushrooms ?? 0) < 1}
                                        style={{ flex: 0 }}
                                    />
                                ) : null}
                            </View>
                        ) : null}

                        {/* Accès */}
                        <Eyebrow style={{ marginTop: spacing.md }}>Progresser</Eyebrow>
                        <View style={s.grid}>
                            <Tile s={s} icon="target" label="Quêtes" hint="Jour, semaine, mois" onPress={() => router.push('/aventure/quetes')} tint={colors.primary} />
                            <Tile s={s} icon="calendar-check" label="Calendrier" hint="Une récompense / jour" onPress={() => router.push('/aventure/calendrier')} tint={colors.accent3} />
                            <Tile s={s} icon="flame" label="Série" hint="Paliers à réclamer" onPress={() => router.push('/aventure/serie')} tint={colors.accent2} />
                            <Tile s={s} icon="backpack" label="Inventaire" hint="Cadres, couleurs…" onPress={() => router.push('/inventaire')} tint={colors.accent4} />
                            <Tile s={s} icon="flash" label="Boosts" hint={`${hero?.mushrooms ?? 0} 🍄`} onPress={openBoosts} tint={colors.primary} />
                            <Tile s={s} icon="trophy" label="Concours" hint="Gagner des lots" onPress={() => router.push('/recompenses')} tint={colors.accent2} />
                        </View>
                    </View>
                )}
            </ScrollView>

            <BottomSheet visible={boostsOpen} onClose={() => setBoostsOpen(false)} title="Boosts 🍄">
                {!boosts ? (
                    <SkeletonList count={2} />
                ) : (
                    <>
                        <Text style={s.cardText}>Tu as {boosts.balance} champignon{boosts.balance > 1 ? 's' : ''}. Chaque boost soigne aussi ton héros.</Text>
                        {boosts.boosts.map((b) => (
                            <View key={b.type} style={s.boost}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.cardTitle}>{b.name}</Text>
                                    <Text style={s.cardText}>{b.description}</Text>
                                </View>
                                {b.isActive ? (
                                    <Text style={s.activeTag}>Actif</Text>
                                ) : (
                                    <Pressable
                                        disabled={!b.canAfford}
                                        onPress={() => activate(b)}
                                        style={({ pressed }) => [s.boostBtn, !b.canAfford && { opacity: 0.4 }, pressed && s.pressed]}
                                    >
                                        <Text style={s.boostBtnText}>{b.cost} 🍄</Text>
                                    </Pressable>
                                )}
                            </View>
                        ))}
                    </>
                )}
            </BottomSheet>
        </View>
    );
}

function Tile({ s, icon, label, hint, onPress, tint }: { s: ReturnType<typeof createStyles>; icon: string; label: string; hint: string; onPress: () => void; tint: string }) {
    return (
        <Pressable style={({ pressed }) => [s.tile, pressed && s.pressed]} onPress={() => { tapLight(); onPress(); }} accessibilityRole="button" accessibilityLabel={label}>
            <View style={[s.tileIcon, { backgroundColor: tint + '22' }]}><Icon name={icon} size={20} color={tint} /></View>
            <Text style={s.tileLabel}>{label}</Text>
            <Text style={s.tileHint} numberOfLines={1}>{hint}</Text>
        </Pressable>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        roundBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
        body: { padding: spacing.lg, gap: spacing.md },
        pressed: { transform: [{ scale: 0.98 }] },

        streak: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg,
            backgroundColor: c.surface, borderRadius: 24, borderWidth: 1, borderColor: c.border,
        },
        streakFlame: { fontSize: 36 },
        streakValue: { fontFamily: typography.fontFamily.displayBold, fontSize: 26, color: c.text },
        streakLabel: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: c.textSecondary },

        battle: { padding: spacing.lg, borderRadius: 24, backgroundColor: c.surfaceVariant, gap: spacing.md, borderWidth: 1, borderColor: c.border },
        battleTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        monsterEmoji: { fontSize: 52 },
        battleKicker: { fontFamily: typography.fontFamily.mono, fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase', color: c.accent },
        battleTitle: { fontFamily: typography.fontFamily.display, fontSize: 24, lineHeight: 28, color: c.text },
        battlePower: { fontFamily: typography.fontFamily.semiBold, fontSize: 12, color: c.textSecondary, marginTop: 2 },
        battleNote: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: c.textSecondary },
        won: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: c.success + '18' },
        wonText: { flex: 1, fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.text },

        card: { padding: spacing.lg, borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, gap: spacing.md },
        row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        rowGap: { flexDirection: 'row', gap: spacing.sm },
        cardTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: c.text },
        cardText: { fontFamily: typography.fontFamily.regular, fontSize: 13, lineHeight: 18, color: c.textSecondary, marginTop: 1 },
        heroEmoji: { fontSize: 40 },
        statLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        statLabel: { width: 24, fontFamily: typography.fontFamily.mono, fontSize: 11, color: c.textMuted },
        statVal: { minWidth: 56, textAlign: 'right', fontFamily: typography.fontFamily.mono, fontSize: 11, color: c.textSecondary },
        equip: { flexDirection: 'row', gap: spacing.sm },
        slot: { flex: 1, alignItems: 'center', padding: spacing.sm, borderRadius: radius.lg, backgroundColor: c.surfaceVariant },
        slotEmoji: { fontSize: 24 },
        slotName: { fontFamily: typography.fontFamily.medium, fontSize: 11, color: c.textSecondary },

        grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
        tile: {
            width: '31.5%', padding: spacing.md, gap: 4, borderRadius: 20,
            backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
        },
        tileIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
        tileLabel: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.text },
        tileHint: { fontFamily: typography.fontFamily.regular, fontSize: 11, color: c.textMuted },

        boost: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: c.divider },
        boostBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.full, backgroundColor: c.primary, borderBottomWidth: 3, borderBottomColor: c.primaryDark },
        boostBtnText: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: '#fff' },
        activeTag: { fontFamily: typography.fontFamily.semiBold, fontSize: 12, color: c.success },
    });
}
