import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from './api';
import { ensurePermission } from './notifications';

/**
 * Notifications push du site (réponse au forum, like, suivi, défi, clan…)
 * et relances (quiz du jour, ordres de clan, « ça fait longtemps… »).
 * Le téléphone obtient un jeton Expo et le confie au site
 * (POST /api/push/register) avec les catégories que l'élève accepte ;
 * le site pousse ensuite sur le canal voulu (src/lib/expoPush.ts).
 *
 * Nécessite le projectId EAS (`eas init` remplit app.json → extra.eas) ;
 * sans lui, ou sur le web, on ne fait rien.
 */

const ASKED_KEY = 'push_permission_asked_v1';
const TOKEN_KEY = 'push_token_v1';
const PREFS_KEY = 'push_prefs_v1';
const native = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Un canal Android par type de notification, chacun avec son son
 * (fichiers dans assets/sounds, embarqués par le plugin expo-notifications).
 * Android fige le son d'un canal à sa création : pour en changer, il faut
 * un nouvel identifiant de canal (même nom côté site, src/lib/expoPush.ts).
 */
export const CHANNELS = [
    { id: 'activite', name: 'Activité (réponses, likes, suivi…)', sound: undefined },
    { id: 'quiz', name: 'Quiz du jour', sound: 'epee.wav' },
    { id: 'clan_capitaine', name: 'Clan : ordres du capitaine', sound: 'cor.wav' },
    { id: 'clan_soldat', name: 'Clan : appel aux soldats', sound: 'tambour.wav' },
    { id: 'relance', name: 'Foxy : « ça fait longtemps ! »', sound: 'foxy.wav' },
    { id: 'cours', name: 'Reprendre un cours', sound: 'page.wav' },
] as const;

/**
 * Catégories que l'élève peut couper dans « Mon espace ». Le site respecte
 * quiz / clan / relance ; `cours` est une relance locale (comeback.ts).
 */
export interface PushPrefs { quiz: boolean; clan: boolean; relance: boolean; cours: boolean }
const DEFAULT_PREFS: PushPrefs = { quiz: true, clan: true, relance: true, cours: true };

function projectId(): string | undefined {
    return (Constants.expoConfig?.extra as any)?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
}

export async function createChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;
    for (const c of CHANNELS) {
        await Notifications.setNotificationChannelAsync(c.id, {
            name: c.name,
            importance: Notifications.AndroidImportance.HIGH,
            sound: c.sound ?? 'default',
            vibrationPattern: [0, 180, 120, 180],
            lightColor: '#FF6A1A',
        });
    }
}

export async function getPushPrefs(): Promise<PushPrefs> {
    try {
        const raw = await AsyncStorage.getItem(PREFS_KEY);
        return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
    } catch {
        return DEFAULT_PREFS;
    }
}

async function sendToken(token: string, prefs: PushPrefs) {
    await apiFetch('/push/register', {
        method: 'POST',
        body: JSON.stringify({ token, platform: Platform.OS, prefs }),
        softAuth: true,
    });
}

/**
 * À appeler une fois connecté. La permission n'est demandée qu'une seule
 * fois (au premier lancement connecté) ; ensuite on se contente de
 * renouveler le jeton si elle a été accordée. Chaque envoi sert aussi au
 * site de « dernière ouverture » pour les relances d'inactivité.
 */
export async function registerPush(): Promise<void> {
    if (!native || !projectId()) return;
    try {
        await createChannels();
        let granted = (await Notifications.getPermissionsAsync()).granted;
        if (!granted && !(await AsyncStorage.getItem(ASKED_KEY))) {
            await AsyncStorage.setItem(ASKED_KEY, '1');
            granted = await ensurePermission();
        }
        if (!granted) return;

        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
        await sendToken(token, await getPushPrefs());
        await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch {
        // Route pas encore déployée, pas de réseau… on réessaiera au prochain lancement
    }
}

/** Change les catégories acceptées ; gardé sur l'appareil et transmis au site. */
export async function setPushPrefs(next: PushPrefs): Promise<PushPrefs> {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
    try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (native && token) await sendToken(token, next);
    } catch { /* renvoyé au prochain lancement par registerPush */ }
    return next;
}

/** À la déconnexion : le téléphone ne doit plus recevoir les notifications de ce compte. */
export async function unregisterPush(): Promise<void> {
    if (!native) return;
    try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (!token) return;
        await apiFetch('/push/register', { method: 'DELETE', body: JSON.stringify({ token }), softAuth: true });
        await AsyncStorage.removeItem(TOKEN_KEY);
    } catch { /* sans conséquence : le site nettoiera le jeton s'il devient invalide */ }
}
