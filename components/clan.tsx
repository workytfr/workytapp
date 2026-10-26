/**
 * Briques visuelles de la Guerre des Clans, pensées pour le téléphone.
 *
 * Toutes les animations passent par le driver natif (transform / opacity) :
 * elles tournent sur le thread UI, sans solliciter le JS, même sur un
 * téléphone modeste. Les barres de vie s'animent en `scaleX` depuis la gauche
 * plutôt qu'en largeur, pour la même raison.
 */
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Modal, Pressable, ScrollView, AccessibilityInfo } from 'react-native';
import Icon from './Icon';
import { useColors } from '../lib/useColors';
import { radius, spacing, typography, type ThemeColors } from '../lib/theme';
import {
    CHEST_LABEL, GATE_LABEL, GATES, OUTCOME_META, WAR_DAYS,
    type BattleReport, type CastleTheme, type Gate, type GateName, type WeeklyReward,
} from '../lib/clan';
import { CastleArt, ClanBanner, GATE_GAUGE, GATE_STATE_LABEL, gateState } from './clanArt';

/** Respecte le réglage « réduire les animations » du téléphone. */
export function useReducedMotion() {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
        return () => sub.remove();
    }, []);
    return reduced;
}

/* ───────────────────────── Blason ───────────────────────── */

/**
 * Blason du clan, tiré de sa graine comme sur le site (react-native-svg).
 * L'ancienne version empilait des View (rectangle + losange tourné en
 * zIndex négatif) : rien à voir avec l'écu du site, et la pointe passait
 * sous le fond de la carte sur Android.
 */
export const Banner = memo(function Banner({ seed, name, size = 56 }: { seed: string; name: string; size?: number }) {
    return <ClanBanner seed={seed || name} size={size} label={`Blason de ${name}`} />;
});

/* ───────────────────────── Barre de vie ───────────────────────── */

