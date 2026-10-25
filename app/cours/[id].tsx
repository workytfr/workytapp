import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import Icon from '../../components/Icon';
import { useColors } from '../../lib/useColors';
import { spacing, radius, typography, type ThemeColors } from '../../lib/theme';
import {
    getCourseFull, getCourseEvaluations, getCourseProgress,
    type CourseFull, type SectionTree, type CourseProgress,
} from '../../lib/api';
import { getCourseCompetencies, type Competency } from '../../lib/gamification';
import { getSiteOrigin } from '../../lib/siteOrigin';
import BookmarkButton from '../../components/BookmarkButton';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import PaperDots from '../../components/PaperDots';
import { LevelChip, SubjectLabel, XpBar, EmptyState } from '../../components/wk';
import { PrimaryButton } from '../../components/mobile';
import { tapLight } from '../../lib/haptics';
import { saveRecentCourse } from '../../lib/recent';

type Step = { kind: 'lesson' | 'exercise' | 'quiz'; id: string; title: string; tag?: string; sectionId: string };

function resolveImg(src?: string | null): string | null {
    if (!src) return null;
    if (src.startsWith('http')) return src;
    return `${getSiteOrigin()}${src.startsWith('/') ? '' : '/'}${src}`;
}

/** Étapes d'une section, dans l'ordre du parcours : leçons, puis exercices, puis quiz */
function stepsOf(section: SectionTree): Step[] {
    return [
        ...(section.lessons ?? []).map((l) => ({ kind: 'lesson' as const, id: l._id, title: l.title, tag: 'Leçon', sectionId: section._id })),
        ...(section.exercises ?? []).map((e) => ({ kind: 'exercise' as const, id: e._id, title: e.title, tag: e.difficulty || 'Exercice', sectionId: section._id })),
        ...(section.quizzes ?? []).map((q) => ({ kind: 'quiz' as const, id: q._id, title: q.title, tag: 'Quiz', sectionId: section._id })),
    ];
}

const KIND_ICON: Record<Step['kind'], string> = { lesson: 'book-outline', exercise: 'create-outline', quiz: 'help-circle-outline' };

const STATUS_LABEL: Record<string, string> = {
    not_started: 'À découvrir',
    learning: 'En cours',
    in_progress: 'En cours',
    acquired: 'Acquise',
    mastered: 'Maîtrisée',
};

