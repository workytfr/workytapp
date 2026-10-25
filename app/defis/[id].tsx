import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import DuoButton from '../../components/DuoButton';
import { EmptyState, Eyebrow, IconButton, XpBar } from '../../components/wk';
import { useToast } from '../../components/kits/Toast';
import { useColors } from '../../lib/useColors';
import { useAuth } from '../../lib/auth';
import { radius, spacing, typography, type ThemeColors } from '../../lib/theme';
import { answerChallenge, getChallenge, respondChallenge, type ChallengeDetail } from '../../lib/challenges';

/** Score à la française (les questions peuvent valoir des demi-points). */
const pts = (n: number) => String(n).replace('.', ',');

/** Duel de quiz — équivalent de /defis/[id] sur le site. */
export default function DefiScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();
    const s = useMemo(() => createStyles(colors), [colors]);
    const { show: showToast, node: toastNode } = useToast();

    const [data, setData] = useState<ChallengeDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [selected, setSelected] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<{ correct: boolean; answer: number } | null>(null);
    const nextTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const load = useCallback(async () => {
        try {
            setError('');
            setData(await getChallenge(String(id)));
        } catch (e: any) {
            setError(e?.message || 'Défi introuvable');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) load();
        return () => { if (nextTimer.current) clearTimeout(nextTimer.current); };
    }, [id, load]);

    const back = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/amis' as any);
    }, [router]);

    const respond = async (accept: boolean) => {
        setBusy(true);
        try {
            await respondChallenge(String(id), accept);
            if (accept) {
                showToast('Duel accepté — à toi de jouer !');
                load();
            } else {
                showToast('Défi refusé');
                back();
            }
        } catch (e: any) {
            showToast(e?.message || 'Erreur', 'ko');
        } finally {
            setBusy(false);
        }
    };

    const answer = async (answerIndex: number) => {
        if (!data || busy || feedback) return;
        setBusy(true);
        setSelected(answerIndex);
        try {
            const res = await answerChallenge(String(id), data.answeredCount, answerIndex);
            setFeedback({ correct: res.isCorrect, answer: res.correctAnswer });
            // Laisse le temps de voir la correction avant la question suivante
            nextTimer.current = setTimeout(async () => {
                await load();
                setFeedback(null);
                setSelected(null);
            }, 1200);
        } catch (e: any) {
            setSelected(null);
            showToast(e?.message || 'Erreur', 'ko');
        } finally {
            setBusy(false);
        }
    };

    const current = data ? data.questions[data.answeredCount] : undefined;

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[s.topbar, { paddingTop: insets.top + spacing.sm }]}>
                <IconButton icon="arrow-back" label="Retour" onPress={back} />
                <Pressable onPress={() => router.push('/defis' as any)} hitSlop={8} style={s.allLink} accessibilityRole="link">
                    <Text style={s.allLinkText}>Tous mes défis</Text>
                </Pressable>
            </View>

            {loading ? (
                <View style={s.center}><ActivityIndicator color={colors.error} size="large" /></View>
            ) : error || !data ? (
                <EmptyState icon="swords" title="Défi introuvable" text={error} actionLabel="Retour à mes amis" onAction={() => router.replace('/amis' as any)} />
            ) : (
                <ScrollView
                    contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing['3xl'] }]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
                >
                    {/* En-tête du duel */}
                    <View style={s.head}>
                        <View style={s.headIcon}><Icon name="swords" size={26} color="#fff" /></View>
                        <View style={{ flex: 1 }}>
                            <Eyebrow>Défi</Eyebrow>
                            <Text style={s.headTitle}>Duel de quiz<Text style={{ color: colors.primary }}>.</Text></Text>
                            <Text style={s.headMeta}>
                                Niveau {data.level} · {data.total} questions{data.matiere ? ` · ${data.matiere}` : ''}
                            </Text>
                        </View>
                    </View>

                    {/* En attente d'acceptation */}
                    {data.status === 'pending' ? (
                        <View style={s.card}>
                            {data.side === 'opponent' ? (
                                <>
                                    <Text style={s.cardLead}>Tu as été défié ! Prêt à relever le duel ?</Text>
                                    <DuoButton label="Accepter le duel" variant="danger" icon="swords" size="md" disabled={busy} onPress={() => respond(true)} />
                                    <Pressable onPress={() => respond(false)} disabled={busy} style={s.ghostBtn} accessibilityRole="button">
                                        <Text style={s.ghostBtnText}>Refuser</Text>
                                    </Pressable>
                                </>
                            ) : (
                                <View style={s.waitRow}>
                                    <Icon name="time-outline" size={18} color={colors.textSecondary} />
                                    <Text style={s.waitText}>En attente de la réponse de ton adversaire…</Text>
                                </View>
                            )}
                        </View>
                    ) : null}

                    {/* Expiré / refusé */}
                    {(data.status === 'expired' || data.status === 'declined') ? (
                        <View style={s.card}>
                            <View style={s.waitRow}>
                                <Icon name="hourglass-outline" size={18} color={colors.textSecondary} />
                                <Text style={s.waitText}>
                                    {data.status === 'expired' ? 'Ce défi a expiré : il n\'a pas été joué à temps.' : 'Ce défi a été refusé.'}
                                </Text>
                            </View>
                        </View>
                    ) : null}

                    {/* En cours */}
                    {data.status === 'active' && !data.myFinished && current ? (
                        <View style={s.card}>
                            <View style={s.qHead}>
                                <Text style={s.qCount}>Question {data.answeredCount + 1} / {data.total}</Text>
                                <Text style={s.qCount}>{pts(data.myScore)} pt{data.myScore > 1 ? 's' : ''}</Text>
                            </View>
                            <XpBar percent={(data.answeredCount / data.total) * 100} color={colors.error} />
                            <Text style={s.question}>{current.question}</Text>
                            <View style={{ gap: spacing.sm }}>
                                {current.answers.map((a, i) => {
                                    const isPicked = selected === i;
                                    const isRight = !!feedback && feedback.answer === i;
                                    const isWrongPick = !!feedback && isPicked && !feedback.correct;
                                    return (
                                        <Pressable
                                            key={i}
                                            disabled={busy || !!feedback}
                                            onPress={() => answer(i)}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Réponse ${String.fromCharCode(65 + i)} : ${a}`}
                                            style={({ pressed }) => [
                                                s.answer,
                                                isRight ? s.answerRight : isWrongPick ? s.answerWrong : isPicked ? s.answerPicked : null,
                                                pressed && !feedback && { borderColor: colors.error + '88' },
                                            ]}
                                        >
                                            <View style={s.answerLetter}><Text style={s.answerLetterText}>{String.fromCharCode(65 + i)}</Text></View>
                                            <Text style={s.answerText}>{a}</Text>
                                            {isRight ? <Icon name="checkmark" size={20} color={colors.success} /> : null}
                                            {isWrongPick ? <Icon name="close" size={20} color={colors.error} /> : null}
                                            {isPicked && busy && !feedback ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    ) : null}

                    {/* Terminé de mon côté, en attente de l'adversaire */}
                    {data.myFinished && data.status !== 'completed' ? (
                        <View style={[s.card, { alignItems: 'center' }]}>
                            <Text style={s.bigScore}>{pts(data.myScore)} points</Text>
                            <View style={s.waitRow}>
                                <Icon name="time-outline" size={16} color={colors.textSecondary} />
                                <Text style={s.waitText}>Ton adversaire n'a pas encore terminé. Tu seras prévenu du résultat.</Text>
                            </View>
                        </View>
                    ) : null}

                    {/* Résultat final */}
                    {data.status === 'completed' ? (
                        <ResultCard data={data} myId={user?.id} s={s} colors={colors} onBack={() => router.replace('/amis' as any)} />
                    ) : null}

                    {/* Corrigé, une fois que j'ai fini */}
                    {data.myFinished ? (
                        <View style={s.card}>
                            <Text style={s.recapTitle}>Corrigé</Text>
                            {data.questions.map((q) => (
                                <View key={q.index} style={s.recapItem}>
                                    <Text style={s.recapQ}>{q.index + 1}. {q.question}</Text>
                                    {typeof q.correctAnswer === 'number' && q.answers[q.correctAnswer] !== undefined ? (
                                        <View style={s.recapA}>
                                            <Icon name="checkmark-circle" size={14} color={colors.success} />
                                            <Text style={s.recapAText}>{q.answers[q.correctAnswer]}</Text>
                                        </View>
                                    ) : null}
                                </View>
                            ))}
                        </View>
                    ) : null}
                </ScrollView>
            )}
            {toastNode}
        </View>
    );
}

function ResultCard({ data, myId, s, colors, onBack }: {
    data: ChallengeDetail;
    myId?: string;
    s: ReturnType<typeof createStyles>;
    colors: ThemeColors;
    onBack: () => void;
}) {
    // Le serveur départage les égalités de score au temps : on se fie au
    // vainqueur qu'il renvoie, et au score à défaut.
    let won: boolean;
    let draw: boolean;
    if (data.winner !== undefined && myId) {
        draw = data.winner === null;
        won = data.winner === myId;
    } else {
        won = data.opponentScore !== null && data.myScore > data.opponentScore;
        draw = data.opponentScore !== null && data.myScore === data.opponentScore;
    }
    const tone = won ? colors.success : draw ? colors.warning : colors.textMuted;
    const sameScore = data.opponentScore !== null && data.myScore === data.opponentScore;

    return (
        <View style={[s.card, s.result, { borderColor: tone + '66', backgroundColor: tone + '10' }]}>
            <Icon name="trophy" size={40} color={tone} />
            <Text style={s.resultTitle}>{won ? 'Victoire !' : draw ? 'Égalité !' : 'Défaite'}</Text>
            {!draw && sameScore ? <Text style={s.resultHint}>Même score : départagés au temps de réponse.</Text> : null}
            <View style={s.scores}>
                <View style={{ alignItems: 'center' }}>
                    <Text style={s.scoreNum}>{pts(data.myScore)}</Text>
                    <Text style={s.scoreLabel}>Toi</Text>
                </View>
                <Text style={s.scoreDash}>—</Text>
                <View style={{ alignItems: 'center' }}>
                    <Text style={s.scoreNum}>{data.opponentScore !== null ? pts(data.opponentScore) : '—'}</Text>
                    <Text style={s.scoreLabel}>Adversaire</Text>
                </View>
            </View>
            <DuoButton label="Retour à mes amis" variant="white" size="sm" onPress={onBack} />
        </View>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        topbar: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.sm,
        },
        allLink: { minHeight: 44, justifyContent: 'center' },
        allLinkText: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.accent },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        body: { padding: spacing.lg, gap: spacing.lg },

        head: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            backgroundColor: c.surface,
            borderRadius: radius['2xl'],
            borderWidth: 1,
            borderColor: c.border,
            padding: spacing.lg,
        },
        headIcon: {
            width: 52,
            height: 52,
            borderRadius: radius.lg,
            backgroundColor: c.error,
            alignItems: 'center',
            justifyContent: 'center',
            borderBottomWidth: 4,
            borderBottomColor: '#8e1c1c',
        },
        headTitle: { fontFamily: typography.fontFamily.display, fontSize: 26, color: c.text, marginTop: 2 },
        headMeta: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: c.textSecondary, marginTop: 2 },

        card: {
            backgroundColor: c.surface,
            borderRadius: radius['2xl'],
            borderWidth: 1,
            borderColor: c.border,
            padding: spacing.lg,
            gap: spacing.md,
        },
        cardLead: { fontFamily: typography.fontFamily.semiBold, fontSize: 16, color: c.text, textAlign: 'center' },
        ghostBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
        ghostBtnText: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.textSecondary },
        waitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
        waitText: { fontFamily: typography.fontFamily.regular, fontSize: 14, color: c.textSecondary, flexShrink: 1, textAlign: 'center' },

        qHead: { flexDirection: 'row', justifyContent: 'space-between' },
        qCount: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.textSecondary },
        question: { fontFamily: typography.fontFamily.display, fontSize: 20, lineHeight: 26, color: c.text, marginTop: spacing.xs },
        answer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            borderWidth: 2,
            borderColor: c.border,
            borderRadius: radius.lg,
            padding: spacing.md,
            minHeight: 52,
            backgroundColor: c.surface,
        },
        answerPicked: { borderColor: c.textMuted },
        answerRight: { borderColor: c.success, backgroundColor: c.success + '14' },
        answerWrong: { borderColor: c.error, backgroundColor: c.error + '14' },
        answerLetter: {
            width: 30,
            height: 30,
            borderRadius: radius.sm,
            backgroundColor: c.surfaceVariant,
            alignItems: 'center',
            justifyContent: 'center',
        },
        answerLetterText: { fontFamily: typography.fontFamily.heading, fontSize: 13, color: c.textSecondary },
        answerText: { flex: 1, fontFamily: typography.fontFamily.medium, fontSize: 15, color: c.text, lineHeight: 20 },

        bigScore: { fontFamily: typography.fontFamily.display, fontSize: 30, color: c.text },

        result: { alignItems: 'center', borderWidth: 2 },
        resultTitle: { fontFamily: typography.fontFamily.display, fontSize: 26, color: c.text },
        resultHint: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textSecondary },
        scores: { flexDirection: 'row', alignItems: 'center', gap: spacing['2xl'], marginVertical: spacing.sm },
        scoreNum: { fontFamily: typography.fontFamily.display, fontSize: 36, color: c.text },
        scoreLabel: { fontFamily: typography.fontFamily.heading, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: c.textMuted },
        scoreDash: { fontFamily: typography.fontFamily.display, fontSize: 26, color: c.textMuted },

        recapTitle: { fontFamily: typography.fontFamily.display, fontSize: 20, color: c.text },
        recapItem: { gap: 4, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: c.divider },
        recapQ: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.text, lineHeight: 19 },
        recapA: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        recapAText: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: c.success, flexShrink: 1 },
    });
}
