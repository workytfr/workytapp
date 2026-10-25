/**
 * Routes Pomodoro du site (/api/pomodoro/preferences et /sessions) : elles
 * acceptent le jeton Bearer via friends/_auth.ts. Seuls les comptes connectés
 * synchronisent leurs réglages et journalisent leurs focus.
 */
import { apiFetch } from '../api';
import type { PomodoroSettings } from './pomodoroSettings';

export interface PomodoroStats {
    today: { date: string; completed: number; minutes: number };
    week: { date: string; completed: number; minutes: number }[];
    streak: number;
    totals: { completed: number; abandoned: number; minutes: number };
    bySubject: { subject: string; minutes: number }[];
    recent: { subject: string | null; endedAt: string; minutes: number; completed: boolean }[];
}

export async function getPomodoroPreferences(): Promise<PomodoroSettings | null> {
    return (await apiFetch<{ settings: PomodoroSettings | null }>('/pomodoro/preferences')).settings;
}

export function putPomodoroPreferences(settings: PomodoroSettings) {
    return apiFetch('/pomodoro/preferences', { method: 'PUT', body: JSON.stringify({ settings }) });
}

export function logPomodoroSession(body: {
    startedAt: string;
    endedAt: string;
    plannedMinutes: number;
    focusedSeconds: number;
    completed: boolean;
    subject?: string;
}) {
    return apiFetch('/pomodoro/sessions', { method: 'POST', body: JSON.stringify(body) });
}

export function getPomodoroStats(): Promise<PomodoroStats> {
    return apiFetch<PomodoroStats>('/pomodoro/sessions');
}