export default function CourseDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);

    const [course, setCourse] = useState<CourseFull | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [evalCount, setEvalCount] = useState(0);
    const [progress, setProgress] = useState<CourseProgress | null>(null);
    const [open, setOpen] = useState<Record<string, boolean>>({});
    const [descOpen, setDescOpen] = useState(false);
    const [competencies, setCompetencies] = useState<Competency[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const data = await getCourseFull(id);
                setCourse(data.cours);
                saveRecentCourse({ id, title: data.cours.title, image: data.cours.image, matiere: data.cours.matiere });
            } catch (e: any) {
                setError(e.message || 'Impossible de charger le cours.');
            } finally {
                setLoading(false);
            }
            getCourseEvaluations(id).then((ev) => setEvalCount(ev?.evaluationCount ?? 0)).catch(() => {});
            getCourseCompetencies(id).then(setCompetencies).catch(() => {});
        })();
    }, [id]);

    // Rafraîchit la progression au retour sur l'écran (après lecture de leçons)
    useFocusEffect(
        useCallback(() => {
            let alive = true;
            getCourseProgress(id).then((p) => { if (alive) setProgress(p); }).catch(() => {});
            return () => { alive = false; };
        }, [id]),
    );

    const sections = course?.sections ?? [];
    const read = useMemo(() => new Set(progress?.lessonsRead ?? []), [progress]);
    const doneSections = useMemo(() => new Set(progress?.sectionsCompleted ?? []), [progress]);

    // Section « en cours » : la première non terminée
    const currentIndex = useMemo(() => {
        const i = sections.findIndex((sec) => !doneSections.has(sec._id));
        return i === -1 ? sections.length - 1 : i;
    }, [sections, doneSections]);

    // Ouvre la section en cours au premier affichage
    useEffect(() => {
        const sec = sections[currentIndex];
        if (sec) setOpen((o) => (Object.keys(o).length ? o : { [sec._id]: true }));
    }, [sections, currentIndex]);

    // Prochaine leçon non lue : cible du bouton « Continuer »
    const nextLesson = useMemo(() => {
        for (const sec of sections) {
            for (const l of sec.lessons ?? []) if (!read.has(l._id)) return { sec, lesson: l };
        }
        return null;
    }, [sections, read]);

    const started = (progress?.lessonsRead.length ?? 0) > 0;
    const finished = !!progress && progress.totalSections > 0 && progress.sectionsCompleted.length >= progress.totalSections;

    const openStep = useCallback((step: Step) => {
        tapLight();
        if (step.kind === 'lesson') {
            router.push({ pathname: '/cours/lesson', params: { courseId: id, sectionId: step.sectionId, lessonId: step.id } });
        } else if (step.kind === 'exercise') {
            router.push({ pathname: '/cours/exercise', params: { id: step.id } });
        } else {
            router.push({ pathname: '/cours/quiz', params: { id: step.id } });
        }
    }, [router, id]);

    const onContinue = useCallback(() => {
        if (nextLesson) {
            router.push({ pathname: '/cours/lesson', params: { courseId: id, sectionId: nextLesson.sec._id, lessonId: nextLesson.lesson._id } });
        } else if (evalCount > 0) {
            router.push({ pathname: '/cours/evaluations', params: { id, title: course?.title ?? '' } });
        }
    }, [nextLesson, evalCount, router, id, course?.title]);

    const cover = resolveImg(course?.image);

    const TopButtons = (
        <View style={[s.topButtons, { top: insets.top + spacing.sm }]}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={s.roundBtn} accessibilityLabel="Retour">
                <Icon name="arrow-back" size={20} color={colors.text} />
            </Pressable>
            {id ? <View style={s.roundBtn}><BookmarkButton type="cours" id={String(id)} size={18} bordered={false} /></View> : null}
        </View>
    );

    if (loading || error || !course) {
        return (
            <View style={s.container}>
                <Stack.Screen options={{ headerShown: false }} />
                {TopButtons}
                {loading ? (
                    <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
                ) : (
                    <EmptyState icon="cloud-offline-outline" title="Oups" text={error || 'Cours introuvable.'} actionLabel="Retour" onAction={() => router.back()} />
                )}
            </View>
        );
    }

    const ctaLabel = finished
        ? (evalCount > 0 ? "Passer l'évaluation" : 'Cours terminé')
        : nextLesson
            ? (started ? 'Continuer' : 'Commencer le cours')
            : 'Revoir le cours';

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
                {/* Couverture */}
                <View style={[s.cover, { height: (cover ? 230 : 120) + insets.top }]}>
                    {cover ? (
                        <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    ) : (
                        <PaperDots />
                    )}
                    {cover ? <View style={s.coverShade} /> : null}
                </View>

                {/* En-tête du cours, en carte qui chevauche la couverture */}
                <View style={s.headCard}>
                    {course.matiere ? <SubjectLabel subject={course.matiere} /> : null}
                    <Text style={s.title}>{course.title}<Text style={{ color: colors.primary }}>.</Text></Text>
                    <View style={s.metaRow}>
                        {course.niveau ? <LevelChip level={course.niveau} /> : null}
                        <View style={s.metaItem}>
                            <Icon name="layers-outline" size={13} color={colors.textMuted} />
                            <Text style={s.metaText}>{sections.length} chapitre{sections.length > 1 ? 's' : ''}</Text>
                        </View>
                        {progress ? (
                            <View style={s.metaItem}>
                                <Icon name="book-outline" size={13} color={colors.textMuted} />
                                <Text style={s.metaText}>{progress.totalLessons} leçons</Text>
                            </View>
                        ) : null}
                    </View>

                    {course.description ? (
                        <Pressable onPress={() => setDescOpen((v) => !v)} style={s.desc}>
                            <View style={descOpen ? undefined : s.descClamp}>
                                <MarkdownRenderer content={course.description} />
                            </View>
                            <Text style={s.more}>{descOpen ? 'Réduire' : 'Lire la suite'}</Text>
                        </Pressable>
                    ) : null}

                    {/* Progression */}
                    {progress && progress.totalSections > 0 ? (
                        <View style={s.progress}>
                            <View style={s.progressTop}>
                                <Text style={s.progressLabel}>Ta progression</Text>
                                <Text style={s.progressPct}>{progress.percentage}%</Text>
                            </View>
                            <XpBar percent={progress.percentage} />
                            <Text style={s.progressMeta}>
                                {progress.lessonsRead.length}/{progress.totalLessons} leçons lues · {progress.sectionsCompleted.length}/{progress.totalSections} chapitres terminés
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* Évaluation */}
                {evalCount > 0 ? (
                    <Pressable
                        style={({ pressed }) => [s.evalCard, finished && s.evalCardReady, pressed && { opacity: 0.85 }]}
                        onPress={() => router.push({ pathname: '/cours/evaluations', params: { id, title: course.title } })}
                    >
                        <View style={[s.evalIcon, finished && { backgroundColor: colors.primary }]}>
                            <Icon name="ribbon" size={20} color={finished ? '#fff' : colors.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.evalTitle}>{finished ? 'Évaluation débloquée !' : 'Évaluation de fin de cours'}</Text>
                            <Text style={s.evalSub}>
                                {finished ? 'Teste tes connaissances et décroche ton badge.' : 'Termine tous les chapitres pour la débloquer.'}
                            </Text>
                        </View>
                        <Icon name="chevron-forward" size={18} color={colors.textMuted} />
                    </Pressable>
                ) : null}

                {/* Parcours */}
                <View style={s.pathHead}>
                    <View style={s.eyebrowLine} />
                    <Text style={s.eyebrow}>Programme</Text>
                </View>

                <View style={s.path}>
                    {sections.map((sec, i) => {
                        const steps = stepsOf(sec);
                        const done = doneSections.has(sec._id);
                        const current = i === currentIndex && !done;
                        const isOpen = !!open[sec._id];
                        const last = i === sections.length - 1;
                        const lessonsRead = (sec.lessons ?? []).filter((l) => read.has(l._id)).length;
                        return (
                            <View key={sec._id} style={s.node}>
                                {/* Rail : pastille + trait vers l'étape suivante */}
                                <View style={s.rail}>
                                    <View style={[s.dot, done && s.dotDone, current && s.dotCurrent]}>
                                        {done ? (
                                            <Icon name="checkmark" size={16} color="#fff" strokeWidth={3} />
                                        ) : (
                                            <Text style={[s.dotText, current && { color: '#fff' }]}>{i + 1}</Text>
                                        )}
                                    </View>
                                    {!last ? <View style={[s.line, done && s.lineDone]} /> : null}
                                </View>

                                <View style={[s.sectionCard, current && s.sectionCardCurrent]}>
                                    <Pressable
                                        onPress={() => { tapLight(); setOpen((o) => ({ ...o, [sec._id]: !o[sec._id] })); }}
                                        style={s.sectionHead}
                                        accessibilityRole="button"
                                        accessibilityState={{ expanded: isOpen }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            {current ? <Text style={s.currentTag}>En cours</Text> : null}
                                            <Text style={s.sectionTitle}>{sec.title}</Text>
                                            <Text style={s.sectionMeta}>
                                                {[
                                                    (sec.lessons?.length ?? 0) > 0 ? `${lessonsRead}/${sec.lessons!.length} leçons` : '',
                                                    (sec.exercises?.length ?? 0) > 0 ? `${sec.exercises!.length} exercice${sec.exercises!.length > 1 ? 's' : ''}` : '',
                                                    (sec.quizzes?.length ?? 0) > 0 ? `${sec.quizzes!.length} quiz` : '',
                                                ].filter(Boolean).join(' · ')}
                                            </Text>
                                        </View>
                                        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
                                    </Pressable>

                                    {isOpen ? (
                                        <View style={s.steps}>
                                            {steps.length === 0 ? <Text style={s.sectionMeta}>Chapitre vide pour l'instant.</Text> : null}
                                            {steps.map((st) => {
                                                const ok = st.kind === 'lesson' && read.has(st.id);
                                                return (
                                                    <Pressable
                                                        key={st.kind + st.id}
                                                        onPress={() => openStep(st)}
                                                        style={({ pressed }) => [s.step, pressed && { backgroundColor: colors.surfaceVariant }]}
                                                    >
                                                        <View style={[s.stepIcon, ok && { backgroundColor: colors.success + '22' }]}>
                                                            <Icon name={ok ? 'checkmark' : KIND_ICON[st.kind]} size={16} color={ok ? colors.success : colors.accent} />
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={s.stepTag}>{st.tag}</Text>
                                                            <Text style={[s.stepTitle, ok && { color: colors.textSecondary }]} numberOfLines={2}>{st.title}</Text>
                                                        </View>
                                                        <Icon name="chevron-forward" size={16} color={colors.textMuted} />
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    ) : null}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Compétences travaillées (si le cours en déclare) */}
                {competencies.length > 0 ? (
                    <View style={s.skills}>
                        <View style={s.pathHead}>
                            <View style={s.eyebrowLine} />
                            <Text style={s.eyebrow}>Compétences travaillées</Text>
                        </View>
                        {competencies.slice(0, 12).map((c) => {
                            const acquired = c.status === 'acquired' || c.status === 'mastered';
                            return (
                                <View key={c.skillId} style={s.skill}>
                                    <Icon name={acquired ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={acquired ? colors.success : colors.textMuted} />
                                    <Text style={s.skillText} numberOfLines={3}>{c.description}</Text>
                                    <Text style={[s.skillStatus, acquired && { color: colors.success }]}>{STATUS_LABEL[c.status] ?? c.status}</Text>
                                </View>
                            );
                        })}
                    </View>
                ) : null}
            </ScrollView>

            {TopButtons}

            {/* Action principale, toujours à portée de pouce */}
            <View style={[s.ctaBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                {nextLesson && !finished ? (
                    <Text style={s.ctaHint} numberOfLines={1}>
                        {started ? 'Reprendre : ' : 'Première leçon : '}<Text style={{ color: colors.text }}>{nextLesson.lesson.title}</Text>
                    </Text>
                ) : null}
                <PrimaryButton
                    label={ctaLabel}
                    icon={finished ? 'ribbon' : 'play'}
                    onPress={onContinue}
                    disabled={!nextLesson && !(finished && evalCount > 0)}
                    style={{ flex: 0 }}
                />
            </View>
        </View>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

        topButtons: { position: 'absolute', left: spacing.lg, right: spacing.lg, flexDirection: 'row', justifyContent: 'space-between' },
        roundBtn: {
            width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
            backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
        },

        cover: { width: '100%', backgroundColor: c.surfaceVariant, overflow: 'hidden' },
        coverShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(26,21,18,0.12)' },

        headCard: {
            marginTop: -36,
            marginHorizontal: spacing.lg,
            padding: spacing.xl,
            backgroundColor: c.surface,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: c.border,
            gap: spacing.sm,
        },
        title: { fontFamily: typography.fontFamily.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.6, color: c.text },
        metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
        metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        metaText: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textMuted },
        desc: { marginTop: spacing.xs },
        descClamp: { maxHeight: 92, overflow: 'hidden' },
        more: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.accent, marginTop: 4 },

        progress: { marginTop: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.divider, gap: spacing.sm },
        progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
        progressLabel: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.text },
        progressPct: { fontFamily: typography.fontFamily.display, fontSize: 22, color: c.accent },
        progressMeta: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textMuted },

        evalCard: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.md,
            marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md,
            backgroundColor: c.surface, borderRadius: radius['2xl'], borderWidth: 1, borderColor: c.border,
        },
        evalCardReady: { borderColor: c.primary, backgroundColor: c.primary + '0D' },
        evalIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceVariant },
        evalTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: c.text },
        evalSub: { fontFamily: typography.fontFamily.regular, fontSize: 12.5, color: c.textSecondary, marginTop: 1 },

        pathHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing['2xl'], marginBottom: spacing.md, paddingHorizontal: spacing.lg },
        eyebrowLine: { width: 28, height: 1, backgroundColor: c.textMuted, opacity: 0.6 },
        eyebrow: { fontFamily: typography.fontFamily.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: c.textSecondary },

        path: { paddingHorizontal: spacing.lg },
        node: { flexDirection: 'row', gap: spacing.md },
        rail: { width: 36, alignItems: 'center' },
        dot: {
            width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
            backgroundColor: c.surface, borderWidth: 2, borderColor: c.border,
        },
        dotDone: { backgroundColor: c.success, borderColor: c.success },
        dotCurrent: { backgroundColor: c.primary, borderColor: c.primaryDark },
        dotText: { fontFamily: typography.fontFamily.displayBold, fontSize: 15, color: c.textSecondary },
        line: { flex: 1, width: 2, backgroundColor: c.border, marginVertical: 4, minHeight: 16 },
        lineDone: { backgroundColor: c.success },

        sectionCard: {
            flex: 1, marginBottom: spacing.md,
            backgroundColor: c.surface, borderRadius: radius['2xl'], borderWidth: 1, borderColor: c.border,
            overflow: 'hidden',
        },
        sectionCardCurrent: { borderColor: c.primary, borderWidth: 1.5 },
        sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, minHeight: 56 },
        currentTag: { fontFamily: typography.fontFamily.mono, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: c.accent, marginBottom: 2 },
        sectionTitle: { fontFamily: typography.fontFamily.display, fontSize: 17, lineHeight: 21, color: c.text },
        sectionMeta: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 3 },

        steps: { borderTopWidth: 1, borderTopColor: c.divider, paddingVertical: spacing.xs },
        step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 10, minHeight: 52 },
        stepIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceVariant },
        stepTag: { fontFamily: typography.fontFamily.semiBold, fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase', color: c.textMuted },
        stepTitle: { fontFamily: typography.fontFamily.medium, fontSize: 14, lineHeight: 19, color: c.text },

        skills: { paddingBottom: spacing.md },
        skill: {
            flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
            marginHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.divider,
        },
        skillText: { flex: 1, fontFamily: typography.fontFamily.regular, fontSize: 13.5, lineHeight: 19, color: c.text },
        skillStatus: { fontFamily: typography.fontFamily.semiBold, fontSize: 11, color: c.textMuted },

        ctaBar: {
            position: 'absolute', left: 0, right: 0, bottom: 0,
            paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm,
            backgroundColor: c.background, borderTopWidth: 1, borderTopColor: c.border,
        },
        ctaHint: { fontFamily: typography.fontFamily.regular, fontSize: 12.5, color: c.textMuted },
    });
}
