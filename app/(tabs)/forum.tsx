import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    RefreshControl,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import { useAuth } from '../../lib/auth';
import { apiFetch } from '../../lib/api';
import { spacing, radius, typography, shadows } from '../../lib/theme';
import { useColors } from '../../lib/useColors';
import { useThemeContext } from '../../lib/themeContext';
import { useForumListRealtime } from '../../lib/realtime';
import Avatar from '../../components/Avatar';
import { ContentCard, PageHeader, IconButton, ChipTabs, EmptyState, SkeletonList, QuestionStatus, Stat, plainExcerpt, timeAgo as timeAgoLong } from '../../components/wk';
import { SearchBar, FilterButton, BottomSheet, SheetChoices, PrimaryButton, Fab } from '../../components/mobile';
import { tapLight } from '../../lib/haptics';

interface Question {
    _id: string;
    title: string;
    subject: string;
    classLevel: string;
    status: string;
    user: { _id: string; username: string; points?: number; image?: string | null };
    answerCount: number;
    points: number;
    createdAt: string;
    description?: { whatIDid: string; whatINeed: string };
    contextType?: 'lesson' | 'exercise' | 'general';
    contextTitle?: string;
    attachments?: string[];
}

const SUBJECTS = ['Mathématiques', 'Français', 'Histoire-Géo', 'Physique-Chimie', 'SVT', 'Anglais', 'SES', 'Philosophie', 'NSI', 'Autre'];
const LEVELS = ['Seconde', 'Première', 'Terminale', 'BTS'];
// Onglets de statut, toujours visibles (le reste des filtres est dans la feuille)
const STATUS_TABS: { value: string; label: string }[] = [
    { value: '', label: 'Toutes' },
    { value: 'Non validée', label: 'En attente' },
    { value: 'Validée', label: 'Validées' },
    { value: 'Résolue', label: 'Résolues' },
];

const GUIDE = [
    {
        icon: 'chatbubbles-outline',
        title: 'Pose ta question',
        lines: ['Mise de 1 à 15 points pour la poser.', 'Un titre clair, ce que tu as fait, ce dont tu as besoin.'],
    },
    {
        icon: 'star',
        title: 'Gagne des points',
        lines: ['+2 points par réponse donnée.', '+1 point par like reçu.', 'Les points misés si ta réponse est validée.'],
    },
    {
        icon: 'shield-checkmark',
        title: 'Les statuts',
        lines: ['En attente : pas encore de réponse retenue.', "Validée : vérifiée par l'équipe.", "Résolue : l'auteur a choisi la meilleure réponse."],
    },
];

const CONTEXT_TYPES = [
    { value: '', label: 'Toutes' },
    { value: 'lesson', label: 'Leçons' },
    { value: 'exercise', label: 'Exercices' },
];

