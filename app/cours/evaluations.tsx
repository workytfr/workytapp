import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import { useColors } from '../../lib/useColors';
import { spacing, radius, shadows, typography } from '../../lib/theme';
import {
    getEvaluationStatus,
    drawEvaluation,
    getEvaluationDraw,
    EvalStatus,
    DrawnEvaluation,
} from '../../lib/api';
import EvaluationExam from '../../components/EvaluationExam';

type IconName = string;

interface ExamState { drawId: string; evaluation: DrawnEvaluation; mustSubmitBefore: string }

export default function EvaluationsScreen() {
    const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [status, setStatus] = useState<EvalStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [exam, setExam] = useState<ExamState | null>(null);
    const [justSubmitted, setJustSubmitted] = useState(false);

    const loadStatus = useCallback(async () => {
        setLoading(true);
        try {
            setStatus(await getEvaluationStatus(id));
            setError('');
        } catch (e: any) {
            setError(e.message || 'Impossible de charger les évaluations.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { loadStatus(); }, [loadStatus]);

    // Tirer un sujet (démarre le chrono) — confirmation car irréversible ce trimestre
    const onDraw = useCallback(() => {
        Alert.alert(
            'Tirer mon sujet',
            "Une fois tiré, le chronomètre démarre et tu ne pourras pas retirer d'autre sujet ce trimestre. Prêt ?",
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Tirer', style: 'default', onPress: async () => {
                        setBusy(true);
                        try {
                            const res = await drawEvaluation(id);
                            setExam({ drawId: res.draw._id, evaluation: res.evaluation, mustSubmitBefore: String(res.draw.mustSubmitBefore) });
                        } catch (e: any) {
                            Alert.alert('Oups', e?.message || 'Tirage impossible.');
                        } finally {
                            setBusy(false);
                        }
                    },
                },
            ],
        );
    }, [id]);

    // Reprendre un tirage en cours
    const onResume = useCallback(async (drawId: string) => {
        setBusy(true);
        try {
            const res = await getEvaluationDraw(drawId);
            setExam({ drawId, evaluation: res.evaluation, mustSubmitBefore: String(res.draw.mustSubmitBefore) });
        } catch (e: any) {
            Alert.alert('Oups', e?.message || 'Impossible de reprendre.');
        } finally {
            setBusy(false);
        }
    }, []);

    const onSubmitted = useCallback(() => {
        setExam(null);
        setJustSubmitted(true);
        loadStatus();
    }, [loadStatus]);

    // ---- Rendu ----
    const header = (
        <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm }]}>
            <TouchableOpacity onPress={() => (exam ? confirmLeave() : router.back())} hitSlop={10}>
                <Icon name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.topbarTitle} numberOfLines={1}>Évaluation</Text>
            <View style={{ width: 22 }} />
        </View>
    );

    function confirmLeave() {
        Alert.alert('Quitter ?', 'Le chronomètre continue de tourner. Tu peux revenir reprendre ton évaluation.', [
            { text: 'Rester', style: 'cancel' },
            { text: 'Quitter', style: 'destructive', onPress: () => { setExam(null); loadStatus(); } },
        ]);
    }

    if (exam) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                {header}
                <EvaluationExam
                    drawId={exam.drawId}
                    evaluation={exam.evaluation}
                    mustSubmitBefore={exam.mustSubmitBefore}
                    onSubmitted={onSubmitted}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            {header}

            {loading ? (
                <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
            ) : error ? (
                <View style={styles.center}>
                    <Icon name="cloud-offline-outline" size={40} color={colors.textMuted} />
                    <Text style={styles.emptyText}>{error}</Text>
                    <TouchableOpacity style={styles.retry} onPress={loadStatus}><Text style={styles.retryText}>Réessayer</Text></TouchableOpacity>
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing['3xl'] }}>
                    {title ? <Text style={styles.courseTitle}>{title}</Text> : null}
                    {status?.currentTrimester && (
                        <View style={styles.infoCard}>
                            <Icon name="calendar-outline" size={20} color={colors.info} />
                            <View style={styles.flex}>
                                <Text style={styles.infoTitle}>{status.currentTrimester.name}</Text>
                                <Text style={styles.infoSub}>Année scolaire {status.currentTrimester.schoolYear}</Text>
                            </View>
                        </View>
                    )}

                    {justSubmitted && (
                        <StateCard icon="checkmark-done-circle" color={colors.success} styles={styles}
                            title="Copie envoyée !" text="Ton évaluation est en attente de correction. Tu recevras une notification dès qu'elle sera notée." />
                    )}

                    {renderBody()}
                </ScrollView>
            )}
        </View>
    );

    function renderBody() {
        if (!status) return null;

        // Peut tirer
        if (status.canDraw) {
            return (
                <View style={styles.hero}>
                    <View style={styles.heroIcon}><Icon name="ribbon" size={30} color={colors.warning} /></View>
                    <Text style={styles.heroCount}>{status.evaluationCount ?? 1}</Text>
                    <Text style={styles.heroLabel}>évaluation{(status.evaluationCount ?? 1) > 1 ? 's' : ''} disponible{(status.evaluationCount ?? 1) > 1 ? 's' : ''}</Text>
                    <Text style={styles.heroNote}>
                        Le sujet est tiré au sort. Dès le tirage, le chronomètre démarre : compose puis rends ta copie (photo ou réponses) avant la fin.
                    </Text>
                    <TouchableOpacity style={styles.primaryBtn} onPress={onDraw} disabled={busy} activeOpacity={0.85}>
                        {busy ? <ActivityIndicator color="#fff" /> : (
                            <><Icon name="shuffle" size={18} color="#fff" /><Text style={styles.primaryBtnText}>Tirer mon sujet</Text></>
                        )}
                    </TouchableOpacity>
                </View>
            );
        }

        const d = status.existingDraw;

        // Tirage en cours → reprendre
        if (status.reason === 'already_drawn' && d && (d.status === 'drawn' || d.status === 'in_progress') && (d.remainingMs ?? 0) > 0) {
            return (
                <StateCard icon="hourglass" color={colors.warning} styles={styles}
                    title="Évaluation en cours" text="Ton chronomètre tourne toujours. Reprends là où tu t'es arrêté.">
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => onResume(d._id)} disabled={busy} activeOpacity={0.85}>
                        {busy ? <ActivityIndicator color="#fff" /> : (
                            <><Icon name="play" size={18} color="#fff" /><Text style={styles.primaryBtnText}>Reprendre</Text></>
                        )}
                    </TouchableOpacity>
                </StateCard>
            );
        }

        // Déjà soumis / corrigé
        if (status.reason === 'already_drawn' && d) {
            if (d.submissionStatus === 'graded' || typeof d.grade === 'number') {
                return (
                    <StateCard icon="school" color={colors.success} styles={styles}
                        title={`Note : ${d.grade}/20`} text={d.feedback || 'Ton évaluation a été corrigée.'} />
                );
            }
            if (d.status === 'timeout') {
                return (
                    <StateCard icon="alert-circle" color={colors.error} styles={styles}
                        title="Temps dépassé" text="Le temps imparti a été dépassé — note automatique 0/20. Prochaine tentative au trimestre suivant." />
                );
            }
            return (
                <StateCard icon="time" color={colors.info} styles={styles}
                    title="En attente de correction" text={status.message || "Ton évaluation a été soumise. Tu seras notifié dès qu'elle sera corrigée."} />
            );
        }

        // Cas bloquants
        if (status.reason === 'course_not_completed') {
            return (
                <StateCard icon="lock-closed" color={colors.textMuted} styles={styles}
                    title="Termine d'abord le cours" text={status.message || 'Tu dois terminer toutes les sections du cours avant de passer une évaluation.'}>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
                        <Text style={styles.secondaryBtnText}>Retour au cours</Text>
                    </TouchableOpacity>
                </StateCard>
            );
        }
        if (status.reason === 'vacation_period') {
            return (
                <StateCard icon="sunny" color={colors.warning} styles={styles}
                    title="Période de vacances" text={status.message || "Pas d'évaluation pendant les vacances."} />
            );
        }
        if (status.reason === 'no_evaluations') {
            return (
                <StateCard icon="documents-outline" color={colors.textMuted} styles={styles}
                    title="Aucune évaluation" text={status.message || "Aucune évaluation n'est encore disponible pour ce cours."} />
            );
        }

        return null;
    }
}

