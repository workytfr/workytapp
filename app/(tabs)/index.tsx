import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import { useAuth } from '../../lib/auth';
import { useColors } from '../../lib/useColors';
import { spacing, radius, typography, type ThemeColors } from '../../lib/theme';
import { getBadgeConfig, useBadgeCatalog } from '../../lib/badges';
import RemoteImage from '../../components/RemoteImage';
import { calculateUserRank, getRankProgress } from '../../lib/ranks';
import { getLiveStatus, type LiveStatus } from '../../lib/api';
import { getWarStatus, type WarStatus } from '../../lib/clan';
import { WarStrip } from '../../components/clan';
import Avatar from '../../components/Avatar';
import NotificationBell from '../../components/NotificationBell';
import HexagonBadge from '../../components/HexagonBadge';
import { Eyebrow, IconButton, XpBar } from '../../components/wk';
import PaperDots from '../../components/PaperDots';
import { getCourseProgress, type CourseProgress } from '../../lib/api';
import { getRecentCourse, type RecentCourse } from '../../lib/recent';
import { getStreak, getDailyQuiz, getQuests, isUnavailable, type Quest, type DailyQuiz } from '../../lib/gamification';
import { tapLight } from '../../lib/haptics';
import { refreshReminders } from '../../lib/notifications';
import { openLink } from '../../lib/links';

type IconName = string;

interface Shortcut { icon: IconName; label: string; hint: string; route: string; tint: string }

