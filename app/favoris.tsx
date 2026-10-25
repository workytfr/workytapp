import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Icon from '../components/Icon';
import { useColors } from '../lib/useColors';
import { spacing, type ThemeColors } from '../lib/theme';
import { getBookmarks, toggleBookmark, type BookmarkItem, type BookmarkType } from '../lib/api';
import { ChipTabs, ContentCard, EmptyState, IconButton, PageHeader, SkeletonList, FicheStatus, QuestionStatus, timeAgo, plainExcerpt } from '../components/wk';

type Filter = '' | BookmarkType;

const KIND_LABEL: Record<BookmarkType, string> = {
    fiche: 'Fiche',
    forum: 'Question',
    cours: 'Cours',
    exercise: 'Exercice',
};

/** Route de l'app pour un favori (l'exercice ouvre son cours). */
function routeFor(b: BookmarkItem): string | null {
    switch (b.contentType) {
        case 'fiche': return `/fiches/${b.refId}`;
        case 'forum': return `/forum/${b.refId}`;
        case 'cours': return `/cours/${b.refId}`;
        case 'exercise': {
            const m = b.href?.match(/^\/cours\/([a-f0-9]{24})/i);
            return m ? `/cours/${m[1]}` : null;
        }
    }
}

/** Mes favoris — équivalent de /fiches/favoris sur le site, tous types confondus. */
export default function FavorisScreen() {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);

    const [filter, setFilter] = useState<Filter>('');
    const [items, setItems] = useState<BookmarkItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    // Ignore les réponses d'un filtre qu'on a déjà quitté
    const requestId = useRef(0);

    const load = useCallback(async (p: number, f: Filter) => {
        const rid = ++requestId.current;
        try {
            setError('');
            const res = await getBookmarks({ contentType: f, page: p, limit: 20 });
            if (rid !== requestId.current) return;
            setItems((prev) => (p === 1 ? res.data : [...prev, ...res.data]));
            setPage(p);
            setTotalPages(res.pagination?.totalPages ?? 1);
        } catch (e: any) {
            if (rid === requestId.current) setError(e.message || 'Impossible de charger tes favoris.');
        } finally {
            if (rid === requestId.current) {
                setLoading(false);
                setLoadingMore(false);
                setRefreshing(false);
            }
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        load(1, filter);
    }, [filter, load]);

    const onEndReached = useCallback(() => {
        if (loadingMore || loading || page >= totalPages) return;
        setLoadingMore(true);
        load(page + 1, filter);
    }, [loadingMore, loading, page, totalPages, filter, load]);

    const remove = useCallback((b: BookmarkItem) => {
        Alert.alert('Retirer des favoris ?', b.title, [
            { text: 'Annuler', style: 'cancel' },
            {
                text: 'Retirer',
                style: 'destructive',
                onPress: async () => {
                    setItems((prev) => prev.filter((x) => x.bookmarkId !== b.bookmarkId));
                    try {
                        await toggleBookmark(b.contentType, b.refId);
                    } catch {
                        load(1, filter);
                    }
                },
            },
        ]);
    }, [filter, load]);

    const renderItem = useCallback(({ item }: { item: BookmarkItem }) => {
        const route = routeFor(item);
        return (
            <ContentCard
                title={item.title}
                subject={item.subject}
                kindLabel={KIND_LABEL[item.contentType]}
                level={item.level || item.classLevel}
                status={
                    item.contentType === 'fiche' ? <FicheStatus status={item.status} />
                        : item.contentType === 'forum' ? <QuestionStatus status={item.status} />
                            : undefined
                }
                excerpt={plainExcerpt(item.content, 200)}
                authorName={item.authors?.username}
                meta={`${KIND_LABEL[item.contentType]} · ajouté ${timeAgo(item.bookmarkedAt)}`}
                action={
                    <Pressable onPress={() => remove(item)} hitSlop={10} accessibilityLabel="Retirer des favoris">
                        <Icon name="bookmark" size={20} color={colors.primary} />
                    </Pressable>
                }
                onPress={() => route && router.push(route as any)}
            />
        );
    }, [colors.primary, remove, router]);

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <PageHeader
                topInset={insets.top}
                eyebrow="Ma bibliothèque"
                title="Favoris"
                subtitle="Tes fiches, questions et cours mis de côté."
                right={<IconButton icon="close" label="Fermer" onPress={() => router.back()} />}
            >
                <ChipTabs<Filter>
                    value={filter}
                    onChange={setFilter}
                    style={{ paddingTop: spacing.md }}
                    options={[
                        { value: '', label: 'Tout' },
                        { value: 'fiche', label: 'Fiches', icon: 'document-text-outline' },
                        { value: 'forum', label: 'Forum', icon: 'chatbubbles-outline' },
                        { value: 'cours', label: 'Cours', icon: 'book-outline' },
                        { value: 'exercise', label: 'Exercices', icon: 'create-outline' },
                    ]}
                />
            </PageHeader>

            {loading ? (
                <SkeletonList />
            ) : error ? (
                <EmptyState icon="cloud-offline-outline" title="Oups" text={error} actionLabel="Réessayer" onAction={() => { setLoading(true); load(1, filter); }} />
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(b) => b.bookmarkId}
                    renderItem={renderItem}
                    contentContainerStyle={[s.list, { paddingBottom: insets.bottom + spacing['3xl'] }]}
                    onEndReached={onEndReached}
                    onEndReachedThreshold={0.4}
                    initialNumToRender={6}
                    maxToRenderPerBatch={8}
                    windowSize={7}
                    removeClippedSubviews
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1, filter); }} tintColor={colors.primary} />}
                    ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: spacing.lg }} color={colors.primary} /> : undefined}
                    ListEmptyComponent={
                        <EmptyState
                            icon="bookmark-outline"
                            title="Aucun favori"
                            text="Touche l'icône favori sur une fiche, une question ou un cours pour le retrouver ici."
                        />
                    }
                />
            )}
        </View>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        list: { padding: spacing.lg, gap: spacing.md },
    });
}
