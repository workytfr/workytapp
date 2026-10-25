import { useCallback, useMemo } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, Text, StyleSheet, type ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../lib/useColors';
import { spacing, typography } from '../lib/theme';
import { SkeletonList } from './wk';

type Row<T> = { key: '__hero' } | { key: '__bar' } | { key: string; item: T };

/**
 * Liste « catalogue » façon app mobile : l'en-tête papier défile avec le
 * contenu, la barre de recherche/filtres reste collée en haut, la liste se
 * recharge en tirant et se pagine en bas. Utilisée par Forum, Fiches, Cours.
 */
export default function CatalogList<T>({
    hero, bar, data, keyOf, renderItem, loading, loadingMore, refreshing, onRefresh, onEndReached,
    empty, endLabel,
}: {
    hero: React.ReactNode;
    bar: React.ReactNode;
    data: T[];
    keyOf: (item: T) => string;
    renderItem: (item: T) => React.ReactElement;
    loading: boolean;
    loadingMore?: boolean;
    refreshing: boolean;
    onRefresh: () => void;
    onEndReached?: () => void;
    /** Affiché quand la liste est vide (après chargement) */
    empty: React.ReactNode;
    /** Pied de liste quand tout est chargé (ex. « 27 cours ») */
    endLabel?: string;
}) {
    const colors = useColors();
    const insets = useSafeAreaInsets();

    const rows = useMemo<Row<T>[]>(() => [
        { key: '__hero' },
        { key: '__bar' },
        ...(loading ? [] : data.map((item) => ({ key: keyOf(item), item }))),
    ], [data, keyOf, loading]);

    const render: ListRenderItem<Row<T>> = useCallback(({ item }) => {
        if (item.key === '__hero') return <>{hero}</>;
        if (item.key === '__bar') return <View style={[styles.bar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>{bar}</View>;
        return <View style={styles.cell}>{renderItem((item as { item: T }).item)}</View>;
    }, [hero, bar, renderItem, colors]);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Bande sous la barre d'état : la barre collante s'arrête dessous */}
            <View style={{ height: insets.top, backgroundColor: colors.background }} />
            <FlatList
                data={rows}
                keyExtractor={(r) => r.key}
                renderItem={render}
                stickyHeaderIndices={[1]}
                contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.5}
                initialNumToRender={6}
                maxToRenderPerBatch={6}
                windowSize={9}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                ListFooterComponent={
                    loading ? <SkeletonList count={3} />
                        : data.length === 0 ? <>{empty}</>
                        : loadingMore ? <ActivityIndicator style={{ padding: spacing.xl }} color={colors.primary} />
                        : endLabel ? <Text style={[styles.end, { color: colors.textMuted }]}>{endLabel}</Text>
                        : undefined
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    bar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1 },
    cell: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    end: { textAlign: 'center', fontFamily: typography.fontFamily.mono, fontSize: 11, letterSpacing: 1, padding: spacing.xl },
});
