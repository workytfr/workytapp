import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import { useColors } from '../../lib/useColors';
import { spacing, radius, typography, type ThemeColors } from '../../lib/theme';
import { getPublicProfile, type PublicProfile } from '../../lib/api';
import { calculateUserRank, getRankProgress } from '../../lib/ranks';
import Avatar from '../../components/Avatar';
import HexagonBadge from '../../components/HexagonBadge';
import { ChipTabs, ContentCard, EmptyState, Eyebrow, SkeletonList, FicheStatus, QuestionStatus, Stat, XpBar, timeAgo, htmlToText } from '../../components/wk';

type Tab = 'fiches' | 'questions' | 'reponses';

/** Profil public d'un membre — équivalent de /compte/[id] sur le site. */
export default function MemberScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);

    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [error, setError] = useState('');
    const [tab, setTab] = useState<Tab>('fiches');
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            setError('');
            setProfile(await getPublicProfile(String(id), 15));
        } catch (e: any) {
            setError(e.message || 'Profil introuvable.');
        } finally {
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const user = profile?.user;
    const rank = user ? calculateUserRank(user.points || 0) : null;
    const progress = user ? getRankProgress(user.points || 0) : null;

    const counts = profile?.pagination;

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[s.topbar, { paddingTop: insets.top + spacing.sm }]}>
                <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Retour">
                    <Icon name="arrow-back" size={22} color={colors.text} />
                </Pressable>
                <Text style={s.topbarTitle} numberOfLines={1}>{user?.username ?? 'Profil'}</Text>
                <View style={{ width: 22 }} />
            </View>

            {!profile && !error ? (
                <SkeletonList count={3} />
            ) : error ? (
                <EmptyState icon="person-outline" title="Profil indisponible" text={error} actionLabel="Réessayer" onAction={load} />
            ) : user && rank && progress ? (
                <ScrollView
                    contentContainerStyle={{ paddingBottom: insets.bottom + spacing['3xl'] }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
                >
                    {/* Identité */}
                    <View style={s.hero}>
                        <Avatar name={user.username} userId={user._id} size="xl" />
                        <Text style={s.name}>{user.username}</Text>
                        {user.role && user.role !== 'Apprenti' ? <Text style={s.role}>{user.role}</Text> : null}
                        <View style={s.rankPill}>
                            <Text style={s.rankEmoji}>{rank.badge}</Text>
                            <Text style={s.rankText}>{rank.name} · {rank.world}</Text>
                        </View>
                        {user.bio ? <Text style={s.bio}>{user.bio}</Text> : null}
                        <Text style={s.since}>Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</Text>
                    </View>

                    {/* Chiffres clés */}
                    <View style={s.statsRow}>
                        <StatBox value={user.points || 0} label="Points" s={s} />
                        <StatBox value={counts?.totalRevisions ?? 0} label="Fiches" s={s} />
                        <StatBox value={counts?.totalQuestions ?? 0} label="Questions" s={s} />
                        <StatBox value={counts?.totalAnswers ?? 0} label="Réponses" s={s} />
                    </View>

                    <View style={s.block}>
                        <View style={s.rowBetween}>
                            <Text style={s.blockTitle}>Niveau {rank.level}</Text>
                            <Text style={s.blockMeta}>{Math.round(progress.progress)} %</Text>
                        </View>
                        <XpBar percent={progress.progress} color={rank.color} />
                    </View>

                    {user.badges && user.badges.length > 0 ? (
                        <View style={s.section}>
                            <Eyebrow style={s.sectionEyebrow}>{`Badges · ${user.badges.length}`}</Eyebrow>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.badges}>
                                {user.badges.map((slug) => <HexagonBadge key={slug} slug={slug} size="md" showName />)}
                            </ScrollView>
                        </View>
                    ) : null}

                    {/* Contributions */}
                    <View style={s.section}>
                        <ChipTabs<Tab>
                            value={tab}
                            onChange={setTab}
                            style={{ paddingHorizontal: spacing.lg }}
                            options={[
                                { value: 'fiches', label: 'Fiches', icon: 'document-text-outline' },
                                { value: 'questions', label: 'Questions', icon: 'help-circle-outline' },
                                { value: 'reponses', label: 'Réponses', icon: 'chatbubble-outline' },
                            ]}
                        />
                        <View style={s.list}>
                            {tab === 'fiches' && (profile.revisions.length === 0
                                ? <EmptyState icon="document-text-outline" title="Aucune fiche" />
                                : profile.revisions.map((r) => (
                                    <ContentCard
                                        key={r._id}
                                        title={r.title}
                                        subject={r.subject}
                                        level={r.level}
                                        meta={timeAgo(r.createdAt)}
                                        status={<FicheStatus status={r.status} />}
                                        stats={<><Stat icon="flame" value={r.likes ?? 0} color={colors.primary} /><Stat icon="chatbubble" value={r.comments ?? 0} /></>}
                                        onPress={() => router.push(`/fiches/${r._id}`)}
                                    />
                                )))}
                            {tab === 'questions' && (profile.questions.length === 0
                                ? <EmptyState icon="help-circle-outline" title="Aucune question" />
                                : profile.questions.map((q) => (
                                    <ContentCard
                                        key={q._id}
                                        title={q.title}
                                        subject={q.subject}
                                        level={q.classLevel}
                                        meta={timeAgo(q.createdAt)}
                                        status={<QuestionStatus status={q.status} />}
                                        stats={<Stat icon="chatbubble" value={q.answersCount ?? 0} />}
                                        onPress={() => router.push(`/forum/${q._id}`)}
                                    />
                                )))}
                            {tab === 'reponses' && (profile.answers.length === 0
                                ? <EmptyState icon="chatbubble-outline" title="Aucune réponse" />
                                : profile.answers.map((a) => (
                                    <ContentCard
                                        key={a._id}
                                        kindLabel="Réponse"
                                        title={a.question?.title ?? 'Question supprimée'}
                                        excerpt={htmlToText(a.content).slice(0, 220)}
                                        meta={timeAgo(a.createdAt)}
                                        stats={<Stat icon="heart" value={a.likes ?? 0} />}
                                        onPress={() => a.question?._id && router.push(`/forum/${a.question._id}`)}
                                    />
                                )))}
                        </View>
                    </View>
                </ScrollView>
            ) : null}
        </View>
    );
}

