import { memo, useEffect, useState, useCallback } from 'react';
import { Pressable, StyleSheet, Alert } from 'react-native';
import Icon from './Icon';
import { useColors } from '../lib/useColors';
import { isBookmarked, toggleBookmark, type BookmarkType } from '../lib/api';

/**
 * Bouton favori (fiche, question, cours, exercice) — même API que le site.
 * Mise à jour optimiste : l'icône bascule tout de suite, on revient en
 * arrière si le serveur refuse.
 */
function BookmarkButton({ type, id, size = 22, bordered = true }: { type: BookmarkType; id: string; size?: number; bordered?: boolean }) {
    const colors = useColors();
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let alive = true;
        isBookmarked(type, id).then((b) => { if (alive) setSaved(b); }).catch(() => {});
        return () => { alive = false; };
    }, [type, id]);

    const onPress = useCallback(async () => {
        if (busy) return;
        setBusy(true);
        const previous = saved;
        setSaved(!previous);
        try {
            const res = await toggleBookmark(type, id);
            setSaved(res.bookmarked);
        } catch (e: any) {
            setSaved(previous);
            Alert.alert('Favoris', e?.message || "Impossible de modifier tes favoris.");
        } finally {
            setBusy(false);
        }
    }, [busy, saved, type, id]);

    return (
        <Pressable
            onPress={onPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            accessibilityState={{ selected: saved }}
            style={({ pressed }) => [
                bordered && [styles.btn, { backgroundColor: colors.surface, borderColor: saved ? colors.primary : colors.border }],
                pressed && { opacity: 0.6 },
            ]}
        >
            <Icon name={saved ? 'bookmark' : 'bookmark-outline'} size={size} color={saved ? colors.primary : colors.text} />
        </Pressable>
    );
}

export default memo(BookmarkButton);

const styles = StyleSheet.create({
    btn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
