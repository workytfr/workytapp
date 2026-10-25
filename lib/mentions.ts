import { apiFetch } from './api';
import { getSiteOrigin } from './siteOrigin';

/**
 * Gestion des mentions `@[user:id]` du forum.
 *
 * Le backend stocke les mentions figées sur l'ID utilisateur (`@[user:<24 hex>]`)
 * et les résout dynamiquement à l'affichage vers le pseudo courant.
 * On reproduit ici la même logique que le site web :
 *   - cache mémoire global (dédupe les requêtes entre composants)
 *   - résolution des IDs manquants via `POST /users/batch`
 */

export const MENTION_RE = /@\[user:([a-f0-9]{24})\]/g;

// id -> username (partagé entre tous les MarkdownRenderer)
const userCache = new Map<string, string>();
const inflight = new Map<string, Promise<void>>();

type MaybeUser = { _id?: string; id?: string; username?: string } | null | undefined;

/** Pré-remplit le cache avec des utilisateurs déjà connus (auteurs question/réponses). */
export function primeUsers(users?: MaybeUser[]): void {
    if (!users) return;
    for (const u of users) {
        const id = u && (u._id || u.id);
        if (id && u?.username) userCache.set(String(id), u.username);
    }
}

/** Extrait (dédupliqués) tous les IDs mentionnés dans un contenu. */
export function extractMentionIds(content?: string | null): string[] {
    if (!content) return [];
    const ids = new Set<string>();
    const re = new RegExp(MENTION_RE.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) ids.add(m[1]);
    return Array.from(ids);
}

export function getCachedUsername(id: string): string | undefined {
    return userCache.get(id);
}

/** Résout les IDs inconnus via le backend. Dédupe les requêtes en vol. */
export async function fetchUsersBatch(ids: string[]): Promise<void> {
    const missing = ids.filter((id) => !userCache.has(id) && !inflight.has(id));
    if (missing.length === 0) return;

    const promise = (async () => {
        try {
            const data = await apiFetch<{ users?: Array<{ _id: string; username: string }> }>(
                '/users/batch',
                { method: 'POST', body: JSON.stringify({ ids: missing }) },
            );
            for (const u of data?.users ?? []) {
                if (u?._id && u?.username) userCache.set(String(u._id), u.username);
            }
        } catch {
            // silencieux : en cas d'échec on affichera « @? »
        } finally {
            for (const id of missing) inflight.delete(id);
        }
    })();

    for (const id of missing) inflight.set(id, promise);
    await promise;
}

/**
 * Remplace `@[user:id]` par un lien markdown `[@pseudo](origin/compte/id)`
 * (rendu coloré + ouverture du profil au tap). ID inconnu → « @? ».
 */
export function resolveMentions(content: string): string {
    return content.replace(MENTION_RE, (_m, id: string) => {
        const name = userCache.get(id);
        if (!name) return '@?';
        return `[@${name}](${getSiteOrigin()}/compte/${id})`;
    });
}
