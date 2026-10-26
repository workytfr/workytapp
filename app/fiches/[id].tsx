import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Image,
    FlatList,
    Modal,
    Share,
    useWindowDimensions,
    type NativeScrollEvent,
    type ScrollViewInstance,
    type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import { useColors } from '../../lib/useColors';
import { spacing, radius, typography, type ThemeColors } from '../../lib/theme';
import { getFiche, getFicheLikeStatus, getFiches, likeFiche, type FicheListItem } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import RichMarkdown from '../../components/RichMarkdown';
import PdfViewer from '../../components/PdfViewer';
import FicheComments from '../../components/FicheComments';
import BookmarkButton from '../../components/BookmarkButton';
import { Eyebrow, FicheStatus, LevelChip, SubjectLabel, timeAgo } from '../../components/wk';
import { FicheCover, FicheGridCard, subjectPalette } from '../../components/FicheCover';
import { calculateUserRank } from '../../lib/ranks';
import { getSiteOrigin } from '../../lib/siteOrigin';
import { success, tapLight } from '../../lib/haptics';

const isPdf = (url: string) => /\.pdf(\?|$)/i.test(url);

/**
 * Fiche de révision, façon Knowunity : la fiche d'abord (pages à faire
 * défiler, plein écran au toucher), puis l'auteur, le contenu, les fiches
 * de la même matière et les commentaires. Les actions (j'aime, commenter,
 * enregistrer, partager) restent sous le pouce, dans une barre collée en bas.
 */
