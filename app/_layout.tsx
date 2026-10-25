import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { AuthContext, useAuthProvider } from '../lib/auth';
import { ThemeProvider } from '../lib/themeContext';
import { useColors } from '../lib/useColors';
import { useThemeContext } from '../lib/themeContext';
import { useFonts } from 'expo-font';
import { 
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import { 
    FunnelDisplay_400Regular,
    FunnelDisplay_500Medium,
    FunnelDisplay_700Bold,
} from '@expo-google-fonts/funnel-display';
import Icon from '../components/Icon';
import { onNotificationOpen } from '../lib/notifications';
import { registerPush } from '../lib/push';
import { refreshComeback } from '../lib/comeback';

// Composant de chargement
function LoadingScreen() {
    const colors = useColors();
    const { isDark } = useThemeContext();
    
    return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
                <Image source={require('../assets/workyt-logo.png')} style={styles.logoImage} resizeMode="contain" />
                <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
            </View>
        </View>
    );
}

// Composant racine avec accès au thème
function RootLayout() {
    const auth = useAuthProvider();
    const router = useRouter();
    const segments = useSegments();
    const colors = useColors();
    const { isDark } = useThemeContext();
    const [appReady, setAppReady] = useState(false);

    // Chargement des polices
    const [fontsLoaded, fontError] = useFonts({
        Montserrat_400Regular,
        Montserrat_500Medium,
        Montserrat_600SemiBold,
        Montserrat_700Bold,
        FunnelDisplay_400Regular,
        FunnelDisplay_500Medium,
        FunnelDisplay_700Bold,
    });

    // Attendre que les polices soient chargées
    // Pas de délai artificiel : on affiche l'app dès que les polices sont prêtes
    useEffect(() => {
        if (fontsLoaded || fontError) setAppReady(true);
    }, [fontsLoaded, fontError]);

    // Gérer la redirection selon l'état d'authentification
    useEffect(() => {
        if (!appReady || auth.isLoading) return;

        const inAuthGroup = segments[0] === 'auth';

        if (!auth.isAuthenticated && !inAuthGroup) {
            router.replace('/auth/login');
        } else if (auth.isAuthenticated && inAuthGroup) {
            router.replace('/(tabs)');
        }
    }, [auth.isAuthenticated, auth.isLoading, segments, appReady]);

    // Tap sur une notification (rappel, plus tard push) → écran ciblé
    useEffect(() => {
        if (!auth.isAuthenticated) return;
        registerPush().then(refreshComeback);
        return onNotificationOpen((url) => router.push(url as any));
    }, [auth.isAuthenticated]);

    // La navigation reste montée pendant le chargement (écran posé par-dessus) :
    // la démonter ferait repartir l'app de l'accueil et perdrait l'écran
    // demandé par un lien ou une notification.
    const loading = !appReady || auth.isLoading;

    return (
        <AuthContext.Provider value={auth}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                }}
            >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="auth" />
            </Stack>
            {loading ? (
                <View style={StyleSheet.absoluteFill}>
                    <LoadingScreen />
                </View>
            ) : null}
        </AuthContext.Provider>
    );
}

// Export avec ThemeProvider
export default function Layout() {
    return (
        <ThemeProvider>
            <RootLayout />
        </ThemeProvider>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingCard: {
        borderRadius: 24,
        padding: 40,
        alignItems: 'center',
        minWidth: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    logoImage: {
        width: 170,
        height: 36,
        marginBottom: 16,
    },
    loader: {
        marginTop: 8,
    },
});