export default function HomeScreen() {
    const { user, stats, refreshProfile } = useAuth();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);
    useBadgeCatalog();

    const [live, setLive] = useState<LiveStatus | null>(null);
    const [war, setWar] = useState<WarStatus | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    // Boucle du jour (série, combat, quêtes) — null tant que non chargée
    const [streakDays, setStreakDays] = useState<number | null>(null);
    const [quiz, setQuiz] = useState<DailyQuiz | null>(null);
    const [quests, setQuests] = useState<Quest[] | null>(null);
    const [adventureOff, setAdventureOff] = useState(false);
    const [recent, setRecent] = useState<RecentCourse | null>(null);
    const [recentProgress, setRecentProgress] = useState<CourseProgress | null>(null);

    const loadDaily = useCallback(() => {
        getStreak().then((st) => { setStreakDays(st.currentStreak); setAdventureOff(false); })
            .catch((e) => { if (isUnavailable(e)) setAdventureOff(true); });
        getDailyQuiz().then((q) => {
            setQuiz(q);
            // Rappel du soir sauté si le combat du jour est déjà gagné
            refreshReminders(q.available && q.solved).catch(() => {});
        }).catch(() => { refreshReminders(false).catch(() => {}); });
        getQuests('daily').then(setQuests).catch(() => {});
        getRecentCourse().then((rc) => {
            setRecent(rc);
            if (rc) getCourseProgress(rc.id).then(setRecentProgress).catch(() => {});
        });
    }, []);

    useEffect(() => {
        getLiveStatus().then(setLive).catch(() => {});
    }, []);

    // Guerre des clans : rafraîchie à chaque retour sur l'accueil (route légère)
    useFocusEffect(useCallback(() => {
        getWarStatus().then(setWar).catch(() => {});
        loadDaily();
    }, [loadDaily]));

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try { await refreshProfile(); } catch {}
        getWarStatus().then(setWar).catch(() => {});
        loadDaily();
        setRefreshing(false);
    }, [refreshProfile]);

    const shortcuts: Shortcut[] = useMemo(() => [
        { icon: 'swords', label: 'Aventure', hint: 'Combat du jour', route: '/aventure', tint: colors.primary },
        { icon: 'shield', label: 'Clan', hint: 'La guerre', route: '/clan', tint: colors.accent4 },
        { icon: 'flag', label: 'Défis', hint: 'Entre amis', route: '/defis', tint: colors.accent2 },
        { icon: 'people', label: 'Amis', hint: 'Ta bande', route: '/amis', tint: colors.accent3 },
        { icon: 'calculator', label: 'Kits', hint: 'Pomodoro, moyenne', route: '/kits', tint: colors.accent4 },
        { icon: 'heart-circle', label: 'Suivi', hint: 'Un bénévole', route: '/suivi', tint: colors.primary },
        { icon: 'trophy', label: 'Concours', hint: 'Gagner des lots', route: '/recompenses', tint: colors.accent2 },
        { icon: 'bookmark', label: 'Favoris', hint: 'Tes sauvegardes', route: '/favoris', tint: colors.accent3 },
        { icon: 'search', label: 'Recherche', hint: 'Tout Workyt', route: '/recherche', tint: colors.accent4 },
    ], [colors]);

    if (!user) return null;

    const rank = calculateUserRank(user.points);
    const progress = getRankProgress(user.points);
    const pct = Math.round(progress.progress);
    const selectedBadge = user.selectedBadge ? getBadgeConfig(user.selectedBadge) : null;
    const firstName = user.name?.split(' ')[0] || user.username;
    const isNewcomer = user.points < 150;
    const quizDone = !!(quiz && quiz.available && quiz.solved);
    const questsDone = !!(quests && quests.length > 0 && quests.every((q) => q.status !== 'in_progress'));
    const todayDone = [quizDone, false, questsDone].filter(Boolean).length;

    return (
        <View style={s.container}>
            <ScrollView
                contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing['3xl'] }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                {/* En-tête papier */}
                <View style={s.header}>
                    <View style={s.flex}>
                        <Eyebrow>{todayLabel()}</Eyebrow>
                        <Text style={s.hello}>
                            Salut, {firstName}<Text style={s.dot}>.</Text>
                        </Text>
                    </View>
                    <View style={s.headerActions}>
                        {streakDays != null ? (
                            <Pressable style={s.streakPill} onPress={() => router.push('/aventure/serie')} accessibilityLabel={`Série de ${streakDays} jours`}>
                                <Text style={s.streakEmoji}>🔥</Text>
                                <Text style={s.streakText}>{streakDays}</Text>
                            </Pressable>
                        ) : null}
                        <NotificationBell color={colors.text} round />
                        <Pressable onPress={() => router.push('/(tabs)/profile')} accessibilityLabel="Mon profil">
                            <Avatar name={user.username} userId={user.id} imageUri={user.image} size="md" />
                        </Pressable>
                    </View>
                </View>

                {/* Barre de recherche factice : ouvre l'écran de recherche */}
                <Pressable style={s.searchBar} onPress={() => router.push('/recherche')}>
                    <Icon name="search" size={18} color={colors.textMuted} />
                    <Text style={s.searchPlaceholder}>Une notion, un chapitre, une question…</Text>
                </Pressable>

                {/* Aujourd'hui : la boucle quotidienne */}
                <View style={s.today}>
                    <PaperDots />
                    <View style={s.todayHead}>
                        <Text style={s.todayTitle}>Aujourd'hui<Text style={s.dot}>.</Text></Text>
                        <Text style={s.todayCount}>{todayDone}/3</Text>
                    </View>
                    {adventureOff ? (
                        <TodayRow s={s} colors={colors} icon="sparkles" title="L'aventure arrive dans l'app" hint="Combat, calendrier et quêtes : bientôt ici." onPress={() => router.push('/aventure')} />
                    ) : (
                        <>
                            <TodayRow
                                s={s} colors={colors} icon="swords" done={quizDone}
                                title={quizDone ? 'Monstre vaincu' : 'Combat du jour'}
                                hint={quiz && !quiz.available ? 'Pas de quiz aujourd’hui' : quizDone ? 'Bravo, reviens demain !' : 'Une question, quatre réponses'}
                                onPress={() => router.push('/aventure/quiz')}
                            />
                            <TodayRow
                                s={s} colors={colors} icon="gift" done={false}
                                title="Récompense du jour" hint={quizDone ? 'Débloquée : récupère-la' : 'Se débloque après le combat'}
                                onPress={() => router.push('/aventure/calendrier')}
                            />
                            <TodayRow
                                s={s} colors={colors} icon="target" done={questsDone}
                                title="Quêtes du jour"
                                hint={quests ? `${quests.filter((q) => q.status !== 'in_progress').length}/${quests.length} terminées` : 'Missions quotidiennes'}
                                onPress={() => router.push('/aventure/quetes')}
                            />
                        </>
                    )}
                </View>

                {/* Reprendre le dernier cours ouvert */}
                {recent ? (
                    <Pressable
                        style={({ pressed }) => [s.resume, pressed && s.tilePressed]}
                        onPress={() => router.push(`/cours/${recent.id}`)}
                    >
                        <View style={s.resumeIcon}><Icon name="play" size={18} color="#fff" /></View>
                        <View style={s.flex}>
                            <Text style={s.resumeKicker}>Reprendre</Text>
                            <Text style={s.resumeTitle} numberOfLines={1}>{recent.title}</Text>
                            {recentProgress ? (
                                <View style={s.resumeBar}><XpBar percent={recentProgress.percentage} /></View>
                            ) : null}
                        </View>
                        {recentProgress ? <Text style={s.resumePct}>{recentProgress.percentage}%</Text> : null}
                    </Pressable>
                ) : null}

                {war ? <WarStrip status={war} onPress={() => router.push('/clan')} /> : null}

                {live && live.status !== 'none' ? <LiveBanner live={live} s={s} colors={colors} /> : null}

                {/* Carte XP */}
                <View style={s.xpCard}>
                    <View style={s.xpTop}>
                        <View style={[s.rankIcon, { backgroundColor: rank.color + '22' }]}>
                            <Text style={s.rankEmoji}>{rank.badge}</Text>
                        </View>
                        <View style={s.flex}>
                            <Text style={s.rankName}>{rank.name}</Text>
                            <Text style={s.rankWorld} numberOfLines={1}>{rank.world}</Text>
                        </View>
                        <View style={s.points}>
                            <Image source={require('../../assets/points.png')} style={s.pointsIcon} />
                            <Text style={s.pointsValue}>{user.points}</Text>
                        </View>
                    </View>
                    <XpBar percent={pct} />
                    <View style={s.xpBottom}>
                        <Text style={s.xpText}>
                            {progress.pointsNeeded > 0 ? `${progress.pointsNeeded} pts avant le niveau suivant` : 'Niveau maximum atteint !'}
                        </Text>
                        <Text style={s.xpPct}>{pct} %</Text>
                    </View>
                    {selectedBadge ? (
                        <View style={s.selectedBadge}>
                            {selectedBadge.icon ? (
                                <RemoteImage uri={selectedBadge.icon} width={18} height={18} fallback={<Icon name="ribbon" size={14} color={colors.accent} />} />
                            ) : (
                                <Icon name="ribbon" size={14} color={colors.accent} />
                            )}
                            <Text style={s.selectedBadgeText}>{selectedBadge.name}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Raccourcis */}
                <Eyebrow style={s.sectionEyebrow}>Accès rapide</Eyebrow>
                <View style={s.grid}>
                    {shortcuts.map((sc) => (
                        <ShortcutTile key={sc.label} sc={sc} s={s} onPress={() => router.push(sc.route as any)} />
                    ))}
                </View>

                {/* CTA principal */}
                <Pressable
                    style={({ pressed }) => [s.cta, pressed && s.ctaPressed]}
                    onPress={() => router.push('/forum/create')}
                >
                    <View style={s.flex}>
                        <Text style={s.ctaTitle}>{isNewcomer ? 'Pose ta 1re question' : 'Bloqué sur un exo ?'}</Text>
                        <Text style={s.ctaText}>La communauté te répond, et tu gagnes des points.</Text>
                    </View>
                    <View style={s.ctaIcon}><Icon name="arrow-forward" size={20} color={colors.primary} /></View>
                </Pressable>

                {/* Activité */}
                <Eyebrow style={s.sectionEyebrow}>Ton activité</Eyebrow>
                <View style={s.statsRow}>
                    <StatBox value={stats?.questions ?? 0} label="Questions" s={s} />
                    <StatBox value={stats?.answers ?? 0} label="Réponses" s={s} />
                    <StatBox value={stats?.revisions ?? 0} label="Fiches" s={s} />
                </View>

                {/* Badges */}
                {user.badges.length > 0 ? (
                    <>
                        <View style={s.sectionRow}>
                            <Eyebrow>Derniers badges</Eyebrow>
                            <Pressable onPress={() => router.push('/(tabs)/profile')} hitSlop={8}>
                                <Text style={s.seeAll}>Voir tout</Text>
                            </Pressable>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.badges}>
                            {user.badges.slice(-6).reverse().map((slug) => (
                                <HexagonBadge key={slug} slug={slug} size="md" showName isSelected={user.selectedBadge === slug} />
                            ))}
                        </ScrollView>
                    </>
                ) : null}

            </ScrollView>
        </View>
    );
}