export default function ForumScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colors = useColors();
    const { isDark } = useThemeContext();
    
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    
    // Filtres
    const [search, setSearch] = useState('');
    const [subject, setSubject] = useState('');
    const [classLevel, setClassLevel] = useState('');
    const [status, setStatus] = useState('');
    const [contextFilter, setContextFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);

    // Recherche différée : une requête après la saisie, pas une par frappe
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
        return () => clearTimeout(t);
    }, [search]);
    // Ignore les réponses arrivées après un changement de filtre
    const requestId = useRef(0);

    const fetchQuestions = useCallback(async (p: number, reset = false) => {
        const rid = ++requestId.current;
        try {
            let url = `/forum/questions?page=${p}&limit=10&title=${encodeURIComponent(debouncedSearch)}&subject=${encodeURIComponent(subject)}&classLevel=${encodeURIComponent(classLevel)}&status=${encodeURIComponent(status)}`;
            if (contextFilter) url += `&contextType=${encodeURIComponent(contextFilter)}`;

            const data = await apiFetch(url);
            if (rid !== requestId.current) return;
            const items = data.data || [];

            if (reset) {
                setQuestions(items);
            } else {
                setQuestions(prev => [...prev, ...items]);
            }
            setTotalPages(data.pagination?.totalPages || 1);
            setHasMore(p < (data.pagination?.totalPages || 1));
        } catch (e) {
            console.error('Erreur fetch questions:', e);
        } finally {
            if (rid === requestId.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [debouncedSearch, subject, classLevel, status, contextFilter]);

    useEffect(() => {
        setLoading(true);
        setPage(1);
        fetchQuestions(1, true);
    }, [fetchQuestions]);

    // Temps réel : compteur de nouvelles questions postées pendant la consultation
    const { newCount, reset: resetNewCount } = useForumListRealtime();

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setPage(1);
        fetchQuestions(1, true);
        resetNewCount();
    }, [fetchQuestions, resetNewCount]);

    const loadMore = () => {
        if (!hasMore || loading) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchQuestions(nextPage);
    };

    const clearFilters = () => {
        setSearch('');
        setSubject('');
        setClassLevel('');
        setStatus('');
        setContextFilter('');
        setPage(1);
    };

    const activeFiltersCount = [subject, classLevel, status, contextFilter].filter(Boolean).length;
    // Filtres rangés dans la feuille (le statut a ses onglets)
    const sheetFiltersCount = [subject, classLevel, contextFilter].filter(Boolean).length;

    const renderQuestion = useCallback(({ item }: { item: Question }) => {
        const excerpt = item.description?.whatINeed || item.description?.whatIDid || '';
        return (
            <ContentCard
                title={item.title}
                subject={item.subject}
                level={item.classLevel}
                status={<QuestionStatus status={item.status} />}
                excerpt={plainExcerpt(excerpt)}
                avatar={<Avatar name={item.user?.username || '?'} userId={item.user?._id} imageUri={item.user?.image} size="xs" />}
                authorName={item.user?.username || 'Anonyme'}
                meta={timeAgoLong(item.createdAt)}
                stats={
                    <>
                        <Stat icon="star" value={`${item.points || 0} pts`} color={colors.accent2} />
                        <Stat icon="chatbubble" value={item.answerCount || 0} />
                        {item.attachments && item.attachments.length > 0 ? <Stat icon="attach" value={item.attachments.length} /> : null}
                    </>
                }
                onPress={() => router.push(`/forum/${item._id}`)}
            />
        );
    }, [colors.accent2, router]);

    type Row = { key: string; kind: 'hero' | 'bar' } | (Question & { kind: 'q'; key: string });
    const rows: Row[] = useMemo(() => [
        { key: '__hero', kind: 'hero' as const },
        { key: '__bar', kind: 'bar' as const },
        ...questions.map((q) => ({ ...q, kind: 'q' as const, key: q._id })),
    ], [questions]);

    const renderRow = useCallback(({ item }: { item: Row }) => {
        if (item.kind === 'hero') {
            return (
                <PageHeader
                    topInset={0}
                    eyebrow="Forum d'entraide"
                    title="Une question ?"
                    accent="La communauté répond"
                    subtitle="Pose ta question, aide les autres et gagne des points."
                    right={<IconButton icon="help-circle" label="Comment marche le forum ?" onPress={() => setShowInfoModal(true)} />}
                >
                    <Pressable
                        onPress={() => router.push('/suivi')}
                        style={({ pressed }) => [styles.mentorCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.8 }]}
                        accessibilityRole="button"
                    >
                        <View style={[styles.mentorIcon, { backgroundColor: colors.primary }]}>
                            <Icon name="heart-circle" size={20} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.mentorTitle, { color: colors.text }]}>Être accompagné</Text>
                            <Text style={[styles.mentorText, { color: colors.textSecondary }]} numberOfLines={1}>Un bénévole te suit, rien que pour toi.</Text>
                        </View>
                        <Icon name="arrow-forward" size={18} color={colors.text} />
                    </Pressable>
                </PageHeader>
            );
        }
        if (item.kind === 'bar') {
            return (
                <View style={[styles.bar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                    <View style={styles.searchRow}>
                        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher une question…" />
                        <FilterButton count={sheetFiltersCount} onPress={() => setShowFilters(true)} />
                    </View>
                    <ChipTabs
                        options={STATUS_TABS}
                        value={status}
                        onChange={(v) => { tapLight(); setStatus(v); }}
                        style={styles.statusTabs}
                    />
                </View>
            );
        }
        return <View style={styles.cardWrap}>{renderQuestion({ item: item as Question })}</View>;
    }, [colors, router, search, sheetFiltersCount, status, renderQuestion]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            {/* Bande sous la barre d'état : la barre de recherche collante s'y arrête */}
            <View style={{ height: insets.top, backgroundColor: colors.background }} />

            <FlatList
                data={loading && questions.length === 0 ? rows.slice(0, 2) : rows}
                keyExtractor={(item) => item.key}
                renderItem={renderRow}
                stickyHeaderIndices={[1]}
                contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.4}
                initialNumToRender={6}
                maxToRenderPerBatch={6}
                windowSize={9}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                ListFooterComponent={
                    loading && questions.length === 0 ? (
                        <SkeletonList count={3} />
                    ) : questions.length === 0 ? (
                        <EmptyState
                            icon="chatbubbles-outline"
                            title="Aucune question trouvée"
                            text={activeFiltersCount > 0 ? 'Essaie de modifier tes filtres.' : 'Sois le premier à poser une question !'}
                            actionLabel={activeFiltersCount > 0 ? 'Effacer les filtres' : undefined}
                            onAction={activeFiltersCount > 0 ? clearFilters : undefined}
                        />
                    ) : hasMore ? (
                        <ActivityIndicator style={{ padding: 20 }} color={colors.primary} />
                    ) : (
                        <Text style={[styles.endText, { color: colors.textMuted }]}>Tu as tout vu · {questions.length} questions</Text>
                    )
                }
            />

            {/* Bandeau temps réel : nouvelles questions */}
            {newCount > 0 && (
                <Pressable
                    style={[styles.newBanner, { top: insets.top + 64, backgroundColor: colors.text }]}
                    onPress={onRefresh}
                >
                    <Icon name="arrow-up" size={16} color={colors.background} />
                    <Text style={[styles.newBannerText, { color: colors.background }]}>
                        {newCount} nouvelle{newCount > 1 ? 's' : ''} question{newCount > 1 ? 's' : ''}
                    </Text>
                </Pressable>
            )}

            <Fab label="Poser" onPress={() => router.push('/forum/create')} />

            {/* Filtres : feuille du bas */}
            <BottomSheet
                visible={showFilters}
                onClose={() => setShowFilters(false)}
                title="Filtres"
                footer={
                    <>
                        <PrimaryButton label="Effacer" variant="ghost" onPress={clearFilters} />
                        <PrimaryButton label="Voir les questions" variant="ink" onPress={() => setShowFilters(false)} />
                    </>
                }
            >
                <SheetChoices label="Matière" options={SUBJECTS} value={subject} onChange={setSubject} allLabel="Toutes" />
                <SheetChoices label="Niveau" options={LEVELS} value={classLevel} onChange={setClassLevel} />
                <SheetChoices label="Type" options={CONTEXT_TYPES.filter((c) => c.value)} value={contextFilter} onChange={setContextFilter} allLabel="Toutes" />
            </BottomSheet>

            {/* Guide du forum */}
            <BottomSheet
                visible={showInfoModal}
                onClose={() => setShowInfoModal(false)}
                title="Comment ça marche ?"
                footer={<PrimaryButton label="J'ai compris !" onPress={() => setShowInfoModal(false)} />}
            >
                {GUIDE.map((g, i) => (
                    <View key={g.title} style={[styles.guideStep, { borderBottomColor: colors.divider }]}>
                        <View style={[styles.guideIcon, { backgroundColor: i === 0 ? colors.text : colors.primary }]}>
                            <Icon name={g.icon} size={18} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.guideNum, { color: colors.primary }]}>{String(i + 1).padStart(2, '0')}</Text>
                            <Text style={[styles.guideTitle, { color: colors.text }]}>{g.title}</Text>
                            {g.lines.map((l) => (
                                <Text key={l} style={[styles.guideText, { color: colors.textSecondary }]}>{l}</Text>
                            ))}
                        </View>
                    </View>
                ))}
            </BottomSheet>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    mentorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginTop: spacing.lg,
        padding: spacing.md,
        borderRadius: radius['2xl'],
        borderWidth: 1,
    },
    mentorIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    mentorTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: 15 },
    mentorText: { fontFamily: typography.fontFamily.regular, fontSize: 13, marginTop: 1 },
    bar: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
    },
    searchRow: { flexDirection: 'row', gap: 10 },
    statusTabs: { paddingTop: spacing.md },
    cardWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    endText: { textAlign: 'center', fontFamily: typography.fontFamily.mono, fontSize: 11, letterSpacing: 1, padding: spacing.xl },
    newBanner: {
        position: 'absolute',
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: radius.full,
        ...shadows.md,
    },
    newBannerText: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.sm },
    guideStep: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.lg, borderBottomWidth: 1 },
    guideIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    guideNum: { fontFamily: typography.fontFamily.mono, fontSize: 11, letterSpacing: 1 },
    guideTitle: { fontFamily: typography.fontFamily.display, fontSize: 20, marginBottom: 6 },
    guideText: { fontFamily: typography.fontFamily.regular, fontSize: 14, lineHeight: 21 },
});