export const HpBar = memo(function HpBar({ hp, hpMax, color, height = 8, delay = 0 }: { hp: number; hpMax: number; color: string; height?: number; delay?: number }) {
    const colors = useColors();
    const reduced = useReducedMotion();
    const ratio = hpMax > 0 ? Math.max(0, Math.min(1, hp / hpMax)) : 0;
    const scale = useRef(new Animated.Value(reduced ? ratio : 0)).current;

    useEffect(() => {
        Animated.timing(scale, {
            toValue: ratio,
            duration: reduced ? 0 : 900,
            delay: reduced ? 0 : delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [ratio, delay, reduced, scale]);

    return (
        <View style={{ height, borderRadius: height / 2, backgroundColor: colors.surfaceVariant, overflow: 'hidden' }}>
            <Animated.View style={{ height, backgroundColor: color, borderRadius: height / 2, transformOrigin: 'left', transform: [{ scaleX: scale }] }} />
        </View>
    );
});

/* ───────────────────────── Scoreboard VS ───────────────────────── */

export function WarScoreboard({
    clan, rival, day, tierName,
}: {
    clan: { name: string; bannerSeed: string; daysWon: number; memberCount: number };
    rival: { name: string; bannerSeed: string; daysWon: number; memberCount: number } | null;
    day: number;
    tierName: string;
}) {
    const reduced = useReducedMotion();
    const left = useRef(new Animated.Value(reduced ? 0 : -1)).current;
    const right = useRef(new Animated.Value(reduced ? 0 : 1)).current;
    const vs = useRef(new Animated.Value(reduced ? 1 : 0)).current;

    // Entrée : les deux blasons glissent vers le centre, puis le VS claque
    useEffect(() => {
        if (reduced) return;
        Animated.sequence([
            Animated.parallel([
                Animated.spring(left, { toValue: 0, useNativeDriver: true, friction: 7, tension: 60 }),
                Animated.spring(right, { toValue: 0, useNativeDriver: true, friction: 7, tension: 60 }),
            ]),
            Animated.spring(vs, { toValue: 1, useNativeDriver: true, friction: 4, tension: 120 }),
        ]).start();
    }, [left, right, vs, reduced]);

    const slide = (v: Animated.Value) => ({ transform: [{ translateX: v.interpolate({ inputRange: [-1, 1], outputRange: [-140, 140] }) }] });

    return (
        <View style={sb.wrap}>
            <View style={sb.tierRow}>
                <Text style={sb.tier}>🏰 {tierName}</Text>
                <Text style={sb.tier}>Jour {Math.min(day, WAR_DAYS)} / {WAR_DAYS}</Text>
            </View>

            <View style={sb.row}>
                <Animated.View style={[sb.side, slide(left)]}>
                    <Banner seed={clan.bannerSeed} name={clan.name} size={58} />
                    <Text style={sb.name} numberOfLines={2}>{clan.name}</Text>
                    <Text style={sb.members}>{clan.memberCount} membres</Text>
                </Animated.View>

                <View style={sb.center}>
                    <Text style={sb.score}>{clan.daysWon}<Text style={sb.scoreSep}> – </Text>{rival?.daysWon ?? 0}</Text>
                    <Animated.View style={[sb.vs, { opacity: vs, transform: [{ scale: vs.interpolate({ inputRange: [0, 1], outputRange: [2.2, 1] }) }] }]}>
                        <Text style={sb.vsText}>VS</Text>
                    </Animated.View>
                    <Text style={sb.scoreLabel}>jours gagnés</Text>
                </View>

                <Animated.View style={[sb.side, slide(right)]}>
                    {rival ? (
                        <>
                            <Banner seed={rival.bannerSeed} name={rival.name} size={58} />
                            <Text style={sb.name} numberOfLines={2}>{rival.name}</Text>
                            <Text style={sb.members}>{rival.memberCount} membres</Text>
                        </>
                    ) : <Text style={sb.members}>Pas d'adversaire</Text>}
                </Animated.View>
            </View>

            {/* Les 7 jours de la guerre */}
            <View style={sb.days}>
                {Array.from({ length: WAR_DAYS }).map((_, i) => (
                    <View key={i} style={[sb.dayDot, i + 1 < day && sb.dayPast, i + 1 === day && sb.dayNow]} />
                ))}
            </View>
        </View>
    );
}

const sb = StyleSheet.create({
    wrap: { backgroundColor: '#1A1512', borderRadius: 28, padding: spacing.lg, overflow: 'hidden' },
    tierRow: { flexDirection: 'row', justifyContent: 'space-between' },
    tier: { fontFamily: typography.fontFamily.semiBold, fontSize: 11.5, letterSpacing: 0.6, color: 'rgba(253,250,244,0.65)' },
    row: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
    side: { flex: 1, alignItems: 'center', gap: 6 },
    name: { fontFamily: typography.fontFamily.display, fontSize: 15, lineHeight: 18, color: '#FDFAF4', textAlign: 'center' },
    members: { fontFamily: typography.fontFamily.regular, fontSize: 11, color: 'rgba(253,250,244,0.55)' },
    center: { width: 96, alignItems: 'center' },
    score: { fontFamily: typography.fontFamily.display, fontSize: 34, color: '#FDFAF4' },
    scoreSep: { color: 'rgba(253,250,244,0.4)' },
    scoreLabel: { fontFamily: typography.fontFamily.regular, fontSize: 10.5, color: 'rgba(253,250,244,0.55)', marginTop: 4 },
    vs: { marginTop: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: '#FF6A1A' },
    vsText: { fontFamily: typography.fontFamily.display, fontSize: 13, color: '#fff', letterSpacing: 1 },
    days: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.lg },
    dayDot: { width: 26, height: 6, borderRadius: 3, backgroundColor: 'rgba(253,250,244,0.15)' },
    dayPast: { backgroundColor: 'rgba(253,250,244,0.45)' },
    dayNow: { backgroundColor: '#FFB547' },
});

/* ───────────────────────── Château ───────────────────────── */

export const Castle = memo(function Castle({
    title, bannerSeed, theme, gates, keepHp, keepHpMax, highlight, order, mine,
}: {
    title: string;
    /** Graine du blason : en-tête de la carte et bannière du donjon */
    bannerSeed?: string;
    /** Thème saisonnier : ciel, collines, sol (jamais les couleurs des camps) */
    theme: CastleTheme;
    gates: Gate[];
    keepHp: number;
    keepHpMax: number;
    /**
     * Porte mise en avant. `threat` = l'ennemi y masse son assaut (halo rouge
     * plein) ; `target` = c'est là qu'on frappe (halo orange en pointillés).
     */
    highlight?: { gate: GateName; label: string; kind: 'threat' | 'target' } | null;
    /** Ordre du jour visible */
    order?: GateName | null;
    mine?: boolean;
}) {
    const colors = useColors();
    const s = useMemo(() => castleStyles(colors), [colors]);
    const [width, setWidth] = useState(0);
    // Toujours nord, est, sud : la géométrie du dessin en dépend
    const ordered = useMemo(() => {
        const byName = new Map(gates.map((g) => [g.name, g]));
        return GATES.map((n) => byName.get(n)).filter((g): g is Gate => !!g);
    }, [gates]);
    const keepPct = keepHpMax > 0 ? Math.max(0, Math.min(1, keepHp / keepHpMax)) : 0;
    const keepDown = keepHp <= 0;

    return (
        <View style={[s.card, mine && { borderColor: colors.primary }]}>
            {/* Bandeau : qui c'est */}
            <View style={[s.head, { backgroundColor: mine ? colors.primary + '12' : colors.surfaceVariant }]}>
                {bannerSeed ? <Banner seed={bannerSeed} name={title} size={30} /> : null}
                <Text style={s.title} numberOfLines={1}>{title}</Text>
                <Text style={[s.side, mine && { color: colors.accent }]}>{mine ? 'Ton clan' : 'Adversaire'}</Text>
            </View>

            {/* Le dessin, mesuré à la largeur disponible */}
            <View style={s.scene} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width) - spacing.sm * 2)}>
                {width > 0 ? (
                    <CastleArt
                        gates={ordered}
                        keepHp={keepHp}
                        keepHpMax={keepHpMax}
                        side={mine ? 'ally' : 'enemy'}
                        bannerSeed={bannerSeed}
                        // Comme sur le site : l'ordre adverse ne s'affiche pas en halo chez lui
                        target={highlight?.kind === 'target' ? highlight.gate : mine ? order ?? null : null}
                        threat={highlight?.kind === 'threat' ? highlight.gate : null}
                        theme={theme}
                        width={width}
                    />
                ) : null}
            </View>

            {/* Chiffres sous chaque porte : l'état ne repose jamais sur la seule couleur */}
            <View style={s.gatesRow}>
                {ordered.map((g) => {
                    const st = gateState(g);
                    const hl = highlight?.gate === g.name;
                    return (
                        <View key={g.name} style={s.gateCol}>
                            <Text style={s.gateName}>{GATE_LABEL[g.name]}</Text>
                            <Text style={s.hp}>{g.fallen ? '—' : `${g.hp}/${g.hpMax}`}</Text>
                            <Text style={[s.state, { color: st === 'tombee' ? colors.error : st === 'critique' ? colors.accent : colors.textMuted }]}>
                                {GATE_STATE_LABEL[st]}
                            </Text>
                            {order === g.name ? <Text style={s.tag}>📯 Ordre</Text> : null}
                            {hl ? (
                                <Text style={[s.tag, { color: highlight?.kind === 'threat' ? colors.error : colors.primary }]} numberOfLines={1}>
                                    {highlight?.label}
                                </Text>
                            ) : null}
                        </View>
                    );
                })}
            </View>

            {/* Le donjon, en chiffres : c'est LA jauge dès qu'une porte est tombée */}
            <View style={s.keep}>
                <View style={s.keepHead}>
                    <Text style={s.keepName}>👑 Donjon</Text>
                    <Text style={[s.hp, keepDown && { color: colors.error }]}>{keepDown ? 'abattu' : `${keepHp}/${keepHpMax}`}</Text>
                </View>
                <HpBar
                    hp={keepHp}
                    hpMax={keepHpMax}
                    color={keepPct > 0.5 ? GATE_GAUGE.intacte : keepPct > 0.2 ? GATE_GAUGE.entamee : GATE_GAUGE.tombee}
                    delay={300}
                />
                <Text style={s.keepHint}>Les coups ne l’atteignent qu’une fois une porte tombée.</Text>
            </View>
        </View>
    );
});

