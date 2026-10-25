import { getSiteOrigin } from './siteOrigin';
/**
 * Système d'avatars - même logique que le site workyt-next
 * 
 * Sur le site : eigen-avatar-generator génère des avatars uniques basés sur l'ID
 * Pour mobile : on utilise des services externes ou on récupère depuis l'API
 */

import { Platform } from 'react-native';

// Couleurs pour les avatars générés (mêmes que le site)
export const AVATAR_COLOR_SETS = [
    ["#6366F1", "#8B5CF6", "#A855F7"], // Violet
    ["#EC4899", "#F472B6", "#F9A8D4"], // Rose
    ["#0EA5E9", "#38BDF8", "#7DD3FC"], // Bleu
    ["#10B981", "#34D399", "#6EE7B7"], // Vert
    ["#F59E0B", "#FBBF24", "#FCD34D"], // Orange
];

// Génère un hash à partir d'une string (comme sur le site)
export function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}

// Récupère le set de couleurs basé sur l'ID
export function getColorSetForUser(userId: string): string[] {
    const hash = hashString(userId);
    return AVATAR_COLOR_SETS[hash % AVATAR_COLOR_SETS.length];
}

// Génère une URL d'avatar (utilise des services externes)
export function generateAvatarUrl(userId: string, size: number = 128): string {
    // Option 1: DiceBear (gratuit, nombreux styles)
    // https://www.dicebear.com/
    const hash = hashString(userId);
    const styles = ['adventurer', 'avataaars', 'bottts', 'fun-emoji', 'lorelei', 'notionists', 'open-peeps'];
    const style = styles[hash % styles.length];
    const seed = encodeURIComponent(userId);
    
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&size=${size}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    
    // Option 2: UI Avatars (initiales)
    // return `https://ui-avatars.com/api/?name=${seed}&size=${size}&background=random`;
}

// Génère une URL d'avatar avec style identicon (comme GitHub)
export function generateIdenticonUrl(userId: string, size: number = 128): string {
    // Gravatar identicon
    const hash = hashString(userId).toString(16).padStart(32, '0');
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
}

// Interface pour la personnalisation (même que le site)
export interface ProfileCustomization {
    usernameColor: {
        type: 'solid' | 'gradient' | 'rainbow' | 'custom';
        value: string;
        isActive: boolean;
    };
    profileImage: {
        filename: string;
        isActive: boolean;
    };
    profileBorder: {
        filename: string;
        isActive: boolean;
    };
}

// URL de base pour les images de profil (toujours la prod, cf. lib/siteOrigin.ts)
const API_BASE_URL = getSiteOrigin();

// Récupère l'URL complète de l'image de profil
export function getProfileImageUrl(filename: string): string {
    return `${API_BASE_URL}/profile/${filename}`;
}

// Récupère l'URL complète du contour de profil
export function getProfileBorderUrl(filename: string): string {
    return `${API_BASE_URL}/profile/contour/${filename}`;
}

// Détermine la couleur du pseudo basée sur la personnalisation
export function getUsernameColor(customization?: ProfileCustomization): string {
    if (!customization?.usernameColor?.isActive) {
        return '#1e293b'; // Couleur par défaut (text)
    }
    
    const { type, value } = customization.usernameColor;
    
    switch (type) {
        case 'solid':
            return value;
        case 'gradient':
            // Pour React Native, on retourne la première couleur du gradient
            return value.split(',')[0]?.trim() || '#6366f1';
        case 'rainbow':
            return '#6366f1'; // Violet par défaut pour rainbow
        case 'custom':
            return value;
        default:
            return '#1e293b';
    }
}
