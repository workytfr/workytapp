import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import { useColors } from '../../lib/useColors';
import { spacing, radius, typography, type ThemeColors } from '../../lib/theme';
import { getCourses, type CourseListItem } from '../../lib/api';
import { getSiteOrigin } from '../../lib/siteOrigin';
import { subjectIcon } from '../../lib/education';
import RemoteImage from '../../components/RemoteImage';
import CatalogList from '../../components/CatalogList';
import { SearchBar } from '../../components/mobile';
import { tapLight } from '../../lib/haptics';
import { ChipTabs, EmptyState, IconButton, LevelChip, PageHeader, SubjectLabel } from '../../components/wk';

type IconName = string;

const keyOf = (c: CourseListItem) => c._id;

const LEVEL_FILTERS = [
    { value: '', label: 'Tous niveaux' },
    { value: '6ème', label: '6e' },
    { value: '5ème', label: '5e' },
    { value: '4ème', label: '4e' },
    { value: '3ème', label: '3e' },
    { value: 'Seconde', label: 'Seconde' },
    { value: 'Première', label: 'Première' },
    { value: 'Terminale', label: 'Terminale' },
    { value: 'BTS', label: 'BTS' },
];

const PAGE_SIZE = 15;
const DEBOUNCE_MS = 350;

function resolveImg(src?: string | null): string | null {
    if (!src) return null;
    if (src.startsWith('http')) return src;
    return `${getSiteOrigin()}${src.startsWith('/') ? '' : '/'}${src}`;
}

export default function CoursesScreen() {
    const colors = useColors();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);

    const [courses, setCourses] = useState<CourseListItem[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [niveau, setNiveau] = useState('');
    const [error, setError] = useState('');
    const requestId = useRef(0);

    useEffect(() => {
        const t = setTimeout(() => setQuery(search.trim()), DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [search]);

    const load = useCallback(async (p: number, force = false) => {
        const rid = ++requestId.current;
        try {
            setError('');
            const data = await getCourses({ search: query, niveau, page: p, limit: PAGE_SIZE, force });
            if (rid !== requestId.current) return;
            setCourses((prev) => (p === 1 ? data.courses || [] : [...prev, ...(data.courses || [])]));
            setPage(p);
            setTotal(data.total ?? 0);
        } catch (e: any) {
            if (rid === requestId.current) setError(e.message || 'Impossible de charger les cours.');
        } finally {
            if (rid === requestId.current) {
                setLoading(false);
                setLoadingMore(false);
                setRefreshing(false);
            }
        }
    }, [query, niveau]);

    useEffect(() => {
        setLoading(true);
        load(1);
    }, [load]);

    const onRefresh = useCallback(() => { setRefreshing(true); load(1, true); }, [load]);
    const onEndReached = useCallback(() => {
        if (loading || loadingMore || courses.length >= total) return;
        setLoadingMore(true);
        load(page + 1);
    }, [loading, loadingMore, courses.length, total, page, load]);

    const open = useCallback((id: string) => router.push(`/cours/${id}`), [router]);
    const renderItem = useCallback((item: CourseListItem) => (
        <CourseCard item={item} s={s} colors={colors} onOpen={open} />
    ), [s, colors, open]);

    return (
        <View style={s.container}>
            <CatalogList
                hero={
                    <PageHeader
                        topInset={0}
                        eyebrow="Bibliothèque de cours"
                        title="Cours gratuits,"
                        accent="du collège au supérieur"
                        subtitle="Leçons, exercices, quiz et fiches, rédigés et relus par les bénévoles."
                        right={<IconButton icon="search" label="Recherche globale" onPress={() => router.push('/recherche')} />}
                    />
                }
                bar={
                    <>
                        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un cours…" style={{ flex: 0 }} />
                        <ChipTabs value={niveau} onChange={(v) => { tapLight(); setNiveau(v); }} options={LEVEL_FILTERS} style={{ paddingTop: spacing.md }} />
                    </>
                }
                data={courses}
                keyOf={keyOf}
                renderItem={renderItem}
                loading={loading}
                loadingMore={loadingMore}
                refreshing={refreshing}
                onRefresh={onRefresh}
                onEndReached={onEndReached}
                endLabel={`${total} cours`}
                empty={
                    error ? (
                        <EmptyState icon="cloud-offline-outline" title="Oups" text={error} actionLabel="Réessayer" onAction={() => { setLoading(true); load(1, true); }} />
                    ) : (
                        <EmptyState icon="school-outline" title="Aucun cours trouvé" text="Essaie un autre mot-clé ou un autre niveau." />
                    )
                }
            />
        </View>
    );
}

type Styles = ReturnType<typeof createStyles>;

const CourseCard = memo(function CourseCard({
    item, s, colors, onOpen,
}: { item: CourseListItem; s: Styles; colors: ThemeColors; onOpen: (id: string) => void }) {
    const img = resolveImg(item.image);
    return (
        <Pressable style={({ pressed }) => [s.card, pressed && s.cardPressed]} onPress={() => onOpen(item._id)} accessibilityLabel={item.title}>
            <View style={s.thumb}>
                {img ? (
                    <RemoteImage uri={img} width={84} height={84} resizeMode="cover" fallback={<Icon name={subjectIcon(item.matiere || '')} size={26} color={colors.accent} />} />
                ) : (
                    <Icon name={subjectIcon(item.matiere || '') as IconName} size={26} color={colors.accent} />
                )}
            </View>
            <View style={s.body}>
                <View style={s.head}>
                    {item.matiere ? <SubjectLabel subject={item.matiere} /> : null}
                </View>
                <Text style={s.title} numberOfLines={2}>{item.title}</Text>
                <View style={s.meta}>
                    {item.niveau ? <LevelChip level={item.niveau} /> : null}
                    <Icon name="layers-outline" size={13} color={colors.textMuted} />
                    <Text style={s.metaText}>{item.sections?.length ?? 0} chapitres</Text>
                </View>
            </View>
        </Pressable>
    );
});

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        card: {
            flexDirection: 'row', gap: spacing.md, padding: spacing.md,
            backgroundColor: c.surface, borderRadius: radius['2xl'], borderWidth: 1, borderColor: c.border,
        },
        cardPressed: { transform: [{ scale: 0.985 }], borderColor: c.textMuted },
        thumb: {
            width: 84, height: 84, borderRadius: radius.lg, overflow: 'hidden',
            backgroundColor: c.surfaceVariant, alignItems: 'center', justifyContent: 'center',
        },
        thumbImg: { width: '100%', height: '100%' },
        body: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 4 },
        head: { flexDirection: 'row', alignItems: 'center' },
        title: { fontFamily: typography.fontFamily.display, fontSize: 19, lineHeight: 23, color: c.text, letterSpacing: -0.2 },
        meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
        metaText: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textMuted },
    });
}
