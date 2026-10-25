import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Rappel quotidien local (aucun serveur requis) : « ta série t'attend ».
 * Programmé chaque jour à l'heure choisie ; quand le combat du jour est
 * gagné, le rappel du jour est sauté (reprogrammé à partir de demain).
 *
 * Les notifications « push » envoyées par le site sont dans push.ts,
 * la relance « reprendre un cours » dans comeback.ts.
 */

const KEY = 'daily_reminder_v1';
const CHANNEL = 'rappels';
const ID_PREFIX = 'rappel-';
const native = Platform.OS === 'ios' || Platform.OS === 'android';

export interface ReminderSettings { enabled: boolean; hour: number; minute: number }
const DEFAULT: ReminderSettings = { enabled: false, hour: 18, minute: 0 };

if (native) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
        }),
    });
}

export async function getReminderSettings(): Promise<ReminderSettings> {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
    } catch {
        return DEFAULT;
    }
}

/** Demande l'autorisation si besoin. Renvoie false si l'élève refuse. */
export async function ensurePermission(): Promise<boolean> {
    if (!native) return false;
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL, {
            name: 'Rappels quotidiens',
            importance: Notifications.AndroidImportance.DEFAULT,
        });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
}

const MESSAGES = [
    { title: 'Ta série t’attend 🔥', body: 'Un combat, une récompense : 2 minutes suffisent pour garder ta flamme.' },
    { title: 'Le monstre du jour rôde 👾', body: 'Réponds au quiz du jour et récupère ta récompense.' },
    { title: 'Petite révision ? 📚', body: 'Une leçon ou une fiche, et ta série continue.' },
];

/** (Re)programme le rappel ; `skipToday` décale le premier au lendemain. */
async function schedule(s: ReminderSettings, skipToday = false) {
    // Seulement nos rappels : la relance « reprendre un cours » (comeback.ts) reste programmée
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(pending
        .filter((n) => n.identifier.startsWith(ID_PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
    if (!s.enabled) return;
    // 7 rappels datés (un message différent chaque jour), renouvelés à chaque ouverture
    const now = new Date();
    for (let d = 0; d < 7; d++) {
        const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, s.hour, s.minute);
        if (at <= now || (skipToday && d === 0)) continue;
        const m = MESSAGES[(at.getDate() + d) % MESSAGES.length];
        await Notifications.scheduleNotificationAsync({
            identifier: `${ID_PREFIX}${d}`,
            content: { title: m.title, body: m.body, data: { url: '/aventure' } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
        });
    }
}

/** Active / désactive le rappel. Renvoie l'état réellement appliqué. */
export async function setReminder(next: ReminderSettings): Promise<ReminderSettings> {
    let applied = next;
    if (next.enabled && !(await ensurePermission())) applied = { ...next, enabled: false };
    await AsyncStorage.setItem(KEY, JSON.stringify(applied));
    if (native) await schedule(applied);
    return applied;
}

/** À l'ouverture de l'app : renouvelle les rappels ; saute aujourd'hui si la journée est faite. */
export async function refreshReminders(dayDone: boolean) {
    if (!native) return;
    const s = await getReminderSettings();
    if (s.enabled) await schedule(s, dayDone);
}

/** Tap sur une notification → ouvre l'écran indiqué dans `data.url` */
export function onNotificationOpen(navigate: (url: string) => void): () => void {
    if (!native) return () => {};
    const open = (r: Notifications.NotificationResponse | null) => {
        const url = r?.notification.request.content.data?.url;
        if (typeof url === 'string') navigate(url);
    };
    // App fermée puis ouverte par le tap : la réponse est déjà arrivée
    Notifications.getLastNotificationResponseAsync().then((r) => {
        if (r) { open(r); Notifications.clearLastNotificationResponseAsync?.().catch(() => {}); }
    }).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
}
