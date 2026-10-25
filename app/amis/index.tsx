import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import { ChipTabs, EmptyState, IconButton, PageHeader, SkeletonList } from '../../components/wk';
import { useToast } from '../../components/kits/Toast';
import { useColors } from '../../lib/useColors';
import { radius, spacing, typography, type ThemeColors } from '../../lib/theme';
import { confirmAction } from '../../lib/confirm';
import {
    getFriendRequests,
    getFriends,
    removeFriendship,
    respondFriendRequest,
    searchFriends,
    sendFriendRequest,
    type Friend,
    type FriendSearchResult,
} from '../../lib/friends';
import { challengeStateLabel, createChallenge, getChallenges, type ChallengeSummary } from '../../lib/challenges';

type Tab = 'friends' | 'requests' | 'add';

type RowItem =
    | { kind: 'label'; key: string; text: string }
    | { kind: 'friend'; key: string; f: Friend }
    | { kind: 'received'; key: string; f: Friend }
    | { kind: 'sent'; key: string; f: Friend }
    | { kind: 'result'; key: string; r: FriendSearchResult };

/** Mes amis — équivalent de la page /amis du site. */
export default function AmisScreen() {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);
    const { show: showToast, node: toastNode } = useToast();

    const [tab, setTab] = useState<Tab>('friends');
    const [friends, setFriends] = useState<Friend[]>([]);
    const [friendsTotal, setFriendsTotal] = useState(0);
    const [friendsPage, setFriendsPage] = useState(1);
    const [received, setReceived] = useState<Friend[]>([]);
    const [sent, setSent] = useState<Friend[]>([]);
    const [ongoing, setOngoing] = useState<ChallengeSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState<string | null>(null);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<FriendSearchResult[]>([]);
    const [searching, setSearching] = useState(false);

    const load = useCallback(async () => {
        try {
            setError('');
            const [f, r, c] = await Promise.all([
                getFriends(1),
                getFriendRequests(),
                // Les défis sont secondaires : leur échec ne bloque pas la page
                getChallenges().catch(() => [] as ChallengeSummary[]),
            ]);
            setFriends(f.friends);
            setFriendsTotal(f.total);
            setFriendsPage(1);
            setReceived(r.received);
            setSent(r.sent);
            // Seuls les défis encore jouables, comme sur le site
            setOngoing(c.filter((x) => x.status === 'pending' || x.status === 'active'));
        } catch (e: any) {
            setError(e?.message || 'Impossible de charger tes amis');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const loadMoreFriends = useCallback(async () => {
        if (tab !== 'friends' || loadingMore || loading || friends.length >= friendsTotal) return;
        setLoadingMore(true);
        try {
            const next = await getFriends(friendsPage + 1);
            setFriends((prev) => {
                const seen = new Set(prev.map((x) => x.friendshipId));
                return [...prev, ...next.friends.filter((x) => !seen.has(x.friendshipId))];
            });
            setFriendsPage(next.page);
            setFriendsTotal(next.total);
        } catch {
            /* on réessaiera au prochain défilement */
        } finally {
            setLoadingMore(false);
        }
    }, [tab, loadingMore, loading, friends.length, friendsTotal, friendsPage]);

    // Recherche différée : on n'interroge pas le serveur à chaque frappe
    const searchId = useRef(0);
    useEffect(() => {
        if (tab !== 'add') return;
        const q = query.trim();
        if (q.length < 2) {
            setResults([]);
            setSearching(false);
            return;
        }
        setSearching(true);
        const rid = ++searchId.current;
        const timer = setTimeout(async () => {
            try {
                const res = await searchFriends(q);
                if (rid === searchId.current) setResults(res);
            } catch {
                /* silencieux : la recherche est secondaire */
            } finally {
                if (rid === searchId.current) setSearching(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [query, tab]);

    const doSend = useCallback(async (username: string) => {
        setBusy(username);
        try {
            const res = await sendFriendRequest(username);
            showToast(res.message || `Demande envoyée à ${username}`);
            setResults((prev) => prev.filter((r) => r.username !== username));
            load();
        } catch (e: any) {
            showToast(e?.message || 'Erreur', 'ko');
        } finally {
            setBusy(null);
        }
    }, [load, showToast]);

    const doRespond = useCallback(async (f: Friend, accept: boolean) => {
        setBusy(f.friendshipId);
        try {
            await respondFriendRequest(f.friendshipId, accept);
            showToast(accept ? `Tu es maintenant ami avec ${f.username} !` : 'Demande refusée');
            load();
        } catch (e: any) {
            showToast(e?.message || 'Erreur', 'ko');
        } finally {
            setBusy(null);
        }
    }, [load, showToast]);

    const doRemove = useCallback(async (f: Friend, kind: 'friend' | 'sent') => {
        if (kind === 'friend') {
            const ok = await confirmAction(`Retirer ${f.username} ?`, 'Il ou elle disparaîtra de ta liste d\'amis.', 'Retirer');
            if (!ok) return;
        }
        setBusy(f.friendshipId);
        try {
            await removeFriendship(f.friendshipId);
            showToast(kind === 'friend' ? `${f.username} retiré de tes amis` : 'Demande annulée');
            load();
        } catch {
            showToast('Erreur', 'ko');
        } finally {
            setBusy(null);
        }
    }, [load, showToast]);

    const doChallenge = useCallback(async (f: Friend) => {
        setBusy(`duel-${f.userId}`);
        try {
            const res = await createChallenge(f.userId);
            if (res.ok) {
                showToast(`Défi envoyé à ${f.username} !`);
                router.push(`/defis/${res.challengeId}` as any);
            } else if (res.challengeId) {
                // Un défi est déjà en cours avec cette personne : on y emmène le joueur
                showToast(res.error || 'Défi déjà en cours', 'info');
                router.push(`/defis/${res.challengeId}` as any);
            } else {
                showToast(res.error, 'ko');
            }
        } finally {
            setBusy(null);
        }
    }, [router, showToast]);

    const openProfile = useCallback((userId: string) => router.push(`/membre/${userId}` as any), [router]);

    const data: RowItem[] = useMemo(() => {
        if (tab === 'friends') return friends.map((f) => ({ kind: 'friend', key: f.friendshipId, f }));
        if (tab === 'requests') {
            const out: RowItem[] = [];
            if (received.length) out.push({ kind: 'label', key: 'l-r', text: 'Reçues' });
            received.forEach((f) => out.push({ kind: 'received', key: f.friendshipId, f }));
            if (sent.length) out.push({ kind: 'label', key: 'l-s', text: 'Envoyées' });
            sent.forEach((f) => out.push({ kind: 'sent', key: f.friendshipId, f }));
            return out;
        }
        return results.map((r) => ({ kind: 'result', key: r.userId, r }));
    }, [tab, friends, received, sent, results]);

    const renderItem = useCallback(({ item }: { item: RowItem }) => {
        switch (item.kind) {
            case 'label':
                return <Text style={s.sectionLabel}>{item.text}</Text>;
            case 'friend': {
                const f = item.f;
                const duelBusy = busy === `duel-${f.userId}`;
                return (
                    <FriendRow user={f} onPress={() => openProfile(f.userId)} meta={`${f.points} points · Niv. ${f.heroLevel}`}>
                        <RoundAction
                            icon="swords"
                            label={`Défier ${f.username} au quiz`}
                            color={colors.error}
                            busy={duelBusy}
                            disabled={!!busy}
                            onPress={() => doChallenge(f)}
                        />
                        <RoundAction
                            icon="trash-outline"
                            label="Retirer des amis"
                            color={colors.textMuted}
                            busy={busy === f.friendshipId}
                            disabled={!!busy}
                            onPress={() => doRemove(f, 'friend')}
                        />
                    </FriendRow>
                );
            }
            case 'received': {
                const f = item.f;
                return (
                    <FriendRow user={f} onPress={() => openProfile(f.userId)} meta={`${f.points} points`}>
                        <RoundAction
                            icon="checkmark"
                            label={`Accepter ${f.username}`}
                            color="#fff"
                            bg={colors.success}
                            busy={busy === f.friendshipId}
                            disabled={!!busy}
                            onPress={() => doRespond(f, true)}
                        />
                        <RoundAction
                            icon="close"
                            label="Refuser"
                            color={colors.textMuted}
                            disabled={!!busy}
                            onPress={() => doRespond(f, false)}
                        />
                    </FriendRow>
                );
            }
            case 'sent': {
                const f = item.f;
                return (
                    <FriendRow user={f} onPress={() => openProfile(f.userId)} meta="En attente">
                        <RoundAction
                            icon="close"
                            label="Annuler la demande"
                            color={colors.textMuted}
                            busy={busy === f.friendshipId}
                            disabled={!!busy}
                            onPress={() => doRemove(f, 'sent')}
                        />
                    </FriendRow>
                );
            }
            case 'result': {
                const r = item.r;
                const isBusy = busy === r.username;
                return (
                    <FriendRow user={r} onPress={() => openProfile(r.userId)} meta={`${r.points} points`}>
                        <Pressable
                            onPress={() => doSend(r.username)}
                            disabled={!!busy}
                            accessibilityRole="button"
                            accessibilityLabel={`Ajouter ${r.username}`}
                            style={({ pressed }) => [s.addBtn, pressed && { transform: [{ translateY: 2 }] }, !!busy && !isBusy && { opacity: 0.5 }]}
                        >
                            {isBusy ? <ActivityIndicator size="small" color="#fff" /> : (
                                <>
                                    <Icon name="person-add" size={16} color="#fff" />
                                    <Text style={s.addBtnText}>Ajouter</Text>
                                </>
                            )}
                        </Pressable>
                    </FriendRow>
                );
            }
        }
    }, [busy, colors, doChallenge, doRemove, doRespond, doSend, openProfile, s]);

    const header = (
        <View style={{ gap: spacing.md }}>
            {/* Défis en cours : la porte de retour vers un défi */}
            {ongoing.length > 0 ? (
                <View style={s.duels}>
                    <View style={s.duelsHead}>
                        <Icon name="swords" size={16} color={colors.error} />
                        <Text style={s.duelsTitle}>Défis en cours</Text>
                        <Pressable onPress={() => router.push('/defis' as any)} hitSlop={10} style={s.duelsAll}>
                            <Text style={s.duelsAllText}>Tout voir</Text>
                        </Pressable>
                    </View>
                    {ongoing.map((c) => (
                        <Pressable
                            key={c.id}
                            onPress={() => router.push(`/defis/${c.id}` as any)}
                            style={({ pressed }) => [s.duelRow, pressed && { opacity: 0.7 }]}
                            accessibilityRole="button"
                        >
                            <Text style={s.duelName} numberOfLines={1}>{c.opponent?.username ?? 'Adversaire'}</Text>
                            <Text style={s.duelState}>{challengeStateLabel(c)}</Text>
                        </Pressable>
                    ))}
                </View>
            ) : null}

            {tab === 'add' ? (
                <View style={s.searchBox}>
                    <Icon name="search" size={18} color={colors.textMuted} />
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Rechercher un pseudo (2 caractères minimum)"
                        placeholderTextColor={colors.textMuted}
                        style={s.searchInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="search"
                        accessibilityLabel="Rechercher un pseudo"
                    />
                    {searching ? <ActivityIndicator size="small" color={colors.textMuted} /> : query ? (
                        <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Effacer">
                            <Icon name="close-circle" size={18} color={colors.textMuted} />
                        </Pressable>
                    ) : null}
                </View>
            ) : null}
        </View>
    );

    const empty = tab === 'friends' ? (
        <EmptyState icon="people-outline" title="Aucun ami pour l'instant" text="Utilise l'onglet « Ajouter » pour trouver tes camarades." actionLabel="Ajouter un ami" onAction={() => setTab('add')} />
    ) : tab === 'requests' ? (
        <EmptyState icon="person-add-outline" title="Aucune demande" text="Les demandes que tu reçois apparaîtront ici." />
    ) : query.trim().length >= 2 && !searching ? (
        <EmptyState icon="search" title="Aucun résultat" text="Vérifie l'orthographe du pseudo. Les personnes déjà dans tes amis n'apparaissent pas ici." />
    ) : query.trim().length < 2 ? (
        <EmptyState icon="person-add-outline" title="Trouve tes camarades" text="Tape au moins deux lettres de leur pseudo." />
    ) : null;

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <PageHeader
                topInset={insets.top}
                eyebrow="Communauté"
                title="Mes amis"
                subtitle="Ajoute tes camarades pour suivre leur progression, les défier au quiz et vous entraider."
                right={<IconButton icon="close" label="Fermer" onPress={() => router.back()} />}
            >
                <ChipTabs<Tab>
                    value={tab}
                    onChange={setTab}
                    style={{ paddingTop: spacing.md }}
                    options={[
                        { value: 'friends', label: friendsTotal ? `Mes amis · ${friendsTotal}` : 'Mes amis', icon: 'people-outline' },
                        { value: 'requests', label: received.length ? `Demandes · ${received.length}` : 'Demandes', icon: 'checkmark-done' },
                        { value: 'add', label: 'Ajouter', icon: 'person-add-outline' },
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
                    keyExtractor={(i) => i.key}
                    renderItem={renderItem}
                    ListHeaderComponent={header}
                    ListHeaderComponentStyle={{ marginBottom: spacing.xs }}
                    ListEmptyComponent={empty ?? undefined}
                    contentContainerStyle={[s.list, { paddingBottom: insets.bottom + spacing['3xl'] }]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    onEndReached={loadMoreFriends}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: spacing.lg }} color={colors.primary} /> : undefined}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
                />
            )}
            {toastNode}
        </View>
    );
}

/* ───────── Ligne membre ───────── */

const FriendRow = memo(function FriendRow({
    user, meta, onPress, children,
}: {
    user: { userId: string; username: string; avatar: string | null; isOnline?: boolean };
    meta: string;
    onPress: () => void;
    children: React.ReactNode;
}) {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    return (
        <View style={s.row}>
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [s.rowMain, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={`Profil de ${user.username}`}
            >
                <View>
                    {/* Même avatar que le site : photo, contour boutique, sinon Blobatar */}
                    <Avatar name={user.username} userId={user.userId} imageUri={user.avatar} size="md" />
                    {user.isOnline ? <View style={s.online} accessibilityLabel="En ligne" /> : null}
                </View>
                <View style={s.rowText}>
                    <Text style={s.rowName} numberOfLines={1}>{user.username}</Text>
                    <Text style={s.rowMeta} numberOfLines={1}>{meta}</Text>
                </View>
            </Pressable>
            <View style={s.rowActions}>{children}</View>
        </View>
    );
});

const RoundAction = memo(function RoundAction({
    icon, label, color, bg, busy, disabled, onPress,
}: {
    icon: string;
    label: string;
    color: string;
    bg?: string;
    busy?: boolean;
    disabled?: boolean;
    onPress: () => void;
}) {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [
                s.round,
                bg ? { backgroundColor: bg, borderColor: bg } : null,
                pressed && { opacity: 0.6 },
                disabled && !busy && { opacity: 0.45 },
            ]}
        >
            {busy ? <ActivityIndicator size="small" color={color} /> : <Icon name={icon} size={19} color={color} />}
        </Pressable>
    );
});

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        list: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },

        sectionLabel: {
            fontFamily: typography.fontFamily.heading,
            fontSize: 11,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: c.textMuted,
            paddingHorizontal: spacing.xs,
            paddingTop: spacing.sm,
        },

        row: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: c.surface,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: c.border,
            paddingVertical: spacing.sm + 2,
            paddingLeft: spacing.md,
            paddingRight: spacing.sm,
        },
        rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minWidth: 0, minHeight: 44 },
        rowText: { flex: 1, minWidth: 0 },
        rowName: { fontFamily: typography.fontFamily.display, fontSize: 17, color: c.text },
        rowMeta: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textSecondary, marginTop: 1 },
        rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
        online: {
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: '#10b981',
            borderWidth: 2,
            borderColor: c.surface,
        },

        round: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
        },

        addBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            minHeight: 44,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.full,
            backgroundColor: c.primary,
            borderBottomWidth: 3,
            borderBottomColor: c.primaryDark,
        },
        addBtnText: { fontFamily: typography.fontFamily.heading, fontSize: 13, color: '#fff' },

        searchBox: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
            minHeight: 48,
        },
        searchInput: {
            flex: 1,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.size.base,
            color: c.text,
            paddingVertical: spacing.sm,
        },

        duels: {
            backgroundColor: c.error + '0D',
            borderWidth: 1,
            borderColor: c.error + '33',
            borderRadius: radius.xl,
            padding: spacing.md,
            gap: spacing.sm,
        },
        duelsHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        duelsTitle: { flex: 1, fontFamily: typography.fontFamily.heading, fontSize: 14, color: c.text },
        duelsAll: { minHeight: 32, justifyContent: 'center' },
        duelsAllText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.accent },
        duelRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
            backgroundColor: c.surface,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            minHeight: 44,
        },
        duelName: { flex: 1, fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.text },
        duelState: { fontFamily: typography.fontFamily.medium, fontSize: 12, color: c.textSecondary },
    });
}
