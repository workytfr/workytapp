import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
// Pause / passer / recommencer n'ont pas d'équivalent dans Icon.tsx : import
// direct, une icône par fichier (pas de tree-shaking avec Metro).
import Pause from 'lucide-react-native/icons/pause';
import SkipForward from 'lucide-react-native/icons/skip-forward';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import Icon from '../../components/Icon';
import DuoButton from '../../components/DuoButton';
import { ChipTabs, IconButton, PageHeader, XpBar } from '../../components/wk';
import FableScene from '../../components/kits/FableScene';
import KitSection from '../../components/kits/KitSection';
import { useToast } from '../../components/kits/Toast';
import { useColors } from '../../lib/useColors';
import { useAuth } from '../../lib/auth';
import { radius, spacing, typography, type ThemeColors } from '../../lib/theme';
import { confirmAction } from '../../lib/confirm';
import { formatClock, phaseLabel, usePomodoro, type Phase, type PomodoroApi } from '../../lib/kits/usePomodoro';
import { PRESETS, SETTINGS_LIMITS, SUBJECTS, type PomodoroSettings } from '../../lib/kits/pomodoroSettings';
import { FABLE_CREDIT, FABLE_TITLE, FABLE_VERSES, POMODOROS_PER_FABLE, VERSES_PER_POMODORO, fableProgress } from '../../lib/kits/fable';
import { getPomodoroStats, type PomodoroStats } from '../../lib/kits/pomodoroApi';

const PHASES: Phase[] = ['focus', 'short', 'long'];

/** Pomodoro « Corvy et Foxy » — équivalent de /kits/pomodoro sur le site. */
export default function PomodoroScreen() {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const s = useMemo(() => createStyles(colors), [colors]);
    const { show: showToast, node: toastNode } = useToast();
    const p = usePomodoro({ isAuthenticated, onMessage: showToast });
    const [refreshKey, setRefreshKey] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <PageHeader
                topInset={insets.top}
                eyebrow="Pomodoro"
                title="Garde ton fromage"
                right={<IconButton icon="arrow-back" label="Kits de l'élève" onPress={() => router.back()} />}
            />
            <ScrollView
                contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing['3xl'] }]}
                refreshControl={isAuthenticated ? (
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); setRefreshKey((k) => k + 1); setTimeout(() => setRefreshing(false), 600); }}
                        tintColor={colors.primary}
                    />
                ) : undefined}
            >
                <Text style={s.intro}>
                    « Tout flatteur vit aux dépens de celui qui l'écoute. » Pendant chaque focus, Foxy essaie de te
                    distraire. Tiens bon jusqu'à la sonnerie et Corvy garde son fromage. Le minuteur continue de
                    tourner si tu quittes cet écran.
                </Text>

                <FableScene phase={p.phase} status={p.status} outcome={p.outcome} remainingMs={p.remainingMs} totalMs={p.totalMs} />
                <TimerPanel p={p} authed={isAuthenticated} />
                <FablePanel count={p.fableCount} />
                <SettingsPanel p={p} authed={isAuthenticated} />
                <StatsPanel p={p} authed={isAuthenticated} refreshKey={refreshKey} onLogin={() => router.push('/auth/login' as any)} />
            </ScrollView>
            {toastNode}
        </View>
    );
}

/* ───────── Minuteur ───────── */

