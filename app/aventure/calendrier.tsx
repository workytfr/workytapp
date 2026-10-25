/**
 * Calendrier des récompenses quotidiennes — version mobile de
 * src/app/calendrier et du plateau AdventureBoard du site : grille du mois,
 * gros bouton « Récupérer » pour aujourd'hui, jours spéciaux, semaines de
 * Guerre des Clans, collection de cartes hebdo et feuille de récompense.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, PanResponder, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import { SkeletonList, Eyebrow } from '../../components/wk';
import { PrimaryButton, BottomSheet } from '../../components/mobile';
import { GameScreen, UnavailableState, ErrorBanner, RewardChip, PaperCard, rewardVisual } from '../../components/gameKit';
import { useColors } from '../../lib/useColors';
import { radius, spacing, typography, type ThemeColors } from '../../lib/theme';
import { success, error as hapticError, tapLight } from '../../lib/haptics';
import {
    getCalendarMonth, claimCalendarDay, localDay, isUnavailable, rewardLabel, CHEST_LABEL,
    type CalendarData, type CalendarDay, type CalendarClaim, type ChestType,
} from '../../lib/gamification';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Emojis des thèmes saisonniers (components/adventure/types.ts du site) */
const THEME_EMOJI: Record<string, string> = {
    christmas: '🎄', newyear: '🎆', chinese_newyear: '🐉', eastern: '🏜️', indian: '🪔',
    japanese: '🌸', canadian: '🍁', french_civil: '🇫🇷', french_cultural: '🎭',
};
/** Thèmes de la Guerre des Clans (lib/clanThemes.ts du site) */
const WAR_THEME: Record<string, { emoji: string; label: string }> = {
    halloween: { emoji: '🎃', label: 'La Nuit des Citrouilles' },
    automne: { emoji: '🍂', label: "Les Brumes d'automne" },
    hiver: { emoji: '❄️', label: "Le Siège d'hiver" },
    nouvel_an: { emoji: '🎆', label: 'Les Aurores du Nouvel An' },
    carnaval: { emoji: '🎭', label: 'Le Grand Carnaval' },
    printemps: { emoji: '🌸', label: 'Le Printemps des Cerisiers' },
    examens: { emoji: '📚', label: 'Le Siège des Examens' },
    ete: { emoji: '🏴‍☠️', label: "L'Été des Pirates" },
};

function warLabel(w: CalendarData['wars'][number]) {
    if (w.status === 'truce') return { emoji: '🕊️', text: 'Trêve : pas de Guerre des Clans' };
    const t = WAR_THEME[w.theme];
    return {
        emoji: t?.emoji ?? '⚔️',
        text: `${t ? `Guerre · ${t.label}` : 'Guerre des Clans'}${w.status === 'planned' ? ' (prévue)' : ''}`,
    };
}

type Lock = 'quiz' | 'fainted' | null;

/** Libellé d'une récompense de jour */
function dayReward(d: CalendarDay) {
    return rewardLabel({ type: d.reward.type, amount: d.reward.amount, chestType: d.reward.chestType });
}

