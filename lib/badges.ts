/**
 * Badges — mêmes données et même rendu que le site (components/ui/BadgeDisplay).
 *
 * Source : /api/badges (public), chargé une fois par session. En attendant (ou
 * hors ligne), on retombe sur BADGE_CATALOG, généré depuis data/badges.ts du
 * site. Les icônes sont servies par workyt.fr (SVG ou PNG).
 */
import { useEffect, useState } from 'react';
import { cachedGet } from './api';
import { getSiteOrigin } from './siteOrigin';
import { BADGE_CATALOG, type BadgeDef } from './badgeCatalog';

export type BadgeRarity = 'commun' | 'rare' | 'epique' | 'legendaire';
export type BadgeCategory = BadgeDef['category'];

export interface BadgeConfig {
    slug: string;
    name: string;
    description: string;
    /** URL absolue de l'icône */
    icon: string;
    category: BadgeCategory;
    rarity: BadgeRarity;
}

/** Couleurs de rareté du site (RARITY_CONFIG de BadgeDisplay). */
export const RARITY_COLORS: Record<BadgeRarity, { label: string; ring: string; tint: string; color: string; dot: string; text: string }> = {
    commun: { label: 'Commun', ring: 'rgba(26,21,18,0.12)', tint: '#FFFFFF', color: '#6B625C', dot: '#6B625C', text: '#6B625C' },
    rare: { label: 'Rare', ring: '#9FD3EC', tint: '#F1F9FD', color: '#2F86B3', dot: '#2F86B3', text: '#2F86B3' },
    epique: { label: 'Épique', ring: '#C9B3F5', tint: '#F7F3FF', color: '#7B55D6', dot: '#7B55D6', text: '#7B55D6' },
    legendaire: { label: 'Légendaire', ring: '#FFC56B', tint: '#FFF7E8', color: '#C27A00', dot: '#C27A00', text: '#C27A00' },
};

export const CATEGORY_LABEL: Record<BadgeCategory, string> = {
    progression: 'Progression',
    engagement: 'Engagement',
    performance: 'Performance',
    special: 'Spécial',
};

const normRarity = (r: string): BadgeRarity =>
    r === 'épique' || r === 'epique' ? 'epique' : r === 'légendaire' || r === 'legendaire' ? 'legendaire' : r === 'rare' ? 'rare' : 'commun';

const absolute = (icon: string) => (/^https?:/.test(icon) ? icon : `${getSiteOrigin()}${icon.startsWith('/') ? '' : '/'}${icon}`);

function toConfig(b: { slug: string; name: string; description?: string; icon?: string; category?: string; rarity?: string }): BadgeConfig {
    return {
        slug: b.slug,
        name: b.name,
        description: b.description ?? '',
        icon: b.icon ? absolute(b.icon) : '',
        category: (b.category as BadgeCategory) ?? 'special',
        rarity: normRarity(b.rarity ?? 'commun'),
    };
}

let catalog = new Map<string, BadgeConfig>(BADGE_CATALOG.map((b) => [b.slug, toConfig(b)]));
let order: string[] = BADGE_CATALOG.map((b) => b.slug);
let loaded = false;
const listeners = new Set<() => void>();

/** Charge le catalogue réel du site (une fois). */
export async function loadBadgeCatalog(): Promise<void> {
    if (loaded) return;
    try {
        const res = await cachedGet<{ badges: any[] }>('/badges', 60 * 60_000);
        if (Array.isArray(res?.badges) && res.badges.length) {
            catalog = new Map(res.badges.map((b) => [b.slug, toConfig(b)]));
            order = res.badges.map((b) => b.slug);
            loaded = true;
            listeners.forEach((l) => l());
        }
    } catch {
        // on garde le catalogue embarqué
    }
}

/** Re-rend le composant quand le catalogue du site arrive. */
export function useBadgeCatalog(): number {
    const [v, setV] = useState(0);
    useEffect(() => {
        const l = () => setV((x) => x + 1);
        listeners.add(l);
        loadBadgeCatalog();
        return () => { listeners.delete(l); };
    }, []);
    return v;
}

export function getBadgeConfig(slug: string): BadgeConfig | null {
    return catalog.get(slug) ?? null;
}

/** Tous les badges, dans l'ordre du site. */
export function getAllBadges(): BadgeConfig[] {
    return order.map((s) => catalog.get(s)!).filter(Boolean);
}

export function getRarityColor(rarity: BadgeRarity | string) {
    return RARITY_COLORS[normRarity(rarity)];
}
