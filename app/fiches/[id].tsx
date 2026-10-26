import { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import { useColors } from '../../lib/useColors';
import { spacing, radius, typography } from '../../lib/theme';
import { getFiche, getFicheLikeStatus, likeFiche } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import RichMarkdown from '../../components/RichMarkdown';
import PdfViewer from '../../components/PdfViewer';
import FicheComments from '../../components/FicheComments';
import BookmarkButton from '../../components/BookmarkButton';
import { SubjectLabel, LevelChip } from '../../components/wk';

type IconName = string;

function statusStyle(status: string, colors: ReturnType<typeof useColors>) {
    if (status === 'Certifiée') return { color: colors.success, icon: 'ribbon' as IconName };
    if (status === 'Vérifiée') return { color: colors.info, icon: 'checkmark-circle' as IconName };
    return { color: colors.textMuted, icon: 'document-text-outline' as IconName };
}

const isPdf = (url: string) => /\.pdf(\?|$)/i.test(url);

export default function FicheDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { isAuthenticated } = useAuth();

    const [fiche, setFiche] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [likes, setLikes] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    const [liking, setLiking] = useState(false);

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
        (async () => {
            try {
                const s = await getFicheLikeStatus(revisionId);
                setHasLiked(s.hasLiked);
                setLikes(s.totalLikes);
            } catch {
                // silencieux
            }
        })();
    }, [isAuthenticated, revisionId]);

    const onLike = async () => {
        if (hasLiked || liking || !revisionId) return;
        setLiking(true);
        // Optimiste
        setHasLiked(true);
        setLikes((n) => n + 1);
        try {
            const res = await likeFiche(revisionId);
            setLikes(res.likes ?? likes + 1);
            setHasLiked(true);
        } catch (e: any) {
            // 409 = déjà liké → on garde l'état liké ; sinon on annule l'optimiste
            if (!/déjà liké/i.test(e?.message || '')) {
                setHasLiked(false);
                setLikes((n) => Math.max(0, n - 1));
            }
        } finally {
            setLiking(false);
        }
    };

    const st = fiche ? statusStyle(fiche.status, colors) : null;
    const files: string[] = fiche?.files ?? [];

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm }]}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
                    <Icon name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.topbarTitle} numberOfLines={1}>Fiche</Text>
                {isAuthenticated ? <BookmarkButton type="fiche" id={String(revisionId)} size={20} bordered={false} /> : <View style={{ width: 22 }} />}
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
            ) : error ? (
                <View style={styles.center}>
                    <Icon name="cloud-offline-outline" size={40} color={colors.textMuted} />
                    <Text style={styles.emptyText}>{error}</Text>
                </View>
            ) : fiche ? (
                <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing['3xl'] }} showsVerticalScrollIndicator={false}>
                    {st && (
                        <View style={styles.metaRow}>
                            <View style={[styles.statusPill, { backgroundColor: st.color + '18' }]}>
                                <Icon name={st.icon} size={12} color={st.color} />
                                <Text style={[styles.statusText, { color: st.color }]}>{fiche.status}</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.likeBtn, hasLiked && styles.likeBtnActive]}
                                onPress={onLike}
                                disabled={hasLiked || liking || !isAuthenticated}
                                activeOpacity={0.8}
                            >
                                <Icon
                                    name={hasLiked ? 'heart' : 'heart-outline'}
                                    size={16}
                                    color={hasLiked ? '#fff' : colors.error}
                                />
                                <Text style={[styles.likesText, hasLiked && { color: '#fff' }]}>{likes}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <Text style={styles.title}>{fiche.title}</Text>

                    <View style={styles.chips}>
                        {fiche.subject ? <SubjectLabel subject={fiche.subject} /> : null}
                        {fiche.level ? <LevelChip level={fiche.level} /> : null}
                    </View>

                    {fiche.author?.username ? (
                        <TouchableOpacity
                            style={styles.authorRow}
                            disabled={!fiche.author?._id}
                            onPress={() => router.push(`/membre/${fiche.author._id}`)}
                        >
                            <Icon name="person-circle-outline" size={18} color={colors.textMuted} />
                            <Text style={styles.authorText}>Par <Text style={styles.authorName}>{fiche.author.username}</Text></Text>
                        </TouchableOpacity>
                    ) : null}

                    {fiche.content ? <RichMarkdown content={fiche.content} fontSize={16} /> : null}

                    {files.length > 0 && (
                        <View style={styles.files}>
                            <Text style={styles.filesTitle}>Documents joints</Text>
                            {files.map((url, i) =>
                                isPdf(url) ? (
                                    <PdfViewer
                                        key={i}
                                        url={url}
                                        label={files.length > 1 ? `Document #${i + 1}` : 'Document PDF'}
                                    />
                                ) : (
                                    <Image key={i} source={{ uri: url }} style={styles.fileImg} resizeMode="contain" />
                                )
                            )}
                        </View>
                    )}

                    <FicheComments revisionId={fiche._id || id} />
                </ScrollView>
            ) : null}
        </View>
    );
}

function createStyles(colors: ReturnType<typeof useColors>) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        topbar: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
            backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border,
        },
        topbarTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg, color: colors.text },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['3xl'], gap: spacing.sm },
        emptyText: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: colors.textSecondary, textAlign: 'center' },
        metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
        statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
        statusText: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.xs },
        likeBtn: {
            flexDirection: 'row', alignItems: 'center', gap: 5,
            paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full,
            borderWidth: 1.5, borderColor: colors.error,
        },
        likeBtnActive: { backgroundColor: colors.error, borderColor: colors.error },
        likesText: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.sm, color: colors.error },
        title: { fontFamily: typography.fontFamily.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.4, color: colors.text, marginBottom: spacing.md },
        chips: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
        authorName: { fontFamily: typography.fontFamily.semiBold, color: colors.accent },
        authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
        authorText: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm, color: colors.textSecondary },
        files: { marginTop: spacing.lg, gap: spacing.md },
        filesTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.base, color: colors.text },
        fileImg: { width: '100%', height: 260, borderRadius: radius.lg, backgroundColor: colors.surfaceVariant },
    });
}
