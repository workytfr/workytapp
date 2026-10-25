/**
 * Liens workyt.fr ouverts dans l'app (App Links / Universal Links) :
 * les adresses du site qui n'ont pas le même chemin que l'écran de l'app
 * sont traduites ici. Les autres (/forum/<id>, /fiches/<id>, /clan…) tombent
 * directement sur l'écran du même nom.
 */
const REWRITES: [RegExp, string][] = [
    [/^\/compte\/([^/?#]+)/, '/membre/$1'],
    [/^\/calendrier\/?$/, '/aventure/calendrier'],
    [/^\/gems\/?$/, '/inventaire'],
    [/^\/recompenses\/?$/, '/aventure'],
];

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
    try {
        // `path` peut être une URL complète (https://workyt.fr/…) ou un chemin
        const url = new URL(path, 'https://workyt.fr');
        const p = url.pathname;
        for (const [re, to] of REWRITES) if (re.test(p)) return p.replace(re, to);
        return p + url.search;
    } catch {
        return path;
    }
}
