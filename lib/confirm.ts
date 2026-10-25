/**
 * Confirmation multiplateforme : Alert.alert n'affiche rien sur le web
 * (react-native-web), on y retombe sur window.confirm.
 */
import { Alert, Platform } from 'react-native';

export function confirmAction(title: string, message: string, confirmLabel = 'Confirmer', destructive = true): Promise<boolean> {
    if (Platform.OS === 'web') {
        const w = globalThis as unknown as { confirm?: (m: string) => boolean };
        return Promise.resolve(w.confirm ? w.confirm(message ? `${title}\n\n${message}` : title) : true);
    }
    return new Promise((resolve) => {
        Alert.alert(title, message, [
            { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
            { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
        ], { cancelable: true, onDismiss: () => resolve(false) });
    });
}
