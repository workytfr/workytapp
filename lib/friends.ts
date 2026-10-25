/**
 * Amis — types et appels repris de la page /amis du site
 * (workyt-next : app/amis/page.tsx, lib/friendService.ts).
 *
 * Les routes /api/friends acceptent le jeton Bearer via friends/_auth.ts.
 * Elles répondent { success, data } ou { error }.
 */
import { apiFetch } from './api';

export interface Friend {
    friendshipId: string;
    userId: string;
    username: string;
    points: number;
    role: string;
    heroLevel: number;
    avatar: string | null;
    isOnline: boolean;
    since: string;
}

export interface FriendSearchResult {
    userId: string;
    username: string;
    points: number;
    avatar: string | null;
}

type Envelope<T> = { success: boolean; data: T };

/** GET /api/friends?page= — mes amis (30 par page côté serveur). */
export async function getFriends(page = 1): Promise<{ friends: Friend[]; total: number; page: number }> {
    return (await apiFetch<Envelope<{ friends: Friend[]; total: number; page: number }>>(`/friends?page=${page}`)).data;
}

/** GET /api/friends/requests — demandes reçues et envoyées. */
export async function getFriendRequests(): Promise<{ received: Friend[]; sent: Friend[] }> {
    return (await apiFetch<Envelope<{ received: Friend[]; sent: Friend[] }>>('/friends/requests')).data;
}

/** GET /api/friends/search?q= — membres à qui envoyer une demande (2 caractères min.). */
export async function searchFriends(q: string, signal?: AbortSignal): Promise<FriendSearchResult[]> {
    const res = await apiFetch<Envelope<{ results: FriendSearchResult[] }>>(
        `/friends/search?q=${encodeURIComponent(q)}`,
        signal ? { signal } : {},
    );
    return res.data.results;
}

/**
 * POST /api/friends/request — envoie une demande.
 * `message` est renseigné quand une demande croisée a été acceptée d'office.
 */
export function sendFriendRequest(username: string): Promise<{ success: boolean; friendshipId?: string; message?: string }> {
    return apiFetch('/friends/request', { method: 'POST', body: JSON.stringify({ username }) });
}

/** POST /api/friends/[id]/respond — accepte ou refuse une demande reçue. */
export function respondFriendRequest(friendshipId: string, accept: boolean): Promise<{ success: boolean; accepted: boolean }> {
    return apiFetch(`/friends/${friendshipId}/respond`, { method: 'POST', body: JSON.stringify({ accept }) });
}

/** DELETE /api/friends/[id] — retire un ami, annule ou retire une demande. */
export function removeFriendship(friendshipId: string): Promise<{ success: boolean }> {
    return apiFetch(`/friends/${friendshipId}`, { method: 'DELETE' });
}