const TimerPanel = memo(function TimerPanel({ p, authed }: { p: PomodoroApi; authed: boolean }) {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    const isFocus = p.phase === 'focus';
    const progress = Math.min(1, Math.max(0, 1 - p.remainingMs / p.totalMs));
    const nextLong = p.settings.cyclesBeforeLong - (p.cycle % p.settings.cyclesBeforeLong);
    const resetDisabled = p.status === 'idle' && p.remainingMs === p.totalMs;

    const onStop = async () => {
        if (isFocus && p.status !== 'idle') {
            const ok = await confirmAction('Abandonner le focus ?', 'Foxy va prendre le fromage.', 'Abandonner');
            if (!ok) return;
        }
        p.stop();
    };

    return (
        <View style={s.card}>
            <View style={s.phaseRow} accessibilityRole="tablist">
                {PHASES.map((ph) => {
                    const on = p.phase === ph;
                    const disabled = p.status !== 'idle' && !on;
                    return (
                        <Pressable
                            key={ph}
                            onPress={() => p.selectPhase(ph)}
                            disabled={disabled}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: on, disabled }}
                            style={[s.phaseBtn, on && s.phaseBtnOn, disabled && { opacity: 0.4 }]}
                        >
                            <Text style={[s.phaseText, on && s.phaseTextOn]}>{phaseLabel(ph)}</Text>
                        </Pressable>
                    );
                })}
            </View>

            <Text style={s.clock} accessibilityLabel={`Temps restant ${formatClock(p.remainingMs)}`}>{formatClock(p.remainingMs)}</Text>
            <XpBar percent={progress * 100} color={isFocus ? colors.primary : colors.accent3} />
            <Text style={s.timerHint}>
                {p.status === 'paused' ? 'En pause · ' : ''}
                {isFocus
                    ? `Pause longue dans ${nextLong} focus`
                    : p.phase === 'long' ? 'Grande pause : la série recommence ensuite' : 'Petite pause'}
            </Text>

            <View style={s.controls}>
                <Pressable
                    onPress={onStop}
                    disabled={resetDisabled}
                    accessibilityRole="button"
                    accessibilityLabel={isFocus ? 'Abandonner le focus' : 'Terminer la pause'}
                    style={({ pressed }) => [s.roundCtl, resetDisabled && { opacity: 0.3 }, pressed && { opacity: 0.6 }]}
                >
                    <RotateCcw size={20} color={colors.textSecondary} strokeWidth={2} />
                </Pressable>
                <View style={{ flex: 1, maxWidth: 200 }}>
                    {p.status === 'running' ? (
                        <PauseButton onPress={p.pause} />
                    ) : (
                        <DuoButton label={p.status === 'paused' ? 'Reprendre' : 'Démarrer'} icon="play" variant="primary" size="md" onPress={p.start} />
                    )}
                </View>
                <Pressable
                    onPress={p.skip}
                    disabled={isFocus}
                    accessibilityRole="button"
                    accessibilityLabel="Passer la pause"
                    style={({ pressed }) => [s.roundCtl, isFocus && { opacity: 0.3 }, pressed && { opacity: 0.6 }]}
                >
                    <SkipForward size={20} color={colors.textSecondary} strokeWidth={2} />
                </Pressable>
            </View>

            {/* Série en cours */}
            <View
                style={s.dots}
                accessibilityLabel={`${p.cycle % p.settings.cyclesBeforeLong} focus sur ${p.settings.cyclesBeforeLong} dans la série`}
            >
                {Array.from({ length: p.settings.cyclesBeforeLong }, (_, i) => (
                    <View key={i} style={[s.dot, i < p.cycle % p.settings.cyclesBeforeLong && { backgroundColor: colors.primary }]} />
                ))}
            </View>

            {authed ? (
                <View style={{ marginTop: spacing.md }}>
                    <Text style={s.subjectLabel}>Je travaille :</Text>
                    <ChipTabs<string>
                        value={p.subject}
                        onChange={p.setSubject}
                        style={{ paddingTop: spacing.sm }}
                        options={[{ value: '', label: 'Sans matière' }, ...SUBJECTS.map((x) => ({ value: x, label: x }))]}
                    />
                </View>
            ) : null}
        </View>
    );
});

/** Bouton « Pause » encre, même gabarit que DuoButton (qui n'a pas de variante encre). */
function PauseButton({ onPress }: { onPress: () => void }) {
    const colors = useColors();
    const [pressed, setPressed] = useState(false);
    return (
        <Pressable
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            accessibilityRole="button"
            accessibilityLabel="Pause"
            style={{ height: 57, justifyContent: 'flex-end' }}
        >
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 57, borderRadius: radius.lg, backgroundColor: '#000' }} />
            <View
                style={{
                    height: 52,
                    borderRadius: radius.lg,
                    backgroundColor: colors.statusBar === 'dark' ? '#1A1512' : '#4A3F38',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.sm,
                    transform: [{ translateY: pressed ? 5 : 0 }],
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                }}
            >
                <Pause size={20} color="#fff" strokeWidth={2.25} />
                <Text style={{ fontFamily: typography.fontFamily.display, fontSize: typography.size.lg, color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    Pause
                </Text>
            </View>
        </Pressable>
    );
}

/* ───────── La fable ───────── */

