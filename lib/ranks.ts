/**
 * Système de rangs Workyt — copie fidèle du site (src/lib/rankSystem.ts).
 * 30 rangs répartis en 10 mondes (3 rangs/monde) + prestige (100 niveaux).
 *
 * Les dégradés Tailwind du site (ex. "from-slate-500 to-gray-600") sont
 * convertis en paires hex utilisables par expo-linear-gradient.
 */

// Palette Tailwind (v3) — uniquement les teintes utilisées par les rangs/prestige.
const TW: Record<string, string> = {
    'slate-500': '#64748b', 'slate-400': '#94a3b8', 'slate-300': '#cbd5e1',
    'gray-600': '#4b5563', 'gray-700': '#374151', 'gray-800': '#1f2937',
    'gray-900': '#111827', 'gray-100': '#f3f4f6', 'gray-200': '#e5e7eb', 'gray-300': '#d1d5db',
    'blue-500': '#3b82f6', 'blue-600': '#2563eb', 'blue-700': '#1d4ed8',
    'indigo-500': '#6366f1', 'indigo-600': '#4f46e5',
    'emerald-400': '#34d399', 'emerald-500': '#10b981', 'emerald-600': '#059669',
    'teal-500': '#14b8a6', 'teal-600': '#0d9488',
    'violet-500': '#8b5cf6', 'violet-600': '#7c3aed',
    'purple-500': '#a855f7', 'purple-600': '#9333ea', 'purple-700': '#7e22ce',
    'amber-300': '#fcd34d', 'amber-400': '#fbbf24', 'amber-500': '#f59e0b', 'amber-600': '#d97706',
    'yellow-300': '#fde047', 'yellow-400': '#facc15', 'yellow-500': '#eab308',
    'yellow-600': '#ca8a04', 'yellow-700': '#a16207',
    'red-500': '#ef4444', 'red-600': '#dc2626',
    'rose-400': '#fb7185', 'rose-500': '#f43f5e', 'rose-600': '#e11d48', 'rose-700': '#be123c',
    'pink-300': '#f9a8d4', 'pink-500': '#ec4899',
    'fuchsia-600': '#c026d3',
    'orange-300': '#fdba74', 'orange-400': '#fb923c', 'orange-500': '#f97316', 'orange-600': '#ea580c',
    'green-400': '#4ade80', 'green-500': '#22c55e', 'green-600': '#16a34a',
    'sky-300': '#7dd3fc', 'sky-500': '#0ea5e9', 'sky-600': '#0284c7',
    'cyan-200': '#a5f3fc', 'cyan-400': '#22d3ee', 'cyan-500': '#06b6d4', 'cyan-600': '#0891b2',
    'stone-200': '#e7e5e4', 'stone-500': '#78716c', 'stone-600': '#57534e',
};

function tw(token: string): string {
    return TW[token] || '#6366f1';
}

export interface Rank {
    name: string;
    level: number;
    color: string;
    gradient: [string, string];
    badge: string; // emoji
    minPoints: number;
    description: string;
    world: string;
    worldDescription: string;
    worldLevel: number;
}

interface RawRank extends Omit<Rank, 'gradient'> {
    from: string;
    to: string;
}

