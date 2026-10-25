import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import { useColors } from '../../lib/useColors';
import { spacing, radius, typography, type ThemeColors } from '../../lib/theme';
import { getRewards, type Reward, type RewardStatus } from '../../lib/api';
import { ChipTabs, EmptyState, IconButton, PageHeader, SkeletonList } from '../../components/wk';
import { METHOD_META, formatRange } from '../../lib/rewards';

/** Jours restants (en cours) ou avant le début (à venir) */
function countdown(r: Reward, status: RewardStatus): string | null {
    const now = Date.now();
    if (status === 'active') {
        const d = Math.ceil((new Date(r.endDate).getTime() - now) / 86_400_000);
        return d <= 1 ? 'Dernier jour' : `Encore ${d} j`;
    }
    if (status === 'upcoming') {
        const d = Math.ceil((new Date(r.startDate).getTime() - now) / 86_400_000);
        return d <= 1 ? 'Demain' : `Dans ${d} j`;
    }
    return null;
}

/** Concours & récompenses — équivalent de /recompenses sur le site. */
export default function RewardsScreen() {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);

    const [status, setStatus] = useState<RewardStatus>('active');
    const [rewards, setRewards] = useState<Reward[] | null>(null);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const requestId = useRef(0);

    const load = useCallback(async (st: RewardStatus, force = false) => {
        const rid = ++requestId.current;
        try {
            setError('');
            const data = await getRewards(st, force);
            if (rid === requestId.current) setRewards(Array.isArray(data) ? data : []);
        } catch (e: any) {
            if (rid === requestId.current) setError(e.message || 'Impossible de charger les concours.');
        } finally {
            if (rid === requestId.current) setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        setRewards(null);
        load(status);
    }, [status, load]);

    const renderItem = useCallback(({ item }: { item: Reward }) => {
        const meta = METHOD_META[item.method] ?? METHOD_META.highestPoints;
        const cd = countdown(item, status);
        return (
            <Pressable
                style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.985 }] }]}
                onPress={() => router.push(`/recompenses/${item._id}`)}
            >
                {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={s.image} resizeMode="cover" />
                ) : (
                    <View style={[s.image, s.imageFallback]}>
                        <Icon name="trophy" size={44} color={colors.primary} />
                    </View>
                )}
                <View style={s.body}>
                    <View style={s.headRow}>
                        <View style={s.method}>
                            <Icon name={meta.icon} size={12} color={colors.accent} />
                            <Text style={s.methodText}>{meta.label}{item.category ? ` · ${item.category}` : ''}</Text>
                        </View>
                        {cd ? <Text style={s.countdown}>{cd}</Text> : null}
                    </View>
                    <Text style={s.title} numberOfLines={2}>{item.title}</Text>
                    {item.description ? <Text style={s.desc} numberOfLines={2}>{item.description}</Text> : null}
                    <View style={s.footer}>
                        <View style={s.prize}>
                            <Icon name="gift" size={15} color={colors.primary} />
                            <Text style={s.prizeText} numberOfLines={1}>{item.prize}</Text>
                        </View>
                        <Text style={s.dates}>{formatRange(item.startDate, item.endDate)}</Text>
                    </View>
                </View>
            </Pressable>
        );
    }, [s, colors, router, status]);

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <PageHeader
                topInset={insets.top}
                eyebrow="Concours"
                title="Récompenses"
                subtitle="Participe aux défis de la communauté et gagne des lots."
                right={<IconButton icon="close" label="Fermer" onPress={() => router.back()} />}
            >
                <ChipTabs<RewardStatus>
                    value={status}
                    onChange={setStatus}
                    style={{ paddingTop: spacing.md }}
                    options={[
                        { value: 'active', label: 'En cours', icon: 'flame-outline' },
                        { value: 'upcoming', label: 'À venir', icon: 'calendar-outline' },
                        { value: 'ended', label: 'Terminés', icon: 'checkmark-done-outline' },
                    ]}
                />
            </PageHeader>

            {rewards === null && !error ? (
                <SkeletonList count={3} />
            ) : error ? (
                <EmptyState icon="cloud-offline-outline" title="Oups" text={error} actionLabel="Réessayer" onAction={() => load(status, true)} />
            ) : (
                <FlatList
                    data={rewards ?? []}
                    keyExtractor={(r) => r._id}
                    renderItem={renderItem}
                    contentContainerStyle={[s.list, { paddingBottom: insets.bottom + spacing['3xl'] }]}
                    initialNumToRender={4}
                    windowSize={5}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(status, true); }} tintColor={colors.primary} />}
                    ListEmptyComponent={
                        <EmptyState
                            icon="trophy-outline"
                            title={status === 'active' ? 'Aucun concours en cours' : status === 'upcoming' ? 'Rien de prévu pour le moment' : 'Aucun concours terminé'}
                            text="Reviens bientôt : de nouveaux défis arrivent régulièrement."
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
        list: { padding: spacing.lg, gap: spacing.lg },
        card: { backgroundColor: c.surface, borderRadius: radius['2xl'], borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
        image: { width: '100%', height: 150, backgroundColor: c.surfaceVariant },
        imageFallback: { alignItems: 'center', justifyContent: 'center' },
        body: { padding: spacing.lg, gap: spacing.sm },
        headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
        method: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
        methodText: { fontFamily: typography.fontFamily.heading, fontSize: 10.5, letterSpacing: 1.1, textTransform: 'uppercase', color: c.accent, flexShrink: 1 },
        countdown: {
            fontFamily: typography.fontFamily.semiBold, fontSize: 11, color: c.text,
            backgroundColor: c.accent2 + '55', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, overflow: 'hidden',
        },
        title: { fontFamily: typography.fontFamily.display, fontSize: 21, lineHeight: 25, color: c.text },
        desc: { fontFamily: typography.fontFamily.regular, fontSize: 14, lineHeight: 20, color: c.textSecondary },
        footer: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm,
            marginTop: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.divider,
        },
        prize: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
        prizeText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.text, flexShrink: 1 },
        dates: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textMuted },
    });
}
