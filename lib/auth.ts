import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ============================================
// TYPES (identiques au site workyt-next)
// ============================================

export interface User {
    id: string;
    username: string;
    name: string;
    email: string;
    role: 'Apprenti' | 'Helpeur' | 'Rédacteur' | 'Correcteur' | 'Modérateur' | 'Admin';
    points: number;
    badges: string[];
    selectedBadge: string | null;
    bio: string;
    image: string | null;
    verified: boolean;
    createdAt: string;
}

export interface UserStats {
    questions: number;
    answers: number;
    revisions: number;
}

export interface AuthState {
    user: User | null;
    stats: UserStats | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================

export const AuthContext = createContext<AuthState>({
    user: null,
    stats: null,
    isLoading: true,
    isAuthenticated: false,
    signIn: async () => {},
    signOut: async () => {},
    refreshProfile: async () => {},
});

export function useAuth() {
    return useContext(AuthContext);
}

// ============================================
// HOOK
// ============================================

export function useAuthProvider() {
    const [user, setUser] = useState<User | null>(null);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Récupérer le profil utilisateur
    const refreshProfile = useCallback(async () => {
        try {
            // Import dynamique pour éviter les dépendances circulaires
            const { getMe } = await import('./api');
            const data = await getMe();
            setUser({ ...data.user, role: data.user.role as User['role'] });
            setStats(data.stats);
        } catch (error) {
            // Déconnexion seulement si le token a été invalidé (401 → apiFetch
            // l'a supprimé). Une simple coupure réseau ne doit pas déconnecter.
            const { getToken } = await import('./api');
            if (!(await getToken())) {
                setUser(null);
                setStats(null);
            }
            throw error;
        }
    }, []);

    // Vérifier la session au lancement
    useEffect(() => {
        (async () => {
            try {
                const { getToken } = await import('./api');
                const token = await getToken();
                
                if (token) {
                    await refreshProfile();
                }
            } catch (error) {
                console.log('Session invalide ou expirée', error);
                setUser(null);
                setStats(null);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [refreshProfile]);

    // Connexion
    const signIn = useCallback(async (email: string, password: string) => {
        const { login } = await import('./api');
        const data = await login(email, password);
        setUser({ ...data.user, role: data.user.role as User['role'] });
        
        // Charger les stats en arrière-plan
        refreshProfile().catch(() => {});
    }, [refreshProfile]);

    // Déconnexion
    const signOut = useCallback(async () => {
        const { logout } = await import('./api');
        await logout();
        setUser(null);
        setStats(null);
    }, []);

    return {
        user,
        stats,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signOut,
        refreshProfile,
    };
}
