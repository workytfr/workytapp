import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthContext, User } from '../lib/auth';
import { apiFetch, setToken, removeToken, getToken } from '../lib/api';
import { colors } from '../lib/colors';

export default function RootLayout() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const segments = useSegments();

    // Vérifier la session au lancement
    useEffect(() => {
        (async () => {
            try {
                const token = await getToken();
                if (token) {
                    const data = await apiFetch('/auth/me');
                    setUser(data.user);
                }
            } catch {
                await removeToken();
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    // Rediriger selon l'état d'auth
    useEffect(() => {
        if (isLoading) return;
        const inAuthGroup = segments[0] === 'auth';

        if (!user && !inAuthGroup) {
            router.replace('/auth/login');
        } else if (user && inAuthGroup) {
            router.replace('/(tabs)');
        }
    }, [user, segments, isLoading]);

    const signIn = useCallback(async (email: string, password: string) => {
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        await setToken(data.accessToken);
        setUser(data.user);
    }, []);

    const signOut = useCallback(async () => {
        await removeToken();
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
            <StatusBar style="dark" />
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                    headerTitleStyle: { fontWeight: '600' },
                    contentStyle: { backgroundColor: colors.background },
                }}
            >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth" options={{ headerShown: false }} />
            </Stack>
        </AuthContext.Provider>
    );
}
