import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '../../lib/useColors';
import { spacing, type ThemeColors } from '../../lib/theme';
import { getFiches, type FicheListItem } from '../../lib/api';
import { ChipTabs, ContentCard, EmptyState, IconButton, PageHeader, FicheStatus, Stat, timeAgo, plainExcerpt } from '../../components/wk';
import Avatar from '../../components/Avatar';
import CatalogList from '../../components/CatalogList';
import { SearchBar, Fab } from '../../components/mobile';
import { tapLight } from '../../lib/haptics';

const keyOf = (f: FicheListItem) => f.id;

// Matières mises en avant sur la page fiches du site
const POPULAR = [
    { value: '', label: 'Toutes' },
    { value: 'Mathématiques', label: 'Maths' },
    { value: 'Français', label: 'Français' },
    { value: 'Physique-Chimie', label: 'Physique-Chimie' },
    { value: 'Sciences de la Vie et de la Terre (SVT)', label: 'SVT' },
    { value: 'Histoire-Géographie', label: 'Histoire-Géo' },
    { value: 'Philosophie', label: 'Philo' },
    { value: 'Sciences Économiques et Sociales (SES)', label: 'SES' },
    { value: 'Anglais', label: 'Anglais' },
];

const PAGE_SIZE = 15;
const DEBOUNCE_MS = 350;

export default function FichesTab() {
    const colors = useColors();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);

    const [fiches, setFiches] = useState<FicheListItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [subject, setSubject] = useState('');
    const [error, setError] = useState('');
    const requestId = useRef(0);

    // La saisie ne déclenche la requête qu'après une courte pause
    useEffect(() => {
        const t = setTimeout(() => setQuery(search.trim()), DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [search]);

    const load = useCallback(async (p: number, force = false) => {
        const rid = ++requestId.current;
        try {
            setError('');
            const data = await getFiches({ query, subject, page: p, limit: PAGE_SIZE, force });
            if (rid !== requestId.current) return;
            setFiches((prev) => (p === 1 ? data.data || [] : [...prev, ...(data.data || [])]));
            setPage(p);
            setTotalPages(data.pagination?.totalPages ?? 1);
        } catch (e: any) {
            if (rid === requestId.current) setError(e.message || 'Impossible de charger les fiches.');
        } finally {
            if (rid === requestId.current) {
                setLoading(false);
                setLoadingMore(false);
                setRefreshing(false);
            }
        }
    }, [query, subject]);

    useEffect(() => {
        setLoading(true);
        load(1);
    }, [load]);

    const onRefresh = useCallback(() => { setRefreshing(true); load(1, true); }, [load]);
    const onEndReached = useCallback(() => {
        if (loading || loadingMore || page >= totalPages) return;
        setLoadingMore(true);
        load(page + 1);
    }, [loading, loadingMore, page, totalPages, load]);

    const renderItem = useCallback((item: FicheListItem) => (
        <ContentCard
            title={item.title}
            subject={item.subject}
            level={item.level}
            status={<FicheStatus status={item.status} />}
            excerpt={plainExcerpt(item.content, 200)}
            avatar={item.authors?.username ? <Avatar name={item.authors.username} userId={item.authors._id} size="xs" /> : undefined}
            authorName={item.authors?.username}
            meta={timeAgo(item.createdAt)}
            stats={<><Stat icon="flame" value={item.likes} color={colors.primary} /><Stat icon="chatbubble" value={item.comments} /></>}
            onPress={() => router.push(`/fiches/${item.id}`)}
        />
    ), [colors.primary, router]);

    return (
        <View style={s.container}>
            <CatalogList
                hero={
                    <PageHeader
                        topInset={0}
                        eyebrow="Fiches de révision"
                        title="Fiches de révision"
                        accent="gratuites"
                        subtitle="Synthèses, méthodes, formules : tout pour le Brevet, le Bac et le supérieur."
                        right={<IconButton icon="bookmark-outline" label="Mes favoris" onPress={() => router.push('/favoris')} />}
                    />
                }
                bar={
                    <>
                        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher une fiche…" style={{ flex: 0 }} />
                        <ChipTabs value={subject} onChange={(v) => { tapLight(); setSubject(v); }} options={POPULAR} style={{ paddingTop: spacing.md }} />
                    </>
                }
                data={fiches}
                keyOf={keyOf}
                renderItem={renderItem}
                loading={loading}
                loadingMore={loadingMore}
                refreshing={refreshing}
                onRefresh={onRefresh}
                onEndReached={onEndReached}
                endLabel={`${fiches.length} fiche${fiches.length > 1 ? 's' : ''}`}
                empty={
                    error ? (
                        <EmptyState icon="cloud-offline-outline" title="Oups" text={error} actionLabel="Réessayer" onAction={() => { setLoading(true); load(1, true); }} />
                    ) : (
                        <EmptyState
                            icon="documents-outline"
                            title="Aucune fiche trouvée"
                            text={query || subject ? 'Essaie un autre mot-clé ou une autre matière.' : 'Sois le premier à partager une fiche !'}
                        />
                    )
                }
            />

            <Fab label="Déposer" onPress={() => router.push('/fiches/creer')} />
        </View>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
    });
}
