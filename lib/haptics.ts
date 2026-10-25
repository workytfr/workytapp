import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Retours haptiques de l'app : légers, jamais bloquants. Sur le web (aperçu)
 * il n'y a pas de moteur de vibration, on ne fait rien.
 */
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

/** Tap discret : sélection d'un filtre, d'un onglet, d'une réponse */
export function tapLight() {
    if (enabled) Haptics.selectionAsync().catch(() => {});
}

/** Appui franc : bouton principal, ouverture d'une feuille */
export function tapMedium() {
    if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** Réussite : bonne réponse, récompense récupérée, message envoyé */
export function success() {
    if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Échec : mauvaise réponse, action refusée */
export function error() {
    if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