function castleStyles(c: ThemeColors) {
    return StyleSheet.create({
        card: { backgroundColor: c.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
        head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
        title: { flex: 1, fontFamily: typography.fontFamily.display, fontSize: 17, color: c.text },
        side: { fontFamily: typography.fontFamily.semiBold, fontSize: 11, color: c.textSecondary },
        // Papier de la charte derrière le dessin, comme sur le site, y compris en
        // sombre : la pierre et l'encre du château sont pensées pour ce fond
        scene: { backgroundColor: '#FDFAF4', paddingHorizontal: spacing.sm, paddingTop: spacing.md, paddingBottom: 2 },
        gatesRow: { flexDirection: 'row', paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
        gateCol: { flex: 1, alignItems: 'center', minWidth: 0 },
        gateName: { fontFamily: typography.fontFamily.heading, fontSize: 13, color: c.text },
        hp: { fontFamily: typography.fontFamily.semiBold, fontSize: 11.5, color: c.text },
        state: { fontFamily: typography.fontFamily.medium, fontSize: 10.5 },
        tag: { fontFamily: typography.fontFamily.semiBold, fontSize: 10.5, color: c.textSecondary, marginTop: 2 },
        keep: { gap: 5, margin: spacing.md, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: c.divider },
        keepHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        keepName: { fontFamily: typography.fontFamily.semiBold, fontSize: 12.5, color: c.text },
        keepHint: { fontFamily: typography.fontFamily.regular, fontSize: 11, color: c.textMuted },
    });
}

/* ───────────────────────── Compteur animé ───────────────────────── */

function CountUp({ to, style, duration = 1100 }: { to: number; style: any; duration?: number }) {
    const [v, setV] = useState(0);
    useEffect(() => {
        const start = Date.now();
        let raf = 0;
        const tick = () => {
            const t = Math.min(1, (Date.now() - start) / duration);
            setV(Math.round(to * (1 - Math.pow(1 - t, 3))));
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [to, duration]);
    return <Text style={style}>{v}</Text>;
}

/* ───────────────────────── Rapport de bataille ───────────────────────── */

export function BattleReportModal({ report, onClose }: { report: BattleReport | null; onClose: () => void }) {
    const colors = useColors();
    const s = useMemo(() => modalStyles(colors), [colors]);
    const reduced = useReducedMotion();
    const pop = useRef(new Animated.Value(0)).current;
    const shake = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!report) return;
        pop.setValue(reduced ? 1 : 0);
        if (reduced) return;
        Animated.sequence([
            Animated.spring(pop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
            // Une défaite « encaisse » : petite secousse
            ...(report.outcome === 'loss'
                ? [Animated.sequence([-1, 1, -1, 1, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 60, useNativeDriver: true })))]
                : []),
        ]).start();
    }, [report, pop, shake, reduced]);

    if (!report) return null;
    const meta = OUTCOME_META[report.outcome];

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <View style={s.backdrop}>
                <Animated.View style={[s.sheet, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }, { translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] }) }], opacity: pop }]}>
                    <Text style={s.kicker}>Rapport du jour {report.day}</Text>
                    <Text style={s.emoji}>{meta.emoji}</Text>
                    <Text style={[s.outcome, { color: meta.color }]}>{meta.label}</Text>
                    {report.clan && report.rival ? (
                        <Text style={s.sub}>{report.clan.name} {report.clan.daysWon} – {report.rival.daysWon} {report.rival.name}</Text>
                    ) : null}

                    <View style={s.stats}>
                        <View style={s.stat}>
                            <CountUp to={report.damageDealt} style={[s.statValue, { color: colors.success }]} />
                            <Text style={s.statLabel}>dégâts infligés</Text>
                        </View>
                        <View style={s.stat}>
                            <CountUp to={report.damageTaken} style={[s.statValue, { color: colors.error }]} />
                            <Text style={s.statLabel}>dégâts subis</Text>
                        </View>
                    </View>

                    <View style={s.chips}>
                        <Text style={s.chip}>×{report.myMultiplier} aujourd'hui</Text>
                        {report.woundedCount ? <Text style={s.chip}>🩹 {report.woundedCount} blessé(s)</Text> : null}
                        {report.healedCount ? <Text style={s.chip}>💚 {report.healedCount} soigné(s)</Text> : null}
                    </View>
                    {report.iAmWounded ? <Text style={s.warn}>Tu es blessé : tu contribues à 50 % jusqu'à ce qu'un soigneur t'aide.</Text> : null}

                    {report.events?.length ? (
                        <ScrollView style={s.events} contentContainerStyle={{ gap: 6 }}>
                            {report.events.slice(0, 12).map((e, i) => (
                                <Text key={i} style={s.event}>• {e.message}</Text>
                            ))}
                        </ScrollView>
                    ) : null}

                    <Pressable style={({ pressed }) => [s.btn, pressed && s.btnPressed]} onPress={onClose}>
                        <Text style={s.btnText}>Au combat !</Text>
                    </Pressable>
                </Animated.View>
            </View>
        </Modal>
    );
}

