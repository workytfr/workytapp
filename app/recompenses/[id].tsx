import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import { useColors } from '../../lib/useColors';
import { spacing, radius, typography, type ThemeColors } from '../../lib/theme';
import { getReward, getRewardLeaderboard, type Reward, type RewardLeaderboard } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { METHOD_META, formatRange } from '../../lib/rewards';
import Avatar from '../../components/Avatar';
import { EmptyState, Eyebrow, SkeletonList } from '../../components/wk';

const PODIUM = ['#F5B301', '#A8A29E', '#C2773A'];

/** Détail d'un concours + classement (top 10 et mon rang). */
export default function RewardDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();
    const s = useMemo(() => createStyles(colors), [colors]);

    const [reward, setReward] = useState<Reward | null>(null);
    const [board, setBoard] = useState<RewardLeaderboard | null>(null);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (force = false) => {
        try {
            setError('');
            // Les deux appels partent en parallèle
            const [r, b] = await Promise.all([getReward(String(id)), getRewardLeaderboard(String(id), force)]);
            setReward(r);
            setBoard(b);
        } catch (e: any) {
            setError(e.message || 'Concours introuvable.');
        } finally {
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const meta = reward ? METHOD_META[reward.method] ?? METHOD_META.highestPoints : null;
    const unit = reward?.method === 'highestPoints' ? 'pts' : 'fiches';
    const now = Date.now();
    const phase = reward
        ? now < new Date(reward.startDate).getTime() ? 'À venir' : now > new Date(reward.endDate).getTime() ? 'Terminé' : 'En cours'
        : '';

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[s.topbar, { paddingTop: insets.top + spacing.sm }]}>
                <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Retour">
                    <Icon name="arrow-back" size={22} color={colors.text} />
                </Pressable>
                <Text style={s.topbarTitle}>Concours</Text>
                <View style={{ width: 22 }} />
            </View>

            {!reward && !error ? (
                <SkeletonList count={3} />
            ) : error ? (
                <EmptyState icon="trophy-outline" title="Oups" text={error} actionLabel="Réessayer" onAction={() => load(true)} />
            ) : reward && meta ? (
                <ScrollView
                    contentContainerStyle={{ paddingBottom: insets.bottom + spacing['3xl'] }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} />}
                >
                    {reward.imageUrl ? <Image source={{ uri: reward.imageUrl }} style={s.image} resizeMode="cover" /> : null}

                    <View style={s.head}>
                        <Eyebrow>{`${phase} · ${formatRange(reward.startDate, reward.endDate)}`}</Eyebrow>
                        <Text style={s.title}>{reward.title}</Text>
                        {reward.description ? <Text style={s.desc}>{reward.description}</Text> : null}

                        <View style={s.infoRow}>
                            <View style={s.info}>
                                <Icon name="gift" size={18} color={colors.primary} />
                                <View style={s.flex}>
                                    <Text style={s.infoLabel}>À gagner</Text>
                                    <Text style={s.infoValue}>{reward.prize}</Text>
                                </View>
                            </View>
                            <View style={s.info}>
                                <Icon name={meta.icon} size={18} color={colors.primary} />
                                <View style={s.flex}>
                                    <Text style={s.infoLabel}>Comment gagner</Text>
                                    <Text style={s.infoValue}>{meta.hint}{reward.category ? ` (${reward.category})` : ''}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Mon rang */}
                    {board?.me ? (
                        <View style={s.me}>
                            <Text style={s.meRank}>#{board.me.rank}</Text>
                            <View style={s.flex}>
                                <Text style={s.meTitle}>Ton classement</Text>
                                <Text style={s.meSub}>{board.me.total} {unit} sur la période</Text>
                            </View>
                            <Icon name="trending-up" size={22} color="#fff" />
                        </View>
                    ) : null}

                    {/* Top 10 */}
                    <View style={s.section}>
                        <Eyebrow style={{ marginBottom: spacing.md }}>Classement · top 10</Eyebrow>
                        {!board || board.top10.length === 0 ? (
                            <EmptyState icon="podium-outline" title="Personne pour l'instant" text="Sois le premier à marquer des points !" />
                        ) : (
                            <View style={s.board}>
                                {board.top10.map((row, i) => {
                                    const isMe = user?.id === String(row.userId);
                                    return (
                                        <Pressable
                                            key={String(row.userId)}
                                            onPress={() => router.push(`/membre/${row.userId}`)}
                                            style={[s.row, i > 0 && s.rowBorder, isMe && s.rowMe]}
                                        >
                                            <View style={[s.pos, i < 3 && { backgroundColor: PODIUM[i] }]}>
                                                <Text style={[s.posText, i < 3 && { color: '#fff' }]}>{i + 1}</Text>
                                            </View>
                                            <Avatar name={row.username} userId={String(row.userId)} size="sm" />
                                            <Text style={s.username} numberOfLines={1}>{row.username}{isMe ? ' (toi)' : ''}</Text>
                                            <Text style={s.score}>{row.total} <Text style={s.unit}>{unit}</Text></Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </ScrollView>
            ) : null}
        </View>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        flex: { flex: 1, minWidth: 0 },
        container: { flex: 1, backgroundColor: c.background },
        topbar: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.border,
        },
        topbarTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg, color: c.text },
        image: { width: '100%', height: 190, backgroundColor: c.surfaceVariant },
        head: { padding: spacing.lg, gap: spacing.sm },
        title: { fontFamily: typography.fontFamily.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.4, color: c.text, marginTop: spacing.xs },
        desc: { fontFamily: typography.fontFamily.regular, fontSize: 15, lineHeight: 22, color: c.textSecondary },
        infoRow: { gap: spacing.sm, marginTop: spacing.md },
        info: {
            flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md,
            backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border,
        },
        infoLabel: { fontFamily: typography.fontFamily.semiBold, fontSize: 11, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
        infoValue: { fontFamily: typography.fontFamily.medium, fontSize: 14, lineHeight: 20, color: c.text, marginTop: 2 },
        me: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.md,
            marginHorizontal: spacing.lg, padding: spacing.lg, borderRadius: radius.xl,
            backgroundColor: c.primary, borderBottomWidth: 4, borderBottomColor: c.primaryDark,
        },
        meRank: { fontFamily: typography.fontFamily.display, fontSize: 30, color: '#fff' },
        meTitle: { fontFamily: typography.fontFamily.heading, fontSize: 15, color: '#fff' },
        meSub: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
        section: { padding: spacing.lg, marginTop: spacing.sm },
        board: { backgroundColor: c.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
        row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
        rowBorder: { borderTopWidth: 1, borderTopColor: c.divider },
        rowMe: { backgroundColor: c.accentLight + '66' },
        pos: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceVariant },
        posText: { fontFamily: typography.fontFamily.heading, fontSize: 13, color: c.textSecondary },
        username: { flex: 1, fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.text },
        score: { fontFamily: typography.fontFamily.display, fontSize: 16, color: c.text },
        unit: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textMuted },
    });
}