const FablePanel = memo(function FablePanel({ count }: { count: number }) {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    const { recitations, unlockedVerses, complete } = fableProgress(count);
    const left = POMODOROS_PER_FABLE - unlockedVerses / VERSES_PER_POMODORO;

    return (
        <KitSection
            title={`La fable : ${FABLE_TITLE}`}
            right={recitations > 0 ? <View style={s.chip}><Text style={s.chipText}>Récitée {recitations}×</Text></View> : undefined}
            text={complete
                ? 'Fable complète ! Comme Corvy, tu as gardé ton fromage.'
                : `Chaque focus réussi dévoile ${VERSES_PER_POMODORO} vers. Encore ${left} pomodoro${left > 1 ? 's' : ''} pour la finir.`}
        >
            <View style={{ gap: 4, marginTop: spacing.sm }}>
                {FABLE_VERSES.map((verse, i) =>
                    i < unlockedVerses ? (
                        <Text key={i} style={s.verse}>{verse}</Text>
                    ) : (
                        <View key={i} style={s.lockedVerse} accessibilityLabel="Vers verrouillé">
                            <Icon name="lock-closed" size={11} color={colors.border} />
                            <View style={[s.lockedBar, { maxWidth: `${40 + ((i * 37) % 50)}%` }]} />
                        </View>
                    ),
                )}
            </View>
            <Text style={s.credit}>{FABLE_CREDIT}</Text>
        </KitSection>
    );
});

/* ───────── Réglages ───────── */

type NumberKey = keyof typeof SETTINGS_LIMITS;
type BoolKey = 'autoStartBreaks' | 'autoStartFocus' | 'strictMode';

const DURATIONS: { key: Exclude<NumberKey, 'dailyGoal'>; label: string; unit: string }[] = [
    { key: 'focusMin', label: 'Focus', unit: 'min' },
    { key: 'shortBreakMin', label: 'Pause courte', unit: 'min' },
    { key: 'longBreakMin', label: 'Pause longue', unit: 'min' },
    { key: 'cyclesBeforeLong', label: 'Focus avant la pause longue', unit: '' },
];

// Le carillon et les notifications du navigateur n'ont pas d'équivalent ici
const TOGGLES: { key: BoolKey; label: string; hint?: string }[] = [
    { key: 'autoStartBreaks', label: 'Lancer les pauses automatiquement' },
    { key: 'autoStartFocus', label: 'Relancer le focus après la pause' },
    { key: 'strictMode', label: 'Mode strict', hint: "Quitter l'application plus de 30 s pendant un focus = Foxy prend le fromage." },
];

function Stepper({ label, unit, value, min, max, onChange }: {
    label: string;
    unit: string;
    value: number;
    min: number;
    max: number;
    onChange: (n: number) => void;
}) {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    return (
        <View style={s.stepper}>
            <Text style={s.stepLabel} numberOfLines={2}>{label}{unit ? <Text style={s.stepUnit}> · {unit}</Text> : null}</Text>
            <View style={s.stepRow}>
                <Pressable
                    onPress={() => onChange(Math.max(min, value - 1))}
                    onLongPress={() => onChange(Math.max(min, value - 5))}
                    disabled={value <= min}
                    accessibilityRole="button"
                    accessibilityLabel={`Diminuer ${label}`}
                    style={[s.stepBtn, value <= min && { opacity: 0.35 }]}
                >
                    <Text style={s.stepBtnText}>−</Text>
                </Pressable>
                <Text style={s.stepValue} accessibilityLabel={`${label} : ${value} ${unit}`}>
                    {value}
                </Text>
                <Pressable
                    onPress={() => onChange(Math.min(max, value + 1))}
                    onLongPress={() => onChange(Math.min(max, value + 5))}
                    disabled={value >= max}
                    accessibilityRole="button"
                    accessibilityLabel={`Augmenter ${label}`}
                    style={[s.stepBtn, value >= max && { opacity: 0.35 }]}
                >
                    <Text style={s.stepBtnText}>+</Text>
                </Pressable>
            </View>
        </View>
    );
}

