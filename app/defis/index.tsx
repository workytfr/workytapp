import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import { ChipTabs, EmptyState, IconButton, PageHeader, SkeletonList, StatusPill, timeAgo } from '../../components/wk';
import { useColors } from '../../lib/useColors';
import { radius, spacing, typography, type ThemeColors } from '../../lib/theme';
import { challengeStateLabel, getChallenges, type ChallengeSummary } from '../../lib/challenges';

type Filter = 'ongoing' | 'done';

/** Score à la française (les questions peuvent valoir des demi-points). */
const pts = (n: number) => String(n).replace('.', ',');

/**
 * Mes défis — le site n'a que /defis/[id] et l'encart « Défis en cours » de
 * /amis ; l'app regroupe ici tous les défis renvoyés par GET /api/challenges
 * (30 derniers), en cours et terminés.
 */
export default function DefisScreen() {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);

    const [filter, setFilter] = useState<Filter>('ongoing');
    const [items, setItems] = useState<ChallengeSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            setError('');
            setItems(await getChallenges());
        } catch (e: any) {
            setError(e?.message || 'Impossible de charger tes défis');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Au montage et au retour d'un duel : la liste reflète le nouveau score
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const ongoing = useMemo(() => items.filter((c) => c.status === 'pending' || c.status === 'active'), [items]);
    const done = useMemo(() => items.filter((c) => c.status !== 'pending' && c.status !== 'active'), [items]);
    const data = filter === 'ongoing' ? ongoing : done;

    const wins = done.filter((c) => c.outcome === 'win').length;
    const losses = done.filter((c) => c.outcome === 'loss').length;
    const draws = done.filter((c) => c.outcome === 'draw').length;

    const renderItem = useCallback(({ item: c }: { item: ChallengeSummary }) => {
        const toPlay = (c.status === 'active' && !c.myFinished) || (c.status === 'pending' && !c.iAmChallenger);
        let pill: React.ReactNode;
        if (c.status === 'completed') {
            pill = c.outcome === 'win' ? <StatusPill label="Victoire" color={colors.success} icon="trophy" />
                : c.outcome === 'draw' ? <StatusPill label="Égalité" color={colors.warning} icon="scale" />
                    : <StatusPill label="Défaite" color={colors.textMuted} icon="close-circle" />;
        } else if (c.status === 'expired') {
            pill = <StatusPill label="Expiré" color={colors.textMuted} icon="hourglass" />;
        } else {
            pill = <StatusPill label={challengeStateLabel(c).replace(' →', '')} color={toPlay ? colors.error : colors.info} icon={toPlay ? 'flash' : 'time-outline'} />;
        }
        return (
            <Pressable
                onPress={() => router.push(`/defis/${c.id}` as any)}
                style={({ pressed }) => [s.card, toPlay && s.cardHot, pressed && { transform: [{ scale: 0.985 }] }]}
                accessibilityRole="button"
                accessibilityLabel={`Défi contre ${c.opponent?.username ?? 'adversaire'}`}
            >
                <Avatar name={c.opponent?.username ?? '?'} userId={c.opponent?._id} size="md" />
                <View style={s.cardBody}>
                    <Text style={s.cardTitle} numberOfLines={1}>{c.opponent?.username ?? 'Adversaire'}</Text>
                    <Text style={s.cardMeta} numberOfLines={1}>
                        {c.iAmChallenger ? 'Tu as lancé' : 'Tu as été défié'} · {c.total} questions{c.matiere ? ` · ${c.matiere}` : ''} · {timeAgo(c.createdAt)}
                    </Text>
                    <View style={s.cardFoot}>
                        {pill}
                        {c.status === 'completed' ? (
                            <Text style={s.score}>{pts(c.myScore)} — {c.opponentScore !== null ? pts(c.opponentScore) : '—'}</Text>
                        ) : c.myFinished ? (
                            <Text style={s.score}>{pts(c.myScore)} pt{c.myScore > 1 ? 's' : ''}</Text>
                        ) : null}
                    </View>
                </View>
                <Icon name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
        );
    }, [colors, router, s]);

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <PageHeader
                topInset={insets.top}
                eyebrow="Duels de quiz"
                title="Mes défis"
                subtitle="Défie tes amis : mêmes questions, meilleur score. À égalité, le plus rapide l'emporte."
                right={<IconButton icon="close" label="Fermer" onPress={() => router.back()} />}
            >
                <ChipTabs<Filter>
                    value={filter}
                    onChange={setFilter}
                    style={{ paddingTop: spacing.md }}
                    options={[
                        { value: 'ongoing', label: ongoing.length ? `En cours · ${ongoing.length}` : 'En cours', icon: 'swords' },
                        { value: 'done', label: 'Terminés', icon: 'trophy-outline' },
                    ]}
                />
            </PageHeader>

            {loading ? (
                <SkeletonList />
            ) : error ? (
                <EmptyState icon="cloud-offline-outline" title="Oups" text={error} actionLabel="Réessayer" onAction={() => { setLoading(true); load(); }} />
            ) : (
                <FlatList
                    data={data}
                    keyExtractor={(c) => c.id}
                    renderItem={renderItem}
                    contentContainerStyle={[s.list, { paddingBottom: insets.bottom + spacing['3xl'] }]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
                    ListHeaderComponent={filter === 'done' && done.length > 0 ? (
                        <View style={s.tally}>
                            <Tally label="Victoires" value={wins} color={colors.success} s={s} />
                            <Tally label="Égalités" value={draws} color={colors.warning} s={s} />
                            <Tally label="Défaites" value={losses} color={colors.textMuted} s={s} />
                        </View>
                    ) : undefined}
                    ListEmptyComponent={
                        filter === 'ongoing' ? (
                            <EmptyState
                                icon="swords"
                                title="Aucun défi en cours"
                                text="Défie un ami depuis ta liste d'amis : bouton épées à côté de son nom."
                                actionLabel="Mes amis"
                                onAction={() => router.push('/amis' as any)}
                            />
                        ) : (
                            <EmptyState icon="trophy-outline" title="Aucun défi terminé" text="Tes résultats de duels apparaîtront ici." />
                        )
                    }
                />
            )}
        </View>
    );
}

function Tally({ label, value, color, s }: { label: string; value: number; color: string; s: ReturnType<typeof createStyles> }) {
    return (
        <View style={s.tallyItem}>
            <Text style={[s.tallyValue, { color }]}>{value}</Text>
            <Text style={s.tallyLabel}>{label}</Text>
        </View>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        list: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
        card: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            backgroundColor: c.surface,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: c.border,
            padding: spacing.md,
        },
        cardHot: { borderColor: c.error + '55' },
        cardBody: { flex: 1, minWidth: 0 },
        cardTitle: { fontFamily: typography.fontFamily.display, fontSize: 17, color: c.text },
        cardMeta: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textSecondary, marginTop: 2 },
        cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, gap: spacing.sm },
        score: { fontFamily: typography.fontFamily.display, fontSize: 16, color: c.text },
        tally: {
            flexDirection: 'row',
            backgroundColor: c.surface,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: c.border,
            paddingVertical: spacing.md,
            marginBottom: spacing.xs,
        },
        tallyItem: { flex: 1, alignItems: 'center' },
        tallyValue: { fontFamily: typography.fontFamily.display, fontSize: 26 },
        tallyLabel: { fontFamily: typography.fontFamily.semiBold, fontSize: 11, color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
    });
}
