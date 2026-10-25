/**
 * État mémorisé sur l'appareil (équivalent de useStoredState du site, qui
 * utilise localStorage) : les notes saisies restent après une fermeture.
 * Mêmes clés que le site (wk-bac-notes…).
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useStoredState<T>(key: string, initial: T) {
    const [value, setValue] = useState<T>(initial);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        AsyncStorage.getItem(key)
            .then((raw) => {
                if (!cancelled && raw) setValue(JSON.parse(raw) as T);
            })
            .catch(() => { /* valeur illisible : on garde la valeur initiale */ })
            .finally(() => { if (!cancelled) setLoaded(true); });
        return () => { cancelled = true; };
    }, [key]);

    useEffect(() => {
        if (loaded) AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
    }, [key, value, loaded]);

    return [value, setValue, loaded] as const;
}
