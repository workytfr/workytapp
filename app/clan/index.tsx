import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Image, Alert, ActivityIndicator, AppState,
    type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '../../lib/useColors';
import { spacing, radius, typography, type ThemeColors } from '../../lib/theme';
import {
    CHAT_CATEGORY_LABEL, CHAT_TEMPLATES, CHEST_LABEL, GATES, GATE_LABEL, ROLE_META, SOLDIER_CATALOG,
    buySoldier, cancelPurchase, deployUnit, getBattleReport, getChat, getMyClan, getSoldiers, getWeeklyReward,
    markRewardSeen, renderTemplate, sendChat, setDailyOrder, setMyGate, setRole, soldierImage,
    type BattleReport, type ChatData, type ChatTemplateDef, type ClanRole, type GateName, type MyClanData,
    type SoldiersData, type Stance, type WeeklyReward,
} from '../../lib/clan';
import { BattleReportModal, Castle, WarScoreboard, WeeklyRewardModal } from '../../components/clan';
import { ChipTabs, EmptyState, Eyebrow, IconButton, SkeletonList } from '../../components/wk';

type Tab = 'combat' | 'garnison' | 'tchat' | 'journal';
const SEEN_REPORT_KEY = '@workyt_clan_report_seen';

/** Guerre des Clans — version mobile de /clan. */
export default function ClanScreen() {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);

    const [data, setData] = useState<MyClanData | null>(null);
    const [error, setError] = useState('');
    const [tab, setTab] = useState<Tab>('combat');
    const [refreshing, setRefreshing] = useState(false);
    const [report, setReport] = useState<BattleReport | null>(null);
    const [reward, setReward] = useState<WeeklyReward | null>(null);

    const load = useCallback(async () => {
        try {
            setError('');
            setData(await getMyClan());
        } catch (e: any) {
            setError(e.message || 'Impossible de charger la guerre.');
        } finally {
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    // À l'ouverture : butin de fin de guerre, sinon rapport du jour pas encore vu
    useEffect(() => {
        (async () => {
            try {
                const r = await getWeeklyReward();
                if (r) { setReward(r); return; }
                const rep = await getBattleReport();
                if (!rep) return;
                const seen = await AsyncStorage.getItem(SEEN_REPORT_KEY);
                const key = `${rep.day}:${rep.clan?.name ?? ''}`;
                if (seen !== key) setReport(rep);
            } catch { /* pas enrôlé : rien à montrer */ }
        })();
    }, []);

    const closeReport = useCallback(() => {
        if (report) AsyncStorage.setItem(SEEN_REPORT_KEY, `${report.day}:${report.clan?.name ?? ''}`).catch(() => {});
        setReport(null);
    }, [report]);

    const closeReward = useCallback(() => {
        setReward(null);
        markRewardSeen().catch(() => {});
    }, []);

    const clan = data?.clan;

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[s.topbar, { paddingTop: insets.top + spacing.sm }]}>
                <View style={s.flex}>
                    <Eyebrow>Guerre des clans</Eyebrow>
                    <Text style={s.title}>{clan?.name ?? 'Clans'}<Text style={{ color: colors.primary }}>.</Text></Text>
                </View>
                <IconButton icon="close" label="Fermer" onPress={() => router.back()} />
            </View>

            {!data && !error ? (
                <SkeletonList count={3} />
            ) : error ? (
                <EmptyState icon="shield-outline" title="Guerre indisponible" text={error} actionLabel="Réessayer" onAction={load} />
            ) : !clan ? (
                <NotEnrolled reason={data?.reason} s={s} colors={colors} />
            ) : (
                <>
                    <ChipTabs<Tab>
                        value={tab}
                        onChange={setTab}
                        style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
                        options={[
                            { value: 'combat', label: 'Combat', icon: 'flash-outline' },
                            { value: 'garnison', label: 'Garnison', icon: 'people-outline' },
                            { value: 'tchat', label: 'Tchat', icon: 'chatbubbles-outline' },
                            { value: 'journal', label: 'Journal', icon: 'newspaper-outline' },
                        ]}
                    />
                    {tab === 'tchat' ? (
                        <ChatTab data={data!} s={s} colors={colors} bottomInset={insets.bottom} />
                    ) : (
                        <ScrollView
                            contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing['3xl'], gap: spacing.md }}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
                        >
                            {tab === 'combat' ? <CombatTab data={data!} s={s} colors={colors} onChanged={load} /> : null}
                            {tab === 'garnison' ? <GarrisonTab data={data!} s={s} colors={colors} onChanged={load} /> : null}
                            {tab === 'journal' ? <JournalTab data={data!} s={s} colors={colors} /> : null}
                        </ScrollView>
                    )}
                </>
            )}

            <WeeklyRewardModal reward={reward} onClose={closeReward} />
            <BattleReportModal report={reward ? null : report} onClose={closeReport} />
        </View>
    );
}