type Styles = ReturnType<typeof createStyles>;

const ShortcutTile = memo(function ShortcutTile({ sc, s, onPress }: { sc: Shortcut; s: Styles; onPress: () => void }) {
    return (
        <Pressable style={({ pressed }) => [s.tile, pressed && s.tilePressed]} onPress={onPress} accessibilityLabel={sc.label}>
            <View style={[s.tileIcon, { backgroundColor: sc.tint + '33' }]}>
                <Icon name={sc.icon} size={20} color={s.tileLabel.color as string} />
            </View>
            <Text style={s.tileLabel}>{sc.label}</Text>
            <Text style={s.tileHint}>{sc.hint}</Text>
        </Pressable>
    );
});

function TodayRow({ s, colors, icon, title, hint, done, onPress }: {
    s: Styles; colors: ThemeColors; icon: IconName; title: string; hint: string; done?: boolean; onPress: () => void;
}) {
    return (
        <Pressable
            style={({ pressed }) => [s.todayRow, pressed && { opacity: 0.7 }]}
            onPress={() => { tapLight(); onPress(); }}
            accessibilityRole="button"
            accessibilityLabel={title}
        >
            <View style={[s.todayIcon, done && { backgroundColor: colors.success }]}>
                <Icon name={done ? 'checkmark' : icon} size={18} color={done ? '#fff' : colors.primary} />
            </View>
            <View style={s.flex}>
                <Text style={[s.todayRowTitle, done && { color: colors.textSecondary }]}>{title}</Text>
                <Text style={s.todayRowHint} numberOfLines={1}>{hint}</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
    );
}