/* ───────────────────────── Coffre de fin de guerre ───────────────────────── */

export function WeeklyRewardModal({ reward, onClose }: { reward: WeeklyReward | null; onClose: () => void }) {
    const colors = useColors();
    const s = useMemo(() => modalStyles(colors), [colors]);
    const reduced = useReducedMotion();
    const [opened, setOpened] = useState(false);
    const wobble = useRef(new Animated.Value(0)).current;
    const burst = useRef(new Animated.Value(0)).current;

    // Le coffre tremble en attendant qu'on le touche
    useEffect(() => {
        if (!reward || opened || reduced) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(wobble, { toValue: 1, duration: 90, useNativeDriver: true }),
                Animated.timing(wobble, { toValue: -1, duration: 90, useNativeDriver: true }),
                Animated.timing(wobble, { toValue: 0, duration: 90, useNativeDriver: true }),
                Animated.delay(900),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [reward, opened, wobble, reduced]);

    const open = () => {
        setOpened(true);
        burst.setValue(0);
        Animated.spring(burst, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }).start();
    };

    if (!reward) return null;
    const meta = OUTCOME_META[reward.outcome];

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <View style={s.backdrop}>
                <View style={s.sheet}>
                    <Text style={s.kicker}>Fin de la guerre</Text>
                    <Text style={[s.outcome, { color: meta.color }]}>{meta.emoji} {meta.label}</Text>
                    <Text style={s.sub}>{reward.clanName} {reward.daysWon} – {reward.rivalDaysWon} {reward.rivalName ?? ''}</Text>
                    {reward.isMvp ? <Text style={s.mvp}>⭐ Tu es le MVP de ton clan !</Text> : null}

                    {!opened ? (
                        <Pressable onPress={open} style={{ alignItems: 'center', marginVertical: spacing.lg }} accessibilityLabel="Ouvrir le butin">
                            <Animated.Text style={[s.chest, { transform: [{ rotate: wobble.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] }) }] }]}>🎁</Animated.Text>
                            <Text style={s.tap}>Touche pour ouvrir ton butin</Text>
                        </Pressable>
                    ) : (
                        <Animated.View style={{ opacity: burst, transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }], gap: 8, marginVertical: spacing.lg, alignSelf: 'stretch' }}>
                            {reward.loot.map((l, i) => (
                                <View key={i} style={s.loot}>
                                    <Text style={s.lootChest}>{CHEST_LABEL[l.chestType] ?? l.chestType}</Text>
                                    <Text style={s.lootValue}>
                                        {l.rewardType === 'points' || l.rewardType === 'gems' ? `+${l.amount ?? 0} ${l.rewardType === 'gems' ? 'gemmes' : 'points'}` : l.cosmeticType ? `Cosmétique : ${l.cosmeticType}` : l.rewardType}
                                    </Text>
                                </View>
                            ))}
                            {reward.points ? <View style={s.loot}><Text style={s.lootChest}>Participation</Text><Text style={s.lootValue}>+{reward.points} points</Text></View> : null}
                            {reward.leftover ? <View style={s.loot}><Text style={s.lootChest}>Trésor restant</Text><Text style={s.lootValue}>+{reward.leftover} points</Text></View> : null}
                            {reward.tierDelta ? (
                                <Text style={[s.sub, { color: reward.tierDelta > 0 ? colors.success : colors.error }]}>
                                    {reward.tierDelta > 0 ? '⬆️ Ton rang monte' : '⬇️ Ton rang baisse'}{reward.tierName ? ` : ${reward.tierName}` : ''}
                                </Text>
                            ) : null}
                        </Animated.View>
                    )}

                    <Pressable style={({ pressed }) => [s.btn, pressed && s.btnPressed, !opened && { opacity: 0.5 }]} onPress={onClose} disabled={!opened}>
                        <Text style={s.btnText}>Récupérer</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