function StateCard({ icon, color, title, text, styles, children }: {
    icon: IconName; color: string; title: string; text: string; styles: any; children?: React.ReactNode;
}) {
    return (
        <View style={styles.stateCard}>
            <View style={[styles.stateIcon, { backgroundColor: color + '18' }]}>
                <Icon name={icon} size={26} color={color} />
            </View>
            <Text style={styles.stateTitle}>{title}</Text>
            <Text style={styles.stateText}>{text}</Text>
            {children}
        </View>
    );
}

function createStyles(colors: ReturnType<typeof useColors>) {
    return StyleSheet.create({
        flex: { flex: 1 },
        container: { flex: 1, backgroundColor: colors.background },
        topbar: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
            backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
        },
        topbarTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg, color: colors.text },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['3xl'], gap: spacing.sm },
        emptyText: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: colors.textSecondary, textAlign: 'center' },
        retry: { marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primary + '15' },
        retryText: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.sm, color: colors.primary },
        courseTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg, color: colors.textSecondary, marginBottom: spacing.md },

        infoCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.lg },
        infoTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.base, color: colors.text },
        infoSub: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 1 },

        hero: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, ...shadows.sm },
        heroIcon: { width: 56, height: 56, borderRadius: radius.lg, backgroundColor: colors.warning + '18', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
        heroCount: { fontFamily: typography.fontFamily.display, fontSize: typography.size['5xl'], color: colors.text },
        heroLabel: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: colors.textSecondary },
        heroNote: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md, lineHeight: typography.size.sm * 1.5 },

        primaryBtn: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
            backgroundColor: colors.primary, paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
            borderRadius: radius.lg, marginTop: spacing.lg, alignSelf: 'stretch',
        },
        primaryBtnText: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.base, color: '#fff' },
        secondaryBtn: { marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary },
        secondaryBtnText: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.sm, color: colors.primary },

        stateCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, ...shadows.sm },
        stateIcon: { width: 54, height: 54, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
        stateTitle: { fontFamily: typography.fontFamily.display, fontSize: typography.size.xl, color: colors.text, textAlign: 'center' },
        stateText: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, lineHeight: typography.size.sm * 1.5 },
    });
}
