/**
 * Défis (duels de quiz entre amis) — types et appels repris du site
 * (workyt-next : app/defis/[id]/page.tsx, lib/challengeService.ts).
 *
 * Les routes /api/challenges acceptent le jeton Bearer via friends/_auth.ts.
 * La correction et le chronométrage sont faits côté serveur : le client
 * n'envoie que son choix de réponse.
 */
import { API_ORIGIN, apiFetch, clearApiCache, getToken } from './api';

export type ChallengeStatus = 'pending' | 'active' | 'completed' | 'declined' | 'expired';

/** Élément de GET /api/challenges (30 derniers défis, dans les deux sens). */
export interface ChallengeSummary {
    id: string;
    status: ChallengeStatus;
    matiere: string | null;
    level: number;
    total: number;
    opponent: { _id: string; username: string } | null;
    iAmChallenger: boolean;
    myScore: number;
    myFinished: boolean;
    opponentFinished: boolean;
    opponentScore: number | null;
    outcome: 'win' | 'loss' | 'draw' | null;
    createdAt: string;
    expiresAt?: string;
}

export interface ChallengeQuestion {
    index: number;
    question: string;
    answers: string[];
    point: number;
    /** Seulement une fois que j'ai terminé */
    correctAnswer?: number;
}

/** GET /api/challenges/[id] — le défi tel que le joueur doit le voir. */
export interface ChallengeDetail {
    id: string;
    status: ChallengeStatus;
    matiere: string | null;
    level: number;
    secondsPerQuestion: number;
    side: 'challenger' | 'opponent';
    total: number;
    answeredCount: number;
    myScore: number;
    myFinished: boolean;
    opponentFinished: boolean;
    opponentScore: number | null;
    winner?: string | null;
    questions: ChallengeQuestion[];
}

type Envelope<T> = { success: boolean; data: T };

export async function getChallenges(): Promise<ChallengeSummary[]> {
    return (await apiFetch<Envelope<{ challenges: ChallengeSummary[] }>>('/challenges')).data.challenges ?? [];
}

export async function getChallenge(id: string): Promise<ChallengeDetail> {
    return (await apiFetch<Envelope<ChallengeDetail>>(`/challenges/${id}`)).data;
}

export function respondChallenge(id: string, accept: boolean): Promise<{ success: boolean; accepted: boolean }> {
    return apiFetch(`/challenges/${id}/respond`, { method: 'POST', body: JSON.stringify({ accept }) });
}

export function answerChallenge(
    id: string,
    index: number,
    answerIndex: number,
): Promise<{ success: boolean; isCorrect: boolean; correctAnswer: number; finished: boolean; completed: boolean }> {
    return apiFetch(`/challenges/${id}/answer`, { method: 'POST', body: JSON.stringify({ index, answerIndex }) });
}

/**
 * POST /api/challenges — défie un ami.
 * En cas de refus parce qu'un défi est déjà en cours avec cette personne, le
 * serveur renvoie son `challengeId` : on le remonte (apiFetch le perdrait)
 * pour y emmener le joueur, comme le site.
 */
export async function createChallenge(
    opponentId: string,
    matiere?: string,
): Promise<{ ok: true; challengeId: string } | { ok: false; error: string; challengeId?: string }> {
    const token = await getToken();
    let res: Response;
    try {
        res = await fetch(`${API_ORIGIN}/api/challenges`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ opponentId, ...(matiere ? { matiere } : {}) }),
        });
    } catch {
        return { ok: false, error: 'Connexion impossible. Vérifie ton réseau.' };
    }
    const data = await res.json().catch(() => ({}));
    clearApiCache();
    if (!res.ok) {
        return { ok: false, error: data.error || 'Impossible de lancer le défi', challengeId: data.challengeId };
    }
    return { ok: true, challengeId: data.challengeId };
}

/** Libellé d'état d'un défi de la liste, mot pour mot celui de /amis. */
export function challengeStateLabel(c: Pick<ChallengeSummary, 'status' | 'iAmChallenger' | 'myFinished'>): string {
    if (c.status === 'pending') return c.iAmChallenger ? 'En attente de réponse' : 'À accepter';
    if (c.status === 'active') return c.myFinished ? "En attente de l'adversaire" : 'À jouer →';
    if (c.status === 'expired') return 'Expiré';
    if (c.status === 'declined') return 'Refusé';
    return 'Terminé';
}
