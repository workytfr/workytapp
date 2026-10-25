import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Icon from './Icon';
import { useColors } from '../lib/useColors';
import { spacing, radius, typography } from '../lib/theme';
import { DrawnEvaluation, submitEvaluationDraw, uploadEvaluationFiles } from '../lib/api';
import PdfViewer from './PdfViewer';

interface EvaluationExamProps {
    drawId: string;
    evaluation: DrawnEvaluation;
    mustSubmitBefore: string; // ISO date
    onSubmitted: () => void;
}

interface LocalPhoto { uri: string; name: string; mimeType: string }

function formatRemaining(ms: number): string {
    if (ms <= 0) return '00:00';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function EvaluationExam({ drawId, evaluation, mustSubmitBefore, onSubmitted }: EvaluationExamProps) {
    const colors = useColors();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const deadline = useMemo(() => new Date(mustSubmitBefore).getTime(), [mustSubmitBefore]);
    const [remaining, setRemaining] = useState(() => deadline - Date.now());
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [photos, setPhotos] = useState<LocalPhoto[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const submittedRef = useRef(false);

    const expired = remaining <= 0;

    // Chrono (source de vérité = deadline serveur)
    useEffect(() => {
        const t = setInterval(() => setRemaining(deadline - Date.now()), 1000);
        return () => clearInterval(t);
    }, [deadline]);

    const questions = useMemo(
        () => (evaluation.questions ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        [evaluation.questions],
    );

    const setAnswer = useCallback((idx: number, value: string) => {
        setAnswers((a) => ({ ...a, [idx]: value }));
    }, []);

    const addPhotos = useCallback(async (fromCamera: boolean) => {
        if (photos.length >= 5) {
            Alert.alert('Limite atteinte', 'Maximum 5 photos.');
            return;
        }
        const perm = fromCamera
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('Autorisation requise', fromCamera ? "Autorise l'appareil photo." : 'Autorise la galerie.');
            return;
        }
        const result = fromCamera
            ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
            : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true, selectionLimit: 5 - photos.length });
        if (result.canceled) return;
        const added: LocalPhoto[] = result.assets.map((a, i) => ({
            uri: a.uri,
            name: a.fileName || `copie-${Date.now()}-${i}.jpg`,
            mimeType: a.mimeType || 'image/jpeg',
        }));
        setPhotos((p) => [...p, ...added].slice(0, 5));
    }, [photos.length]);

    const removePhoto = useCallback((idx: number) => {
        setPhotos((p) => p.filter((_, i) => i !== idx));
    }, []);

    const doSubmit = useCallback(async (auto = false) => {
        if (submittedRef.current || submitting) return;

        // Construire les réponses en ligne
        const onlineAnswers = questions
            .map((q, idx) => ({ order: q.order ?? idx, questionText: q.questionText, answer: (answers[idx] || '').trim() }))
            .filter((a) => a.answer.length > 0);

        // Réponses aux énoncés du PDF (hybride)
        const pdfAnswers = (evaluation.pdfExercises ?? [])
            .map((ex, idx) => ({ order: idx, questionText: ex.enonce, answer: (answers[idx] || '').trim() }))
            .filter((a) => a.answer.length > 0);

        if (!auto) {
            if (evaluation.type === 'form' && onlineAnswers.length === 0) {
                Alert.alert('Réponses requises', 'Réponds à au moins une question.');
                return;
            }
            if (evaluation.type === 'pdf' && photos.length === 0 && pdfAnswers.length === 0) {
                Alert.alert('Copie requise', 'Ajoute au moins une photo de ta copie, ou réponds en ligne.');
                return;
            }
        }

        setSubmitting(true);
        try {
            let submittedFiles: string[] = [];
            if (evaluation.type === 'pdf' && photos.length > 0) {
                const up = await uploadEvaluationFiles(photos, 'submission');
                submittedFiles = up.urls || [];
            }
            const payload =
                evaluation.type === 'form'
                    ? { answers: onlineAnswers }
                    : { answers: pdfAnswers, submittedFiles };
            await submitEvaluationDraw(drawId, payload);
            submittedRef.current = true;
            onSubmitted();
        } catch (e: any) {
            Alert.alert('Envoi impossible', e?.message || 'Réessaie.');
        } finally {
            setSubmitting(false);
        }
    }, [answers, photos, questions, evaluation, drawId, onSubmitted, submitting]);

    // Auto-soumission quand le temps est écoulé (si du contenu existe)
    useEffect(() => {
        if (expired && !submittedRef.current && !submitting) {
            const hasContent =
                Object.values(answers).some((v) => v.trim().length > 0) || photos.length > 0;
            if (hasContent) doSubmit(true);
        }
    }, [expired]); // eslint-disable-line react-hooks/exhaustive-deps

    const timerColor = remaining < 60_000 ? colors.error : remaining < 5 * 60_000 ? colors.warning : colors.success;

    return (
        <View style={styles.wrap}>
            {/* Chrono collant en haut */}
            <View style={[styles.timerBar, { borderColor: timerColor + '55', backgroundColor: timerColor + '12' }]}>
                <Icon name="time" size={18} color={timerColor} />
                <Text style={[styles.timerText, { color: timerColor }]}>
                    {expired ? 'Temps écoulé' : formatRemaining(remaining)}
                </Text>
                <Text style={styles.timerHint}>{evaluation.title}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {evaluation.description ? <Text style={styles.desc}>{evaluation.description}</Text> : null}

                {/* TYPE FORM : questions dans l'app */}
                {evaluation.type === 'form' &&
                    questions.map((q, idx) => (
                        <View key={idx} style={styles.qCard}>
                            <Text style={styles.qText}>
                                {idx + 1}. {q.questionText}
                                {q.points ? <Text style={styles.qPoints}>  ({q.points} pt{q.points > 1 ? 's' : ''})</Text> : null}
                            </Text>

                            {q.questionType === 'multiple_choice' && q.options ? (
                                <View style={styles.options}>
                                    {q.options.map((opt) => {
                                        const selected = answers[idx] === opt;
                                        return (
                                            <TouchableOpacity
                                                key={opt}
                                                style={[styles.option, selected && styles.optionSel]}
                                                onPress={() => setAnswer(idx, opt)}
                                                disabled={expired}
                                            >
                                                <Icon
                                                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                                                    size={18}
                                                    color={selected ? colors.primary : colors.textMuted}
                                                />
                                                <Text style={[styles.optionText, selected && { color: colors.primary }]}>{opt}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ) : (
                                <TextInput
                                    style={[styles.input, q.questionType === 'text' && styles.inputMulti]}
                                    placeholder={q.questionType === 'file_link' ? 'Colle un lien…' : 'Ta réponse…'}
                                    placeholderTextColor={colors.textMuted}
                                    value={answers[idx] || ''}
                                    onChangeText={(v) => setAnswer(idx, v)}
                                    multiline={q.questionType === 'text'}
                                    keyboardType={q.questionType === 'number' ? 'numeric' : 'default'}
                                    editable={!expired}
                                />
                            )}
                        </View>
                    ))}

                {/* TYPE PDF : sujet + réponses hybrides + photos de copie */}
                {evaluation.type === 'pdf' && (
                    <>
                        {evaluation.pdfUrl ? <PdfViewer url={evaluation.pdfUrl} label="Sujet de l'évaluation" /> : null}

                        {(evaluation.pdfExercises ?? []).length > 0 && (
                            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                                <Text style={styles.sectionLabel}>Répondre en ligne (optionnel)</Text>
                                {evaluation.pdfExercises!.map((ex, idx) => (
                                    <View key={idx} style={styles.qCard}>
                                        <Text style={styles.qText}>
                                            {idx + 1}. {ex.enonce}
                                            {ex.points ? <Text style={styles.qPoints}>  ({ex.points} pt{ex.points > 1 ? 's' : ''})</Text> : null}
                                        </Text>
                                        <TextInput
                                            style={[styles.input, styles.inputMulti]}
                                            placeholder="Ta réponse…"
                                            placeholderTextColor={colors.textMuted}
                                            value={answers[idx] || ''}
                                            onChangeText={(v) => setAnswer(idx, v)}
                                            multiline
                                            editable={!expired}
                                        />
                                    </View>
                                ))}
                            </View>
                        )}

                        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                            <Text style={styles.sectionLabel}>Photos de ta copie ({photos.length}/5)</Text>
                            <View style={styles.photoRow}>
                                {photos.map((p, i) => (
                                    <View key={i} style={styles.photoThumb}>
                                        <Image source={{ uri: p.uri }} style={styles.photoImg} />
                                        <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)}>
                                            <Icon name="close" size={14} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                {photos.length < 5 && !expired && (
                                    <>
                                        <TouchableOpacity style={styles.photoAdd} onPress={() => addPhotos(true)}>
                                            <Icon name="camera" size={22} color={colors.primary} />
                                            <Text style={styles.photoAddText}>Photo</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.photoAdd} onPress={() => addPhotos(false)}>
                                            <Icon name="images" size={22} color={colors.primary} />
                                            <Text style={styles.photoAddText}>Galerie</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </View>
                    </>
                )}

                <TouchableOpacity
                    style={[styles.submitBtn, (submitting || expired) && { opacity: 0.6 }]}
                    onPress={() => doSubmit(false)}
                    disabled={submitting || expired}
                    activeOpacity={0.85}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Icon name="send" size={18} color="#fff" />
                            <Text style={styles.submitText}>{expired ? 'Temps écoulé' : 'Rendre ma copie'}</Text>
                        </>
                    )}
                </TouchableOpacity>

                {expired && (
                    <Text style={styles.expiredNote}>
                        Le temps est écoulé. Si tu n'as rien rendu, l'évaluation sera notée 0/20.
                    </Text>
                )}
            </ScrollView>
        </View>
    );
}

function createStyles(colors: ReturnType<typeof useColors>) {
    return StyleSheet.create({
        wrap: { flex: 1 },
        timerBar: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
            paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
            borderWidth: 1.5, borderRadius: radius.lg, margin: spacing.md,
        },
        timerText: { fontFamily: typography.fontFamily.display, fontSize: typography.size.xl },
        timerHint: { flex: 1, textAlign: 'right', fontFamily: typography.fontFamily.medium, fontSize: typography.size.xs, color: colors.textMuted },
        body: { paddingHorizontal: spacing.lg, paddingBottom: spacing['3xl'], gap: spacing.md },
        desc: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: colors.textSecondary, lineHeight: typography.size.base * 1.5 },
        sectionLabel: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.base, color: colors.text },
        qCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
        qText: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.base, color: colors.text, lineHeight: typography.size.base * 1.4 },
        qPoints: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textMuted },
        options: { gap: spacing.xs },
        option: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
            padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
        },
        optionSel: { borderColor: colors.primary, backgroundColor: colors.primary + '0D' },
        optionText: { flex: 1, fontFamily: typography.fontFamily.medium, fontSize: typography.size.base, color: colors.text },
        input: {
            backgroundColor: colors.surfaceVariant, borderRadius: radius.md,
            paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
            fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: colors.text,
        },
        inputMulti: { minHeight: 80, textAlignVertical: 'top' },
        photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
        photoThumb: { position: 'relative' },
        photoImg: { width: 80, height: 80, borderRadius: radius.md, backgroundColor: colors.surfaceVariant },
        photoRemove: {
            position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11,
            backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center',
        },
        photoAdd: {
            width: 80, height: 80, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary + '55',
            borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 2,
        },
        photoAddText: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.xs, color: colors.primary },
        submitBtn: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
            backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.lg, marginTop: spacing.md,
        },
        submitText: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.base, color: '#fff' },
        expiredNote: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.error, textAlign: 'center', marginTop: spacing.sm },
    });
}