const SettingsPanel = memo(function SettingsPanel({ p, authed }: { p: PomodoroApi; authed: boolean }) {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    const { settings, updateSettings, status } = p;
    const locked = status !== 'idle';

    return (
        <KitSection
            title="Réglages"
            text={(authed
                ? 'Enregistrés sur ton compte : tu les retrouves sur tous tes appareils.'
                : 'Enregistrés sur cet appareil.') + (locked ? " Les durées s'appliqueront à la prochaine phase." : '')}
        >
            <View style={s.presets}>
                {PRESETS.map((pr) => {
                    const on = settings.focusMin === pr.focusMin && settings.shortBreakMin === pr.shortBreakMin && settings.longBreakMin === pr.longBreakMin;
                    return (
                        <Pressable
                            key={pr.label}
                            onPress={() => updateSettings({ focusMin: pr.focusMin, shortBreakMin: pr.shortBreakMin, longBreakMin: pr.longBreakMin })}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                            style={[s.preset, on && s.presetOn]}
                        >
                            <Text style={[s.presetText, on && s.presetTextOn]}>{pr.label}</Text>
                        </Pressable>
                    );
                })}
            </View>

            <View style={s.grid}>
                {DURATIONS.map((d) => (
                    <Stepper
                        key={d.key}
                        label={d.label}
                        unit={d.unit}
                        value={settings[d.key]}
                        min={SETTINGS_LIMITS[d.key][0]}
                        max={SETTINGS_LIMITS[d.key][1]}
                        onChange={(n) => updateSettings({ [d.key]: n } as Partial<PomodoroSettings>)}
                    />
                ))}
            </View>

            {authed ? (
                <View style={{ marginTop: spacing.sm }}>
                    <Stepper
                        label="Objectif quotidien"
                        unit="pomodoros / jour"
                        value={settings.dailyGoal}
                        min={SETTINGS_LIMITS.dailyGoal[0]}
                        max={SETTINGS_LIMITS.dailyGoal[1]}
                        onChange={(n) => updateSettings({ dailyGoal: n })}
                    />
                </View>
            ) : null}

            <View style={{ marginTop: spacing.md }}>
                {TOGGLES.map((t) => (
                    <Pressable
                        key={t.key}
                        onPress={() => updateSettings({ [t.key]: !settings[t.key] } as Partial<PomodoroSettings>)}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: settings[t.key] }}
                        style={s.toggle}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={s.toggleLabel}>{t.label}</Text>
                            {t.hint ? <Text style={s.toggleHint}>{t.hint}</Text> : null}
                        </View>
                        <Switch
                            value={settings[t.key]}
                            onValueChange={(v) => updateSettings({ [t.key]: v } as Partial<PomodoroSettings>)}
                            trackColor={{ true: colors.primary, false: colors.border }}
                            thumbColor="#fff"
                        />
                    </Pressable>
                ))}
            </View>
        </KitSection>
    );
});

/* ───────── Statistiques ───────── */

