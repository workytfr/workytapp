import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    Pressable,
    Alert,
    RefreshControl,
    Linking,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import { useAuth } from '../../lib/auth';
import { apiFetch } from '../../lib/api';
import { useColors } from '../../lib/useColors';
import { spacing, radius, typography, type ThemeColors } from '../../lib/theme';
import PaperDots from '../../components/PaperDots';
import { EmptyState, Eyebrow, LevelChip, QuestionStatus, SkeletonList, SubjectLabel } from '../../components/wk';
import { BottomSheet, PrimaryButton } from '../../components/mobile';
import { success, tapLight } from '../../lib/haptics';
import RichMarkdown from '../../components/RichMarkdown';
import Avatar from '../../components/Avatar';
import { useThreadRealtime } from '../../lib/realtime';
import TypingIndicator from '../../components/TypingIndicator';
import BookmarkButton from '../../components/BookmarkButton';

interface Answer {
    _id: string;
    content: string;
    user: { _id: string; username: string; points?: number; image?: string | null };
    likes: number;
    likedBy: string[];
    status?: string;
    isValidated?: boolean;
    createdAt: string;
}

interface Revision {
    _id: string;
    title: string;
    content: string;
    author: { _id: string; username: string; points?: number };
    createdAt: string;
}

interface QuestionDetail {
    _id: string;
    title: string;
    description: { whatIDid: string; whatINeed: string };
    subject: string;
    classLevel: string;
    status: string;
    points: number;
    user: { _id: string; username: string; points?: number; image?: string | null };
    createdAt: string;
    attachments: string[];
    contextType?: 'lesson' | 'exercise' | 'general';
    contextTitle?: string;
    courseId?: string;
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}j`;
}

function getSubjectColor(subject: string) {
    const colors: Record<string, string> = {
        'Français': '#dc2626',
        'Mathématiques': '#2563eb',
        'Histoire-Géographie': '#16a34a',
        'Histoire-Géo': '#16a34a',
        'SVT': '#ca8a04',
        'Sciences de la Vie et de la Terre (SVT)': '#ca8a04',
        'Physique-Chimie': '#9333ea',
        'Technologie': '#db2777',
        'Anglais': '#C24A0A',
        'Espagnol': '#0d9488',
        'Allemand': '#ea580c',
        'Italien': '#e11d48',
        'Philosophie': '#0891b2',
        'Économie': '#65a30d',
        'SES': '#65a30d',
        'Sciences Économiques et Sociales (SES)': '#65a30d',
        'Informatique': '#d97706',
        'NSI': '#0284c7',
        'Numérique et Sciences Informatiques (NSI)': '#0284c7',
        'Arts Plastiques': '#c026d3',
        'Éducation Musicale': '#7c3aed',
        'EPS': '#059669',
        'Autre': '#4b5563',
    };
    return colors[subject] || '#2563eb';
}

function getStatusColor(status: string) {
    switch (status) {
        case 'Résolue': return '#10b981';
        case 'Validée': return '#3b82f6';
        case 'Non validée': return '#f59e0b';
        default: return '#6b7280';
    }
}

function getStatusIcon(status: string) {
    switch (status) {
        case 'Résolue': return 'checkmark-circle';
        case 'Validée': return 'shield-checkmark';
        default: return 'time';
    }
}

export default function QuestionDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const router = useRouter();
    const c = useColors();
    const insets = useSafeAreaInsets();
    const s = useMemo(() => createStyles(c), [c]);
    
    const [question, setQuestion] = useState<QuestionDetail | null>(null);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [revisions, setRevisions] = useState<Revision[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [answerText, setAnswerText] = useState('');
    const [sending, setSending] = useState(false);
    const [showAnswerInput, setShowAnswerInput] = useState(false);

    // Auteurs connus → résolution immédiate des mentions @[user:id]
    const knownUsers = useMemo(
        () => [question?.user, ...answers.map((a) => a.user)].filter(Boolean) as Array<{ _id?: string; username?: string }>,
        [question?.user, answers],
    );
    const [showPreview, setShowPreview] = useState(false);

    const fetchData = useCallback(async () => {
        if (!id) return;
        try {
            const data = await apiFetch(`/forum/questions/${id}?page=1&limit=50`);
            setQuestion(data.question);
            setAnswers(data.answers || []);
            setRevisions(data.revisions || []);
        } catch (e: any) {
            Alert.alert('Erreur', 'Impossible de charger la question');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    // Temps réel : frappe, présence, et arrivée live des nouvelles réponses
    const room = id ? `question:${id}` : undefined;
    const { typingUsers, startTyping, stopTyping, presentMembers } = useThreadRealtime(room, fetchData);

    // Émet l'état de frappe (auto-stop après 2,5 s d'inactivité)
    useEffect(() => {
        if (!showAnswerInput || answerText.trim().length === 0) return;
        const wc = answerText.trim().split(/\s+/).filter(Boolean).length;
        startTyping(wc);
        const t = setTimeout(() => stopTyping(), 2500);
        return () => clearTimeout(t);
    }, [answerText, showAnswerInput, startTyping, stopTyping]);

    const handleSubmitAnswer = async () => {
        if (!answerText.trim() || sending || !id) return;
        
        if (question?.status === 'Résolue' || question?.status === 'Validée') {
            Alert.alert('Question fermée', 'Cette question est résolue/validée, vous ne pouvez plus y répondre.');
            return;
        }

        setSending(true);
        try {
            const data = await apiFetch(`/forum/questions/${id}/repondre`, {
                method: 'POST',
                body: JSON.stringify({ content: answerText.trim() }),
            });
            
            const newAnswer = data.answer || data;
            setAnswers(prev => [...prev, newAnswer]);
            setAnswerText('');
            setShowAnswerInput(false);
            setShowPreview(false);
            stopTyping();
            success();
        } catch (e: any) {
            Alert.alert('Erreur', e.message || 'Impossible de publier la réponse');
        } finally {
            setSending(false);
        }
    };

    const handleLike = async (answerId: string) => {
        if (!user) {
            Alert.alert('Connexion requise', 'Vous devez être connecté pour liker');
            return;
        }

        try {
            const data = await apiFetch(`/forum/answers/like?id=${answerId}`, { method: 'POST' });
            
            setAnswers(prev =>
                prev.map(a => {
                    if (a._id !== answerId) return a;
                    return {
                        ...a,
                        likes: data.data?.likes || a.likes,
                        likedBy: data.data?.likedBy || a.likedBy,
                    };
                })
            );
        } catch {
            // ignore
        }
    };

    const handleValidate = async (answerId: string) => {
        if (!user || !question) return;
        
        const isQuestionOwner = user.id === question.user._id;
        const isStaff = ['Admin', 'Helpeur', 'Modérateur'].includes(user.role || '');
        
        if (!isQuestionOwner && !isStaff) {
            Alert.alert('Non autorisé', 'Seul l\'auteur ou le staff peut valider');
            return;
        }

        Alert.alert(
            'Valider cette réponse ?',
            'Cette action marquera la réponse comme validée et distribuera les points.',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Valider',
                    style: 'default',
                    onPress: async () => {
                        try {
                            const data = await apiFetch(`/forum/answers/validate?id=${answerId}`, { 
                                method: 'POST' 
                            });
                            
                            setAnswers(prev =>
                                prev.map(a => a._id === answerId ? { ...a, status: data.data?.status || 'Validée' } : a)
                            );
                            
                            setQuestion(prev => prev ? { ...prev, status: 'Résolue' } : null);
                            
                            Alert.alert('Succès', 'Réponse validée !');
                        } catch (e: any) {
                            Alert.alert('Erreur', e.message || 'Impossible de valider');
                        }
                    }
                }
            ]
        );
    };

    // Barre d'outils Markdown
    const insertMarkdown = (before: string, after: string = '') => {
        const newText = answerText + before + after;
        setAnswerText(newText);
    };

    const TopBar = (
        <View style={[s.topbar, { paddingTop: insets.top + spacing.sm }]}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={s.roundBtn} accessibilityLabel="Retour">
                <Icon name="arrow-back" size={20} color={c.text} />
            </Pressable>
            <Text style={s.crumb} numberOfLines={1}>Forum{question ? ` · ${question.subject}` : ''}</Text>
            {question ? <View style={s.roundBtn}><BookmarkButton type="forum" id={question._id} size={18} bordered={false} /></View> : <View style={{ width: 42 }} />}
        </View>
    );

    if (loading || !question) {
        return (
            <View style={s.container}>
                <Stack.Screen options={{ headerShown: false }} />
                {TopBar}
                {loading ? <SkeletonList count={2} /> : <EmptyState icon="alert-circle" title="Question introuvable" text="Elle a peut-être été supprimée." actionLabel="Retour" onAction={() => router.back()} />}
            </View>
        );
    }

    const isQuestionOwner = user?.id === question.user._id;
    const isStaff = ['Admin', 'Helpeur', 'Modérateur'].includes(user?.role || '');
    const isClosed = question.status === 'Résolue' || question.status === 'Validée';
    const hasLiked = (answer: Answer) => !!user && answer.likedBy?.includes(user.username);

    const closeComposer = () => {
        setShowAnswerInput(false);
        setShowPreview(false);
        stopTyping();
    };

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            {TopBar}
            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {/* En-tête de la question (comme le site) */}
                <View style={s.head}>
                    <PaperDots />
                    <View style={s.tags}>
                        <SubjectLabel subject={question.subject} />
                        {question.classLevel ? <LevelChip level={question.classLevel} /> : null}
                        <QuestionStatus status={question.status} />
                    </View>
                    <View style={s.stake}>
                        <Image source={require('../../assets/points.png')} style={{ width: 14, height: 14 }} />
                        <Text style={s.stakeText}>{question.points} pts misés</Text>
                    </View>
                    <Text style={s.title}>{question.title}</Text>
                    <Pressable style={s.author} onPress={() => question.user?._id && router.push(`/membre/${question.user._id}`)}>
                        <Avatar name={question.user?.username || '?'} userId={question.user._id} imageUri={question.user?.image} size="sm" />
                        <View>
                            <Text style={s.authorName}>{question.user?.username}</Text>
                            <Text style={s.authorMeta}>a demandé {timeAgo(question.createdAt)}</Text>
                        </View>
                    </Pressable>
                </View>

                {/* Contexte (leçon / exercice) */}
                {question.contextType && question.contextType !== 'general' && question.contextTitle ? (
                    <View style={s.context}>
                        <Icon name="book-outline" size={18} color={c.accent} />
                        <View style={{ flex: 1 }}>
                            <Text style={s.contextLabel}>À propos {question.contextType === 'lesson' ? 'de la leçon' : "de l'exercice"}</Text>
                            <Text style={s.contextTitle}>{question.contextTitle}</Text>
                        </View>
                    </View>
                ) : null}

                {/* Ce que j'ai fait / Ce dont j'ai besoin */}
                <View style={s.descCard}>
                    {[
                        { n: '01', label: "Ce que j'ai fait", icon: 'create', bg: c.text, body: question.description.whatIDid },
                        { n: '02', label: "Ce dont j'ai besoin", icon: 'target', bg: c.primary, body: question.description.whatINeed },
                    ].map((b, i) => (
                        <View key={b.n} style={[s.descBlock, i > 0 && s.descBlockSep]}>
                            <View style={s.descHead}>
                                <View style={[s.descIcon, { backgroundColor: b.bg }]}><Icon name={b.icon} size={18} color={i === 0 ? c.primaryLight : '#fff'} /></View>
                                <View>
                                    <Text style={s.descNum}>{b.n}</Text>
                                    <Text style={s.descTitle}>{b.label}</Text>
                                </View>
                            </View>
                            <RichMarkdown content={b.body} knownUsers={knownUsers} />
                        </View>
                    ))}

                    {/* Pièces jointes : vraies vignettes, ouvertes en grand au tap */}
                    {question.attachments?.length ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.attachments}>
                            {question.attachments.map((url, index) => (
                                <Pressable key={index} onPress={() => Linking.openURL(url)} style={s.attachment} accessibilityLabel={`Pièce jointe ${index + 1}`}>
                                    {/\.(png|jpe?g|webp|gif)(\?|$)/i.test(url) ? (
                                        <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                                    ) : (
                                        <Icon name="document-attach" size={26} color={c.textMuted} />
                                    )}
                                </Pressable>
                            ))}
                        </ScrollView>
                    ) : null}
                </View>

                {/* Fiches liées */}
                {revisions.length > 0 ? (
                    <View style={s.block}>
                        <Eyebrow>Fiches liées</Eyebrow>
                        {revisions.map((r) => (
                            <Pressable key={r._id} style={s.revision} onPress={() => router.push(`/fiches/${r._id}`)}>
                                <Icon name="document-text" size={18} color={c.accent} />
                                <View style={{ flex: 1 }}>
                                    <Text style={s.revisionTitle} numberOfLines={1}>{r.title}</Text>
                                    <Text style={s.authorMeta}>Par {r.author?.username}</Text>
                                </View>
                                <Icon name="chevron-forward" size={16} color={c.textMuted} />
                            </Pressable>
                        ))}
                    </View>
                ) : null}

                {/* Réponses */}
                <View style={s.block}>
                    <View style={s.answersHead}>
                        <Text style={s.answersTitle}>Réponses <Text style={{ color: c.primary }}>{answers.length}</Text></Text>
                        {presentMembers.length > 1 ? (
                            <View style={s.presence}><View style={s.presenceDot} /><Text style={s.presenceText}>{presentMembers.length} en ligne</Text></View>
                        ) : null}
                    </View>
                    <TypingIndicator users={typingUsers} />

                    {answers.length === 0 ? (
                        <EmptyState icon="chatbubble-outline" title="Aucune réponse pour l'instant" text={isClosed ? undefined : 'Sois le premier à aider : +2 points par réponse.'} />
                    ) : answers.map((answer) => {
                        const isBest = answer.status === 'Meilleure Réponse';
                        const isValidated = isBest || answer.status === 'Validée';
                        const canValidate = (isQuestionOwner || isStaff) && !isClosed && !isValidated;
                        const liked = hasLiked(answer);
                        return (
                            <View key={answer._id} style={[s.answer, isBest && { borderColor: c.success }, isValidated && !isBest && { borderColor: c.info + '66' }]}>
                                {isValidated ? (
                                    <View style={[s.answerBanner, { backgroundColor: (isBest ? c.success : c.info) + '14' }]}>
                                        <Icon name={isBest ? 'trophy' : 'checkmark-circle'} size={14} color={isBest ? c.success : c.info} />
                                        <Text style={[s.answerBannerText, { color: isBest ? c.success : c.info }]}>
                                            {isBest ? "Meilleure réponse choisie par l'auteur" : "Réponse validée par l'équipe"}
                                        </Text>
                                    </View>
                                ) : null}
                                <View style={s.answerBody}>
                                    <Pressable style={s.author} onPress={() => answer.user?._id && router.push(`/membre/${answer.user._id}`)}>
                                        <Avatar name={answer.user?.username || '?'} userId={answer.user?._id} imageUri={answer.user?.image} size="sm" />
                                        <View>
                                            <Text style={s.authorName}>{answer.user?.username}</Text>
                                            <Text style={s.authorMeta}>{timeAgo(answer.createdAt)}</Text>
                                        </View>
                                    </Pressable>
                                    <RichMarkdown content={answer.content} knownUsers={knownUsers} />
                                    <View style={s.answerFoot}>
                                        <Pressable
                                            onPress={() => { tapLight(); handleLike(answer._id); }}
                                            style={[s.pill, liked && { backgroundColor: c.primary + '1A', borderColor: c.primary }]}
                                            accessibilityLabel={liked ? 'Retirer le like' : "J'aime"}
                                        >
                                            <Icon name="thumbs-up" size={15} color={liked ? c.primary : c.textSecondary} />
                                            <Text style={[s.pillText, liked && { color: c.primary }]}>{answer.likes || 0}</Text>
                                        </Pressable>
                                        {canValidate ? (
                                            <Pressable onPress={() => handleValidate(answer._id)} style={[s.pill, { borderColor: c.success }]}>
                                                <Icon name="checkmark-circle" size={15} color={c.success} />
                                                <Text style={[s.pillText, { color: c.success }]}>Valider</Text>
                                            </Pressable>
                                        ) : null}
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Barre du bas : répondre, toujours à portée de pouce */}
            <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                {isClosed ? (
                    <View style={s.closed}>
                        <Icon name={question.status === 'Résolue' ? 'checkmark-circle' : 'shield-checkmark'} size={16} color={c.info} />
                        <Text style={s.closedText}>
                            Question {question.status === 'Résolue' ? 'résolue' : "validée par l'équipe"} — on ne peut plus y répondre.
                        </Text>
                    </View>
                ) : (
                    <Pressable style={s.composerStub} onPress={() => { tapLight(); setShowAnswerInput(true); }} accessibilityRole="button">
                        <Avatar name={user?.username || '?'} userId={user?.id} imageUri={user?.image} size="xs" />
                        <Text style={s.composerStubText}>{answerText ? answerText.slice(0, 60) : 'Écris ta réponse…'}</Text>
                        <Icon name="send" size={18} color={c.primary} />
                    </Pressable>
                )}
            </View>

            {/* Éditeur de réponse : feuille au-dessus du clavier */}
            <BottomSheet
                visible={showAnswerInput && !isClosed}
                onClose={closeComposer}
                title="Ta réponse"
                footer={
                    <>
                        <PrimaryButton label={showPreview ? 'Modifier' : 'Aperçu'} variant="ghost" icon={showPreview ? 'create' : 'eye'} onPress={() => setShowPreview((v) => !v)} />
                        <PrimaryButton label={sending ? 'Envoi…' : 'Publier (+2 pts)'} icon="send" onPress={handleSubmitAnswer} disabled={!answerText.trim() || sending} />
                    </>
                }
            >
                <View style={s.toolbar}>
                    {[
                        { k: 'B', on: () => insertMarkdown('**', '**') },
                        { k: 'I', on: () => insertMarkdown('*', '*') },
                        { k: 'H', on: () => insertMarkdown('# ', '') },
                        { k: '•', on: () => insertMarkdown('- ', '') },
                        { k: '</>', on: () => insertMarkdown('```\n', '\n```') },
                        { k: '∑', on: () => insertMarkdown('$', '$') },
                    ].map((t) => (
                        <Pressable key={t.k} onPress={t.on} style={s.tool} accessibilityLabel={`Insérer ${t.k}`}>
                            <Text style={[s.toolText, t.k === 'I' && { fontStyle: 'italic' }]}>{t.k}</Text>
                        </Pressable>
                    ))}
                </View>
                {showPreview ? (
                    <View style={s.preview}>
                        <RichMarkdown content={answerText || '*Aucun contenu*'} knownUsers={knownUsers} />
                    </View>
                ) : (
                    <TextInput
                        style={s.input}
                        placeholder="Explique pas à pas… (Markdown et LaTeX acceptés)"
                        placeholderTextColor={c.textMuted}
                        value={answerText}
                        onChangeText={setAnswerText}
                        multiline
                        autoFocus
                        textAlignVertical="top"
                    />
                )}
            </BottomSheet>
        </View>
    );
}

function createStyles(c: ThemeColors) {
    const card = { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border } as const;
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        topbar: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.md,
            paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: c.background,
        },
        roundBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', ...card },
        crumb: { flex: 1, textAlign: 'center', fontFamily: typography.fontFamily.mono, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: c.textSecondary },

        head: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.border },
        tags: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
        stake: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, backgroundColor: c.accent2 + '33' },
        stakeText: { fontFamily: typography.fontFamily.semiBold, fontSize: 12, color: c.text },
        title: { fontFamily: typography.fontFamily.display, fontSize: 30, lineHeight: 35, letterSpacing: -0.6, color: c.text, marginTop: spacing.xs },
        author: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
        authorName: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.text },
        authorMeta: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textMuted },

        context: { ...card, flexDirection: 'row', gap: spacing.md, alignItems: 'center', margin: spacing.lg, marginBottom: 0, padding: spacing.md, borderRadius: radius.xl },
        contextLabel: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textMuted },
        contextTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.text },

        descCard: { ...card, margin: spacing.lg, borderRadius: 24, overflow: 'hidden' },
        descBlock: { padding: spacing.lg, gap: spacing.md },
        descBlockSep: { borderTopWidth: 1, borderTopColor: c.divider, borderStyle: 'dashed' },
        descHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        descIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
        descNum: { fontFamily: typography.fontFamily.mono, fontSize: 11, color: c.primary },
        descTitle: { fontFamily: typography.fontFamily.display, fontSize: 22, color: c.text },
        attachments: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
        attachment: { width: 96, height: 96, borderRadius: radius.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceVariant },

        block: { paddingHorizontal: spacing.lg, marginTop: spacing.md, gap: spacing.md },
        revision: { ...card, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.xl },
        revisionTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.text },

        answersHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        answersTitle: { fontFamily: typography.fontFamily.display, fontSize: 30, letterSpacing: -0.5, color: c.text },
        presence: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, backgroundColor: c.success + '18' },
        presenceDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.success },
        presenceText: { fontFamily: typography.fontFamily.semiBold, fontSize: 12, color: c.success },

        answer: { ...card, borderRadius: 24, overflow: 'hidden' },
        answerBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: 8 },
        answerBannerText: { fontFamily: typography.fontFamily.semiBold, fontSize: 12 },
        answerBody: { padding: spacing.lg, gap: spacing.md },
        answerFoot: { flexDirection: 'row', gap: spacing.sm },
        pill: {
            flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12,
            borderRadius: radius.full, borderWidth: 1, borderColor: c.border,
        },
        pillText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.textSecondary },

        bottomBar: {
            position: 'absolute', left: 0, right: 0, bottom: 0,
            paddingHorizontal: spacing.lg, paddingTop: spacing.sm,
            backgroundColor: c.background, borderTopWidth: 1, borderTopColor: c.border,
        },
        composerStub: {
            ...card, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
            minHeight: 50, paddingHorizontal: spacing.md, borderRadius: radius.full,
        },
        composerStubText: { flex: 1, fontFamily: typography.fontFamily.regular, fontSize: 14, color: c.textMuted },
        closed: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 50, paddingHorizontal: spacing.md, borderRadius: radius.xl, backgroundColor: c.info + '12' },
        closedText: { flex: 1, fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.info },

        toolbar: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
        tool: { minWidth: 40, height: 36, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceVariant },
        toolText: { fontFamily: typography.fontFamily.heading, fontSize: 14, color: c.text },
        input: {
            ...card, minHeight: 180, maxHeight: 320, borderRadius: radius.xl, padding: spacing.md,
            fontFamily: typography.fontFamily.regular, fontSize: 15, lineHeight: 22, color: c.text,
        },
        preview: { ...card, minHeight: 180, borderRadius: radius.xl, padding: spacing.md },
    });
}