const RAW: RawRank[] = [
    // Monde 1 : Monde des Mangas
    { name: 'Ninja', level: 1, color: '#6B7280', from: 'slate-500', to: 'gray-600', badge: '🌱', minPoints: 0, description: 'Nouveau sur la plateforme', world: 'Monde des Mangas', worldDescription: "Découvre la culture japonaise et l'art du manga", worldLevel: 1 },
    { name: 'Kunoichi', level: 2, color: '#3B82F6', from: 'blue-500', to: 'indigo-600', badge: '📚', minPoints: 50, description: "Commence à s'impliquer", world: 'Monde des Mangas', worldDescription: "Découvre la culture japonaise et l'art du manga", worldLevel: 2 },
    { name: 'Sensei', level: 3, color: '#10B981', from: 'emerald-400', to: 'teal-500', badge: '🎓', minPoints: 150, description: 'Apprentissage régulier', world: 'Monde des Mangas', worldDescription: "Découvre la culture japonaise et l'art du manga", worldLevel: 3 },
    // Monde 2 : Monde Français
    { name: 'Élève', level: 4, color: '#8B5CF6', from: 'violet-500', to: 'purple-600', badge: '⭐', minPoints: 300, description: 'Premiers pas dans le savoir', world: 'Monde Français', worldDescription: 'Explore la langue et la culture française', worldLevel: 1 },
    { name: 'Étudiant', level: 5, color: '#F59E0B', from: 'amber-400', to: 'yellow-500', badge: '📖', minPoints: 500, description: 'Connaissances en expansion', world: 'Monde Français', worldDescription: 'Explore la langue et la culture française', worldLevel: 2 },
    { name: 'Professeur', level: 6, color: '#EF4444', from: 'red-500', to: 'rose-600', badge: '🔥', minPoints: 800, description: 'Maître de la langue', world: 'Monde Français', worldDescription: 'Explore la langue et la culture française', worldLevel: 3 },
    // Monde 3 : Monde des Renards et Fées
    { name: 'Renardeau', level: 7, color: '#EC4899', from: 'pink-500', to: 'fuchsia-600', badge: '🌟', minPoints: 1200, description: 'Entré dans le monde magique', world: 'Monde des Renards et Fées', worldDescription: "Plonge dans l'univers magique des contes", worldLevel: 1 },
    { name: 'Renard', level: 8, color: '#8B5CF6', from: 'purple-500', to: 'violet-600', badge: '🦊', minPoints: 1600, description: 'Renard expérimenté', world: 'Monde des Renards et Fées', worldDescription: "Plonge dans l'univers magique des contes", worldLevel: 2 },
    { name: 'Renard Sage', level: 9, color: '#F59E0B', from: 'amber-500', to: 'orange-600', badge: '🧙‍♂️', minPoints: 2000, description: 'Renard légendaire', world: 'Monde des Renards et Fées', worldDescription: "Plonge dans l'univers magique des contes", worldLevel: 3 },
    // Monde 4 : Monde Québécois
    { name: 'Hockeyeur', level: 10, color: '#EF4444', from: 'red-500', to: 'rose-600', badge: '🍁', minPoints: 2500, description: 'Découvreur québécois', world: 'Monde Québécois', worldDescription: 'Découvre la culture québécoise unique', worldLevel: 1 },
    { name: 'Voyageur', level: 11, color: '#10B981', from: 'emerald-500', to: 'green-600', badge: '🏔️', minPoints: 3000, description: 'Explorateur du Grand Nord', world: 'Monde Québécois', worldDescription: 'Découvre la culture québécoise unique', worldLevel: 2 },
    { name: 'Québécois', level: 12, color: '#3B82F6', from: 'blue-500', to: 'sky-600', badge: '🇨🇦', minPoints: 3500, description: 'Véritable québécois', world: 'Monde Québécois', worldDescription: 'Découvre la culture québécoise unique', worldLevel: 3 },
    // Monde 5 : Monde Égyptien
    { name: 'Sphinx', level: 13, color: '#D97706', from: 'amber-600', to: 'yellow-700', badge: '🏺', minPoints: 4000, description: 'Gardien des secrets', world: 'Monde Égyptien', worldDescription: "Explore les mystères de l'Égypte ancienne", worldLevel: 1 },
    { name: 'Scribe', level: 14, color: '#F59E0B', from: 'yellow-500', to: 'amber-600', badge: '📜', minPoints: 4500, description: 'Gardien du savoir', world: 'Monde Égyptien', worldDescription: "Explore les mystères de l'Égypte ancienne", worldLevel: 2 },
    { name: 'Pharaon', level: 15, color: '#EC4899', from: 'pink-500', to: 'rose-600', badge: '👑', minPoints: 5000, description: "Souverain d'Égypte", world: 'Monde Égyptien', worldDescription: "Explore les mystères de l'Égypte ancienne", worldLevel: 3 },
    // Monde 6 : Monde des Neiges et des Sables
    { name: 'Nomade', level: 16, color: '#3B82F6', from: 'blue-500', to: 'cyan-600', badge: '🏕️', minPoints: 5500, description: 'Voyageur des déserts', world: 'Monde des Neiges et des Sables', worldDescription: 'Voyage entre les déserts et les montagnes', worldLevel: 1 },
    { name: 'Explorateur', level: 17, color: '#10B981', from: 'teal-500', to: 'emerald-600', badge: '🗺️', minPoints: 6000, description: 'Découvreur de terres', world: 'Monde des Neiges et des Sables', worldDescription: 'Voyage entre les déserts et les montagnes', worldLevel: 2 },
    { name: 'Conquérant', level: 18, color: '#EF4444', from: 'red-600', to: 'rose-700', badge: '⚔️', minPoints: 6500, description: 'Maître des terres', world: 'Monde des Neiges et des Sables', worldDescription: 'Voyage entre les déserts et les montagnes', worldLevel: 3 },
    // Monde 7 : Monde de l'Imaginaire
    { name: 'Rêveur', level: 19, color: '#8B5CF6', from: 'purple-500', to: 'violet-600', badge: '💭', minPoints: 7000, description: "Créateur d'imaginaire", world: 'Monde de l\'Imaginaire', worldDescription: 'Crée et explore des univers infinis', worldLevel: 1 },
    { name: 'Créateur', level: 20, color: '#F59E0B', from: 'amber-400', to: 'orange-500', badge: '🎨', minPoints: 7500, description: "Artiste de l'imaginaire", world: 'Monde de l\'Imaginaire', worldDescription: 'Crée et explore des univers infinis', worldLevel: 2 },
    { name: 'Visionnaire', level: 21, color: '#EC4899', from: 'pink-500', to: 'rose-600', badge: '🌌', minPoints: 8000, description: "Maître de l'imaginaire", world: 'Monde de l\'Imaginaire', worldDescription: 'Crée et explore des univers infinis', worldLevel: 3 },
    // Monde 8 : Monde Médiéval
    { name: 'Écuyer', level: 22, color: '#78716C', from: 'stone-500', to: 'stone-600', badge: '⚔️', minPoints: 9000, description: 'Novice du monde médiéval', world: 'Monde Médiéval', worldDescription: "Forge ton destin dans les royaumes d'antan", worldLevel: 1 },
    { name: 'Chevalier', level: 23, color: '#0EA5E9', from: 'sky-500', to: 'blue-600', badge: '🛡️', minPoints: 10500, description: 'Gardien du royaume', world: 'Monde Médiéval', worldDescription: "Forge ton destin dans les royaumes d'antan", worldLevel: 2 },
    { name: 'Roi', level: 24, color: '#D97706', from: 'amber-500', to: 'yellow-600', badge: '👑', minPoints: 12000, description: 'Souverain absolu', world: 'Monde Médiéval', worldDescription: "Forge ton destin dans les royaumes d'antan", worldLevel: 3 },
    // Monde 9 : Monde des Sciences
    { name: 'Apprenti Chercheur', level: 25, color: '#10B981', from: 'emerald-500', to: 'teal-600', badge: '🔬', minPoints: 14000, description: "Début de l'aventure scientifique", world: 'Monde des Sciences', worldDescription: 'Repousse les frontières de la connaissance', worldLevel: 1 },
    { name: 'Savant', level: 26, color: '#06B6D4', from: 'cyan-500', to: 'sky-600', badge: '🧪', minPoints: 16500, description: 'Maître de la théorie', world: 'Monde des Sciences', worldDescription: 'Repousse les frontières de la connaissance', worldLevel: 2 },
    { name: 'Génie', level: 27, color: '#6366F1', from: 'indigo-500', to: 'purple-600', badge: '🧠', minPoints: 19000, description: 'Intellect hors du commun', world: 'Monde des Sciences', worldDescription: 'Repousse les frontières de la connaissance', worldLevel: 3 },
    // Monde 10 : Monde des Anciens
    { name: 'Titan', level: 28, color: '#DC2626', from: 'red-600', to: 'rose-700', badge: '🏛️', minPoints: 22000, description: 'Force des anciens', world: 'Monde des Anciens', worldDescription: 'Atteins la sagesse des civilisations disparues', worldLevel: 1 },
    { name: 'Archimage', level: 29, color: '#7C3AED', from: 'violet-600', to: 'purple-700', badge: '🌠', minPoints: 25000, description: 'Maîtrise absolue des arcanes', world: 'Monde des Anciens', worldDescription: 'Atteins la sagesse des civilisations disparues', worldLevel: 2 },
    { name: 'Éternel', level: 30, color: '#F59E0B', from: 'yellow-400', to: 'orange-500', badge: '✨', minPoints: 28000, description: 'Au-delà du temps et des mondes', world: 'Monde des Anciens', worldDescription: 'Atteins la sagesse des civilisations disparues', worldLevel: 3 },
];

