import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: ThemeMode;
    isDark: boolean;
    setTheme: (theme: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'system',
    isDark: false,
    setTheme: () => {},
    toggleTheme: () => {},
});

const THEME_STORAGE_KEY = '@workyt_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemColorScheme = useColorScheme();
    const [theme, setThemeState] = useState<ThemeMode>('light');
    const [isReady, setIsReady] = useState(false);

    // Charger le thème sauvegardé
    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
            if (savedTheme) {
                setThemeState(savedTheme as ThemeMode);
            }
        } catch (error) {
            console.log('Erreur chargement thème:', error);
        }
        setIsReady(true);
    };

    const setTheme = async (newTheme: ThemeMode) => {
        setThemeState(newTheme);
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
        } catch (error) {
            console.log('Erreur sauvegarde thème:', error);
        }
    };

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    // Déterminer si on est en mode sombre (light par défaut)
    const isDark = theme === 'dark';

    if (!isReady) return null;

    return (
        <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useThemeContext() {
    return useContext(ThemeContext);
}
