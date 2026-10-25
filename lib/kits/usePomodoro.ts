/**
 * Minuteur Pomodoro — portage de PomodoroProvider du site
 * (workyt-next : components/pomodoro/PomodoroProvider.tsx).
 *
 * Mêmes règles : le temps restant est toujours recalculé depuis une heure de
 * fin absolue (pas de dérive quand l'app passe en arrière-plan), l'état est
 * mémorisé sur l'appareil, un focus abandonné après plus d'une minute = Foxy
 * prend le fromage, la pause longue arrive tous les `cyclesBeforeLong` focus.
 *
 * Différences assumées avec le site : pas de carillon, ni de notification,
 * ni d'ambiance sonore / radio (Web Audio et YouTube n'existent pas en natif).
 * Le mode strict surveille la sortie de l'APPLICATION (AppState) au lieu de
 * l'onglet.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, STRICT_HIDDEN_MS, sanitizeSettings, type PomodoroSettings } from './pomodoroSettings';
import { getPomodoroPreferences, logPomodoroSession, putPomodoroPreferences } from './pomodoroApi';

export type Phase = 'focus' | 'short' | 'long';
export type Status = 'idle' | 'running' | 'paused';
export type Outcome = 'kept' | 'stolen' | null;

interface TimerState {
    phase: Phase;
    status: Status;
    endsAt: number | null;
    remainingMs: number;
    cycle: number;
    focusStartedAt: number | null;
    focusRunMs: number;
    resumedAt: number | null;
    outcome: Outcome;
    subject: string;
}

// Mêmes clés que le localStorage du site
const STATE_KEY = 'wk-pomodoro-state';
const SETTINGS_KEY = 'wk-pomodoro-settings';
const FABLE_KEY = 'wk-pomodoro-fable';
const TODAY_KEY = 'wk-pomodoro-today';

function phaseMs(phase: Phase, s: PomodoroSettings): number {
    const min = phase === 'focus' ? s.focusMin : phase === 'short' ? s.shortBreakMin : s.longBreakMin;
    return min * 60_000;
}

function initialState(s: PomodoroSettings): TimerState {
    return {
        phase: 'focus',
        status: 'idle',
        endsAt: null,
        remainingMs: phaseMs('focus', s),
        cycle: 0,
        focusStartedAt: null,
        focusRunMs: 0,
        resumedAt: null,
        outcome: null,
        subject: '',
    };
}

/** AAAA-MM-JJ local (équivalent de Intl fr-CA, sans dépendre d'Intl). */
function todayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatClock(ms: number): string {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function phaseLabel(p: Phase): string {
    return p === 'focus' ? 'Focus' : p === 'short' ? 'Pause courte' : 'Pause longue';
}

async function readJson<T>(key: string): Promise<T | null> {
    try {
        const raw = await AsyncStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch {
        return null;
    }
}

export function usePomodoro({ isAuthenticated, onMessage }: {
    isAuthenticated: boolean;
    /** Messages ponctuels (objectif atteint, mode strict…) */
    onMessage?: (text: string, tone: 'ok' | 'ko') => void;
}) {
    const [hydrated, setHydrated] = useState(false);
    const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
    const [state, setState] = useState<TimerState>(() => initialState(DEFAULT_SETTINGS));
    const [now, setNow] = useState(() => Date.now());
    const [fableCount, setFableCount] = useState(0);
    const [todayCount, setTodayCount] = useState(0);
    const [statsVersion, setStatsVersion] = useState(0);

    const stateRef = useRef(state);
    const settingsRef = useRef(settings);
    const authRef = useRef(isAuthenticated);
    const fableRef = useRef(0);
    const msgRef = useRef(onMessage);
    useLayoutEffect(() => {
        stateRef.current = state;
        settingsRef.current = settings;
        authRef.current = isAuthenticated;
        msgRef.current = onMessage;
    }, [state, settings, isAuthenticated, onMessage]);

    const commit = useCallback((next: TimerState) => {
        stateRef.current = next;
        setState(next);
    }, []);

    /* ───────── Chargement / sauvegarde locale ───────── */

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const s = sanitizeSettings(await readJson(SETTINGS_KEY));
            const saved = await readJson<TimerState>(STATE_KEY);
            const fable = Number(await AsyncStorage.getItem(FABLE_KEY).catch(() => null)) || 0;
            const today = await readJson<{ date: string; count: number }>(TODAY_KEY);
            if (cancelled) return;
            setSettings(s);
            settingsRef.current = s;
            const st = saved && typeof saved.phase === 'string' ? { ...initialState(s), ...saved } : initialState(s);
            stateRef.current = st;
            setState(st);
            fableRef.current = fable;
            setFableCount(fable);
            setTodayCount(today?.date === todayKey() ? today.count : 0);
            setHydrated(true);
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (hydrated) AsyncStorage.setItem(STATE_KEY, JSON.stringify(state)).catch(() => {});
    }, [state, hydrated]);

    /* ───────── Réglages synchronisés (comptes connectés) ───────── */

    const serverSyncedRef = useRef(false);
    useEffect(() => {
        if (!hydrated || !isAuthenticated || serverSyncedRef.current) return;
        serverSyncedRef.current = true;
        getPomodoroPreferences()
            .then((remote) => {
                if (remote) {
                    const s = sanitizeSettings(remote);
                    setSettings(s);
                    settingsRef.current = s;
                    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s)).catch(() => {});
                    setState((st) => (st.status === 'idle' ? { ...st, remainingMs: phaseMs(st.phase, s) } : st));
                } else {
                    // Premier passage : les réglages de l'appareil deviennent ceux du compte
                    putPomodoroPreferences(settingsRef.current).catch(() => {});
                }
            })
            .catch(() => {});
    }, [hydrated, isAuthenticated]);

    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const updateSettings = useCallback((patch: Partial<PomodoroSettings>) => {
        const next = sanitizeSettings({ ...settingsRef.current, ...patch });
        settingsRef.current = next;
        setSettings(next);
        AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
        setState((st) => (st.status === 'idle' ? { ...st, remainingMs: phaseMs(st.phase, next) } : st));
        if (authRef.current) {
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => { putPomodoroPreferences(next).catch(() => {}); }, 800);
        }
    }, []);

    /* ───────── Journal des focus ───────── */

    const logFocus = useCallback((s: TimerState, endedAt: number, completed: boolean) => {
        if (!authRef.current || !s.focusStartedAt) return;
        const focusedMs = s.focusRunMs + (s.resumedAt ? endedAt - s.resumedAt : 0);
        logPomodoroSession({
            startedAt: new Date(s.focusStartedAt).toISOString(),
            endedAt: new Date(endedAt).toISOString(),
            plannedMinutes: settingsRef.current.focusMin,
            focusedSeconds: Math.round(focusedMs / 1000),
            completed,
            subject: s.subject || undefined,
        })
            .then(() => setStatsVersion((v) => v + 1))
            .catch(() => {});
    }, []);

    const bumpCounts = useCallback(() => {
        const fable = fableRef.current + 1;
        fableRef.current = fable;
        setFableCount(fable);
        AsyncStorage.setItem(FABLE_KEY, String(fable)).catch(() => {});

        const date = todayKey();
        readJson<{ date: string; count: number }>(TODAY_KEY).then((prev) => {
            const today = (prev?.date === date ? prev.count : 0) + 1;
            AsyncStorage.setItem(TODAY_KEY, JSON.stringify({ date, count: today })).catch(() => {});
            setTodayCount(today);
            if (authRef.current && today === settingsRef.current.dailyGoal) {
                msgRef.current?.(`Objectif du jour atteint : ${today} pomodoros !`, 'ok');
            }
        });
    }, []);

    /* ───────── Transitions ───────── */

    const completePhase = useCallback((at: number) => {
        const s = stateRef.current;
        const cfg = settingsRef.current;
        if (s.status !== 'running') return;
        // Revenu longtemps après la fin : on n'enchaîne pas tout seul
        const late = Date.now() - at > 60_000;

        if (s.phase === 'focus') {
            logFocus(s, at, true);
            bumpCounts();
            const cycle = s.cycle + 1;
            const nextPhase: Phase = cycle % cfg.cyclesBeforeLong === 0 ? 'long' : 'short';
            const auto = cfg.autoStartBreaks && !late;
            commit({
                ...s,
                phase: nextPhase,
                status: auto ? 'running' : 'idle',
                endsAt: auto ? at + phaseMs(nextPhase, cfg) : null,
                remainingMs: phaseMs(nextPhase, cfg),
                cycle,
                focusStartedAt: null,
                focusRunMs: 0,
                resumedAt: null,
                outcome: 'kept',
            });
        } else {
            const auto = cfg.autoStartFocus && !late;
            const startAt = Date.now();
            commit({
                ...s,
                phase: 'focus',
                status: auto ? 'running' : 'idle',
                endsAt: auto ? startAt + phaseMs('focus', cfg) : null,
                remainingMs: phaseMs('focus', cfg),
                cycle: s.phase === 'long' ? 0 : s.cycle,
                focusStartedAt: auto ? startAt : null,
                focusRunMs: 0,
                resumedAt: auto ? startAt : null,
                outcome: null,
            });
        }
    }, [bumpCounts, commit, logFocus]);

    const start = useCallback(() => {
        const s = stateRef.current;
        if (s.status === 'running') return;
        const t = Date.now();
        const isFocus = s.phase === 'focus';
        commit({
            ...s,
            status: 'running',
            endsAt: t + s.remainingMs,
            focusStartedAt: isFocus ? (s.focusStartedAt ?? t) : null,
            resumedAt: isFocus ? t : null,
            outcome: isFocus && s.status === 'idle' ? null : s.outcome,
        });
    }, [commit]);

    const pause = useCallback(() => {
        const s = stateRef.current;
        if (s.status !== 'running' || !s.endsAt) return;
        const t = Date.now();
        commit({
            ...s,
            status: 'paused',
            remainingMs: Math.max(0, s.endsAt - t),
            endsAt: null,
            focusRunMs: s.phase === 'focus' && s.resumedAt ? s.focusRunMs + (t - s.resumedAt) : s.focusRunMs,
            resumedAt: null,
        });
    }, [commit]);

    const stop = useCallback(() => {
        const s = stateRef.current;
        const cfg = settingsRef.current;
        const t = Date.now();
        if (s.phase === 'focus') {
            const ran = s.focusRunMs + (s.resumedAt ? t - s.resumedAt : 0);
            // Moins d'une minute : simple remise à zéro, pas de fable
            const stolen = s.status !== 'idle' && ran >= 60_000;
            if (stolen) logFocus(s, t, false);
            commit({ ...initialState(cfg), cycle: s.cycle, subject: s.subject, outcome: stolen ? 'stolen' : null });
        } else {
            commit({ ...initialState(cfg), cycle: s.phase === 'long' ? 0 : s.cycle, subject: s.subject, outcome: s.outcome });
        }
    }, [commit, logFocus]);

    const skip = useCallback(() => {
        const s = stateRef.current;
        if (s.phase === 'focus') {
            stop();
            return;
        }
        const cfg = settingsRef.current;
        commit({ ...initialState(cfg), cycle: s.phase === 'long' ? 0 : s.cycle, subject: s.subject, outcome: s.outcome });
    }, [commit, stop]);

    const selectPhase = useCallback((p: Phase) => {
        const s = stateRef.current;
        if (s.status !== 'idle') return;
        commit({ ...s, phase: p, remainingMs: phaseMs(p, settingsRef.current) });
    }, [commit]);

    const setSubject = useCallback((subject: string) => {
        commit({ ...stateRef.current, subject });
    }, [commit]);

    const syncFableCount = useCallback((serverTotal: number) => {
        const next = Math.max(fableRef.current, serverTotal);
        fableRef.current = next;
        setFableCount(next);
        AsyncStorage.setItem(FABLE_KEY, String(next)).catch(() => {});
    }, []);

    /* ───────── Horloge ───────── */

    useEffect(() => {
        if (state.status !== 'running') return;
        const tick = () => {
            const t = Date.now();
            setNow(t);
            const s = stateRef.current;
            if (s.status === 'running' && s.endsAt && t >= s.endsAt) completePhase(s.endsAt);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [state.status, state.endsAt, completePhase]);

    /* ───────── Mode strict : quitter l'application trop longtemps ───────── */

    useEffect(() => {
        let hiddenAt: number | null = null;
        const sub = AppState.addEventListener('change', (next) => {
            if (next !== 'active') {
                if (hiddenAt === null) hiddenAt = Date.now();
                return;
            }
            const away = hiddenAt ? Date.now() - hiddenAt : 0;
            hiddenAt = null;
            const s = stateRef.current;
            if (settingsRef.current.strictMode && s.phase === 'focus' && s.status === 'running' && away > STRICT_HIDDEN_MS) {
                stop();
                msgRef.current?.("Tu as quitté l'application trop longtemps : Foxy a pris le fromage !", 'ko');
            }
        });
        return () => sub.remove();
    }, [stop]);

    const remainingMs = state.status === 'running' && state.endsAt ? Math.max(0, state.endsAt - now) : state.remainingMs;

    return {
        hydrated,
        settings,
        updateSettings,
        phase: state.phase,
        status: state.status,
        remainingMs,
        totalMs: phaseMs(state.phase, settings),
        cycle: state.cycle,
        outcome: state.outcome,
        subject: state.subject,
        setSubject,
        start,
        pause,
        stop,
        skip,
        selectPhase,
        fableCount,
        syncFableCount,
        todayCount,
        statsVersion,
    };
}

export type PomodoroApi = ReturnType<typeof usePomodoro>;