export default function FicheDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const s = useMemo(() => createStyles(colors), [colors]);
    const { isAuthenticated } = useAuth();

    const [fiche, setFiche] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [likes, setLikes] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    const [liking, setLiking] = useState(false);
    const [page, setPage] = useState(0);
    const [zoom, setZoom] = useState<string | null>(null);
    const [similar, setSimilar] = useState<FicheListItem[]>([]);

    const scrollRef = useRef<ScrollViewInstance | null>(null);
    const commentsY = useRef(0);
    const revisionId = fiche?._id || id;

    useEffect(() => {
        (async () => {
            try {
                const res = await getFiche(id);
                setFiche(res.data);
                setLikes(res.data?.likes ?? 0);
            } catch (e: any) {
                setError(e.message || 'Impossible de charger la fiche.');
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    // Statut du like pour l'utilisateur connecté
    useEffect(() => {
        if (!isAuthenticated || !revisionId) return;
        getFicheLikeStatus(revisionId)
            .then((r) => { setHasLiked(r.hasLiked); setLikes(r.totalLikes); })
            .catch(() => {});
    }, [isAuthenticated, revisionId]);

    // Fiches de la même matière
    useEffect(() => {
        if (!fiche?.subject) return;
        getFiches({ subject: fiche.subject, sort: 'popular', limit: 12 })
            .then((d) => setSimilar((d.data || []).filter((f) => String(f.id) !== String(revisionId)).slice(0, 10)))
            .catch(() => {});
    }, [fiche?.subject, revisionId]);

    const onLike = async () => {
        if (!isAuthenticated) { router.push('/auth/login'); return; }
        if (hasLiked || liking || !revisionId) return;
        setLiking(true);
        success();
        setHasLiked(true);
        setLikes((n) => n + 1);
        try {
            const res = await likeFiche(revisionId);
            setLikes(res.likes ?? likes + 1);
        } catch (e: any) {
            // 409 = déjà liké → on garde l'état liké ; sinon on annule
            if (!/déjà liké/i.test(e?.message || '')) {
                setHasLiked(false);
                setLikes((n) => Math.max(0, n - 1));
            }
        } finally {
            setLiking(false);
        }
    };

    const onShare = useCallback(() => {
        tapLight();
        const url = `${getSiteOrigin()}/fiches/${revisionId}`;
        Share.share({ message: `${fiche?.title ?? 'Fiche de révision'} — sur Workyt : ${url}`, url }).catch(() => {});
    }, [fiche?.title, revisionId]);

    const files: string[] = fiche?.files ?? [];
    const images = files.filter((f) => !isPdf(f));
    const pdfs = files.filter(isPdf);
    const pageW = width - spacing.lg * 2;
    const pageH = Math.round(pageW * 4 / 3);
    const pal = subjectPalette(fiche?.subject);
    const rank = fiche?.author?.points != null ? calculateUserRank(fiche.author.points) : null;

    const onPage = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        setPage(Math.round(e.nativeEvent.contentOffset.x / (pageW + spacing.sm)));
    };

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Barre du haut : retour, titre court, partager */}
            <View style={[s.topbar, { paddingTop: insets.top + spacing.xs }]}>
                <Pressable onPress={() => router.back()} hitSlop={10} style={s.roundBtn} accessibilityLabel="Retour">
                    <Icon name="arrow-back" size={20} color={colors.text} />
                </Pressable>
                <Text style={s.crumb} numberOfLines={1}>{fiche?.subject ? fiche.subject.toUpperCase() : 'FICHE'}</Text>
                <Pressable onPress={onShare} hitSlop={10} style={s.roundBtn} accessibilityLabel="Partager">
                    <Icon name="share-social-outline" size={19} color={colors.text} />
                </Pressable>
            </View>

            {loading ? (
                <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
            ) : error ? (
                <View style={s.center}>
                    <Icon name="cloud-offline-outline" size={40} color={colors.textMuted} />
                    <Text style={s.emptyText}>{error}</Text>
                </View>
            ) : fiche ? (
                <>
                    <ScrollView
                        ref={scrollRef}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* La fiche elle-même, en premier */}
                        <View style={[s.stage, { backgroundColor: pal.paper }]}>
                            {images.length ? (
                                <>
                                    <FlatList
                                        horizontal
                                        data={images}
                                        keyExtractor={(u, i) => `${i}-${u.slice(-24)}`}
                                        showsHorizontalScrollIndicator={false}
                                        snapToInterval={pageW + spacing.sm}
                                        decelerationRate="fast"
                                        onMomentumScrollEnd={onPage}
                                        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
                                        renderItem={({ item }) => (
                                            <Pressable onPress={() => setZoom(item)} style={[s.page, { width: pageW, height: pageH }]}>
                                                <Image source={{ uri: item }} style={StyleSheet.absoluteFill} resizeMode="contain" />
                                            </Pressable>
                                        )}
                                    />
                                    <View style={s.pager}>
                                        {images.length > 1 ? images.map((_, i) => (
                                            <View key={i} style={[s.dot, i === page && { backgroundColor: colors.primary, width: 18 }]} />
                                        )) : null}
                                        <Text style={s.pagerText}>
                                            {images.length > 1 ? `${page + 1} / ${images.length} · ` : ''}Touche pour agrandir
                                        </Text>
                                    </View>
                                </>
                            ) : (
                                <View style={{ paddingHorizontal: spacing.lg }}>
                                    <FicheCover fiche={fiche} style={{ width: pageW, height: Math.round(pageW * 0.75) }} />
                                </View>
                            )}
                        </View>

                        <View style={s.body}>
                            <View style={s.chips}>
                                <FicheStatus status={fiche.status} />
                                {fiche.subject ? <SubjectLabel subject={fiche.subject} /> : null}
                                {fiche.level ? <LevelChip level={fiche.level} /> : null}
                            </View>

                            <Text style={s.title}>{fiche.title}</Text>
                            <Text style={s.meta}>
                                {timeAgo(fiche.createdAt)}{likes ? ` · ${likes} j’aime` : ''}{files.length ? ` · ${files.length} document${files.length > 1 ? 's' : ''}` : ''}
                            </Text>

                            {/* Auteur */}
                            {fiche.author?.username ? (
                                <Pressable
                                    style={({ pressed }) => [s.author, pressed && { opacity: 0.8 }]}
                                    disabled={!fiche.author?._id}
                                    onPress={() => router.push(`/membre/${fiche.author._id}`)}
                                >
                                    <Avatar name={fiche.author.username} userId={fiche.author._id} size="md" />
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.authorName}>{fiche.author.username}</Text>
                                        <Text style={s.authorSub}>
                                            {rank ? `${rank.badge} ${rank.name} · ${fiche.author.points} pts` : 'Auteur de la fiche'}
                                        </Text>
                                    </View>
                                    <View style={s.profileBtn}>
                                        <Text style={s.profileBtnText}>Profil</Text>
                                        <Icon name="chevron-forward" size={14} color={colors.text} />
                                    </View>
                                </Pressable>
                            ) : null}

                            {fiche.content ? (
                                <View style={s.section}>
                                    <Eyebrow>La fiche</Eyebrow>
                                    <RichMarkdown content={fiche.content} fontSize={16} />
                                </View>
                            ) : null}

                            {pdfs.length ? (
                                <View style={s.section}>
                                    <Eyebrow>Documents PDF</Eyebrow>
                                    {pdfs.map((url, i) => (
                                        <PdfViewer key={i} url={url} label={pdfs.length > 1 ? `Document ${i + 1}` : 'Document PDF'} />
                                    ))}
                                </View>
                            ) : null}
                        </View>

                        {similar.length ? (
                            <View style={s.similar}>
                                <View style={{ paddingHorizontal: spacing.lg, gap: 4 }}>
                                    <Eyebrow>Dans la même matière</Eyebrow>
                                    <Text style={s.similarTitle}>Continue de réviser</Text>
                                </View>
                                <FlatList
                                    horizontal
                                    data={similar}
                                    keyExtractor={(f) => f.id}
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
                                    renderItem={({ item }) => (
                                        <FicheGridCard fiche={item} width={132} onPress={() => router.push(`/fiches/${item.id}`)} />
                                    )}
                                />
                            </View>
                        ) : null}

                        <View style={s.body} onLayout={(e) => { commentsY.current = e.nativeEvent.layout.y; }}>
                            <FicheComments revisionId={fiche._id || id} />
                        </View>
                    </ScrollView>

                    {/* Actions sous le pouce */}
                    <View style={[s.actions, { paddingBottom: insets.bottom + spacing.sm }]}>
                        <Pressable
                            onPress={onLike}
                            disabled={liking}
                            style={({ pressed }) => [s.likeBtn, hasLiked && s.likeBtnOn, pressed && { transform: [{ scale: 0.96 }] }]}
                            accessibilityLabel={hasLiked ? 'Tu aimes cette fiche' : 'J’aime'}
                        >
                            <Icon name={hasLiked ? 'heart' : 'heart-outline'} size={20} color={hasLiked ? '#fff' : colors.primary} />
                            <Text style={[s.likeText, hasLiked && { color: '#fff' }]}>{hasLiked ? 'Merci !' : 'J’aime'} · {likes}</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => { tapLight(); scrollRef.current?.scrollTo({ y: commentsY.current, animated: true }); }}
                            style={s.action}
                            accessibilityLabel="Commentaires"
                        >
                            <Icon name="chatbubble-outline" size={20} color={colors.text} />
                        </Pressable>
                        {isAuthenticated ? (
                            <View style={s.action}><BookmarkButton type="fiche" id={String(revisionId)} size={20} bordered={false} /></View>
                        ) : null}
                        <Pressable onPress={onShare} style={s.action} accessibilityLabel="Partager">
                            <Icon name="paper-plane" size={19} color={colors.text} />
                        </Pressable>
                    </View>

                    {/* Page en plein écran */}
                    <Modal visible={!!zoom} transparent animationType="fade" onRequestClose={() => setZoom(null)}>
                        <View style={s.zoomBg}>
                            <ScrollView
                                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                                maximumZoomScale={4}
                                minimumZoomScale={1}
                                centerContent
                            >
                                {zoom ? <Image source={{ uri: zoom }} style={{ width, height: width * 1.5 }} resizeMode="contain" /> : null}
                            </ScrollView>
                            <Pressable onPress={() => setZoom(null)} style={[s.zoomClose, { top: insets.top + spacing.sm }]} hitSlop={12} accessibilityLabel="Fermer">
                                <Icon name="close" size={22} color="#fff" />
                            </Pressable>
                        </View>
                    </Modal>
                </>
            ) : null}
        </View>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        topbar: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md,
            paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: c.background,
        },
        roundBtn: {
            width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
            backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
        },
        crumb: { flex: 1, textAlign: 'center', fontFamily: typography.fontFamily.mono, fontSize: 11, letterSpacing: 1.2, color: c.textMuted },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['3xl'], gap: spacing.sm },
        emptyText: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: c.textSecondary, textAlign: 'center' },

        stage: { paddingVertical: spacing.lg },
        page: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(26,21,18,0.08)' },
        pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: spacing.md },
        dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(26,21,18,0.2)' },
        pagerText: { marginLeft: 6, fontFamily: typography.fontFamily.mono, fontSize: 10.5, letterSpacing: 0.6, color: 'rgba(26,21,18,0.55)' },

        body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
        chips: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md },
        title: { fontFamily: typography.fontFamily.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.4, color: c.text },
        meta: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: c.textMuted, marginTop: spacing.xs },

        author: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg,
            padding: spacing.md, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
        },
        authorName: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: c.text },
        authorSub: { fontFamily: typography.fontFamily.regular, fontSize: 12.5, color: c.textSecondary, marginTop: 1 },
        profileBtn: {
            flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: spacing.md, paddingVertical: 6,
            borderRadius: radius.full, borderWidth: 1, borderColor: c.border,
        },
        profileBtnText: { fontFamily: typography.fontFamily.semiBold, fontSize: 12.5, color: c.text },

        section: { marginTop: spacing.xl, gap: spacing.md },
        similar: { marginTop: spacing['2xl'], gap: spacing.md },
        similarTitle: { fontFamily: typography.fontFamily.display, fontSize: 24, letterSpacing: -0.3, color: c.text },

        actions: {
            position: 'absolute', left: 0, right: 0, bottom: 0,
            flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
            paddingHorizontal: spacing.lg, paddingTop: spacing.sm,
            backgroundColor: c.background, borderTopWidth: 1, borderTopColor: c.border,
        },
        likeBtn: {
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
            height: 48, borderRadius: radius.full, borderWidth: 1.5, borderColor: c.primary,
        },
        likeBtnOn: { backgroundColor: c.primary, borderColor: c.primary },
        likeText: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: c.primary },
        action: {
            width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
            backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
        },

        zoomBg: { flex: 1, backgroundColor: 'rgba(10,8,6,0.96)' },
        zoomClose: {
            position: 'absolute', right: spacing.lg, width: 40, height: 40, borderRadius: 20,
            alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)',
        },
    });
}