function modalStyles(c: ThemeColors) {
    return StyleSheet.create({
        backdrop: { flex: 1, backgroundColor: 'rgba(26,21,18,0.6)', justifyContent: 'center', padding: spacing.lg },
        sheet: { backgroundColor: c.background, borderRadius: 28, padding: spacing.xl, alignItems: 'center', maxHeight: '88%' },
        kicker: { fontFamily: typography.fontFamily.semiBold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: c.textMuted },
        emoji: { fontSize: 56, marginTop: spacing.md },
        outcome: { fontFamily: typography.fontFamily.display, fontSize: 34, marginTop: spacing.xs },
        sub: { fontFamily: typography.fontFamily.medium, fontSize: 13.5, color: c.textSecondary, textAlign: 'center', marginTop: 4 },
        mvp: { fontFamily: typography.fontFamily.heading, fontSize: 14, color: c.accent, marginTop: spacing.sm },
        stats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, alignSelf: 'stretch' },
        stat: { flex: 1, alignItems: 'center', backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, paddingVertical: spacing.md },
        statValue: { fontFamily: typography.fontFamily.display, fontSize: 28 },
        statLabel: { fontFamily: typography.fontFamily.regular, fontSize: 11.5, color: c.textMuted },
        chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: spacing.md },
        chip: { fontFamily: typography.fontFamily.semiBold, fontSize: 12, color: c.text, backgroundColor: c.surfaceVariant, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
        warn: { fontFamily: typography.fontFamily.medium, fontSize: 12.5, color: c.error, textAlign: 'center', marginTop: spacing.sm },
        events: { alignSelf: 'stretch', maxHeight: 150, marginTop: spacing.md },
        event: { fontFamily: typography.fontFamily.regular, fontSize: 12.5, lineHeight: 17, color: c.textSecondary },
        btn: { alignSelf: 'stretch', alignItems: 'center', marginTop: spacing.lg, paddingVertical: 15, borderRadius: 999, backgroundColor: c.primary, borderBottomWidth: 4, borderBottomColor: c.primaryDark },
        btnPressed: { transform: [{ translateY: 2 }], borderBottomWidth: 2 },
        btnText: { fontFamily: typography.fontFamily.heading, fontSize: 16, color: '#fff' },
        chest: { fontSize: 84 },
        tap: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.textSecondary, marginTop: spacing.sm },
        loot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, padding: spacing.md },
        lootChest: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.textSecondary },
        lootValue: { fontFamily: typography.fontFamily.heading, fontSize: 14, color: c.text },
    });
}

