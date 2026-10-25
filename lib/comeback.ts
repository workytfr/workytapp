import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getRecentCourse } from './recent';
import { createChannels, getPushPrefs } from './push';

/**
 * Relance locale « reprendre un cours », sans serveur : à chaque ouverture
 * de l'app, on repousse deux notifications à J+3 et J+7 (18 h). Tant que
 * l'élève revient, elles ne sonnent jamais ; s'il décroche, la première
 * lui rappelle le dernier cours ouvert (son « page », canal `cours`).
 */

const IDS = ['retour-cours-3', 'retour-cours-7'];
const native = Platform.OS === 'ios' || Platform.OS === 'android';

export async function refreshComeback(): Promise<void> {
    if (!native) return;
    try {
        await Promise.all(IDS.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
        const [prefs, perm] = await Promise.all([getPushPrefs(), Notifications.getPermissionsAsync()]);
        if (!prefs.cours || !perm.granted) return;
        await createChannels();

        const course = await getRecentCourse();
        const now = new Date();
        const plan = [
            {
                days: 3,
                title: course ? 'Ton cours t’attend 📖' : 'Ça fait un moment 📖',
                body: course
                    ? `« ${course.title} » : reprends là où tu t’étais arrêté, une leçon suffit.`
                    : 'Une leçon de 5 minutes, et c’est reparti.',
                url: course ? `/cours/${course.id}` : '/courses',
            },
            {
                days: 7,
                title: 'Ça fait longtemps qu’on n’a pas eu cours ensemble 🦊',
                body: course ? `On reprend « ${course.title} » ?` : 'Choisis un cours, Foxy t’accompagne.',
                url: course ? `/cours/${course.id}` : '/courses',
            },
        ];
        for (const [i, p] of plan.entries()) {
            const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + p.days, 18, 0);
            await Notifications.scheduleNotificationAsync({
                identifier: IDS[i],
                content: { title: p.title, body: p.body, data: { url: p.url }, sound: 'page.wav' },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: 'cours' },
            });
        }
    } catch { /* relance accessoire : jamais bloquante */ }
}

export async function cancelComeback(): Promise<void> {
    if (!native) return;
    await Promise.all(IDS.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}
