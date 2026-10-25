/**
 * Suivi personnalisé (mentorat) — types, appels et libellés repris du site
 * (workyt-next : app/suivi/_lib/client.ts et lib/mentorship/config.ts).
 *
 * Les routes /api/suivi répondent { success, data } ou { success: false, error }.
 * Elles acceptent le jeton Bearer de l'app via currentSuiviUser().
 */
import { API_ORIGIN, apiFetch, getToken, removeToken } from './api';

type IconName = string;

export type ViewerRole = 'student' | 'mentor' | 'moderator' | 'candidate';
export type SuiviStatus = 'pending' | 'active' | 'paused' | 'closed' | 'cancelled';
export type Kind = 'course' | 'lesson' | 'exercise' | 'quiz' | 'fiche' | 'evaluation';
export type Mood = 'bien' | 'moyen' | 'bloque';
export type SuiviFormat = 'ponctuel' | 'suivi';

export interface PublicUser { id: string; username: string; role?: string }

export interface Goal { id: string; title: string; done: boolean; doneAt: string | null }

export interface Assignment {
    id: string;
    kind: Kind;
    title: string;
    url: string;
    note: string;
    dueAt: string | null;
    assignedAt: string | null;
    doneAt: string | null;
    doneSource: 'auto' | 'student' | 'mentor' | null;
    alreadyDone: boolean;
    score: number | null;
    maxScore: number | null;
}

export interface MentorshipDetail {
    id: string;
    viewer: ViewerRole;
    status: SuiviStatus;
    format: SuiviFormat;
    subject: string;
    level: string;
    need: string;
    goalType: string;
    availability: string;
    createdAt: string | null;
    student: PublicUser | null;
    roomKey?: string;
    mentor?: (PublicUser & { bio: string }) | null;
    matchedAt?: string | null;
    closedAt?: string | null;
    goals?: Goal[];
    assignments?: Assignment[];
    checkin?: { askedAt: string | null; answeredAt: string | null; mood: Mood | null } | null;
    duoStreak?: { current: number; best: number };
    closure?: {
        outcome: string;
        summary: string;
        studentFeedback: 'helpful' | 'neutral' | 'not_helpful' | null;
        byStudent: boolean;
    } | null;
    pinnedMessageIds?: string[];
}

export interface SuiviMessage {
    id: string;
    authorRole: 'student' | 'mentor' | 'moderator' | 'system';
    author: PublicUser | null;
    kind: 'text' | 'resource' | 'goal' | 'checkin' | 'checkin_reply' | 'event' | 'block' | 'confused';
    text: string;
    attachment: { name: string; mime: string; url: string } | null;
    meta: {
        assignmentId: string | null;
        goalId: string | null;
        mood: Mood | null;
        event: string | null;
        blockType?: string | null;
        blockTitle?: string | null;
        replyTo?: string | null;
    } | null;
    status: 'visible' | 'blocked';
    blockedReasons?: string[];
    createdAt: string;
}

export interface MentorshipSummary {
    id: string;
    status: SuiviStatus;
    format: SuiviFormat;
    subject: string;
    level: string;
    goalType: string;
    student: PublicUser | null;
    mentor: PublicUser | null;
    createdAt: string | null;
    lastMessageAt: string | null;
    goals: { total: number; done: number };
    assignments: { total: number; done: number };
    checkinPending: boolean;
    duoStreak: number;
    unread: number;
}

export interface SuiviHomeData {
    authenticated: boolean;
    me?: PublicUser;
    asStudent?: MentorshipSummary[];
}

// ─── Libellés (identiques à lib/mentorship/config.ts du site) ───

export const MAX_OPEN_PER_STUDENT = 2;
export const ANNOUNCED_DELAY_HOURS = 48;

export const FORMAT_LABELS: Record<SuiviFormat, { label: string; hint: string }> = {
    ponctuel: { label: 'Un coup de main', hint: 'Une séance pour débloquer un point précis' },
    suivi: { label: 'Un suivi régulier', hint: 'Plusieurs semaines avec le même bénévole' },
};

export const GOAL_TYPE_LABELS: Record<string, string> = {
    comprendre: 'Comprendre un chapitre',
    moyenne: 'Remonter ma moyenne',
    examen: 'Préparer un examen',
    methode: 'Apprendre à m’organiser',
    decrochage: 'Je décroche, j’ai besoin d’aide',
};

export const STATUS_META: Record<SuiviStatus, { label: string; color: string }> = {
    pending: { label: 'En attente', color: '#B7791F' },
    active: { label: 'En cours', color: '#2E7D32' },
    paused: { label: 'En pause', color: '#0277BD' },
    closed: { label: 'Terminé', color: '#78716C' },
    cancelled: { label: 'Annulé', color: '#A8A29E' },
};

export const MOOD_META: Record<Mood, { label: string; emoji: string }> = {
    bien: { label: 'Ça avance bien', emoji: '😀' },
    moyen: { label: 'Moyen', emoji: '😐' },
    bloque: { label: 'Je bloque', emoji: '😣' },
};