/** « Vendredi 24 octobre » */
function todayLabel(): string {
    const t = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
}

function StatBox({ value, label, s }: { value: number; label: string; s: Styles }) {
    return (
        <View style={s.statBox}>
            <Text style={s.statValue}>{value}</Text>
            <Text style={s.statLabel}>{label}</Text>
        </View>
    );
}

function LiveBanner({ live, s, colors }: { live: LiveStatus; s: Styles; colors: ThemeColors }) {
    const isLive = live.status === 'live';
    const url = live.platforms?.[0]?.url ?? (live.videoId ? `https://www.youtube.com/watch?v=${live.videoId}` : null);
    const when = live.scheduledAt
        ? new Date(live.scheduledAt).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
        : null;
    return (
        <Pressable style={s.live} onPress={() => url && openLink(url)} disabled={!url}>
            {live.thumbnail ? <Image source={{ uri: live.thumbnail }} style={s.liveThumb} /> : null}
            <View style={s.flex}>
                <View style={[s.liveTag, { backgroundColor: isLive ? colors.error : colors.ink }]}>
                    <View style={s.liveDot} />
                    <Text style={s.liveTagText}>{isLive ? 'EN DIRECT' : 'PROCHAIN LIVE'}</Text>
                </View>
                <Text style={s.liveTitle} numberOfLines={2}>{live.title ?? 'Live Workyt'}</Text>
                {!isLive && when ? <Text style={s.liveWhen}>{when}</Text> : null}
            </View>
            {url ? <Icon name="play-circle" size={30} color={colors.primary} /> : null}
        </Pressable>
    );
}