export const RANKS: Rank[] = RAW.map((r) => {
    const { from, to, ...rest } = r;
    return { ...rest, gradient: [tw(from), tw(to)] as [string, string] };
});

export function calculateUserRank(points: number): Rank {
    const userRank = RANKS.filter((r) => r.minPoints <= points).sort((a, b) => b.level - a.level)[0];
    return userRank || RANKS[0];
}

export function getNextRank(points: number): Rank | null {
    return RANKS.find((r) => r.minPoints > points) || null;
}

export function getRankProgress(points: number): {
    currentRank: Rank;
    nextRank: Rank | null;
    progress: number;
    pointsNeeded: number;
} {
    const currentRank = calculateUserRank(points);
    const nextRank = getNextRank(points);
    if (!nextRank) return { currentRank, nextRank: null, progress: 100, pointsNeeded: 0 };
    const pointsInCurrentRank = points - currentRank.minPoints;
    const pointsForNextRank = nextRank.minPoints - currentRank.minPoints;
    const progress = Math.min((pointsInCurrentRank / pointsForNextRank) * 100, 100);
    return { currentRank, nextRank, progress, pointsNeeded: nextRank.minPoints - points };
}

// ============================================
// PRESTIGE (100 niveaux, à partir de 28 000 pts)
// ============================================

