import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Icon from '../components/Icon';
import { useColors } from '../lib/useColors';
import { EmptyState, IconButton, PageHeader } from '../components/wk';
import { spacing, radius, typography } from '../lib/theme';
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    AppNotification,
    NotificationType,
} from '../lib/api';

type IconName = string;

function typeVisual(type: NotificationType, colors: ReturnType<typeof useColors>): { icon: IconName; color: string } {
    switch (type) {
        case 'forum_answer': return { icon: 'chatbubble-ellipses', color: colors.info };
        case 'fiche_comment': return { icon: 'chatbubbles', color: colors.accent };
        case 'answer_liked':
        case 'comment_liked': return { icon: 'heart', color: colors.error };
        case 'answer_validated': return { icon: 'checkmark-circle', color: colors.success };
        case 'quest_completed': return { icon: 'trophy', color: colors.warning };
        case 'evaluation_submitted':
        case 'evaluation_graded':
        case 'evaluation_timeout': return { icon: 'clipboard', color: colors.info };
        case 'mentorship_request':
        case 'mentorship_matched':
        case 'mentorship_message':
        case 'mentorship_resource':
        case 'mentorship_checkin':
        case 'mentorship_update':
        case 'mentorship_alert': return { icon: 'people', color: colors.primary };
        case 'kanban_assigned':
        case 'kanban_comment': return { icon: 'albums', color: colors.textSecondary };
        default: return { icon: 'notifications', color: colors.primary };
    }
}

function routeFor(n: AppNotification): string | null {
    const t = n.relatedEntity?.type;
    const id = n.relatedEntity?.id;
    // Notifications de jeu : pas d'entité liée, on ouvre l'écran correspondant
    if (n.type === 'quest_completed') return '/aventure/quetes';
    if (/war|clan/i.test(n.type)) return '/clan';
    if (/friend/i.test(n.type)) return '/amis';
    if (/challenge/i.test(n.type)) return '/defis';
    if (!id) return null;
    if (t === 'question') return `/forum/${id}`;
    if (t === 'fiche') return `/fiches/${id}`;
    if (t === 'mentorship') return `/suivi/${id}`;
    return null;
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} j`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [items, setItems] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unread, setUnread] = useState(0);

    const load = useCallback(async () => {
        try {
            const res = await getNotifications(1, 50);
            setItems(res.notifications || []);
            setUnread(res.unreadCount || 0);
        } catch {
            // silencieux
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    const markAll = useCallback(async () => {
        if (unread === 0) return;
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnread(0);
        try { await markAllNotificationsRead(); } catch { load(); }
    }, [unread, load]);

    const openNotification = useCallback(async (n: AppNotification) => {
        if (!n.isRead) {
            setItems((prev) => prev.map((it) => (it._id === n._id ? { ...it, isRead: true } : it)));
            setUnread((u) => Math.max(0, u - 1));
            markNotificationRead(n._id).catch(() => {});
        }
        const route = routeFor(n);
        if (route) router.push(route as any);
    }, [router]);

    const removeItem = useCallback((n: AppNotification) => {
        Alert.alert('Supprimer', 'Supprimer cette notification ?', [
            { text: 'Annuler', style: 'cancel' },
            {
                text: 'Supprimer', style: 'destructive', onPress: () => {
                    setItems((prev) => prev.filter((it) => it._id !== n._id));
                    if (!n.isRead) setUnread((u) => Math.max(0, u - 1));
                    deleteNotification(n._id).catch(() => {});
                },
            },
        ]);
    }, []);

    const renderItem = useCallback(({ item }: { item: AppNotification }) => {
        const v = typeVisual(item.type, colors);
        return (
            <TouchableOpacity
                style={[styles.row, !item.isRead && styles.rowUnread]}
                onPress={() => openNotification(item)}
                onLongPress={() => removeItem(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconWrap, { backgroundColor: v.color + '18' }]}>
                    <Icon name={v.icon} size={20} color={v.color} />
                </View>
                <View style={styles.body}>
                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
                    <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                </View>
                {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
        );
    }, [colors, styles, openNotification, removeItem]);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <PageHeader
                topInset={insets.top}
                eyebrow="Ton activité"
                title="Notifications"
                subtitle={unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''} · appui long pour supprimer` : 'Tout est lu. Appui long pour supprimer.'}
                right={
                    <>
                        {unread > 0 ? <IconButton icon="checkmark-done" label="Tout marquer comme lu" onPress={markAll} /> : null}
                        <IconButton icon="close" label="Fermer" onPress={() => router.back()} />
                    </>
                }
            />

            {loading ? (
                <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
            ) : items.length === 0 ? (
                <EmptyState icon="notifications-off" title="Aucune notification" text="Tu seras prévenu ici des réponses, commentaires et likes." />
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(n) => n._id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xl }}
                    ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

function createStyles(colors: ReturnType<typeof useColors>) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        topbar: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
            backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
        },
        topbarTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg, color: colors.text },
        markAll: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.sm, color: colors.primary },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
        emptyTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg, color: colors.text, marginTop: spacing.sm },
        emptyText: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary, textAlign: 'center' },
        row: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.md,
            backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.md,
            borderWidth: 1, borderColor: colors.border,
        },
        rowUnread: { backgroundColor: colors.primary + '0C', borderColor: colors.primary + '30' },
        iconWrap: { width: 42, height: 42, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
        body: { flex: 1, gap: 2 },
        title: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.base, color: colors.text },
        message: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary, lineHeight: typography.size.sm * 1.4 },
        time: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textMuted, marginTop: 2 },
        unreadDot: { width: 9, height: 9, borderRadius: 5 },
    });
}
