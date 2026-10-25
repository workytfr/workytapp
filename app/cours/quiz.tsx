import { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import { useColors } from '../../lib/useColors';
import { spacing, radius, shadows, typography } from '../../lib/theme';
import { getQuiz } from '../../lib/api';

interface Question {
    question: string;
    questionType: string;
    answers: string[];
    correctAnswer: any;
    answerSelectionType?: string;
    point?: number;
    explanation?: string;
}

const INTERACTIVE = new Set(['QCM', 'Vrai/Faux']);

export default function QuizScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [quiz, setQuiz] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const data = await getQuiz(id);
                setQuiz(data.quiz);
            } catch (e: any) {
                setError(e.message || 'Impossible de charger le quiz.');
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const questions: Question[] = quiz?.questions ?? [];

    const optionsFor = (q: Question) =>
        q.questionType === 'Vrai/Faux' && (!q.answers || q.answers.length === 0) ? ['Vrai', 'Faux'] : q.answers || [];

    const isCorrect = (q: Question, choice: number | undefined) => {
        if (choice === undefined) return false;
        if (q.questionType === 'Vrai/Faux') {
            const val = choice === 0 ? 'true' : 'false';
            return val === String(q.correctAnswer).toLowerCase();
        }
        return Number(choice) === Number(q.correctAnswer);
    };

    const { score, max, gradable } = useMemo(() => {
        let s = 0, m = 0, g = 0;
        questions.forEach((q, i) => {
            if (!INTERACTIVE.has(q.questionType)) return;
            g += 1;
            const pt = q.point || 1;
            m += pt;
            if (isCorrect(q, answers[i])) s += pt;
        });
        return { score: s, max: m, gradable: g };
    }, [questions, answers]);

    const percentage = max > 0 ? Math.round((score / max) * 100) : 0;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm }]}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
                    <Icon name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.topbarTitle} numberOfLines={1}>Quiz</Text>
                <View style={{ width: 22 }} />
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
            ) : error ? (
                <View style={styles.center}>
                    <Icon name="cloud-offline-outline" size={40} color={colors.textMuted} />
                    <Text style={styles.emptyText}>{error}</Text>
                </View>
            ) : quiz ? (
                <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing['3xl'] }} showsVerticalScrollIndicator={false}>
                    <Text style={styles.title}>{quiz.title}</Text>
                    {quiz.description ? <Text style={styles.desc}>{quiz.description}</Text> : null}

                    {submitted && (
                        <View style={styles.resultCard}>
                            <Text style={styles.resultScore}>{score}/{max}</Text>
                            <Text style={styles.resultPct}>{percentage}% de réussite</Text>
                            <Text style={styles.resultNote}>Score non enregistré sur ton profil (bientôt).</Text>
                        </View>
                    )}

                    {questions.map((q, i) => {
                        const opts = optionsFor(q);
                        const interactive = INTERACTIVE.has(q.questionType);
                        return (
                            <View key={i} style={styles.qCard}>
                                <Text style={styles.qNum}>Question {i + 1}</Text>
                                <Text style={styles.qText}>{q.question}</Text>

                                {!interactive ? (
                                    <View style={styles.unsupported}>
                                        <Icon name="information-circle-outline" size={16} color={colors.textMuted} />
                                        <Text style={styles.unsupportedText}>Type « {q.questionType} » : à faire sur le site pour l'instant.</Text>
                                    </View>
                                ) : (
                                    opts.map((opt, oi) => {
                                        const chosen = answers[i] === oi;
                                        const showState = submitted;
                                        const correct = isCorrect(q, oi);
                                        let borderColor = colors.border;
                                        let bg = colors.surface;
                                        if (showState && correct) { borderColor = colors.success; bg = colors.success + '12'; }
                                        else if (showState && chosen && !correct) { borderColor = colors.error; bg = colors.error + '12'; }
                                        else if (chosen) { borderColor = colors.primary; bg = colors.primary + '10'; }
                                        return (
                                            <TouchableOpacity
                                                key={oi}
                                                style={[styles.opt, { borderColor, backgroundColor: bg }]}
                                                disabled={submitted}
                                                onPress={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                                                activeOpacity={0.8}
                                            >
                                                <View style={[styles.radio, { borderColor: chosen ? colors.primary : colors.border }]}>
                                                    {chosen && <View style={styles.radioDot} />}
                                                </View>
                                                <Text style={styles.optText}>{opt}</Text>
                                                {showState && correct && <Icon name="checkmark-circle" size={18} color={colors.success} />}
                                                {showState && chosen && !correct && <Icon name="close-circle" size={18} color={colors.error} />}
                                            </TouchableOpacity>
                                        );
                                    })
                                )}

                                {submitted && q.explanation ? (
                                    <View style={styles.explain}>
                                        <Text style={styles.explainText}>{q.explanation}</Text>
                                    </View>
                                ) : null}
                            </View>
                        );
                    })}

                    {gradable > 0 && !submitted && (
                        <TouchableOpacity style={styles.submitBtn} onPress={() => setSubmitted(true)} activeOpacity={0.85}>
                            <Text style={styles.submitText}>Valider mes réponses</Text>
                        </TouchableOpacity>
                    )}
                    {submitted && (
                        <TouchableOpacity style={styles.retryBtn} onPress={() => { setSubmitted(false); setAnswers({}); }} activeOpacity={0.85}>
                            <Icon name="refresh" size={18} color={colors.primary} />
                            <Text style={styles.retryText}>Recommencer</Text>
                        </TouchableOpacity>
                    )}
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
            backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
        },
        topbarTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg, color: colors.text },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['3xl'], gap: spacing.sm },
        emptyText: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: colors.textSecondary, textAlign: 'center' },
        title: { fontFamily: typography.fontFamily.display, fontSize: typography.size['3xl'], color: colors.text, marginBottom: spacing.xs },
        desc: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: colors.textSecondary, marginBottom: spacing.md },
        resultCard: { alignItems: 'center', backgroundColor: colors.primary + '10', borderWidth: 1, borderColor: colors.primary + '33', borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg },
        resultScore: { fontFamily: typography.fontFamily.display, fontSize: typography.size['5xl'], color: colors.primary },
        resultPct: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg, color: colors.text, marginTop: 2 },
        resultNote: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textMuted, marginTop: spacing.xs },
        qCard: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm },
        qNum: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.xs, color: colors.primary, marginBottom: 4 },
        qText: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.base, color: colors.text, marginBottom: spacing.md },
        opt: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
        radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
        radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
        optText: { flex: 1, fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: colors.text },
        unsupported: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceVariant, padding: spacing.md, borderRadius: radius.md },
        unsupportedText: { flex: 1, fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary },
        explain: { backgroundColor: colors.info + '10', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.xs },
        explainText: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary },
        submitBtn: { backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.lg, alignItems: 'center', marginTop: spacing.sm },
        submitText: { fontFamily: typography.fontFamily.heading, color: '#fff', fontSize: typography.size.lg },
        retryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.primary, marginTop: spacing.sm },
        retryText: { fontFamily: typography.fontFamily.semiBold, color: colors.primary, fontSize: typography.size.base },
    });
}
