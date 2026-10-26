import { useEffect, useState } from 'react';
import { getSiteOrigin } from './siteOrigin';
import { sanitizeLook, type AvatarLook } from './avatarLook';

/**
 * Personnalisation de profil (image + contour + couleur pseudo), identique au
 * site. Chargée par lots via /api/users/customizations et mise en cache par
 * userId pour la durée de la session.
 */

export interface Customization {
    profileImageUrl: string | null;
    profileBorderUrl: string | null;
    usernameColor: string | null;
    /** Accessoires Blobatar achetés en boutique (chapeau, lunettes…) */
    look: AvatarLook;
}

const EMPTY: Customization = { profileImageUrl: null, profileBorderUrl: null, usernameColor: null, look: {} };

const cache = new Map<string, Customization>();
const inflight = new Map<string, Promise<Customization>>();

/**
 * Le site stocke des chemins relatifs à son origine (ex. la photo envoyée par
 * un bénévole : `/api/media/avatar/<uuid>.webp`, relayée depuis R2). Le
 * navigateur les résout tout seul ; en natif, <Image> exige une URL absolue.
 */
function absolute(url: string, origin: string): string {
    if (/^(https?:|data:)/i.test(url)) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

function parse(c: any, origin: string): Customization {
    if (!c) return EMPTY;
    // Priorité identique au site : photo perso active > image de profil équipée
    const photo =
        c.customPhoto?.isActive && typeof c.customPhoto?.url === 'string' && c.customPhoto.url
            ? absolute(c.customPhoto.url, origin)
            : null;
    const border: string | null =
        c.profileBorder?.isActive && c.profileBorder?.filename ? String(c.profileBorder.filename) : null;
    return {
        profileImageUrl:
            photo ??
            (c.profileImage?.isActive && c.profileImage?.filename
                ? `${origin}/profile/${c.profileImage.filename}`
                : null),
        // Les contours « anim:<id> » sont dessinés par le site (pas de fichier) :
        // on ne demande pas une image qui n'existe pas.
        profileBorderUrl:
            border && !border.startsWith('anim:') ? `${origin}/profile/contour/${border}` : null,
        usernameColor:
            c.usernameColor?.isActive && c.usernameColor?.value ? c.usernameColor.value : null,
        look: sanitizeLook(c.avatarLook),
    };
}

// Regroupement : les avatars montés dans la même fenêtre (une liste qui
// s'affiche) partent en UNE requête POST /api/users/customizations au lieu
// d'une requête par auteur.
const BATCH_WINDOW_MS = 25;
const BATCH_MAX = 100;
let queue = new Map<string, (c: Customization) => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
    timer = null;
    const batch = queue;
    queue = new Map();
    const ids = [...batch.keys()];
    const origin = getSiteOrigin();
    for (let i = 0; i < ids.length; i += BATCH_MAX) {
        const chunk = ids.slice(i, i + BATCH_MAX);
        let data: Record<string, any> = {};
        try {
            const res = await fetch(`${origin}/api/users/customizations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: chunk }),
            });
            if (res.ok) data = (await res.json())?.data ?? {};
        } catch {
            // réseau indisponible : initiales / eigen en repli
        }
        for (const id of chunk) batch.get(id)!(parse(data[id]?.customization, origin));
    }
}

export function getCustomization(userId: string): Promise<Customization> {
    const hit = cache.get(userId);
    if (hit) return Promise.resolve(hit);
    const pending = inflight.get(userId);
    if (pending) return pending;
    const p = new Promise<Customization>((resolve) => {
        queue.set(userId, (c) => {
            cache.set(userId, c);
            inflight.delete(userId);
            resolve(c);
        });
        if (!timer) timer = setTimeout(flush, BATCH_WINDOW_MS);
    });
    inflight.set(userId, p);
    return p;
}

/** Hook : renvoie la personnalisation (ou EMPTY tant que non chargée). */
export function useCustomization(userId?: string | null): Customization {
    const [custom, setCustom] = useState<Customization>(() =>
        userId && cache.has(userId) ? cache.get(userId)! : EMPTY,
    );

    useEffect(() => {
        if (!userId || !/^[a-f0-9]{24}$/i.test(userId)) {
            setCustom(EMPTY);
            return;
        }
        let alive = true;
        getCustomization(userId).then((c) => {
            if (alive) setCustom(c);
        });
        return () => {
            alive = false;
        };
    }, [userId]);

    return custom;
}
