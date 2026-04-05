import { createContext, useContext } from 'react';

export interface User {
    id: string;
    username: string;
    email: string;
    role: string;
    points: number;
    image?: string;
}

export interface AuthState {
    user: User | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState>({
    user: null,
    isLoading: true,
    signIn: async () => {},
    signOut: async () => {},
});

export function useAuth() {
    return useContext(AuthContext);
}
