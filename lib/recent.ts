import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Dernier cours ouvert, gardé sur l'appareil : l'accueil propose de le
 * reprendre en un tap (le site n'expose pas de « dernier cours » par API).
 */
export interface RecentCourse {
    id: string;
    title: string;
    image?: string | null;
    matiere?: string;
    openedAt: number;
}

const KEY = 'recent_course_v1';

export async function saveRecentCourse(c: Omit<RecentCourse, 'openedAt'>): Promise<void> {
    try {
        await AsyncStorage.setItem(KEY, JSON.stringify({ ...c, openedAt: Date.now() }));
    } catch { /* stockage indisponible : sans conséquence */ }
}

export async function getRecentCourse(): Promise<RecentCourse | null> {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as RecentCourse) : null;
    } catch {
        return null;
    }
}