export interface PrestigeTier {
    name: string;
    badge: string;
    color: string;
    from: number;
    to: number;
}

export const PRESTIGE_TIERS: PrestigeTier[] = [
    { name: 'Bronze', badge: '🥉', color: '#B87333', from: 1, to: 5 },
    { name: 'Argent', badge: '🥈', color: '#A8A9AD', from: 6, to: 10 },
    { name: 'Or', badge: '🥇', color: '#FFD700', from: 11, to: 15 },
    { name: 'Émeraude', badge: '💚', color: '#50C878', from: 16, to: 20 },
    { name: 'Rubis', badge: '❤️', color: '#E0115F', from: 21, to: 25 },
    { name: 'Diamant', badge: '💎', color: '#4FC3F7', from: 26, to: 30 },
    { name: 'Cristal', badge: '🔮', color: '#AA00FF', from: 31, to: 35 },
    { name: 'Saphir', badge: '💙', color: '#0F52BA', from: 36, to: 40 },
    { name: 'Améthyste', badge: '💜', color: '#9966CC', from: 41, to: 45 },
    { name: 'Platine', badge: '⚡', color: '#B0BEC5', from: 46, to: 50 },
    { name: 'Opale', badge: '🌈', color: '#90CAF9', from: 51, to: 55 },
    { name: 'Onyx', badge: '🖤', color: '#37474F', from: 56, to: 60 },
    { name: 'Perle', badge: '🤍', color: '#ECEFF1', from: 61, to: 65 },
    { name: 'Corail', badge: '🪸', color: '#FF7043', from: 66, to: 70 },
    { name: 'Topaze', badge: '🌟', color: '#FFA000', from: 71, to: 75 },
    { name: 'Jade', badge: '🍃', color: '#00897B', from: 76, to: 80 },
    { name: 'Obsidienne', badge: '🌑', color: '#212121', from: 81, to: 85 },
    { name: 'Aurore', badge: '🌅', color: '#FF5722', from: 86, to: 90 },
    { name: 'Céleste', badge: '✨', color: '#00BCD4', from: 91, to: 95 },
    { name: 'Étoile', badge: '⭐', color: '#FFD700', from: 96, to: 100 },
];

const PRESTIGE_START = 28000;
const PRESTIGE_PTS_PER_LEVEL = 5000;
const MAX_PRESTIGE = 100;
export const PRESTIGE_ROMAN = ['I', 'II', 'III', 'IV', 'V'] as const;

export interface PrestigeInfo {
    level: number;
    displayLevel: string;
    tier: PrestigeTier | null;
    rankInTier: number;
    badge: string;
    color: string;
    nextLevelPoints: number;
    progressInLevel: number;
}

export function getPrestigeInfo(points: number): PrestigeInfo {
    if (points < PRESTIGE_START) {
        return { level: 0, displayLevel: '', tier: null, rankInTier: 0, badge: '', color: '', nextLevelPoints: 0, progressInLevel: 0 };
    }
    const raw = Math.floor((points - PRESTIGE_START) / PRESTIGE_PTS_PER_LEVEL) + 1;
    const level = Math.min(raw, MAX_PRESTIGE + 1);
    if (level > MAX_PRESTIGE) {
        const lastTier = PRESTIGE_TIERS[PRESTIGE_TIERS.length - 1];
        return { level: 101, displayLevel: '100+', tier: lastTier, rankInTier: 5, badge: `${lastTier.badge} 100+`, color: lastTier.color, nextLevelPoints: 0, progressInLevel: 100 };
    }
    const tierIndex = Math.floor((level - 1) / 5);
    const rankInTier = ((level - 1) % 5) + 1;
    const tier = PRESTIGE_TIERS[tierIndex];
    const pointsIntoLevel = (points - PRESTIGE_START) - (level - 1) * PRESTIGE_PTS_PER_LEVEL;
    const progressInLevel = Math.min((pointsIntoLevel / PRESTIGE_PTS_PER_LEVEL) * 100, 100);
    const nextLevelPoints = PRESTIGE_PTS_PER_LEVEL - pointsIntoLevel;
    return {
        level,
        displayLevel: `${tier.name} ${PRESTIGE_ROMAN[rankInTier - 1]}`,
        tier,
        rankInTier,
        badge: `${tier.badge} ${PRESTIGE_ROMAN[rankInTier - 1]}`,
        color: tier.color,
        nextLevelPoints,
        progressInLevel,
    };
}
