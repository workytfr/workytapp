/**
 * Design System Workyt avec support Dark Mode
 * Polices: Funnel Display (titres) + Montserrat (texte)
 */

import { Platform, useColorScheme } from 'react-native';

// Palette alignée sur le design 2026 du site (globals.css : --wk-*).
// Papier chaud, encre brun-noir, orange Workyt ; trois accents ludiques.
const lightColors = {
    // Orange Workyt (--wk-accent) et son socle 3D (ombre des boutons du site)
    primary: '#FF6A1A',
    primaryDark: '#C24A0A',
    primaryLight: '#FFB547',

    // Orange lisible en texte sur papier (≥ 4.5:1) — liens, labels de matière
    accent: '#C24A0A',
    accentDark: '#9A3A08',
    accentLight: '#FFD7A8',

    // Accents secondaires du site
    accent2: '#FFB547', // miel — XP, étoiles
    accent3: '#6EC1E4', // ciel
    accent4: '#7ED957', // vert pomme

    gradientPrimary: ['#FF6A1A', '#FFB547'] as const,
    gradientAccent: ['#FFB547', '#FF6A1A'] as const,

    // Papier (--wk-paper / --wk-paper-2)
    background: '#FDFAF4',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceVariant: '#F5EFE3',

    // Encre (--wk-ink) et ses opacités du site, aplaties sur le papier
    ink: '#1A1512',
    text: '#1A1512',
    textSecondary: '#635E5A',
    textMuted: '#8C8883',
    textOnPrimary: '#FFFFFF',
    textOnSurface: '#1A1512',

    // rgba(26,21,18,0.08) et 0.06 sur papier
    border: '#E9E5DE',
    divider: '#F0ECE5',

    success: '#2E7D32',
    error: '#C62828',
    warning: '#C24A0A',
    info: '#1565C0',

    rarity: {
        commun: { bg: '#f3f4f6', border: '#d1d5db', text: '#6b7280', dot: '#9ca3af' },
        rare: { bg: '#dbeafe', border: '#93c5fd', text: '#2563eb', dot: '#3b82f6' },
        epique: { bg: '#f3e8ff', border: '#d8b4fe', text: '#9333ea', dot: '#a855f7' },
        legendaire: { bg: '#fef9c3', border: '#fde047', text: '#ca8a04', dot: '#eab308' },
    },

    statusBar: 'dark' as 'dark' | 'light',
};

export type ThemeColors = typeof lightColors;

// Mode sombre : même identité, encre en fond et papier en texte
const darkColors: ThemeColors = {
    primary: '#FF7A33',
    primaryDark: '#C24A0A',
    primaryLight: '#FFB547',

    accent: '#FF9A5C',
    accentDark: '#FF7A33',
    accentLight: '#5A2A10',

    accent2: '#FFB547',
    accent3: '#6EC1E4',
    accent4: '#7ED957',

    gradientPrimary: ['#FF6A1A', '#FFB547'] as const,
    gradientAccent: ['#FFB547', '#FF6A1A'] as const,

    background: '#1A1512',
    surface: '#241E1A',
    surfaceElevated: '#2E2621',
    surfaceVariant: '#2E2621',

    ink: '#1A1512',
    text: '#FDFAF4',
    textSecondary: '#BDB5AC',
    textMuted: '#8A8178',
    textOnPrimary: '#FFFFFF',
    textOnSurface: '#FDFAF4',

    border: '#3A312B',
    divider: '#2E2621',

    success: '#66BB6A',
    error: '#EF5350',
    warning: '#FFB547',
    info: '#64B5F6',

    rarity: {
        commun: { bg: '#1f2937', border: '#4b5563', text: '#9ca3af', dot: '#6b7280' },
        rare: { bg: '#1e3a8a', border: '#3b82f6', text: '#60a5fa', dot: '#3b82f6' },
        epique: { bg: '#581c87', border: '#a855f7', text: '#c084fc', dot: '#a855f7' },
        legendaire: { bg: '#713f12', border: '#eab308', text: '#facc15', dot: '#eab308' },
    },

    statusBar: 'light' as const,
};

export { lightColors, darkColors };

// Hook pour récupérer les couleurs selon le thème
export function useTheme() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    
    return {
        colors: isDark ? darkColors : lightColors,
        isDark,
    };
}

// Export statique pour utilisation hors composants
export const colors = lightColors;

// Typographie
export const typography = {
    fontFamily: {
        // Titres comme sur le site : Funnel Display en graisse normale
        // (.font-serif-display, weight 400) — le gras reste pour les chiffres et boutons.
        display: 'FunnelDisplay_400Regular',
        displayRegular: 'FunnelDisplay_400Regular',
        displayMedium: 'FunnelDisplay_500Medium',
        displayBold: 'FunnelDisplay_700Bold',
        // Surtitres du site (.font-mono-ui)
        mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, Consolas, monospace' }) as string,
        heading: 'Montserrat_700Bold',
        semiBold: 'Montserrat_600SemiBold',
        medium: 'Montserrat_500Medium',
        regular: 'Montserrat_400Regular',
    },
    size: {
        xs: 11,
        sm: 12,
        base: 14,
        lg: 16,
        xl: 18,
        '2xl': 20,
        '3xl': 24,
        '4xl': 28,
        '5xl': 32,
    },
    lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75,
    },
} as const;

// Espacements
export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
} as const;

// Ombres
export const shadows = {
    sm: {
        shadowColor: '#1A1512',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#1A1512',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#1A1512',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    xl: {
        shadowColor: '#1A1512',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 12,
    },
} as const;

// Border radius
export const radius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    full: 9999,
} as const;
