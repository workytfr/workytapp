import * as SecureStore from 'expo-secure-store';

const API_URL = __DEV__
    ? 'http://192.168.1.X:3000/api' // TODO: remplacer par ton IP locale
    : 'https://workyt.fr/api';

const TOKEN_KEY = 'auth_token';

export async function getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function apiFetch<T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getToken();

    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || data.message || `Erreur ${res.status}`);
    }

    return data;
}
