import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '../../lib/useColors';
import { spacing, typography, type ThemeColors } from '../../lib/theme';
import { getFiches, type FicheListItem } from '../../lib/api';
import { ChipTabs, EmptyState, Eyebrow, IconButton, PageHeader } from '../../components/wk';
import CatalogList from '../../components/CatalogList';
import { SearchBar, Fab, FilterButton, BottomSheet, SheetChoices, PrimaryButton } from '../../components/mobile';
import { FicheGridCard } from '../../components/FicheCover';
import { LEVELS } from '../../lib/education';
import { tapLight } from '../../lib/haptics';

// Grille de 2 colonnes : chaque ligne de la liste porte deux fiches
type Pair = FicheListItem[];
const keyOf = (row: Pair) => row.map((f) => f.id).join('-');
const GAP = spacing.md;

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
    const [level, setLevel] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [popular, setPopular] = useState<FicheListItem[]>([]);
    const { width } = useWindowDimensions();
    const cardW = Math.floor((width - spacing.lg * 2 - GAP) / 2);
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
            const data = await getFiches({ query, subject, level, page: p, limit: PAGE_SIZE, force });
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
    }, [query, subject, level]);

    // Carrousel « les plus aimées » de la matière choisie
    useEffect(() => {
        let alive = true;
        getFiches({ subject, level, sort: 'popular', limit: 10 })
            .then((d) => {
                if (!alive) return;
                // Site pas encore à jour (tri ignoré) : on trie nous-mêmes la page reçue
                setPopular([...(d.data || [])].sort((a, b) => b.likes - a.likes).filter((f) => f.likes > 0).slice(0, 10));
            })
            .catch(() => { if (alive) setPopular([]); });
        return () => { alive = false; };
    }, [subject, level]);

    const rows = useMemo(() => {
        const out: Pair[] = [];
        for (let i = 0; i < fiches.length; i += 2) out.push(fiches.slice(i, i + 2));
        return out;
    }, [fiches]);

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

    const open = useCallback((id: string) => { tapLight(); router.push(`/fiches/${id}`); }, [router]);
    const renderItem = useCallback((row: Pair) => (
        <View style={s.pair}>
            {row.map((f) => <FicheGridCard key={f.id} fiche={f} width={cardW} onPress={() => open(f.id)} />)}
        </View>
    ), [cardW, open, s]);

    return (
        <View style={s.container}>
            <CatalogList
                hero={
                    <>
                        <PageHeader
                            topInset={0}
                            eyebrow="Fiches de révision"
                            title="Fiches de révision"
                            accent="gratuites"
                            subtitle="Synthèses, méthodes, formules : tout pour le Brevet, le Bac et le supérieur."
                            right={<IconButton icon="bookmark-outline" label="Mes favoris" onPress={() => router.push('/favoris')} />}
                        />
                        {popular.length > 2 && !query ? (
                            <View style={s.popular}>
                                <View style={s.popularHead}>
                                    <Eyebrow>Les plus aimées</Eyebrow>
                                    <Text style={s.popularTitle}>Ce que les autres révisent 🔥</Text>
                                </View>
                                <FlatList
                                    horizontal
                                    data={popular}
                                    keyExtractor={(f) => f.id}
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: GAP }}
                                    renderItem={({ item }) => <FicheGridCard fiche={item} width={132} onPress={() => open(item.id)} />}
                                />
                            </View>
                        ) : null}
                    </>
                }
                bar={
                    <>
                        <View style={s.searchRow}>
                            <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher une fiche…" />
                            <FilterButton count={level ? 1 : 0} onPress={() => setFiltersOpen(true)} />
                        </View>
                        <ChipTabs value={subject} onChange={(v) => { tapLight(); setSubject(v); }} options={POPULAR} style={{ paddingTop: spacing.md }} />
                    </>
                }
                data={rows}
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
                            text={query || subject || level ? 'Essaie un autre mot-clé ou une autre matière.' : 'Sois le premier à partager une fiche !'}
                        />
                    )
                }
            />

            <Fab label="Déposer" onPress={() => router.push('/fiches/creer')} />

            <BottomSheet
                visible={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                title="Filtrer les fiches"
                footer={<PrimaryButton label={level ? `Voir les fiches · ${level}` : 'Voir toutes les fiches'} onPress={() => setFiltersOpen(false)} />}
            >
                <SheetChoices label="Niveau" options={LEVELS} value={level} onChange={setLevel} allLabel="Tous les niveaux" />
            </BottomSheet>
        </View>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        pair: { flexDirection: 'row', gap: GAP, paddingBottom: spacing.sm },
        searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        popular: { paddingTop: spacing.sm, paddingBottom: spacing.lg, gap: spacing.md },
        popularHead: { paddingHorizontal: spacing.lg, gap: 4 },
        popularTitle: { fontFamily: typography.fontFamily.display, fontSize: 24, letterSpacing: -0.3, color: c.text },
    });
}