function hours(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} h ${m.toString().padStart(2, '0')}` : `${h} h`;
}

const WEEKDAYS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
const weekday = (date: string) => WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
function shortWhen(iso: string): string {
    const d = new Date(iso);
    return `${WEEKDAYS[d.getDay()]}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const StatsPanel = memo(function StatsPanel({ p, authed, refreshKey, onLogin }: {
    p: PomodoroApi;
    authed: boolean;
    refreshKey: number;
    onLogin: () => void;
}) {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    const [stats, setStats] = useState<PomodoroStats | null>(null);
    const [failed, setFailed] = useState(false);
    const { statsVersion, syncFableCount, settings, todayCount } = p;

    const load = useCallback(() => {
        let cancelled = false;
        getPomodoroStats()
            .then((data) => {
                if (cancelled) return;
                setStats(data);
                setFailed(false);
                syncFableCount(data.totals.completed);
            })
            .catch(() => { if (!cancelled) setFailed(true); });
        return () => { cancelled = true; };
    }, [syncFableCount]);

    useEffect(() => {
        if (!authed) return;
        return load();
    }, [authed, statsVersion, refreshKey, load]);

    if (!authed) {
        return (
            <View style={s.inkCard}>
                <Text style={s.inkTitle}>Suis tes heures de travail</Text>
                <Text style={s.inkText}>
                    Avec un compte Workyt (gratuit) : historique et statistiques de tes focus, temps passé par matière,
                    série de jours, objectif quotidien et réglages synchronisés sur tous tes appareils.
                </Text>
                {todayCount > 0 ? (
                    <Text style={[s.inkText, { color: colors.accent2 }]}>
                        Déjà {todayCount} pomodoro{todayCount > 1 ? 's' : ''} aujourd'hui sur cet appareil.
                    </Text>
                ) : null}
                <DuoButton label="Se connecter" variant="primary" size="sm" onPress={onLogin} style={{ marginTop: spacing.md }} />
            </View>
        );
    }

    if (!stats) {
        return (
            <View style={[s.card, { minHeight: 160, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={s.timerHint}>{failed ? 'Statistiques indisponibles pour le moment.' : 'Chargement des statistiques…'}</Text>
            </View>
        );
    }

    const maxWeek = Math.max(30, ...stats.week.map((d) => d.minutes));
    const goal = settings.dailyGoal;
    const goalPct = Math.min(100, (stats.today.completed / goal) * 100);
    const maxSubject = Math.max(1, ...stats.bySubject.map((x) => x.minutes));

    return (
        <KitSection title="Mes statistiques">
            <View style={s.tiles}>
                <Tile icon="time-outline" label="Aujourd'hui" value={hours(stats.today.minutes)} />
                <Tile icon="flame-outline" label="Jours d'affilée" value={String(stats.streak)} />
                <Tile icon="bar-chart" label="Temps de focus (12 mois)" value={hours(stats.totals.minutes)} />
                <Tile icon="trophy-outline" label="Fromages gardés / volés (12 mois)" value={`${stats.totals.completed} / ${stats.totals.abandoned}`} />
            </View>

            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                <View style={s.lineBetween}>
                    <Text style={s.statLabel}>Objectif du jour</Text>
                    <Text style={s.statMuted}>{stats.today.completed} / {goal} pomodoros</Text>
                </View>
                <XpBar percent={goalPct} />
            </View>

            <Text style={[s.statLabel, { marginTop: spacing.xl }]}>7 derniers jours</Text>
            <View style={s.bars} accessibilityLabel="Minutes de focus des 7 derniers jours">
                {stats.week.map((d) => (
                    <View key={d.date} style={s.barCol}>
                        <Text style={s.barNum}>{d.minutes || ''}</Text>
                        <View
                            style={[
                                s.bar,
                                { height: (d.minutes / maxWeek) * 110, minHeight: d.minutes ? 4 : 0, opacity: d.minutes ? 1 : 0.15 },
                            ]}
                        />
                        <Text style={s.barDay}>{weekday(d.date)}</Text>
                    </View>
                ))}
            </View>

            <Text style={[s.statLabel, { marginTop: spacing.xl }]}>Par matière (30 jours)</Text>
            {stats.bySubject.length === 0 ? (
                <Text style={[s.statMuted, { marginTop: spacing.sm }]}>Choisis une matière avant de lancer un focus pour la voir ici.</Text>
            ) : (
                <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                    {stats.bySubject.slice(0, 6).map((x) => (
                        <View key={x.subject}>
                            <View style={s.lineBetween}>
                                <Text style={s.statText}>{x.subject}</Text>
                                <Text style={s.statMuted}>{hours(x.minutes)}</Text>
                            </View>
                            <View style={s.subjTrack}>
                                <View style={[s.subjFill, { width: `${(x.minutes / maxSubject) * 100}%` }]} />
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {stats.recent.length > 0 ? (
                <>
                    <Text style={[s.statLabel, { marginTop: spacing.xl }]}>Derniers focus</Text>
                    {stats.recent.map((r) => (
                        <View key={r.endedAt} style={s.recent}>
                            <Text style={s.statText}>{r.completed ? '🧀' : '🦊'}  {r.subject ?? 'Sans matière'}</Text>
                            <Text style={s.statMuted}>{r.minutes} min · {shortWhen(r.endedAt)}</Text>
                        </View>
                    ))}
                </>
            ) : null}
        </KitSection>
    );
});

function Tile({ icon, label, value }: { icon: string; label: string; value: string }) {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    return (
        <View style={s.tile}>
            <Icon name={icon} size={16} color={colors.accent} />
            <Text style={s.tileValue}>{value}</Text>
            <Text style={s.tileLabel}>{label}</Text>
        </View>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        body: { padding: spacing.lg, gap: spacing.lg },
        intro: { fontFamily: typography.fontFamily.regular, fontSize: 15, lineHeight: 22, color: c.textSecondary },

        card: {
            backgroundColor: c.surface,
            borderRadius: radius['3xl'],
            borderWidth: 1,
            borderColor: c.border,
            padding: spacing.xl,
        },
        phaseRow: { flexDirection: 'row', gap: 6 },
        phaseBtn: { flexGrow: 1, minHeight: 40, paddingHorizontal: 8, borderRadius: radius.full, backgroundColor: c.surfaceVariant, alignItems: 'center', justifyContent: 'center' },
        phaseBtnOn: { backgroundColor: c.text },
        phaseText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.textSecondary },
        phaseTextOn: { color: c.background },
        clock: {
            fontFamily: typography.fontFamily.display,
            fontSize: 76,
            lineHeight: 84,
            color: c.text,
            textAlign: 'center',
            marginTop: spacing.lg,
            marginBottom: spacing.md,
            fontVariant: ['tabular-nums'],
        },
        timerHint: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: c.textSecondary, textAlign: 'center', marginTop: spacing.md },
        controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginTop: spacing.xl },
        roundCtl: {
            width: 50,
            height: 50,
            borderRadius: 25,
            borderWidth: 1,
            borderColor: c.border,
            alignItems: 'center',
            justifyContent: 'center',
        },
        dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xl },
        dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.border },
        subjectLabel: { fontFamily: typography.fontFamily.medium, fontSize: 13, color: c.textSecondary, textAlign: 'center' },

        chip: { backgroundColor: c.surfaceVariant, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
        chipText: { fontFamily: typography.fontFamily.semiBold, fontSize: 11, color: c.textSecondary },
        verse: { fontFamily: typography.fontFamily.displayRegular, fontSize: 15, lineHeight: 22, color: c.text },
        lockedVerse: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 22 },
        lockedBar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: c.surfaceVariant },
        credit: { fontFamily: typography.fontFamily.regular, fontStyle: 'italic', fontSize: 12, color: c.textMuted, textAlign: 'right', marginTop: spacing.md },

        presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
        preset: { minHeight: 38, paddingHorizontal: 14, borderRadius: radius.full, backgroundColor: c.surfaceVariant, justifyContent: 'center' },
        presetOn: { backgroundColor: c.primary },
        presetText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.textSecondary },
        presetTextOn: { color: '#fff' },
        grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
        stepper: {
            flexGrow: 1,
            flexBasis: '45%',
            backgroundColor: c.background,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: c.border,
            padding: spacing.sm,
            gap: 4,
        },
        stepLabel: { fontFamily: typography.fontFamily.semiBold, fontSize: 12, color: c.textSecondary, paddingHorizontal: 4, minHeight: 16 },
        stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        stepBtn: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            alignItems: 'center',
            justifyContent: 'center',
        },
        stepBtnText: { fontFamily: typography.fontFamily.heading, fontSize: 20, lineHeight: 22, color: c.text },
        stepValue: { fontFamily: typography.fontFamily.display, fontSize: 22, color: c.text, textAlign: 'center', flexShrink: 1 },
        stepUnit: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textMuted },
        toggle: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            minHeight: 52,
            paddingVertical: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: c.divider,
        },
        toggleLabel: { fontFamily: typography.fontFamily.medium, fontSize: 14, color: c.text },
        toggleHint: { fontFamily: typography.fontFamily.regular, fontSize: 12, lineHeight: 16, color: c.textMuted, marginTop: 2 },

        inkCard: { backgroundColor: '#1A1512', borderRadius: radius['3xl'], padding: spacing['2xl'], gap: spacing.sm },
        inkTitle: { fontFamily: typography.fontFamily.display, fontSize: 26, lineHeight: 30, color: '#FDFAF4' },
        inkText: { fontFamily: typography.fontFamily.regular, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.7)' },

        tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
        tile: { flexGrow: 1, flexBasis: '45%', backgroundColor: c.surfaceVariant, borderRadius: radius.xl, padding: spacing.md },
        tileValue: { fontFamily: typography.fontFamily.display, fontSize: 22, color: c.text, marginTop: spacing.md },
        tileLabel: { fontFamily: typography.fontFamily.regular, fontSize: 11.5, color: c.textSecondary, marginTop: 2 },
        lineBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.md },
        statLabel: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.text },
        statText: { fontFamily: typography.fontFamily.regular, fontSize: 14, color: c.text },
        statMuted: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: c.textSecondary },
        bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, height: 160, marginTop: spacing.md },
        barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
        barNum: { fontFamily: typography.fontFamily.regular, fontSize: 10, color: c.textMuted },
        bar: { width: '100%', borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: c.primary },
        barDay: { fontFamily: typography.fontFamily.regular, fontSize: 11, color: c.textSecondary, textTransform: 'capitalize' },
        subjTrack: { height: 6, borderRadius: 3, backgroundColor: c.surfaceVariant, marginTop: 4, overflow: 'hidden' },
        subjFill: { height: '100%', borderRadius: 3, backgroundColor: c.accent2 },
        recent: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: spacing.md,
            paddingVertical: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: c.divider,
        },
    });
}
