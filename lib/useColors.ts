import { useThemeContext } from './themeContext';
import { lightColors, darkColors, type ThemeColors } from './theme';

/** Palette du thème courant (clair/sombre). Source unique : lib/theme.ts */
export function useColors(): ThemeColors {
    const { isDark } = useThemeContext();
    return isDark ? darkColors : lightColors;
}

export { lightColors, darkColors };
