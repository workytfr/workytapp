/** Copie fidèle de workyt-next : lib/pomodoro/settings.ts */
/**
 * Réglages du Pomodoro, partagés entre le client (localStorage) et l'API
 * (préférences synchronisées des comptes connectés).
 */

export interface PomodoroSettings {
    focusMin: number;
    shortBreakMin: number;
    longBreakMin: number;
    /** Nombre de focus avant une pause longue */
    cyclesBeforeLong: number;
    autoStartBreaks: boolean;
    autoStartFocus: boolean;
    sound: boolean;
    notifications: boolean;
    /** Quitter l'onglet plus de STRICT_HIDDEN_MS pendant un focus = le renard prend le fromage */
    strictMode: boolean;
    /** Objectif quotidien en pomodoros (comptes connectés) */
    dailyGoal: number;
}

export const DEFAULT_SETTINGS: PomodoroSettings = {
    focusMin: 25,
    shortBreakMin: 5,
    longBreakMin: 15,
    cyclesBeforeLong: 4,
    autoStartBreaks: false,
    autoStartFocus: false,
    sound: true,
    notifications: false,
    strictMode: false,
    dailyGoal: 4,
};

export const STRICT_HIDDEN_MS = 30_000;

const LIMITS: Record<"focusMin" | "shortBreakMin" | "longBreakMin" | "cyclesBeforeLong" | "dailyGoal", [number, number]> = {
    focusMin: [5, 120],
    shortBreakMin: [1, 30],
    longBreakMin: [5, 60],
    cyclesBeforeLong: [2, 8],
    dailyGoal: [1, 16],
};

export const PRESETS: { label: string; focusMin: number; shortBreakMin: number; longBreakMin: number }[] = [
    { label: "Classique 25/5", focusMin: 25, shortBreakMin: 5, longBreakMin: 15 },
    { label: "Long 50/10", focusMin: 50, shortBreakMin: 10, longBreakMin: 20 },
    { label: "Marathon 90/20", focusMin: 90, shortBreakMin: 20, longBreakMin: 30 },
];

export const SUBJECTS = [
    "Mathématiques",
    "Français",
    "Philosophie",
    "Histoire-géographie",
    "Physique-chimie",
    "SVT",
    "Anglais",
    "Espagnol",
    "Allemand",
    "SES",
    "NSI",
    "Technologie",
    "Autre",
] as const;

function clampInt(v: unknown, [min, max]: [number, number], fallback: number): number {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
}

/** Nettoie une entrée inconnue (localStorage, corps de requête) en réglages valides. */
export function sanitizeSettings(input: unknown): PomodoroSettings {
    const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    const bool = (k: keyof PomodoroSettings) =>
        typeof o[k] === "boolean" ? (o[k] as boolean) : (DEFAULT_SETTINGS[k] as boolean);
    return {
        focusMin: clampInt(o.focusMin, LIMITS.focusMin, DEFAULT_SETTINGS.focusMin),
        shortBreakMin: clampInt(o.shortBreakMin, LIMITS.shortBreakMin, DEFAULT_SETTINGS.shortBreakMin),
        longBreakMin: clampInt(o.longBreakMin, LIMITS.longBreakMin, DEFAULT_SETTINGS.longBreakMin),
        cyclesBeforeLong: clampInt(o.cyclesBeforeLong, LIMITS.cyclesBeforeLong, DEFAULT_SETTINGS.cyclesBeforeLong),
        dailyGoal: clampInt(o.dailyGoal, LIMITS.dailyGoal, DEFAULT_SETTINGS.dailyGoal),
        autoStartBreaks: bool("autoStartBreaks"),
        autoStartFocus: bool("autoStartFocus"),
        sound: bool("sound"),
        notifications: bool("notifications"),
        strictMode: bool("strictMode"),
    };
}

export const SETTINGS_LIMITS = LIMITS;
