import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Modal,
    ActivityIndicator,
    Alert,
    Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { useColors } from '../../lib/useColors';
import { spacing, radius, shadows, typography } from '../../lib/theme';
import { useThemeContext } from '../../lib/themeContext';
import { getBadgeConfig, getRarityColor } from '../../lib/badges';
import { calculateUserRank, getNextRank, getRankProgress, getPrestigeInfo } from '../../lib/ranks';
import { selectBadge } from '../../lib/api';
import Avatar from '../../components/Avatar';
import HexagonBadge, { BadgeListItem } from '../../components/HexagonBadge';
import { StatCard, ModernCard } from '../../components/ModernCard';
import PaperDots from '../../components/PaperDots';
import { ChipTabs, Eyebrow } from '../../components/wk';
import { getReminderSettings, setReminder, type ReminderSettings } from '../../lib/notifications';
import { getPushPrefs, setPushPrefs, type PushPrefs } from '../../lib/push';
import { refreshComeback } from '../../lib/comeback';

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

const RARITY_ORDER = ['legendaire', 'epique', 'rare', 'commun'] as const;

export default function ProfileScreen() {
    const { user, stats, isLoading, signOut, refreshProfile } = useAuth();
    const router = useRouter();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const { isDark, toggleTheme } = useThemeContext();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'badges' | 'stats' | 'details'>('badges');
    const [pickerOpen, setPickerOpen] = useState(false);
    const [savingBadge, setSavingBadge] = useState(false);
    const [reminder, setReminderState] = useState<ReminderSettings | null>(null);
    useEffect(() => { getReminderSettings().then(setReminderState); }, []);
    const [pushPrefs, setPushPrefsState] = useState<PushPrefs | null>(null);
    useEffect(() => { getPushPrefs().then(setPushPrefsState); }, []);
    const togglePref = useCallback(async (key: keyof PushPrefs) => {
        if (!pushPrefs) return;
        const next = await setPushPrefs({ ...pushPrefs, [key]: !pushPrefs[key] });
        setPushPrefsState(next);
        if (key === 'cours') refreshComeback();
    }, [pushPrefs]);
    const updateReminder = useCallback(async (next: ReminderSettings) => {
        const applied = await setReminder(next);
        setReminderState(applied);
        if (next.enabled && !applied.enabled) {
            Alert.alert('Notifications désactivées', "Autorise les notifications de Workyt dans les réglages du téléphone pour recevoir le rappel.");
        }
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshProfile();
        setRefreshing(false);
    }, [refreshProfile]);

    const chooseBadge = useCallback(async (slug: string | null) => {
        setSavingBadge(true);
        try {
            await selectBadge(slug);
            await refreshProfile();
            setPickerOpen(false);
        } catch (e: any) {
            Alert.alert('Oups', e.message || "Impossible de changer le badge.");
        } finally {
            setSavingBadge(false);
        }
    }, [refreshProfile]);

    if (!user) {
        return (
            <View style={[styles.container, styles.centerFill, { paddingTop: insets.top }]}>
                {isLoading ? (
                    <ActivityIndicator color={colors.primary} size="large" />
                ) : (
                    <>
                        <Icon name="person-circle-outline" size={56} color={colors.textMuted} />
                        <Text style={styles.centerText}>Connecte-toi pour voir ton profil.</Text>
                    </>
                )}
            </View>
        );
    }

    const currentLevel = calculateUserRank(user.points);
    const nextLevel = getNextRank(user.points);
    const rankProgress = getRankProgress(user.points);
    const progressPercent = Math.round(rankProgress.progress);
    const pointsRemaining = rankProgress.pointsNeeded;
    const prestige = getPrestigeInfo(user.points);

    const badgesByRarity: Record<string, number> = { commun: 0, rare: 0, epique: 0, legendaire: 0 };
    user.badges.forEach((slug) => {
        const config = getBadgeConfig(slug);
        if (config) badgesByRarity[config.rarity] = (badgesByRarity[config.rarity] || 0) + 1;
    });

    const selectedBadgeConfig = user.selectedBadge ? getBadgeConfig(user.selectedBadge) : null;

    return (
        <View style={styles.container}>

            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: insets.bottom + spacing['3xl'] }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <PaperDots />
                <View style={styles.headerTop}>
                    <Eyebrow>Mon profil</Eyebrow>
                    <Pressable onPress={() => router.push(`/membre/${user.id}`)} style={styles.publicBtn} accessibilityLabel="Voir mon profil public">
                        <Icon name="eye" size={16} color={colors.text} />
                        <Text style={styles.publicBtnText}>Public</Text>
                    </Pressable>
                </View>
                <View style={styles.avatarSection}>
                    <View style={styles.avatarWrapper}>
                        <Avatar name={user.username} userId={user.id} imageUri={user.image} size="xl" showBorder borderColor={colors.surface} />
                        {user.verified && (
                            <View style={styles.verifiedBadge}>
                                <Icon name="checkmark-circle" size={22} color={colors.info} />
                            </View>
                        )}
                    </View>

                    <Text style={styles.username}>{user.username}<Text style={{ color: colors.primary }}>.</Text></Text>
                    {user.name && user.name !== user.username && <Text style={styles.name}>{user.name}</Text>}

                    <View style={styles.levelBadge}>
                        <Text style={styles.levelBadgeEmoji}>{currentLevel.badge}</Text>
                        <Text style={styles.levelBadgeText}>{currentLevel.name}</Text>
                    </View>
                    <Text style={styles.worldName}>{currentLevel.world}</Text>
                    {prestige.level > 0 && (
                        <View style={styles.prestigePill}>
                            <Text style={styles.prestigeText}>Prestige {prestige.displayLevel}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.headerStats}>
                    <View style={styles.headerStat}>
                        <Text style={styles.headerStatValue}>{user.points}</Text>
                        <Text style={styles.headerStatLabel}>Points</Text>
                    </View>
                    <View style={styles.headerStatDivider} />
                    <View style={styles.headerStat}>
                        <Text style={styles.headerStatValue}>{user.badges.length}</Text>
                        <Text style={styles.headerStatLabel}>Badges</Text>
                    </View>
                    <View style={styles.headerStatDivider} />
                    <View style={styles.headerStat}>
                        <Text style={styles.headerStatValue}>{currentLevel.name}</Text>
                        <Text style={styles.headerStatLabel}>Niveau</Text>
                    </View>
                </View>
                </View>
                <View style={styles.tabs}>
                    <ChipTabs
                        value={activeTab}
                        onChange={setActiveTab}
                        options={[
                            { value: 'badges', label: 'Badges', icon: 'ribbon' },
                            { value: 'stats', label: 'Statistiques', icon: 'bar-chart' },
                            { value: 'details', label: 'Mon espace', icon: 'person' },
                        ]}
                    />
                </View>

                {activeTab === 'badges' && (
                    <View style={styles.section}>
                        {/* Badge affiché — personnalisation */}
                        <ModernCard style={styles.displayCard}>
                            <View style={styles.displayRow}>
                                {selectedBadgeConfig ? (
                                    <HexagonBadge slug={user.selectedBadge!} size="md" />
                                ) : (
                                    <View style={styles.noBadge}>
                                        <Icon name="ribbon-outline" size={28} color={colors.textMuted} />
                                    </View>
                                )}
                                <View style={styles.flex}>
                                    <Text style={styles.displayTitle}>Badge affiché</Text>
                                    <Text style={styles.displaySub}>
                                        {selectedBadgeConfig ? selectedBadgeConfig.name : 'Aucun badge sélectionné'}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.changeBtn}
                                    onPress={() => setPickerOpen(true)}
                                    disabled={user.badges.length === 0}
                                >
                                    <Text style={styles.changeBtnText}>Changer</Text>
                                </TouchableOpacity>
                            </View>
                        </ModernCard>

                        {/* Légende raretés */}
                        <View style={styles.rarityLegend}>
                            {RARITY_ORDER.map((rarity) => {
                                const rc = getRarityColor(rarity);
                                return (
                                    <View key={rarity} style={styles.rarityLegendItem}>
                                        <View style={[styles.rarityDot, { backgroundColor: rc.dot }]} />
                                        <Text style={[styles.rarityLabel, { color: rc.text }]}>{rc.label}</Text>
                                        <Text style={styles.rarityCount}>{badgesByRarity[rarity] || 0}</Text>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Grille de badges (tap = définir comme affiché) */}
                        {user.badges.length > 0 ? (
                            <View style={styles.badgesGrid}>
                                {user.badges.map((slug) => (
                                    <HexagonBadge
                                        key={slug}
                                        slug={slug}
                                        size="md"
                                        showName
                                        isSelected={user.selectedBadge === slug}
                                        onPress={() => chooseBadge(slug === user.selectedBadge ? null : slug)}
                                    />
                                ))}
                            </View>
                        ) : (
                            <ModernCard style={styles.emptyCard}>
                                <Icon name="trophy-outline" size={48} color={colors.textMuted} />
                                <Text style={styles.emptyTitle}>Aucun badge encore</Text>
                                <Text style={styles.emptyText}>
                                    Participe au forum, termine des cours et réussis des quiz pour débloquer des badges !
                                </Text>
                            </ModernCard>
                        )}
                    </View>
                )}

                {activeTab === 'stats' && stats && (
                    <View style={styles.section}>
                        <ModernCard style={styles.block}>
                            <View style={styles.levelHeader}>
                                <View style={[styles.levelIconLarge, { backgroundColor: currentLevel.color + '22' }]}>
                                    <Text style={styles.levelIconEmoji}>{currentLevel.badge}</Text>
                                </View>
                                <View style={styles.flex}>
                                    <Text style={styles.levelTitle}>Niveau actuel</Text>
                                    <Text style={[styles.levelName, { color: currentLevel.color }]}>{currentLevel.name}</Text>
                                    <Text style={styles.levelWorld}>{currentLevel.world}</Text>
                                </View>
                            </View>
                            <View style={styles.progressTrack}>
                                <LinearGradient
                                    colors={currentLevel.gradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.progressFill, { width: `${progressPercent}%` }]}
                                />
                            </View>
                            <View style={styles.progressMeta}>
                                <Text style={[styles.progressPct, { color: currentLevel.color }]}>{progressPercent}%</Text>
                                {nextLevel && (
                                    <Text style={styles.progressRemaining}>{pointsRemaining} pts avant {nextLevel.name}</Text>
                                )}
                            </View>
                        </ModernCard>

                        <Text style={styles.sectionTitle}>Activité</Text>
                        <View style={styles.statsRow}>
                            <StatCard icon="help-circle" value={stats.questions} label="Questions" color={colors.info} />
                            <StatCard icon="chatbubble" value={stats.answers} label="Réponses" color={colors.success} />
                            <StatCard icon="document-text" value={stats.revisions} label="Fiches" color={colors.accent} />
                        </View>
                    </View>
                )}

                {activeTab === 'details' && (
                    <View style={styles.section}>
                        <ModernCard style={[styles.block, { paddingVertical: spacing.xs }]}>
                            {([
                                { icon: 'swords', label: 'Mon aventure', route: '/aventure' },
                                { icon: 'backpack', label: 'Inventaire & gemmes', route: '/inventaire' },
                                { icon: 'people-outline', label: 'Mes amis', route: '/amis' },
                                { icon: 'flag-outline', label: 'Mes défis', route: '/defis' },
                                { icon: 'shield-outline', label: 'Guerre des clans', route: '/clan' },
                                { icon: 'heart-circle', label: 'Mon suivi personnalisé', route: '/suivi' },
                                { icon: 'calculator', label: "Kits de l'élève", route: '/kits' },
                                { icon: 'bookmark-outline', label: 'Mes favoris', route: '/favoris' },
                                { icon: 'trophy-outline', label: 'Concours & récompenses', route: '/recompenses' },
                                { icon: 'notifications-outline', label: 'Notifications', route: '/notifications' },
                                { icon: 'person-circle-outline', label: 'Voir mon profil public', route: `/membre/${user.id}` },
                            ] as const).map((item, i, arr) => (
                                <TouchableOpacity
                                    key={item.label}
                                    style={[styles.menuRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}
                                    onPress={() => router.push(item.route as any)}
                                    activeOpacity={0.7}
                                >
                                    <Icon name={item.icon} size={20} color={colors.accent} />
                                    <Text style={styles.menuLabel}>{item.label}</Text>
                                    <Icon name="chevron-forward" size={18} color={colors.textMuted} />
                                </TouchableOpacity>
                            ))}
                        </ModernCard>

                        {reminder ? (
                            <ModernCard style={styles.block}>
                                <TouchableOpacity style={styles.themeRow} onPress={() => updateReminder({ ...reminder, enabled: !reminder.enabled })} activeOpacity={0.7}>
                                    <View style={styles.themeInfo}>
                                        <Icon name="notifications" size={24} color={colors.primary} />
                                        <View>
                                            <Text style={styles.themeTitle}>Rappel quotidien</Text>
                                            <Text style={styles.themeSub}>{reminder.enabled ? `Chaque jour à ${reminder.hour} h, sauf si ta journée est faite` : 'Pour ne jamais perdre ta série'}</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.toggle, { backgroundColor: reminder.enabled ? colors.primary : colors.border }]}>
                                        <View style={[styles.toggleKnob, { transform: [{ translateX: reminder.enabled ? 24 : 0 }] }]} />
                                    </View>
                                </TouchableOpacity>
                                {reminder.enabled ? (
                                    <View style={styles.hours}>
                                        {[17, 18, 19, 20, 21].map((h) => (
                                            <Pressable
                                                key={h}
                                                onPress={() => updateReminder({ ...reminder, hour: h, minute: 0 })}
                                                style={[styles.hour, reminder.hour === h && styles.hourActive]}
                                            >
                                                <Text style={[styles.hourText, reminder.hour === h && styles.hourTextActive]}>{h} h</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                ) : null}
                            </ModernCard>
                        ) : null}

                        {pushPrefs ? (
                            <ModernCard style={styles.block}>
                                <Text style={styles.prefsHead}>Relances de Foxy</Text>
                                <Text style={styles.themeSub}>Chaque type a son propre son, pour savoir de quoi il s'agit sans regarder.</Text>
                                {([
                                    { key: 'quiz', icon: 'sword', title: 'Quiz du jour', sub: 'Son d’épée · à 18 h, puis dernière chance à 20 h 30' },
                                    { key: 'clan', icon: 'shield', title: 'Clan', sub: 'Cor du capitaine · tambour des soldats' },
                                    { key: 'relance', icon: 'sparkles', title: '« Ça fait longtemps ! »', sub: 'Cri de Foxy · après 2, 5 et 10 jours d’absence' },
                                    { key: 'cours', icon: 'book-text', title: 'Reprendre mon cours', sub: 'Page qui tourne · si tu n’as rien ouvert depuis 3 jours' },
                                ] as const).map((row) => (
                                    <TouchableOpacity key={row.key} style={[styles.themeRow, styles.prefRow]} onPress={() => togglePref(row.key)} activeOpacity={0.7}>
                                        <View style={[styles.themeInfo, { flex: 1 }]}>
                                            <Icon name={row.icon} size={22} color={colors.primary} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.themeTitle}>{row.title}</Text>
                                                <Text style={styles.themeSub}>{row.sub}</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.toggle, { backgroundColor: pushPrefs[row.key] ? colors.primary : colors.border }]}>
                                            <View style={[styles.toggleKnob, { transform: [{ translateX: pushPrefs[row.key] ? 24 : 0 }] }]} />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ModernCard>
                        ) : null}

                        <ModernCard style={styles.block}>
                            <TouchableOpacity style={styles.themeRow} onPress={toggleTheme} activeOpacity={0.7}>
                                <View style={styles.themeInfo}>
                                    <Icon name={isDark ? 'moon' : 'sunny'} size={24} color={colors.primary} />
                                    <View>
                                        <Text style={styles.themeTitle}>Mode {isDark ? 'sombre' : 'clair'}</Text>
                                        <Text style={styles.themeSub}>Appuie pour changer</Text>
                                    </View>
                                </View>
                                <View style={[styles.toggle, { backgroundColor: isDark ? colors.primary : colors.border }]}>
                                    <View style={[styles.toggleKnob, { transform: [{ translateX: isDark ? 24 : 0 }] }]} />
                                </View>
                            </TouchableOpacity>
                        </ModernCard>

                        <ModernCard style={styles.block}>
                            <Text style={styles.detailsTitle}>Informations</Text>
                            {user.bio ? (
                                <View style={styles.detailRow}>
                                    <Icon name="information-circle-outline" size={20} color={colors.textSecondary} />
                                    <View style={styles.flex}>
                                        <Text style={styles.detailLabel}>Bio</Text>
                                        <Text style={styles.detailValue}>{user.bio}</Text>
                                    </View>
                                </View>
                            ) : null}
                            <View style={styles.detailRow}>
                                <Icon name="mail-outline" size={20} color={colors.textSecondary} />
                                <View style={styles.flex}>
                                    <Text style={styles.detailLabel}>Email</Text>
                                    <Text style={styles.detailValue}>{user.email}</Text>
                                </View>
                            </View>
                            <View style={[styles.detailRow, styles.detailRowLast]}>
                                <Icon name="calendar-outline" size={20} color={colors.textSecondary} />
                                <View style={styles.flex}>
                                    <Text style={styles.detailLabel}>Membre depuis</Text>
                                    <Text style={styles.detailValue}>{formatDate(user.createdAt)}</Text>
                                </View>
                            </View>
                        </ModernCard>

                        <TouchableOpacity style={styles.logoutBtn} onPress={signOut} activeOpacity={0.85}>
                            <Icon name="log-out-outline" size={20} color="#fff" />
                            <Text style={styles.logoutText}>Se déconnecter</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteLink} onPress={() => router.push('/supprimer-compte')} hitSlop={8}>
                            <Text style={styles.deleteLinkText}>Supprimer mon compte</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Modal sélecteur de badge */}
            <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => !savingBadge && setPickerOpen(false)}>
                    <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Choisir mon badge</Text>
                        <Text style={styles.modalSub}>Il s'affichera sur ton profil. Change quand tu veux.</Text>

                        <ScrollView style={styles.modalList} contentContainerStyle={{ gap: spacing.sm, paddingBottom: insets.bottom + spacing.lg }}>
                            <TouchableOpacity
                                style={[styles.noneRow, !user.selectedBadge && styles.noneRowActive]}
                                onPress={() => chooseBadge(null)}
                                disabled={savingBadge}
                            >
                                <View style={styles.noneIcon}>
                                    <Icon name="close-circle-outline" size={24} color={colors.textMuted} />
                                </View>
                                <Text style={styles.noneText}>Aucun badge</Text>
                                {!user.selectedBadge && <Icon name="checkmark-circle" size={20} color={colors.primary} />}
                            </TouchableOpacity>

                            {user.badges.map((slug) => (
                                <BadgeListItem
                                    key={slug}
                                    slug={slug}
                                    isSelected={user.selectedBadge === slug}
                                    onPress={() => chooseBadge(slug)}
                                />
                            ))}
                        </ScrollView>

                        {savingBadge && (
                            <View style={styles.savingOverlay}>
                                <ActivityIndicator color={colors.primary} />
                            </View>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

function createStyles(colors: ReturnType<typeof useColors>) {
    return StyleSheet.create({
        hours: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
        hour: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
        hourActive: { backgroundColor: colors.text, borderColor: colors.text },
        hourText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: colors.textSecondary },
        hourTextActive: { color: colors.background },
        menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
        menuLabel: { flex: 1, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.base, color: colors.text },
        flex: { flex: 1 },
        container: { flex: 1, backgroundColor: colors.background },
        centerFill: { justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
        centerText: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: colors.textSecondary, textAlign: 'center' },
        header: {
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.xl,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            overflow: 'hidden',
        },
        headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
        publicBtn: {
            flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12,
            borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
        },
        publicBtnText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: colors.text },
        avatarSection: { alignItems: 'center', marginBottom: spacing.lg },
        avatarWrapper: { position: 'relative', marginBottom: spacing.md },
        verifiedBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: colors.surface, borderRadius: radius.full, padding: 2 },
        username: { fontFamily: typography.fontFamily.display, fontSize: 34, letterSpacing: -0.6, color: colors.text, marginBottom: 2 },
        name: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: colors.textSecondary, marginBottom: spacing.sm },
        levelBadge: {
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
            borderRadius: radius.full, marginBottom: spacing.xs,
        },
        levelBadgeText: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.sm, color: colors.text },
        levelBadgeEmoji: { fontSize: 14 },
        worldName: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary },
        prestigePill: {
            marginTop: spacing.xs, backgroundColor: colors.text,
            paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.full,
        },
        prestigeText: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.xs, color: colors.background },
        headerStats: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xl },
        headerStat: { alignItems: 'center' },
        headerStatValue: { fontFamily: typography.fontFamily.displayBold, fontSize: typography.size.xl, color: colors.text },
        headerStatLabel: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textMuted, marginTop: 2 },
        headerStatDivider: { width: 1, height: 28, backgroundColor: colors.border },

        content: { flex: 1 },
        tabs: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
        tab: { alignItems: 'center', paddingVertical: spacing.xs },
        tabText: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.base, color: colors.textMuted },
        tabTextActive: { color: colors.primary },
        tabIndicator: { width: 22, height: 3, backgroundColor: colors.primary, borderRadius: radius.full, marginTop: 6 },

        section: { paddingHorizontal: spacing.lg },
        block: { marginBottom: spacing.lg },

        displayCard: { marginBottom: spacing.lg },
        displayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        noBadge: {
            width: 72, height: 72, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border,
            borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceVariant,
        },
        displayTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.base, color: colors.text },
        displaySub: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 },
        changeBtn: { backgroundColor: colors.primary + '15', borderWidth: 1.5, borderColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
        changeBtnText: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.sm, color: colors.primary },

        rarityLegend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' },
        rarityLegendItem: {
            flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface,
            paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
        },
        rarityDot: { width: 6, height: 6, borderRadius: 3 },
        rarityLabel: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.xs },
        rarityCount: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.xs, color: colors.textMuted },
        badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' },

        emptyCard: { alignItems: 'center', paddingVertical: spacing['3xl'] },
        emptyTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg, color: colors.text, marginTop: spacing.md },
        emptyText: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },

        levelHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
        levelIconLarge: { width: 58, height: 58, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center' },
        levelIconEmoji: { fontSize: 30 },
        levelTitle: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary },
        levelName: { fontFamily: typography.fontFamily.display, fontSize: typography.size.xl },
        levelWorld: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 },
        progressTrack: { height: 10, backgroundColor: colors.surfaceVariant, borderRadius: radius.full, overflow: 'hidden' },
        progressFill: { height: '100%', borderRadius: radius.full },
        progressMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
        progressPct: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.sm },
        progressRemaining: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textMuted },

        sectionTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg, color: colors.text, marginBottom: spacing.md },
        statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },

        themeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        themeInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        themeTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.base, color: colors.text },
        themeSub: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 1 },
        toggle: { width: 52, height: 28, borderRadius: 14, padding: 2 },
        toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', ...shadows.sm },
        prefsHead: { fontFamily: typography.fontFamily.display, fontSize: 22, color: colors.text },
        prefRow: { gap: spacing.md, paddingTop: spacing.md, marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },

        detailsTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg, color: colors.text, marginBottom: spacing.sm },
        detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
        detailRowLast: { borderBottomWidth: 0 },
        detailLabel: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.xs, color: colors.textMuted, marginBottom: 2 },
        detailValue: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: colors.text },
        logoutBtn: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
            backgroundColor: colors.error, marginTop: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.lg, ...shadows.sm,
        },
        logoutText: { fontFamily: typography.fontFamily.heading, color: '#fff', fontSize: typography.size.base },
        deleteLink: { alignSelf: 'center', marginTop: spacing.lg, padding: spacing.sm },
        deleteLinkText: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm, color: colors.textMuted, textDecorationLine: 'underline' },

        modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
        modalSheet: { backgroundColor: colors.background, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], paddingHorizontal: spacing.lg, paddingTop: spacing.sm, maxHeight: '80%' },
        modalHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.md },
        modalTitle: { fontFamily: typography.fontFamily.display, fontSize: typography.size['2xl'], color: colors.text },
        modalSub: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.md },
        modalList: { flexGrow: 0 },
        noneRow: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
            backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
        },
        noneRowActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
        noneIcon: { width: 48, height: 48, borderRadius: radius.lg, backgroundColor: colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
        noneText: { flex: 1, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.base, color: colors.text },
        savingOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
    });
}