type Styles = ReturnType<typeof createStyles>;
type TabProps = { data: MyClanData; s: Styles; colors: ThemeColors };

/* ───────────── Pas enrôlé ───────────── */

function NotEnrolled({ reason, s, colors }: { reason?: string; s: Styles; colors: ThemeColors }) {
    return (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
            <EmptyState
                icon={reason === 'event_week' ? 'sparkles-outline' : 'shield-half-outline'}
                title={reason === 'event_week' ? 'Semaine d’événement' : 'Pas de clan cette semaine'}
                text={reason === 'event_week'
                    ? 'La guerre fait une pause pendant l’événement. Elle reprend lundi prochain.'
                    : 'Les clans se forment chaque lundi parmi les membres actifs. Gagne des points cette semaine pour être enrôlé à la prochaine guerre.'}
            />
            <Rules s={s} colors={colors} />
        </ScrollView>
    );
}

function Rules({ s, colors }: { s: Styles; colors: ThemeColors }) {
    const steps = [
        ['⚡', 'Tes points = tes coups', 'Chaque point gagné sur Workyt (forum, fiches, quiz, cours) alimente ton clan.'],
        ['🎭', 'Choisis ton rôle', 'Attaquant, défenseur ou soigneur. Il se fige dès ton premier point du jour.'],
        ['🏰', 'Vise une porte', 'Nord, Est ou Sud. Fais tomber une porte adverse pour atteindre le donjon.'],
        ['🌙', 'Résolution à minuit', 'Chaque nuit, la bataille est calculée. 7 jours, le clan qui en gagne le plus remporte la guerre.'],
    ];
    return (
        <View style={s.card}>
            <Text style={s.cardTitle}>Comment ça marche</Text>
            {steps.map(([e, t, d]) => (
                <View key={t} style={s.ruleRow}>
                    <Text style={s.ruleEmoji}>{e}</Text>
                    <View style={s.flex}>
                        <Text style={s.ruleTitle}>{t}</Text>
                        <Text style={s.muted}>{d}</Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

/* ───────────── Combat ───────────── */

function CombatTab({ data, s, colors, onChanged }: TabProps & { onChanged: () => void }) {
    const clan = data.clan!;
    const rival = data.rival;
    const me = data.me!;
    const [busy, setBusy] = useState<string | null>(null);
    const roleFrozen = me.dailyPoints > 0;

    const run = async (key: string, fn: () => Promise<unknown>) => {
        setBusy(key);
        try { await fn(); await onChanged(); }
        catch (e: any) { Alert.alert('Guerre des clans', e.message); }
        finally { setBusy(null); }
    };

    const pressure = rival?.pressureGate ? { gate: rival.pressureGate, label: `🔭 ${rival.pressureShare ?? ''} %` } : null;
    const myGateHl = me.gate ? { gate: me.gate, label: '🎯 Ma cible' } : null;

    return (
        <>
            <WarScoreboard
                clan={clan}
                rival={rival ?? null}
                day={data.day}
                tierName={clan.tierName}
            />

            {/* Mes chiffres du jour */}
            <View style={s.statsRow}>
                <Stat s={s} value={`${me.dailyPoints}`} label="pts aujourd’hui" accent={colors.primary} />
                <Stat s={s} value={`×${me.multiplier}`} label={`demain ×${me.nextMultiplier}`} accent={colors.accent2} />
                <Stat s={s} value={me.roleRank ? `#${me.roleRank}` : '—'} label={`sur ${me.roleSize} ${ROLE_META[me.role].label.toLowerCase()}s`} accent={colors.accent3} />
            </View>
            {me.wounded ? (
                <View style={[s.banner, { backgroundColor: colors.error + '14', borderColor: colors.error + '40' }]}>
                    <Text style={s.bannerEmoji}>🩹</Text>
                    <Text style={[s.bannerText, { color: colors.error }]}>Tu es blessé : tu frappes à 50 % jusqu’à ce qu’un soigneur t’aide.</Text>
                </View>
            ) : null}

            {/* Rôle */}
            <View style={s.card}>
                <View style={s.rowBetween}>
                    <Text style={s.cardTitle}>Mon rôle</Text>
                    {roleFrozen ? <Text style={s.muted}>🔒 figé jusqu’à minuit</Text> : null}
                </View>
                <View style={s.roles}>
                    {(Object.keys(ROLE_META) as ClanRole[]).map((r) => {
                        const m = ROLE_META[r];
                        const active = me.role === r;
                        return (
                            <Pressable
                                key={r}
                                disabled={roleFrozen || busy !== null || active}
                                onPress={() => run(`role:${r}`, () => setRole(r))}
                                style={({ pressed }) => [s.role, active && { borderColor: m.color, backgroundColor: m.bg }, pressed && { transform: [{ scale: 0.97 }] }, roleFrozen && !active && { opacity: 0.45 }]}
                                accessibilityState={{ selected: active }}
                            >
                                {busy === `role:${r}` ? <ActivityIndicator color={m.color} /> : <Text style={s.roleEmoji}>{m.emoji}</Text>}
                                <Text style={[s.roleLabel, active && { color: m.color }]}>{m.label}</Text>
                            </Pressable>
                        );
                    })}
                </View>
                <Text style={s.muted}>{ROLE_META[me.role].hint}</Text>
            </View>

            {/* Porte */}
            {me.role !== 'soigneur' ? (
                <View style={s.card}>
                    <Text style={s.cardTitle}>{me.role === 'attaquant' ? 'Porte adverse visée' : 'Porte que je tiens'}</Text>
                    <View style={s.gates}>
                        {GATES.map((g) => {
                            const active = me.gate === g;
                            const ordered = clan.dailyOrder === g;
                            return (
                                <Pressable
                                    key={g}
                                    disabled={busy !== null}
                                    onPress={() => run(`gate:${g}`, () => setMyGate(active ? null : g))}
                                    style={({ pressed }) => [s.gateBtn, active && s.gateBtnActive, pressed && { transform: [{ scale: 0.97 }] }]}
                                >
                                    {busy === `gate:${g}` ? <ActivityIndicator color={colors.primary} /> : (
                                        <>
                                            <Text style={[s.gateBtnText, active && s.gateBtnTextActive]}>{GATE_LABEL[g]}</Text>
                                            {ordered ? <Text style={[s.gateOrder, active && s.gateBtnTextActive]}>📯 ordre</Text> : null}
                                        </>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                    {clan.dailyOrder ? <Text style={s.muted}>Le capitaine a désigné la porte {GATE_LABEL[clan.dailyOrder]}.</Text> : null}
                </View>
            ) : null}

            {/* Champ de bataille */}
            <Eyebrow style={{ marginTop: spacing.sm }}>Champ de bataille</Eyebrow>
            <View style={s.castles}>
                <Castle title="Nous" gates={clan.gates} keepHp={clan.keepHp} keepHpMax={clan.keepHpMax} highlight={pressure} order={clan.dailyOrder} mine />
                {rival ? (
                    <Castle
                        title={rival.name}
                        gates={rival.gates}
                        keepHp={rival.keepHp}
                        keepHpMax={rival.keepHpMax}
                        highlight={me.role === 'attaquant' ? myGateHl : null}
                        order={rival.dailyOrder}
                    />
                ) : null}
            </View>
            {!rival?.scouted ? <Text style={s.hint}>🔭 Recrute un Éclaireur pour voir où l’ennemi masse son assaut.</Text> : null}

            {/* Capitaine : ordre du jour */}
            {clan.isCaptain ? (
                <View style={[s.card, { borderColor: colors.accent2 }]}>
                    <Text style={s.cardTitle}>👑 Ordre du jour (capitaine)</Text>
                    <View style={s.gates}>
                        {GATES.map((g) => (
                            <Pressable
                                key={g}
                                disabled={busy !== null}
                                onPress={() => run(`order:${g}`, () => setDailyOrder(clan.dailyOrder === g ? null : g))}
                                style={[s.gateBtn, clan.dailyOrder === g && s.gateBtnActive]}
                            >
                                <Text style={[s.gateBtnText, clan.dailyOrder === g && s.gateBtnTextActive]}>{GATE_LABEL[g]}</Text>
                            </Pressable>
                        ))}
                    </View>
                    <Text style={s.muted}>Les attaquants frappent cette porte chez l’ennemi, les défenseurs tiennent la nôtre.</Text>
                </View>
            ) : null}

            {/* Classements par rôle */}
            <Eyebrow style={{ marginTop: spacing.sm }}>Classement du jour</Eyebrow>
            {(data.rankings ?? []).map((r) => (
                <View key={r.role} style={s.card}>
                    <Text style={[s.cardTitle, { color: ROLE_META[r.role].color }]}>{ROLE_META[r.role].emoji} {ROLE_META[r.role].label}s</Text>
                    {r.entries.length === 0 ? <Text style={s.muted}>Personne dans ce rôle.</Text> : r.entries.slice(0, 5).map((e) => (
                        <View key={e.userId} style={[s.rankRow, e.userId === me.userId && { backgroundColor: colors.accentLight + '66' }]}>
                            <Text style={s.rankPos}>{e.rank + 1}</Text>
                            <Text style={s.rankName} numberOfLines={1}>{e.username}{e.wounded ? ' 🩹' : ''}</Text>
                            <Text style={s.rankPts}>{e.dailyPoints} pts</Text>
                            <Text style={s.rankMult}>×{e.nextMultiplier}</Text>
                        </View>
                    ))}
                </View>
            ))}

            {/* Butin */}
            {data.rewards ? (
                <View style={s.card}>
                    <Text style={s.cardTitle}>🎁 À gagner dimanche</Text>
                    <Text style={s.muted}>Victoire : {data.rewards.winner.map((c) => CHEST_LABEL[c] ?? c).join(' + ')}</Text>
                    <Text style={s.muted}>MVP : {data.rewards.mvp.map((c) => CHEST_LABEL[c] ?? c).join(' + ')}</Text>
                    <Text style={s.muted}>Participation : +{data.rewards.loserPoints} points</Text>
                </View>
            ) : null}

            <Rules s={s} colors={colors} />
        </>
    );
}

function Stat({ s, value, label, accent }: { s: Styles; value: string; label: string; accent: string }) {
    return (
        <View style={s.stat}>
            <Text style={[s.statValue, { color: accent }]}>{value}</Text>
            <Text style={s.statLabel} numberOfLines={1}>{label}</Text>
        </View>
    );
}

/* ───────────── Garnison ───────────── */

function GarrisonTab({ data, s, colors, onChanged }: TabProps & { onChanged: () => void }) {
    const [sold, setSold] = useState<SoldiersData | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [editing, setEditing] = useState<string | null>(null);

    const load = useCallback(async () => {
        try { setSold(await getSoldiers()); } catch { /* affiché vide */ }
    }, []);
    useEffect(() => { load(); }, [load]);

    const run = async (key: string, fn: () => Promise<unknown>) => {
        setBusy(key);
        try { await fn(); await Promise.all([load(), onChanged()]); }
        catch (e: any) { Alert.alert('Garnison', e.message); }
        finally { setBusy(null); }
    };

    if (!sold) return <SkeletonList count={2} />;
    const captain = sold.isCaptain;
    const full = sold.garrison.length >= sold.garrisonMax;

    return (
        <>
            <View style={s.treasury}>
                <View>
                    <Text style={s.treasuryValue}>⚒️ {sold.resources}</Text>
                    <Text style={s.treasuryLabel}>Trésor du clan</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.treasuryValue}>{sold.garrison.length}/{sold.garrisonMax}</Text>
                    <Text style={s.treasuryLabel}>Unités</Text>
                </View>
            </View>
            {!captain ? <Text style={s.hint}>Seul le capitaine recrute et déploie. Tu peux lui demander une unité depuis le tchat.</Text> : null}

            <Eyebrow style={{ marginTop: spacing.sm }}>Notre garnison</Eyebrow>
            {sold.garrison.length === 0 ? (
                <Text style={s.muted}>Aucune unité pour l’instant.</Text>
            ) : sold.garrison.map((u) => (
                <View key={u.id} style={s.unit}>
                    <UnitImage path={u.image} emoji={u.emoji} s={s} />
                    <View style={s.flex}>
                        <Text style={s.unitName}>{u.name}</Text>
                        <Text style={s.muted}>
                            ⚔️ {u.atk} · 🛡️ {u.def} · usure {u.wear} %{u.gate ? ` · ${GATE_LABEL[u.gate]}` : ''}{u.stance ? ` · ${u.stance}` : ' · en réserve'}
                        </Text>
                        {editing === u.id ? (
                            <View style={{ gap: 6, marginTop: 6 }}>
                                <View style={s.gates}>
                                    {GATES.map((g) => (
                                        <Pressable key={g} style={[s.miniBtn, u.gate === g && s.miniBtnActive]} disabled={busy !== null}
                                            onPress={() => run(`dep:${u.id}`, () => deployUnit(u.id, g, u.stance ?? (u.kind === 'combat' ? 'assaut' : 'garnison')))}>
                                            <Text style={[s.miniBtnText, u.gate === g && s.miniBtnTextActive]}>{GATE_LABEL[g]}</Text>
                                        </Pressable>
                                    ))}
                                    <Pressable style={[s.miniBtn, !u.gate && s.miniBtnActive]} disabled={busy !== null}
                                        onPress={() => run(`dep:${u.id}`, () => deployUnit(u.id, null, null))}>
                                        <Text style={[s.miniBtnText, !u.gate && s.miniBtnTextActive]}>🏠 Caserne</Text>
                                    </Pressable>
                                </View>
                                {u.kind === 'combat' ? (
                                    <View style={s.gates}>
                                        {(['assaut', 'garnison'] as Stance[]).map((st) => (
                                            <Pressable key={st} style={[s.miniBtn, u.stance === st && s.miniBtnActive]} disabled={busy !== null || !u.gate}
                                                onPress={() => run(`dep:${u.id}`, () => deployUnit(u.id, u.gate, st))}>
                                                <Text style={[s.miniBtnText, u.stance === st && s.miniBtnTextActive]}>{st === 'assaut' ? '⚔️ Assaut' : '🛡️ Défense'}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                ) : null}
                            </View>
                        ) : null}
                    </View>
                    {busy === `dep:${u.id}` ? <ActivityIndicator color={colors.primary} /> : captain ? (
                        <Pressable onPress={() => setEditing(editing === u.id ? null : u.id)} hitSlop={8}>
                            <Icon name={editing === u.id ? 'checkmark' : 'move-outline'} size={20} color={colors.accent} />
                        </Pressable>
                    ) : null}
                    {u.cancellable ? (
                        <Pressable hitSlop={8} onPress={() => Alert.alert('Annuler l’achat ?', `${u.name} (${u.cost} ⚒️)`, [
                            { text: 'Garder', style: 'cancel' },
                            { text: 'Annuler l’achat', style: 'destructive', onPress: () => run(`cancel:${u.id}`, () => cancelPurchase(u.id)) },
                        ])}>
                            <Icon name="arrow-undo-outline" size={20} color={colors.error} />
                        </Pressable>
                    ) : null}
                </View>
            ))}

            <Eyebrow style={{ marginTop: spacing.md }}>Recruter</Eyebrow>
            <View style={s.catalog}>
                {SOLDIER_CATALOG.map((d) => {
                    const affordable = sold.resources >= d.cost;
                    return (
                        <Pressable
                            key={d.key}
                            style={({ pressed }) => [s.soldier, pressed && captain && { transform: [{ scale: 0.97 }] }]}
                            disabled={!captain || busy !== null}
                            onPress={() => {
                                if (!affordable) return Alert.alert('Trésor insuffisant', `Il faut ${d.cost} ⚒️.`);
                                if (full) return Alert.alert('Garnison pleine', `${sold.garrisonMax} unités maximum.`);
                                Alert.alert(`Recruter un ${d.name} ?`, `${d.cost} ⚒️ — ${d.description}`, [
                                    { text: 'Annuler', style: 'cancel' },
                                    { text: 'Recruter', onPress: () => run(`buy:${d.key}`, () => buySoldier(d.key)) },
                                ]);
                            }}
                        >
                            <UnitImage path={d.image} emoji={d.emoji} s={s} big />
                            <Text style={s.soldierName} numberOfLines={1}>{d.name}</Text>
                            <Text style={s.soldierStats}>{d.kind === 'combat' ? `⚔️${d.atk} 🛡️${d.def}` : 'Soutien'}</Text>
                            <Text style={[s.soldierCost, !affordable && { color: colors.textMuted }]}>{busy === `buy:${d.key}` ? '…' : `${d.cost} ⚒️`}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </>
    );
}

const UnitImage = memo(function UnitImage({ path, emoji, s, big }: { path: string | null; emoji: string; s: Styles; big?: boolean }) {
    const [failed, setFailed] = useState(false);
    const uri = soldierImage(path);
    const size = big ? 64 : 44;
    return uri && !failed ? (
        <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="contain" onError={() => setFailed(true)} />
    ) : (
        <View style={[s.unitFallback, { width: size, height: size }]}><Text style={{ fontSize: size * 0.5 }}>{emoji}</Text></View>
    );
});

/* ───────────── Journal ───────────── */

function JournalTab({ data, s, colors }: TabProps) {
    const y = data.yesterday;
    return (
        <>
            {y ? (
                <View style={s.card}>
                    <Text style={s.cardTitle}>Bataille du jour {y.day} : {y.outcome === 'win' ? '🏆 Victoire' : y.outcome === 'loss' ? '🛡️ Défaite' : '🤝 Égalité'}</Text>
                    <View style={s.statsRow}>
                        <Stat s={s} value={`${y.damageDealt}`} label="infligés" accent={colors.success} />
                        <Stat s={s} value={`${y.damageTaken}`} label="subis" accent={colors.error} />
                        <Stat s={s} value={`${y.healedCount}`} label="soignés" accent={colors.accent3} />
                    </View>
                </View>
            ) : <Text style={s.muted}>Pas encore de bataille résolue : la première a lieu cette nuit à minuit.</Text>}

            <Eyebrow style={{ marginTop: spacing.sm }}>Fil de guerre</Eyebrow>
            {(data.feed ?? []).length === 0 ? <Text style={s.muted}>Rien à signaler pour l’instant.</Text> : (data.feed ?? []).map((e, i) => (
                <View key={i} style={s.feedRow}>
                    <Text style={s.feedIcon}>{FEED_ICON[e.type] ?? '•'}</Text>
                    <Text style={s.feedText}>{e.message}</Text>
                </View>
            ))}

            <Eyebrow style={{ marginTop: spacing.sm }}>{`Membres · ${data.members?.length ?? 0}`}</Eyebrow>
            <View style={s.card}>
                {(data.members ?? []).map((m, i) => (
                    <View key={m.userId} style={[s.rankRow, i === 0 && { backgroundColor: colors.accent2 + '30' }]}>
                        <Text style={s.rankPos}>{i === 0 ? '⭐' : i + 1}</Text>
                        <Text style={s.rankName} numberOfLines={1}>{ROLE_META[m.role].emoji} {m.username}{m.wounded ? ' 🩹' : ''}</Text>
                        <Text style={s.rankPts}>{m.totalPoints} pts</Text>
                    </View>
                ))}
            </View>
        </>
    );
}

const FEED_ICON: Record<string, string> = {
    gate_damage: '💥', gate_fallen: '🏚️', gate_repaired: '🔨', player_wounded: '🩹', player_healed: '💚', rally: '📯',
};

/* ───────────── Tchat (phrases fermées) ───────────── */

function ChatTab({ data, s, colors, bottomInset }: TabProps & { bottomInset: number }) {
    const [chat, setChat] = useState<ChatData | null>(null);
    const [composing, setComposing] = useState<ChatTemplateDef | null>(null);
    const [slots, setSlots] = useState<{ memberId?: string; memberName?: string; gate?: GateName; soldier?: string; soldierName?: string; role?: ClanRole }>({});
    const [sending, setSending] = useState(false);
    const lastAt = useRef<string | null>(null);
    const scrollRef = useRef<ScrollViewInstance>(null);

    const load = useCallback(async () => {
        try {
            const res = await getChat(lastAt.current);
            if (!res) return;
            setChat((prev) => {
                if (!prev || !lastAt.current) return res;
                const seen = new Set(prev.messages.map((m) => m.id));
                return { ...res, messages: [...prev.messages, ...res.messages.filter((m) => !seen.has(m.id))] };
            });
            if (res.messages.length) lastAt.current = res.messages[res.messages.length - 1].createdAt;
        } catch { /* réessaie au prochain tour */ }
    }, []);

    // Relève toutes les 10 s (comme le site), seulement app au premier plan
    useEffect(() => {
        load();
        const t = setInterval(() => { if (AppState.currentState === 'active') load(); }, 10_000);
        return () => clearInterval(t);
    }, [load]);

    const members = (data.members ?? []).filter((m) => m.userId !== data.me?.userId);
    const ready = composing && composing.slots.every((k) =>
        (k === 'member' && slots.memberId) || (k === 'gate' && slots.gate) || (k === 'soldier' && slots.soldier) || (k === 'role' && slots.role));

    const send = async () => {
        if (!composing || !ready) return;
        setSending(true);
        try {
            await sendChat({ template: composing.key, memberId: slots.memberId ?? null, gate: slots.gate ?? null, soldier: slots.soldier ?? null, role: slots.role ?? null });
            setComposing(null);
            setSlots({});
            await load();
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (e: any) {
            Alert.alert('Tchat', e.message);
        } finally {
            setSending(false);
        }
    };

    const categories = ['tactique', 'demande', 'etat', 'social'] as const;

    return (
        <View style={{ flex: 1 }}>
            <ScrollView ref={scrollRef} contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
                <Text style={s.hint}>Le tchat du clan s’efface chaque nuit. On y choisit des phrases toutes prêtes : pas de texte libre, pour que ça reste sympa pour tout le monde.</Text>
                {!chat ? <ActivityIndicator color={colors.primary} /> : chat.messages.length === 0 ? (
                    <Text style={[s.muted, { textAlign: 'center' }]}>Personne n’a encore parlé aujourd’hui. Lance le mouvement 👋</Text>
                ) : chat.messages.map((m) => {
                    const forMe = m.targetUserId && m.targetUserId === data.me?.userId;
                    return (
                        <View key={m.id} style={[s.msg, m.mine ? s.msgMine : s.msgOther, forMe && { borderColor: colors.primary, borderWidth: 1.5 }]}>
                            {!m.mine ? <Text style={s.msgAuthor}>{m.username}</Text> : null}
                            <Text style={[s.msgText, m.mine && { color: colors.background }]}>{m.text}</Text>
                        </View>
                    );
                })}
            </ScrollView>

            {/* Compositeur */}
            <View style={[s.composer, { paddingBottom: Math.max(bottomInset, spacing.md) }]}>
                {!composing ? (
                    <>
                        <View style={s.rowBetween}>
                            <Text style={s.cardTitle}>Envoyer un message</Text>
                            {chat ? <Text style={s.muted}>{chat.remaining}/{chat.max} restants</Text> : null}
                        </View>
                        <ScrollView style={{ maxHeight: 190 }} nestedScrollEnabled>
                            {categories.map((c) => (
                                <View key={c} style={{ marginTop: spacing.sm }}>
                                    <Text style={s.catLabel}>{CHAT_CATEGORY_LABEL[c]}</Text>
                                    <View style={s.templates}>
                                        {CHAT_TEMPLATES.filter((t) => t.category === c).map((t) => (
                                            <Pressable key={t.key} style={s.template} onPress={() => { setComposing(t); setSlots({}); }}
                                                disabled={chat?.remaining === 0}>
                                                <Text style={s.templateText}>{t.label}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </>
                ) : (
                    <>
                        <Text style={s.preview}>{renderTemplate(composing, { ...slots, role: slots.role })}</Text>
                        {composing.slots.includes('member') ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.slotRow}>
                                {members.map((m) => (
                                    <Pressable key={m.userId} style={[s.miniBtn, slots.memberId === m.userId && s.miniBtnActive]} onPress={() => setSlots((v) => ({ ...v, memberId: m.userId, memberName: m.username }))}>
                                        <Text style={[s.miniBtnText, slots.memberId === m.userId && s.miniBtnTextActive]}>@{m.username}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        ) : null}
                        {composing.slots.includes('gate') ? (
                            <View style={s.slotRow}>
                                {GATES.map((g) => (
                                    <Pressable key={g} style={[s.miniBtn, slots.gate === g && s.miniBtnActive]} onPress={() => setSlots((v) => ({ ...v, gate: g }))}>
                                        <Text style={[s.miniBtnText, slots.gate === g && s.miniBtnTextActive]}>{GATE_LABEL[g]}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        ) : null}
                        {composing.slots.includes('role') ? (
                            <View style={s.slotRow}>
                                {(Object.keys(ROLE_META) as ClanRole[]).map((r) => (
                                    <Pressable key={r} style={[s.miniBtn, slots.role === r && s.miniBtnActive]} onPress={() => setSlots((v) => ({ ...v, role: r }))}>
                                        <Text style={[s.miniBtnText, slots.role === r && s.miniBtnTextActive]}>{ROLE_META[r].emoji} {ROLE_META[r].label}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        ) : null}
                        {composing.slots.includes('soldier') ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.slotRow}>
                                {SOLDIER_CATALOG.map((d) => (
                                    <Pressable key={d.key} style={[s.miniBtn, slots.soldier === d.key && s.miniBtnActive]} onPress={() => setSlots((v) => ({ ...v, soldier: d.key, soldierName: d.name }))}>
                                        <Text style={[s.miniBtnText, slots.soldier === d.key && s.miniBtnTextActive]}>{d.emoji} {d.name}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        ) : null}
                        <View style={[s.rowBetween, { marginTop: spacing.sm }]}>
                            <Pressable onPress={() => { setComposing(null); setSlots({}); }} hitSlop={8}>
                                <Text style={[s.muted, { fontFamily: typography.fontFamily.semiBold }]}>Annuler</Text>
                            </Pressable>
                            <Pressable onPress={send} disabled={!ready || sending} style={[s.sendBtn, (!ready || sending) && { opacity: 0.4 }]}>
                                {sending ? <ActivityIndicator color="#fff" /> : <Text style={s.sendText}>Envoyer</Text>}
                            </Pressable>
                        </View>
                    </>
                )}
            </View>
        </View>
    );
}

/* ───────────── Styles ───────────── */

function createStyles(c: ThemeColors) {
    const card = { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.xl } as const;
    return StyleSheet.create({
        flex: { flex: 1, minWidth: 0 },
        container: { flex: 1, backgroundColor: c.background },
        topbar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
        title: { fontFamily: typography.fontFamily.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.4, color: c.text, marginTop: 4 },
        card: { ...card, padding: spacing.lg, gap: spacing.sm },
        cardTitle: { fontFamily: typography.fontFamily.heading, fontSize: 15, color: c.text },
        muted: { fontFamily: typography.fontFamily.regular, fontSize: 13, lineHeight: 18, color: c.textSecondary },
        hint: { fontFamily: typography.fontFamily.regular, fontSize: 12.5, lineHeight: 17, color: c.textMuted, textAlign: 'center' },
        rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

        ruleRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', marginTop: spacing.xs },
        ruleEmoji: { fontSize: 22 },
        ruleTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.text },

        statsRow: { flexDirection: 'row', gap: spacing.sm },
        stat: { ...card, flex: 1, alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: 4 },
        statValue: { fontFamily: typography.fontFamily.display, fontSize: 22 },
        statLabel: { fontFamily: typography.fontFamily.medium, fontSize: 11, color: c.textSecondary, marginTop: 2 },

        banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
        bannerEmoji: { fontSize: 20 },
        bannerText: { flex: 1, fontFamily: typography.fontFamily.semiBold, fontSize: 13 },

        roles: { flexDirection: 'row', gap: spacing.sm },
        role: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface, minHeight: 76, justifyContent: 'center' },
        roleEmoji: { fontSize: 26 },
        roleLabel: { fontFamily: typography.fontFamily.heading, fontSize: 12.5, color: c.text },

        gates: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
        gateBtn: { flex: 1, minWidth: 80, alignItems: 'center', paddingVertical: 12, borderRadius: radius.full, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, minHeight: 46, justifyContent: 'center' },
        gateBtnActive: { backgroundColor: c.text, borderColor: c.text },
        gateBtnText: { fontFamily: typography.fontFamily.heading, fontSize: 14, color: c.text },
        gateBtnTextActive: { color: c.background },
        gateOrder: { fontFamily: typography.fontFamily.medium, fontSize: 10, color: c.textMuted },

        castles: { flexDirection: 'row', gap: spacing.sm },

        rankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, paddingHorizontal: 6, borderRadius: radius.md },
        rankPos: { width: 22, textAlign: 'center', fontFamily: typography.fontFamily.heading, fontSize: 13, color: c.textSecondary },
        rankName: { flex: 1, fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.text },
        rankPts: { fontFamily: typography.fontFamily.display, fontSize: 14, color: c.text },
        rankMult: { fontFamily: typography.fontFamily.semiBold, fontSize: 12, color: c.accent, minWidth: 34, textAlign: 'right' },

        treasury: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg, borderRadius: radius.xl, backgroundColor: c.ink },
        treasuryValue: { fontFamily: typography.fontFamily.display, fontSize: 24, color: '#FFB547' },
        treasuryLabel: { fontFamily: typography.fontFamily.medium, fontSize: 11.5, color: 'rgba(253,250,244,0.65)' },

        unit: { ...card, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
        unitName: { fontFamily: typography.fontFamily.heading, fontSize: 14.5, color: c.text },
        unitFallback: { borderRadius: 12, backgroundColor: c.surfaceVariant, alignItems: 'center', justifyContent: 'center' },
        catalog: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
        soldier: { ...card, width: '31.5%', flexGrow: 1, alignItems: 'center', padding: spacing.sm, gap: 2 },
        soldierName: { fontFamily: typography.fontFamily.semiBold, fontSize: 12.5, color: c.text, marginTop: 4 },
        soldierStats: { fontFamily: typography.fontFamily.regular, fontSize: 11, color: c.textMuted },
        soldierCost: { fontFamily: typography.fontFamily.heading, fontSize: 12.5, color: c.accent, marginTop: 2 },

        miniBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
        miniBtnActive: { backgroundColor: c.text, borderColor: c.text },
        miniBtnText: { fontFamily: typography.fontFamily.semiBold, fontSize: 12.5, color: c.text },
        miniBtnTextActive: { color: c.background },

        feedRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
        feedIcon: { fontSize: 16, width: 22, textAlign: 'center' },
        feedText: { flex: 1, fontFamily: typography.fontFamily.regular, fontSize: 13.5, lineHeight: 19, color: c.text },

        msg: { maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
        msgMine: { alignSelf: 'flex-end', backgroundColor: c.text, borderTopRightRadius: 6 },
        msgOther: { alignSelf: 'flex-start', backgroundColor: c.surfaceVariant, borderTopLeftRadius: 6 },
        msgAuthor: { fontFamily: typography.fontFamily.semiBold, fontSize: 11.5, color: c.textMuted, marginBottom: 2 },
        msgText: { fontFamily: typography.fontFamily.regular, fontSize: 14.5, lineHeight: 20, color: c.text },

        composer: { borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: c.background, gap: 6 },
        catLabel: { fontFamily: typography.fontFamily.semiBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: c.textMuted, marginBottom: 6 },
        templates: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
        template: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
        templateText: { fontFamily: typography.fontFamily.medium, fontSize: 12.5, color: c.text },
        preview: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, lineHeight: 21, color: c.text, backgroundColor: c.surfaceVariant, padding: spacing.md, borderRadius: radius.lg, overflow: 'hidden' },
        slotRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingVertical: 2 },
        sendBtn: { paddingHorizontal: spacing.xl, paddingVertical: 11, borderRadius: radius.full, backgroundColor: c.primary, borderBottomWidth: 3, borderBottomColor: c.primaryDark, minWidth: 110, alignItems: 'center' },
        sendText: { fontFamily: typography.fontFamily.heading, fontSize: 14.5, color: '#fff' },
    });
}
