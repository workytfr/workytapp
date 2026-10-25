/**
 * Origine du site Next (sans /api) pour images publiques (avatars eigen, /profile/...).
 * Surcharge : EXPO_PUBLIC_SITE_ORIGIN=https://workyt.fr
 */
const env =
    typeof process !== "undefined" && process.env.EXPO_PUBLIC_SITE_ORIGIN
        ? process.env.EXPO_PUBLIC_SITE_ORIGIN.replace(/\/$/, "")
        : null;

export function getSiteOrigin(): string {
    if (env) return env;
    // L'app cible toujours la prod (voir API_URL dans lib/api.ts), y compris en dev :
    // les avatars eigen, images /profile/... et liens de profil doivent donc pointer
    // vers workyt.fr et non vers un serveur local (LAN) qui n'est pas lancé.
    return "https://workyt.fr";
}
