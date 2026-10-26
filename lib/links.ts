import { Linking } from 'react-native';
import { router, type Href } from 'expo-router';
import { getSiteOrigin } from './siteOrigin';

/**
 * Ouverture des liens affichés dans les contenus (forum, fiches, leçons…).
 *
 * Les adresses workyt.fr que l'app sait afficher (question du forum, fiche,
 * profil membre, cours…) sont ouvertes DANS l'app via expo-router ; tout le
 * reste part dans le navigateur. Les mentions `@pseudo` du forum sont des
 * liens `/compte/<id>` → écran `/membre/<id>`.
 */

const SITE_HOSTS = new Set(['workyt.fr', 'www.workyt.fr']);

function siteHosts(): Set<string> {
    try {
        const h = new URL(getSiteOrigin()).host;
        if (h && !SITE_HOSTS.has(h)) return new Set([...SITE_HOSTS, h]);
    } catch {
        // origine invalide : on garde la liste par défaut
    }
    return SITE_HOSTS;
}

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/** Pages « liste » du site qui ne sont pas des identifiants. */
const RESERVED = new Set(['creer', 'matiere', 'niveau', 'favoris', 'generer', 'imprimer']);

/**
 * Traduit une URL du site (absolue ou relative) en chemin d'écran de l'app.
 * Renvoie `null` si l'app n'a pas d'écran équivalent (→ navigateur).
 */
export function appPathForUrl(href: string): string | null {
    if (!href) return null;
    let url: URL;
    try {
        url = new URL(href, getSiteOrigin());
    } catch {
        return null;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!siteHosts().has(url.host)) return null;

    const parts = url.pathname.split('/').filter(Boolean).map((p) => decodeURIComponent(p));
    const [section, id] = parts;
    const hasId = !!id && !RESERVED.has(id);

    switch (section) {
        case undefined:
            return '/';
        case 'forum':
            if (id === 'creer') return '/forum/create';
            return hasId ? `/forum/${encodeURIComponent(id)}` : '/forum';
        case 'fiches':
            if (id === 'creer') return '/fiches/creer';
            if (id === 'favoris') return '/favoris';
            return hasId ? `/fiches/${encodeURIComponent(id)}` : '/fiches';
        case 'compte':
            // /compte/<id> = profil public ; les autres pages du compte restent sur le site
            if (id && OBJECT_ID.test(id)) return `/membre/${id}`;
            return null;
        case 'cours':
            // Les leçons / exercices nécessitent un contexte (section) : on ouvre le cours
            return hasId ? `/cours/${encodeURIComponent(id)}` : '/courses';
        case 'suivi':
            return hasId ? `/suivi/${encodeURIComponent(id)}` : '/suivi';
        case 'defis':
            return hasId ? `/defis/${encodeURIComponent(id)}` : '/defis';
        case 'recompenses':
            return hasId ? `/recompenses/${encodeURIComponent(id)}` : '/aventure';
        case 'amis':
            return '/amis';
        case 'clan':
            return '/clan';
        case 'kits':
            return parts.length === 1 ? '/kits' : null;
        case 'calendrier':
            return '/aventure/calendrier';
        case 'gems':
            return '/inventaire';
        default:
            return null;
    }
}

/** Ouvre un lien : écran de l'app si possible, sinon navigateur / appli système. */
export function openLink(href: string): void {
    const path = appPathForUrl(href);
    if (path) {
        router.push(path as Href);
        return;
    }
    let target = href;
    try {
        target = new URL(href, getSiteOrigin()).toString();
    } catch {
        // on tente l'URL brute
    }
    Linking.openURL(target).catch(() => {});
}