function longDate(date: string) {
    const [y, m, d] = date.split('-').map(Number);
    const t = new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function CalendrierScreen() {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();

    const now = new Date();
    const today = localDay(now);
    const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
    const [data, setData] = useState<CalendarData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unavailable, setUnavailable] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [claiming, setClaiming] = useState(false);
    const [lock, setLock] = useState<Lock>(null);
    const [ceremony, setCeremony] = useState<CalendarClaim | null>(null);
    const [selected, setSelected] = useState<CalendarDay | null>(null);

    const isCurrentMonth = cursor.y === now.getFullYear() && cursor.m === now.getMonth();
    const monthIndex = cursor.y * 12 + cursor.m;
    const nowIndex = now.getFullYear() * 12 + now.getMonth();
    const canPrev = monthIndex > nowIndex - 12;
    const canNext = monthIndex < nowIndex + 1;

    const load = useCallback(async (y: number, m: number) => {
        try {
            const res = await getCalendarMonth(y, m);
            // Le serveur peut renvoyer des dates ISO : on revient au jour local (comme le site)
            const days = (res.days ?? []).map((d) => ({ ...d, date: /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : localDay(new Date(d.date)) }));
            setData({ ...res, days, wars: Array.isArray(res.wars) ? res.wars : [] });
            setUnavailable(false);
        } catch (e) {
            if (isUnavailable(e)) setUnavailable(true);
            else setMessage((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { setLoading(true); load(cursor.y, cursor.m); }, [cursor, load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load(cursor.y, cursor.m);
        setRefreshing(false);
    }, [load, cursor]);

    const shift = useCallback((delta: number) => {
        setCursor((c) => {
            const idx = c.y * 12 + c.m + delta;
            if (idx < nowIndex - 12 || idx > nowIndex + 1) return c;
            tapLight();
            return { y: Math.floor(idx / 12), m: idx % 12 };
        });
    }, [nowIndex]);

    // Glisser à gauche / à droite sur la grille pour changer de mois
    const shiftRef = useRef(shift);
    shiftRef.current = shift;
    const pan = useMemo(() => PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_, g) => {
            if (g.dx < -50) shiftRef.current(1);
            else if (g.dx > 50) shiftRef.current(-1);
        },
    }), []);

    const claim = useCallback(async () => {
        if (claiming) return;
        setClaiming(true);
        setMessage(null);
        try {
            const res = await claimCalendarDay(today);
            success();
            setLock(null);
            setCeremony(res);
            setData((d) => d ? { ...d, days: d.days.map((x) => x.date === today ? { ...x, claimed: true } : x) } : d);
            load(cursor.y, cursor.m);
        } catch (e) {
            hapticError();
            const msg = (e as Error).message || 'Erreur lors de la récupération';
            const low = msg.toLowerCase();
            if (isUnavailable(e)) setUnavailable(true);
            else if (low.includes('quiz')) setLock('quiz');
            else if (low.includes('évanoui') || low.includes('evanoui')) setLock('fainted');
            else setMessage(msg);
        } finally {
            setClaiming(false);
        }
    }, [claiming, today, load, cursor]);

    // Grille : semaines du lundi au dimanche
    const weeks = useMemo(() => {
        const byDate = new Map((data?.days ?? []).map((d) => [d.date, d]));
        const first = new Date(cursor.y, cursor.m, 1);
        const lead = (first.getDay() + 6) % 7;
        const count = new Date(cursor.y, cursor.m + 1, 0).getDate();
        const cells: ({ date: string; n: number; day?: CalendarDay } | null)[] = Array(lead).fill(null);
        for (let n = 1; n <= count; n++) {
            const date = localDay(new Date(cursor.y, cursor.m, n));
            cells.push({ date, n, day: byDate.get(date) });
        }
        while (cells.length % 7) cells.push(null);
        const rows: { monday: string; cells: typeof cells }[] = [];
        for (let i = 0; i < cells.length; i += 7) {
            // Lundi de la ligne (même s'il tombe le mois précédent)
            const monday = localDay(new Date(cursor.y, cursor.m, 1 - lead + i));
            rows.push({ monday, cells: cells.slice(i, i + 7) });
        }
        return rows;
    }, [data, cursor]);

    const warsByMonday = useMemo(() => new Map((data?.wars ?? []).map((w) => [w.monday, w])), [data]);
    const todayDay = data?.days.find((d) => d.date === today);
    const claimedCount = data?.days.filter((d) => d.claimed).length ?? 0;
    const collection = data?.collection;

    const openDay = (cell: { date: string; day?: CalendarDay }) => {
        tapLight();
        if (cell.date === today && todayDay && !todayDay.claimed && !lock) { claim(); return; }
        if (cell.day) setSelected(cell.day);
    };

    return (
        <GameScreen
            eyebrow="Aventure · Calendrier"
            title="Une case"
            accent="chaque jour"
            subtitle="Récupère ta récompense le jour même, sinon elle est perdue."
            refreshing={refreshing}
            onRefresh={unavailable ? undefined : onRefresh}
            footer={
                <>
                    <BottomSheet
                        visible={!!ceremony}
                        onClose={() => setCeremony(null)}
                        title="Récompense !"
                        footer={<PrimaryButton label="Super !" icon="checkmark" onPress={() => setCeremony(null)} />}
                    >
                        {ceremony ? <Ceremony result={ceremony} s={s} colors={colors} /> : null}
                    </BottomSheet>
                    <BottomSheet visible={!!selected} onClose={() => setSelected(null)} title={selected ? longDate(selected.date) : ''}>
                        {selected ? (
                            <View style={s.sheetBody}>
                                {selected.isSpecial ? (
                                    <View style={s.specialPill}>
                                        <Text>{THEME_EMOJI[selected.theme] ?? '✨'}</Text>
                                        <Text style={s.specialText}>{selected.specialName || 'Jour spécial'}</Text>
                                    </View>
                                ) : null}
                                {selected.description ? <Text style={s.sheetText}>{selected.description}</Text> : null}
                                <View style={s.chipsRow}><RewardChip type={selected.reward.type} label={dayReward(selected)} /></View>
                                <Text style={s.sheetState}>
                                    {selected.claimed ? 'Récupérée'
                                        : selected.date < today ? 'Pas récupérée : case perdue'
                                            : selected.date === today ? "C'est aujourd'hui !"
                                                : 'À venir'}
                                </Text>
                            </View>
                        ) : null}
                    </BottomSheet>
                </>
            }
        >
            {unavailable ? (
                <UnavailableState sitePath="/calendrier" what="Le calendrier des récompenses" />
            ) : (
                <View style={s.body}>
                    <ErrorBanner message={message} onClose={() => setMessage(null)} />

                    {/* Aujourd'hui */}
                    {isCurrentMonth && !loading && todayDay ? (
                        <PaperCard style={[s.today, !todayDay.claimed && !lock && s.todayHot]}>
                            <Eyebrow>Aujourd'hui</Eyebrow>
                            <Text style={s.todayDate}>{longDate(today)}</Text>
                            {todayDay.isSpecial ? (
                                <View style={[s.specialPill, { marginTop: spacing.sm }]}>
                                    <Text>{THEME_EMOJI[todayDay.theme] ?? '✨'}</Text>
                                    <Text style={s.specialText}>{todayDay.specialName || 'Jour spécial'}</Text>
                                </View>
                            ) : null}
                            <View style={s.todayReward}>
                                <RewardBig day={todayDay} s={s} colors={colors} />
                            </View>
                            {todayDay.claimed ? (
                                <View style={s.claimedBox}>
                                    <Icon name="checkmark-circle" size={18} color={colors.success} />
                                    <Text style={s.claimedText}>Récupérée — à demain !</Text>
                                </View>
                            ) : lock === 'quiz' ? (
                                <View style={s.lockBox}>
                                    <View style={s.lockHead}>
                                        <Icon name="lock-closed" size={16} color={colors.accent} />
                                        <Text style={s.lockText}>Réussis le quiz du jour pour débloquer</Text>
                                    </View>
                                    <PrimaryButton label="Jouer le quiz du jour" icon="flash" variant="ink" onPress={() => router.push('/aventure/quiz' as never)} />
                                </View>
                            ) : lock === 'fainted' ? (
                                <View style={s.lockBox}>
                                    <View style={s.lockHead}>
                                        <Icon name="heart-pulse" size={16} color={colors.error} />
                                        <Text style={s.lockText}>Ton héros est évanoui : soigne-le pour récupérer ta case</Text>
                                    </View>
                                    <PrimaryButton label="Soigner mon héros" icon="heart-pulse" variant="ink" onPress={() => router.push('/aventure' as never)} />
                                </View>
                            ) : claiming ? (
                                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
                            ) : (
                                <PrimaryButton label="Récupérer" icon="gift" onPress={claim} style={s.todayBtn} />
                            )}
                        </PaperCard>
                    ) : null}

                    {/* Mois */}
                    <PaperCard style={s.monthCard}>
                        <View style={s.monthHead}>
                            <Pressable onPress={() => shift(-1)} disabled={!canPrev} hitSlop={6} style={[s.navBtn, !canPrev && { opacity: 0.3 }]} accessibilityLabel="Mois précédent">
                                <Icon name="chevron-back" size={20} color={colors.text} />
                            </Pressable>
                            <View style={s.monthTitleBox}>
                                <Text style={s.monthTitle}>{MONTHS[cursor.m]} {cursor.y}</Text>
                                {!loading && data ? <Text style={s.monthSub}>{claimedCount} case{claimedCount > 1 ? 's' : ''} récupérée{claimedCount > 1 ? 's' : ''}</Text> : null}
                            </View>
                            <Pressable onPress={() => shift(1)} disabled={!canNext} hitSlop={6} style={[s.navBtn, !canNext && { opacity: 0.3 }]} accessibilityLabel="Mois suivant">
                                <Icon name="chevron-forward" size={20} color={colors.text} />
                            </Pressable>
                        </View>

                        <View style={s.weekdays}>
                            {WEEKDAYS.map((w, i) => <Text key={i} style={s.weekday}>{w}</Text>)}
                        </View>

                        {loading ? (
                            <View style={{ marginHorizontal: -spacing.lg }}><SkeletonList count={2} /></View>
                        ) : (
                            <View {...pan.panHandlers}>
                                {weeks.map((row) => {
                                    const war = warsByMonday.get(row.monday);
                                    const wl = war ? warLabel(war) : null;
                                    return (
                                        <View key={row.monday}>
                                            {wl ? (
                                                <View style={[s.warStrip, war?.status === 'truce' && s.truceStrip]}>
                                                    <Text style={s.warEmoji}>{wl.emoji}</Text>
                                                    <Text style={s.warText} numberOfLines={1}>{wl.text}</Text>
                                                </View>
                                            ) : null}
                                            <View style={s.row}>
                                                {row.cells.map((cell, i) => {
                                                    if (!cell) return <View key={i} style={s.cell} />;
                                                    const d = cell.day;
                                                    const isToday = cell.date === today;
                                                    const past = cell.date < today;
                                                    const missed = past && d && !d.claimed;
                                                    const v = d ? rewardVisual(d.reward.type, colors) : null;
                                                    return (
                                                        <View key={i} style={s.cell}>
                                                            <Pressable
                                                                onPress={() => openDay(cell)}
                                                                disabled={!d}
                                                                style={({ pressed }) => [
                                                                    s.day,
                                                                    d?.claimed && s.dayClaimed,
                                                                    missed && s.dayMissed,
                                                                    isToday && s.dayToday,
                                                                    isToday && d?.claimed && s.dayTodayClaimed,
                                                                    d?.isSpecial && !d.claimed && !isToday && s.daySpecial,
                                                                    pressed && { transform: [{ scale: 0.94 }] },
                                                                ]}
                                                                accessibilityRole="button"
                                                                accessibilityLabel={`${cell.n} ${MONTHS[cursor.m]}${d ? `, ${dayReward(d)}${d.claimed ? ', récupérée' : ''}` : ''}`}
                                                            >
                                                                <Text style={[s.dayNum, isToday && { color: '#fff' }, missed && { color: colors.textMuted }]}>{cell.n}</Text>
                                                                {d?.claimed ? (
                                                                    <Icon name="checkmark" size={13} color={isToday ? '#fff' : colors.success} />
                                                                ) : isToday && lock ? (
                                                                    <Icon name="lock-closed" size={12} color="#fff" />
                                                                ) : d?.isSpecial ? (
                                                                    <Text style={s.dayEmoji}>{THEME_EMOJI[d.theme] ?? '✨'}</Text>
                                                                ) : v && !missed ? (
                                                                    v.emoji ? <Text style={s.dayEmoji}>{v.emoji}</Text>
                                                                        : <Icon name={v.icon!} size={11} color={isToday ? '#fff' : v.color} />
                                                                ) : null}
                                                            </Pressable>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        <View style={s.legend}>
                            <Legend color={colors.primary} label="Aujourd'hui" s={s} />
                            <Legend color={colors.success} label="Récupérée" s={s} />
                            <Legend color={colors.accent2} label="Jour spécial" s={s} />
                            <Legend color={colors.border} label="Perdue" s={s} />
                        </View>
                        <Text style={s.swipeHint}>Glisse sur la grille pour changer de mois</Text>
                    </PaperCard>

                    {/* Collection */}
                    {collection && collection.totalWeeks > 0 ? (
                        <PaperCard style={s.collection}>
                            <View style={s.collHead}>
                                <View style={s.collTitleRow}>
                                    <Icon name="trophy" size={16} color={colors.accent} />
                                    <Text style={s.collTitle}>Collection du mois</Text>
                                </View>
                                <Text style={s.collCount}>{collection.cards.length}/{collection.totalWeeks}</Text>
                            </View>
                            <View style={s.cards}>
                                {Array.from({ length: collection.totalWeeks }, (_, week) => {
                                    const card = collection.cards.find((c) => c.week === week);
                                    return (
                                        <View key={week} style={[s.card, card ? s.cardOn : s.cardOff]}>
                                            <Text style={s.cardEmoji}>{card ? (THEME_EMOJI[card.theme] || '🃏') : '?'}</Text>
                                            <Text style={[s.cardWeek, card && { color: '#fff' }]}>Sem. {week + 1}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                            <Text style={s.collHint}>
                                {collection.setCompleted
                                    ? '🏆 Set complet — coffre épique remporté !'
                                    : "Récupère toutes les cases d'une semaine pour gagner sa carte. Set complet = coffre épique !"}
                            </Text>
                        </PaperCard>
                    ) : null}
                </View>
            )}
        </GameScreen>
    );
}

function Legend({ color, label, s }: { color: string; label: string; s: ReturnType<typeof createStyles> }) {
    return (
        <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: color }]} />
            <Text style={s.legendText}>{label}</Text>
        </View>
    );
}

function RewardBig({ day, s, colors }: { day: CalendarDay; s: ReturnType<typeof createStyles>; colors: ThemeColors }) {
    const v = rewardVisual(day.reward.type, colors);
    const big = day.reward.type === 'chest' ? CHEST_LABEL[(day.reward.chestType as ChestType) ?? 'common'] : String(day.reward.amount ?? 0);
    const unit = day.reward.type === 'points' ? 'points' : day.reward.type === 'gems' ? `gemme${(day.reward.amount ?? 0) > 1 ? 's' : ''}` : '';
    return (
        <View style={s.bigRow}>
            <View style={[s.bigIcon, { backgroundColor: v.color + '18' }]}>
                {v.emoji ? <Text style={{ fontSize: 26 }}>{v.emoji}</Text> : <Icon name={v.icon!} size={28} color={v.color} />}
            </View>
            <Text style={day.reward.type === 'chest' ? s.bigChest : s.bigNum}>{big}</Text>
            {unit ? <Text style={s.bigUnit}>{unit}</Text> : null}
        </View>
    );
}

function Ceremony({ result, s, colors }: { result: CalendarClaim; s: ReturnType<typeof createStyles>; colors: ThemeColors }) {
    const v = rewardVisual(result.rewardType, colors);
    const chest = result.rewardType === 'chest';
    const cr = result.chestReward;
    return (
        <View style={s.cerBody}>
            <View style={[s.cerIcon, { backgroundColor: v.color + '18' }]}>
                {v.emoji ? <Text style={{ fontSize: 40 }}>{v.emoji}</Text> : <Icon name={v.icon!} size={40} color={v.color} />}
            </View>
            <Text style={s.cerTitle}>
                {chest ? CHEST_LABEL[(result.chestType as ChestType) ?? 'common'] ?? 'Coffre' : rewardLabel({ type: result.rewardType, amount: result.amount })}
            </Text>
            {chest && cr ? (
                <Text style={s.cerSub}>
                    {cr.rewardType === 'cosmetic' ? 'Un cosmétique à l\'intérieur ! Retrouve-le dans ton inventaire.' : `${rewardLabel({ type: cr.rewardType, amount: cr.amount })} à l'intérieur !`}
                </Text>
            ) : null}
            {result.cardEarned ? (
                <View style={s.cerLine}>
                    <Text style={{ fontSize: 18 }}>{THEME_EMOJI[result.cardEarned.theme] || '🃏'}</Text>
                    <Text style={s.cerLineText}>Carte de la semaine {result.cardEarned.week + 1} gagnée !</Text>
                </View>
            ) : null}
            {result.setCompleted ? (
                <View style={s.cerLine}>
                    <Text style={{ fontSize: 18 }}>🏆</Text>
                    <Text style={s.cerLineText}>Set complet — coffre épique remporté !</Text>
                </View>
            ) : null}
            {typeof result.currentStreak === 'number' && result.currentStreak > 0 ? (
                <View style={s.cerLine}>
                    <Icon name="flame" size={18} color={colors.primary} />
                    <Text style={s.cerLineText}>Série : {result.currentStreak} jour{result.currentStreak > 1 ? 's' : ''}</Text>
                </View>
            ) : null}
            {result.bossLoot ? (
                <View style={s.loot}>
                    <Text style={s.lootEmoji}>{result.bossLoot.emoji}</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={s.lootName}>{result.bossLoot.name}</Text>
                        <Text style={s.lootMeta}>Butin de boss · {result.bossLoot.rarity} · +{result.bossLoot.stat}{result.bossLoot.autoEquipped ? ' · équipé' : ''}</Text>
                        {result.bossLoot.flavor ? <Text style={s.lootFlavor}>« {result.bossLoot.flavor} »</Text> : null}
                    </View>
                </View>
            ) : null}
        </View>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        body: { paddingBottom: spacing.lg },

        today: { marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.xl },
        todayHot: { borderColor: c.primary, borderWidth: 2 },
        todayDate: { fontFamily: typography.fontFamily.display, fontSize: 24, color: c.text, marginTop: spacing.sm },
        todayReward: { marginTop: spacing.lg },
        todayBtn: { flex: 0, marginTop: spacing.lg, minHeight: 56 },
        bigRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        bigIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
        bigNum: { fontFamily: typography.fontFamily.displayBold, fontSize: 44, color: c.text, letterSpacing: -1 },
        bigChest: { fontFamily: typography.fontFamily.display, fontSize: 24, color: c.text, flexShrink: 1 },
        bigUnit: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: c.textSecondary, marginTop: 10 },
        claimedBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.lg, backgroundColor: c.success + '12' },
        claimedText: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.success },
        lockBox: { marginTop: spacing.lg, gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: c.surfaceVariant },
        lockHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        lockText: { flex: 1, fontFamily: typography.fontFamily.semiBold, fontSize: 14, lineHeight: 19, color: c.text },

        specialPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: c.accent2 + '30' },
        specialText: { fontFamily: typography.fontFamily.semiBold, fontSize: 12, color: c.text },

        monthCard: { marginHorizontal: spacing.lg, marginTop: spacing.lg, paddingHorizontal: spacing.md },
        monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
        navBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceVariant },
        monthTitleBox: { alignItems: 'center' },
        monthTitle: { fontFamily: typography.fontFamily.display, fontSize: 22, color: c.text },
        monthSub: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textSecondary, marginTop: 2 },
        weekdays: { flexDirection: 'row', marginBottom: spacing.xs },
        weekday: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: typography.fontFamily.mono, fontSize: 11, color: c.textMuted },
        row: { flexDirection: 'row' },
        cell: { width: `${100 / 7}%`, aspectRatio: 0.92, padding: 2.5 },
        day: {
            flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 1,
            backgroundColor: c.background, borderWidth: 1, borderColor: c.divider,
        },
        dayClaimed: { backgroundColor: c.success + '14', borderColor: c.success + '40' },
        dayMissed: { backgroundColor: c.surfaceVariant, borderColor: c.surfaceVariant, opacity: 0.7 },
        dayToday: { backgroundColor: c.primary, borderColor: c.primaryDark, borderBottomWidth: 3 },
        dayTodayClaimed: { backgroundColor: c.success, borderColor: c.success },
        daySpecial: { borderColor: c.accent2, borderWidth: 1.5, backgroundColor: c.accent2 + '1A' },
        dayNum: { fontFamily: typography.fontFamily.displayBold, fontSize: 15, color: c.text },
        dayEmoji: { fontSize: 10 },

        warStrip: {
            flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs, marginHorizontal: 2.5,
            paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#DC262640',
        },
        truceStrip: { backgroundColor: '#F0FDF4', borderColor: '#16A34A40' },
        warEmoji: { fontSize: 11 },
        warText: { flex: 1, fontFamily: typography.fontFamily.semiBold, fontSize: 11, color: '#1A1512' },

        legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md, paddingHorizontal: spacing.xs },
        legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
        legendDot: { width: 9, height: 9, borderRadius: 5 },
        legendText: { fontFamily: typography.fontFamily.regular, fontSize: 11, color: c.textSecondary },
        swipeHint: { fontFamily: typography.fontFamily.regular, fontSize: 11, color: c.textMuted, marginTop: spacing.sm, paddingHorizontal: spacing.xs },

        collection: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
        collHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        collTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        collTitle: { fontFamily: typography.fontFamily.display, fontSize: 19, color: c.text },
        collCount: { fontFamily: typography.fontFamily.heading, fontSize: 12, color: c.accent, backgroundColor: c.primary + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, overflow: 'hidden' },
        cards: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
        card: { flex: 1, height: 84, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 4 },
        cardOn: { backgroundColor: c.primary, borderWidth: 2, borderColor: c.accent2 },
        cardOff: { backgroundColor: c.surfaceVariant, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.textMuted },
        cardEmoji: { fontSize: 22, color: c.textMuted, fontFamily: typography.fontFamily.displayBold },
        cardWeek: { fontFamily: typography.fontFamily.semiBold, fontSize: 10, color: c.textSecondary },
        collHint: { fontFamily: typography.fontFamily.regular, fontSize: 12, lineHeight: 17, color: c.textSecondary, marginTop: spacing.md },

        sheetBody: { gap: spacing.md, paddingBottom: spacing.md },
        sheetText: { fontFamily: typography.fontFamily.regular, fontSize: 14, lineHeight: 20, color: c.textSecondary },
        sheetState: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.textMuted },
        chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

        cerBody: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
        cerIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
        cerTitle: { fontFamily: typography.fontFamily.displayBold, fontSize: 30, color: c.text, textAlign: 'center' },
        cerSub: { fontFamily: typography.fontFamily.medium, fontSize: 14, color: c.textSecondary, textAlign: 'center' },
        cerLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
        cerLineText: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.text },
        loot: { alignSelf: 'stretch', flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
        lootEmoji: { fontSize: 32 },
        lootName: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: c.text },
        lootMeta: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textSecondary, marginTop: 2 },
        lootFlavor: { fontFamily: typography.fontFamily.regular, fontSize: 12, fontStyle: 'italic', color: c.textMuted, marginTop: 4 },
    });
}