/** Petit indicateur de guerre pour l'accueil (route légère /api/clan/status). */
export function WarStrip({ status, onPress }: {
    status: { day: number; clanName: string; rivalName: string | null; daysWon: number; rivalDaysWon: number; me: { role: string; multiplier: number; dailyPoints: number; wounded: boolean } };
    onPress: () => void;
}) {
    const colors = useColors();
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [ws.wrap, pressed && { opacity: 0.9 }]}>
            <Text style={ws.icon}>⚔️</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={ws.title} numberOfLines={1}>Guerre des clans · Jour {status.day}</Text>
                <Text style={ws.sub} numberOfLines={1}>{status.clanName} {status.daysWon} – {status.rivalDaysWon} {status.rivalName ?? ''}</Text>
            </View>
            <View style={ws.pts}>
                <Text style={ws.ptsText}>{status.me.dailyPoints} pts</Text>
                <Text style={ws.mult}>×{status.me.multiplier}{status.me.wounded ? ' 🩹' : ''}</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.accent2} />
        </Pressable>
    );
}

const ws = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.xl, backgroundColor: '#1A1512' },
    icon: { fontSize: 24 },
    title: { fontFamily: typography.fontFamily.heading, fontSize: 13.5, color: '#FDFAF4' },
    sub: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: 'rgba(253,250,244,0.65)', marginTop: 1 },
    pts: { alignItems: 'flex-end' },
    ptsText: { fontFamily: typography.fontFamily.display, fontSize: 15, color: '#FFB547' },
    mult: { fontFamily: typography.fontFamily.semiBold, fontSize: 11, color: 'rgba(253,250,244,0.65)' },
});