function StatBox({ value, label, s }: { value: number; label: string; s: ReturnType<typeof createStyles> }) {
    return (
        <View style={s.statBox}>
            <Text style={s.statValue}>{value}</Text>
            <Text style={s.statLabel}>{label}</Text>
        </View>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        topbar: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
            borderBottomWidth: 1, borderBottomColor: c.border,
        },
        topbarTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg, color: c.text, flex: 1, textAlign: 'center' },
        hero: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing['2xl'], gap: spacing.xs },
        name: { fontFamily: typography.fontFamily.display, fontSize: 30, color: c.text, marginTop: spacing.md, letterSpacing: -0.4 },
        role: { fontFamily: typography.fontFamily.semiBold, fontSize: 12, color: c.accent, textTransform: 'uppercase', letterSpacing: 1.2 },
        rankPill: {
            flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm,
            paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full,
            backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
        },
        rankEmoji: { fontSize: 14 },
        rankText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.text },
        bio: { fontFamily: typography.fontFamily.regular, fontSize: 14, lineHeight: 20, color: c.textSecondary, textAlign: 'center', marginTop: spacing.sm },
        since: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: spacing.xs },
        statsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.xl },
        statBox: {
            flex: 1, alignItems: 'center', paddingVertical: spacing.md,
            backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border,
        },
        statValue: { fontFamily: typography.fontFamily.display, fontSize: 20, color: c.text },
        statLabel: { fontFamily: typography.fontFamily.medium, fontSize: 11, color: c.textSecondary, marginTop: 2 },
        block: {
            marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.lg, gap: spacing.sm,
            backgroundColor: c.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: c.border,
        },
        rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        blockTitle: { fontFamily: typography.fontFamily.heading, fontSize: 15, color: c.text },
        blockMeta: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.textSecondary },
        section: { marginTop: spacing.xl },
        sectionEyebrow: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
        badges: { paddingHorizontal: spacing.lg, gap: spacing.md },
        list: { padding: spacing.lg, gap: spacing.md },
    });
}