function createStyles(c: ThemeColors) {
    const card = { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border } as const;
    return StyleSheet.create({
        flex: { flex: 1, minWidth: 0 },
        container: { flex: 1, backgroundColor: c.background },

        header: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, paddingHorizontal: spacing.lg },
        headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: 2 },
        hello: { fontFamily: typography.fontFamily.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.5, color: c.text, marginTop: spacing.sm },
        dot: { color: c.primary },

        searchBar: {
            ...card,
            flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
            marginHorizontal: spacing.lg, marginTop: spacing.lg,
            paddingHorizontal: spacing.lg, height: 48, borderRadius: radius.full,
        },
        searchPlaceholder: { fontFamily: typography.fontFamily.regular, fontSize: 14, color: c.textMuted },

        live: {
            ...card,
            flexDirection: 'row', alignItems: 'center', gap: spacing.md,
            marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.xl,
        },
        liveThumb: { width: 88, height: 50, borderRadius: radius.sm, backgroundColor: c.surfaceVariant },
        liveTag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full },
        liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
        liveTagText: { fontFamily: typography.fontFamily.heading, fontSize: 9.5, letterSpacing: 1, color: '#fff' },
        liveTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, lineHeight: 17, color: c.text, marginTop: 4 },
        liveWhen: { fontFamily: typography.fontFamily.regular, fontSize: 11.5, color: c.textMuted, marginTop: 2 },

        xpCard: { ...card, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.lg, borderRadius: radius['2xl'], gap: spacing.md },
        xpTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        rankIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
        rankEmoji: { fontSize: 24 },
        rankName: { fontFamily: typography.fontFamily.display, fontSize: 20, color: c.text },
        rankWorld: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: c.textSecondary, marginTop: 1 },
        points: {
            flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: c.accent2 + '40', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full,
        },
        pointsIcon: { width: 16, height: 16 },
        pointsValue: { fontFamily: typography.fontFamily.display, fontSize: 15, color: c.text },
        xpBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -spacing.xs },
        xpText: { fontFamily: typography.fontFamily.regular, fontSize: 12.5, color: c.textSecondary },
        xpPct: { fontFamily: typography.fontFamily.heading, fontSize: 12.5, color: c.accent },
        selectedBadge: {
            flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
            paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: c.surfaceVariant,
        },
        selectedBadgeIcon: { width: 16, height: 16 },
        selectedBadgeText: { fontFamily: typography.fontFamily.semiBold, fontSize: 12, color: c.text },

        sectionEyebrow: { paddingHorizontal: spacing.lg, marginTop: spacing['2xl'], marginBottom: spacing.md },
        sectionRow: {
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingHorizontal: spacing.lg, marginTop: spacing['2xl'], marginBottom: spacing.md,
        },
        seeAll: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.accent },

        grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.sm },
        tile: { ...card, width: '31.5%', flexGrow: 1, padding: spacing.md, borderRadius: radius.xl, gap: 2 },
        tilePressed: { transform: [{ scale: 0.97 }], backgroundColor: c.surfaceVariant },
        tileIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
        tileLabel: { fontFamily: typography.fontFamily.heading, fontSize: 14, color: c.text },
        tileHint: { fontFamily: typography.fontFamily.regular, fontSize: 11.5, color: c.textMuted },

        cta: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.md,
            marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.lg,
            borderRadius: radius['2xl'], backgroundColor: c.primary,
            borderBottomWidth: 5, borderBottomColor: c.primaryDark,
        },
        ctaPressed: { transform: [{ translateY: 3 }], borderBottomWidth: 2 },
        ctaTitle: { fontFamily: typography.fontFamily.display, fontSize: 19, color: '#fff' },
        ctaText: { fontFamily: typography.fontFamily.regular, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.92)', marginTop: 2 },
        ctaIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

        statsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
        statBox: { ...card, flex: 1, alignItems: 'center', paddingVertical: spacing.lg, borderRadius: radius.xl },
        statValue: { fontFamily: typography.fontFamily.display, fontSize: 24, color: c.text },
        statLabel: { fontFamily: typography.fontFamily.medium, fontSize: 12, color: c.textSecondary, marginTop: 2 },

        badges: { paddingHorizontal: spacing.lg, gap: spacing.md },

        streakPill: {
            flexDirection: 'row', alignItems: 'center', gap: 3, height: 42, paddingHorizontal: 12,
            borderRadius: radius.full, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
        },
        streakEmoji: { fontSize: 16 },
        streakText: { fontFamily: typography.fontFamily.displayBold, fontSize: 16, color: c.text },

        today: {
            ...card, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.lg,
            borderRadius: 24, overflow: 'hidden', gap: spacing.xs,
        },
        todayHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.xs },
        todayTitle: { fontFamily: typography.fontFamily.display, fontSize: 26, letterSpacing: -0.4, color: c.text },
        todayCount: { fontFamily: typography.fontFamily.mono, fontSize: 12, color: c.textMuted },
        todayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10, minHeight: 56 },
        todayIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary + '1A' },
        todayRowTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: c.text },
        todayRowHint: { fontFamily: typography.fontFamily.regular, fontSize: 12.5, color: c.textMuted, marginTop: 1 },

        resume: {
            ...card, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
            marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: radius['2xl'],
        },
        resumeIcon: {
            width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
            backgroundColor: c.primary, borderBottomWidth: 3, borderBottomColor: c.primaryDark,
        },
        resumeKicker: { fontFamily: typography.fontFamily.mono, fontSize: 10.5, letterSpacing: 1.5, textTransform: 'uppercase', color: c.accent },
        resumeTitle: { fontFamily: typography.fontFamily.display, fontSize: 17, color: c.text, marginTop: 1 },
        resumeBar: { marginTop: 6 },
        resumePct: { fontFamily: typography.fontFamily.displayBold, fontSize: 15, color: c.accent },

    });
}