export const BLOCK_META: Record<string, { label: string; color: string; icon: IconName }> = {
    definition: { label: 'Définition', color: '#1565C0', icon: 'book-outline' },
    propriete: { label: 'Propriété', color: '#6A1B9A', icon: 'git-branch-outline' },
    theoreme: { label: 'Théorème', color: '#AD1457', icon: 'school-outline' },
    exemple: { label: 'Exemple', color: '#2E7D32', icon: 'bulb-outline' },
    methode: { label: 'Méthode', color: '#C24A0A', icon: 'list-outline' },
    indice: { label: 'Indice', color: '#B7791F', icon: 'eye-off-outline' },
    remarque: { label: 'Remarque', color: '#0277BD', icon: 'information-circle-outline' },
    attention: { label: 'Attention', color: '#C62828', icon: 'warning-outline' },
};

export const KIND_META: Record<Kind, { label: string; icon: IconName; color: string }> = {
    course: { label: 'Cours', icon: 'book-outline', color: '#FF6A1A' },
    lesson: { label: 'Leçon', icon: 'school-outline', color: '#E8590C' },
    exercise: { label: 'Exercice', icon: 'barbell-outline', color: '#2B8CB8' },
    quiz: { label: 'Quiz', icon: 'help-circle-outline', color: '#7C4DDB' },
    fiche: { label: 'Fiche', icon: 'document-text-outline', color: '#4E9A2F' },
    evaluation: { label: 'Évaluation', icon: 'clipboard-outline', color: '#C2881B' },
};

/** Ressources validées automatiquement par le site (l'élève ne peut pas les cocher). */
export const AUTO_DETECTED_KINDS: Kind[] = ['course', 'lesson', 'quiz', 'evaluation'];

// ─── Appels ───

async function call<T>(endpoint: string, init?: RequestInit): Promise<T> {
    const res = await apiFetch<{ success?: boolean; data?: T; error?: string }>(endpoint, init);
    if (res && res.success === false) throw new Error(res.error || 'Une erreur est survenue.');
    return res?.data as T;
}

export const getSuiviHome = () => call<SuiviHomeData>('/suivi');

export const createSuiviRequest = (body: {
    format: SuiviFormat; subject: string; level: string; goalType: string; need: string; availability: string;
}) => call<{ id: string }>('/suivi', { method: 'POST', body: JSON.stringify(body) });

export const getSuivi = (id: string) => call<MentorshipDetail>(`/suivi/${id}`);

/** Fil de messages ; `since` ne renvoie que les nouveaux. Lire vaut accusé de lecture. */
export const getSuiviMessages = (id: string, since?: string | null) =>
    call<SuiviMessage[]>(`/suivi/${id}/messages${since ? `?since=${encodeURIComponent(since)}` : ''}`);

export const postSuiviMessage = (
    id: string,
    body: { text?: string; kind?: 'checkin_reply' | 'confused'; mood?: Mood; replyTo?: string },
) => call<unknown>(`/suivi/${id}/messages`, { method: 'POST', body: JSON.stringify(body) });

/** Message avec une photo (multipart : text + file). */
export async function postSuiviPhoto(id: string, text: string, file: { uri: string; name: string; mimeType: string }) {
    const token = await getToken();
    const form = new FormData();
    form.append('text', text);
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as any);
    const res = await fetch(`${API_ORIGIN}/api/suivi/${id}/messages`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
        if (res.status === 401) await removeToken();
        throw new Error(data.error || `Erreur ${res.status}`);
    }
}

export const suiviAction = (id: string, action: 'cancel' | 'feedback', extra: Record<string, unknown> = {}) =>
    call<unknown>(`/suivi/${id}`, { method: 'PATCH', body: JSON.stringify({ action, ...extra }) });

export const markAssignmentDone = (id: string, assignmentId: string) =>
    call<unknown>(`/suivi/${id}/assignments`, { method: 'PATCH', body: JSON.stringify({ assignmentId, done: true }) });

/** URL absolue d'une pièce jointe (protégée : à charger avec le jeton). */
export const attachmentUri = (path: string) => (path.startsWith('http') ? path : `${API_ORIGIN}${path}`);

/**
 * Route de l'app pour une ressource assignée (URL du site : /cours/<id-slug>/…,
 * /fiches/<id ou slug>, /evaluation/draw?courseId=…). `null` → ouvrir le site.
 */
export function appRouteForResource(url: string, title?: string): string | { pathname: string; params: Record<string, string> } | null {
    const id = (s: string | undefined) => s?.match(/^([a-f0-9]{24})/i)?.[1];
    const course = url.match(/^\/cours\/([^/?#]+)/);
    if (course && id(course[1])) return `/cours/${id(course[1])}`;
    const fiche = url.match(/^\/fiches\/([^/?#]+)/);
    if (fiche && id(fiche[1])) return `/fiches/${id(fiche[1])}`;
    const evalMatch = url.match(/courseId=([a-f0-9]{24})/i);
    if (url.startsWith('/evaluation') && evalMatch) {
        return { pathname: '/cours/evaluations', params: { id: evalMatch[1], title: title ?? '' } };
    }
    return null;
}
