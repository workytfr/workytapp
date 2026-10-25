import { getSiteOrigin } from './siteOrigin';
/**
 * Système de niveaux/mondes Workyt
 * Basé sur les paliers de points du site
 */

export interface LevelConfig {
    minPoints: number;
    maxPoints: number;
    name: string;
    world: string;
    description: string;
    icon: string; // Ionicons
    badgeIcon: string; // URL du badge sur le site
    color: string;
    gradient: [string, string];
}

// Les 7 mondes de Workyt (basés sur les badges points_* du site)
export const LEVELS: LevelConfig[] = [
    {
        minPoints: 0,
        maxPoints: 149,
        name: 'Novice',
        world: 'Monde des Débutants',
        description: 'Commence ton aventure',
        icon: 'leaf',
        badgeIcon: '', // Pas de badge pour ce niveau
        color: '#6b7280',
        gradient: ['#9ca3af', '#d1d5db'],
    },
    {
        minPoints: 150,
        maxPoints: 499,
        name: 'Sensei',
        world: 'Monde des Mangas',
        description: 'Maître des arts ninja',
        icon: 'ninja',
        badgeIcon: '/badge/points_150.svg',
        color: '#ec4899',
        gradient: ['#ec4899', '#f472b6'],
    },
    {
        minPoints: 500,
        maxPoints: 1199,
        name: 'Étudiant',
        world: 'Monde Français',
        description: 'Apprenti savant',
        icon: 'school',
        badgeIcon: '/badge/points_500.svg',
        color: '#3b82f6',
        gradient: ['#3b82f6', '#60a5fa'],
    },
    {
        minPoints: 1200,
        maxPoints: 2499,
        name: 'Renardeau',
        world: 'Monde des Renards et Fées',
        description: 'Esprit malin et magique',
        icon: 'paw',
        badgeIcon: '/badge/points_1200.svg',
        color: '#f97316',
        gradient: ['#f97316', '#fb923c'],
    },
    {
        minPoints: 2500,
        maxPoints: 3999,
        name: 'Hockeyeur',
        world: 'Monde Québécois',
        description: 'Champion du grand Nord',
        icon: 'snow',
        badgeIcon: '/badge/points_2500.svg',
        color: '#06b6d4',
        gradient: ['#06b6d4', '#22d3ee'],
    },
    {
        minPoints: 4000,
        maxPoints: 5499,
        name: 'Sphinx',
        world: 'Monde Égyptien',
        description: 'Gardien des mystères anciens',
        icon: 'eye',
        badgeIcon: '/badge/points_4000.svg',
        color: '#eab308',
        gradient: ['#eab308', '#facc15'],
    },
    {
        minPoints: 5500,
        maxPoints: 6999,
        name: 'Nomade',
        world: 'Monde des Neiges et des Sables',
        description: 'Voyageur intrépide',
        icon: 'compass',
        badgeIcon: '/badge/points_5500.svg',
        color: '#a855f7',
        gradient: ['#a855f7', '#c084fc'],
    },
    {
        minPoints: 7000,
        maxPoints: Infinity,
        name: 'Immortel',
        world: "Monde de l'Imaginaire",
        description: 'Légende éternelle',
        icon: 'star',
        badgeIcon: '/badge/points_7000.svg',
        color: '#f59e0b',
        gradient: ['#f59e0b', '#fbbf24'],
    },
];

/**
 * Récupère le niveau correspondant aux points
 */
export function getLevelByPoints(points: number): LevelConfig {
    for (const level of LEVELS) {
        if (points >= level.minPoints && points <= level.maxPoints) {
            return level;
        }
    }
    return LEVELS[0];
}

/**
 * Récupère le niveau suivant (pour la progression)
 */
export function getNextLevel(points: number): LevelConfig | null {
    const currentLevel = getLevelByPoints(points);
    const currentIndex = LEVELS.indexOf(currentLevel);
    return LEVELS[currentIndex + 1] || null;
}

/**
 * Calcule la progression vers le niveau suivant (0-100%)
 */
export function getProgressToNextLevel(points: number): number {
    const currentLevel = getLevelByPoints(points);
    const nextLevel = getNextLevel(points);
    
    if (!nextLevel) return 100; // Déjà au niveau max
    
    const range = nextLevel.minPoints - currentLevel.minPoints;
    const progress = points - currentLevel.minPoints;
    return Math.min(Math.round((progress / range) * 100), 100);
}

/**
 * Points restants pour le prochain niveau
 */
export function getPointsToNextLevel(points: number): number {
    const nextLevel = getNextLevel(points);
    if (!nextLevel) return 0;
    return nextLevel.minPoints - points;
}

/**
 * URL complète du badge de niveau
 */
export function getLevelBadgeUrl(points: number): string | null {
    const level = getLevelByPoints(points);
    if (!level.badgeIcon) return null;
    return `${getSiteOrigin()}${level.badgeIcon}`;
}
