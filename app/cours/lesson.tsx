import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import { useColors } from '../../lib/useColors';
import { spacing, radius, typography, type ThemeColors } from '../../lib/theme';
import { getCourseFull, getSectionDetail, markLessonRead, type SectionTree } from '../../lib/api';
import HtmlContent from '../../components/HtmlContent';
import { EmptyState } from '../../components/wk';
import { PrimaryButton } from '../../components/mobile';
import { success, tapLight } from '../../lib/haptics';

interface Lesson { _id: string; title: string; content?: string; order?: number }

/**
 * Lecteur de leçon pensé pour le pouce : barre de progression du chapitre
 * en haut, contenu plein écran, « Suivant » toujours en bas. À la dernière
 * leçon, on enchaîne sur le chapitre suivant au lieu d'un cul-de-sac.
 */
export default function LessonScreen() {
    const { courseId, sectionId, lessonId } = useLocalSearchParams<{ courseId: string; sectionId: string; lessonId: string }>();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);
    const scrollRef = useRef<ScrollViewInstance | null>(null);

    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [index, setIndex] = useState(0);
    const [sectionTitle, setSectionTitle] = useState('');
    const [nextSection, setNextSection] = useState<SectionTree | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const data = await getSectionDetail(courseId, sectionId);
                const ls: Lesson[] = (data.section?.lessons ?? []).map((l: any) => ({
                    _id: l._id, title: l.title, content: l.content ?? l.body ?? '', order: l.order,
                }));
                setLessons(ls);
                setSectionTitle(data.section?.title ?? '');
                const i = ls.findIndex((l) => l._id === lessonId);
                setIndex(i >= 0 ? i : 0);
            } catch (e: any) {
                setError(e.message || 'Impossible de charger la leçon.');
            } finally {
                setLoading(false);
            }
            // Chapitre suivant (arbre du cours, déjà en cache depuis la page du cours)
            getCourseFull(courseId).then(({ cours }) => {
                const secs = cours.sections ?? [];
                const at = secs.findIndex((x) => x._id === sectionId);
                const after = secs.slice(at + 1).find((x) => (x.lessons?.length ?? 0) > 0) ?? null;
                setNextSection(after);
            }).catch(() => {});
        })();
    }, [courseId, sectionId, lessonId]);

    const lesson = lessons[index];
    const isLast = index >= lessons.length - 1;

    // Marque la leçon consultée comme lue (fait avancer la progression du cours)
    useEffect(() => {
        if (!lesson?._id || !courseId) return;
        markLessonRead(courseId, lesson._id, sectionId).catch(() => {});
    }, [lesson?._id, courseId, sectionId]);

    const go = (i: number) => {
        tapLight();
        setIndex(i);
        scrollRef.current?.scrollTo({ y: 0, animated: false });
    };

    const onNext = () => {
        if (!isLast) return go(index + 1);
        success();
        if (nextSection?.lessons?.[0]) {
            router.replace({
                pathname: '/cours/lesson',
                params: { courseId, sectionId: nextSection._id, lessonId: nextSection.lessons[0]._id },
            });
        } else {
            router.back();
        }
    };

    const pct = lessons.length ? ((index + 1) / lessons.length) * 100 : 0;

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Barre du haut : fermer + progression du chapitre */}
            <View style={[s.topbar, { paddingTop: insets.top + spacing.sm }]}>
                <Pressable onPress={() => router.back()} hitSlop={10} style={s.close} accessibilityLabel="Fermer la leçon">
                    <Icon name="close" size={22} color={colors.text} />
                </Pressable>
                <View style={{ flex: 1 }}>
                    <Text style={s.chapter} numberOfLines={1}>{sectionTitle || 'Leçon'}</Text>
                    <View style={s.track}><View style={[s.fill, { width: `${pct}%` }]} /></View>
                </View>
                <Text style={s.count}>{lessons.length ? `${index + 1}/${lessons.length}` : ''}</Text>
            </View>

            {loading ? (
                <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
            ) : error ? (
                <EmptyState icon="cloud-offline-outline" title="Oups" text={error} actionLabel="Retour" onAction={() => router.back()} />
            ) : lesson ? (
                <>
                    <ScrollView
                        ref={scrollRef}
                        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={s.kicker}>Leçon {index + 1}</Text>
                        <Text style={s.title}>{lesson.title}</Text>
                        {lesson.content ? (
                            <HtmlContent html={lesson.content} />
                        ) : (
                            <Text style={s.emptyText}>Cette leçon n'a pas encore de contenu.</Text>
                        )}

                        {/* Poser une question sur cette leçon, au bon endroit */}
                        <Pressable
                            style={({ pressed }) => [s.ask, pressed && { opacity: 0.8 }]}
                            onPress={() => router.push('/forum/create')}
                        >
                            <Icon name="chatbubbles-outline" size={18} color={colors.accent} />
                            <Text style={s.askText}>Pas clair ? Pose ta question sur cette leçon</Text>
                            <Icon name="chevron-forward" size={16} color={colors.textMuted} />
                        </Pressable>
                    </ScrollView>

                    <View style={[s.nav, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                        {index > 0 ? (
                            <Pressable onPress={() => go(index - 1)} style={s.prev} accessibilityLabel="Leçon précédente">
                                <Icon name="chevron-back" size={22} color={colors.text} />
                            </Pressable>
                        ) : null}
                        <PrimaryButton
                            label={!isLast ? 'Suivant' : nextSection ? 'Chapitre suivant' : 'Terminer'}
                            icon={!isLast ? 'arrow-forward' : nextSection ? 'play' : 'checkmark'}
                            onPress={onNext}
                        />
                    </View>
                </>
            ) : (
                <EmptyState icon="book-outline" title="Leçon introuvable" actionLabel="Retour" onAction={() => router.back()} />
            )}
        </View>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        topbar: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.md,
            paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
            backgroundColor: c.background, borderBottomWidth: 1, borderBottomColor: c.border,
        },
        close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
        chapter: { fontFamily: typography.fontFamily.semiBold, fontSize: 12, color: c.textSecondary, marginBottom: 6 },
        track: { height: 8, borderRadius: 4, backgroundColor: c.surfaceVariant, overflow: 'hidden' },
        fill: { height: '100%', borderRadius: 4, backgroundColor: c.primary },
        count: { fontFamily: typography.fontFamily.mono, fontSize: 12, color: c.textMuted, minWidth: 32, textAlign: 'right' },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        emptyText: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: c.textSecondary },
        kicker: { fontFamily: typography.fontFamily.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: c.accent, marginBottom: spacing.xs },
        title: { fontFamily: typography.fontFamily.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.5, color: c.text, marginBottom: spacing.md },
        ask: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl,
            padding: spacing.md, borderRadius: radius['2xl'], borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
        },
        askText: { flex: 1, fontFamily: typography.fontFamily.semiBold, fontSize: 13.5, color: c.text },
        nav: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
            paddingHorizontal: spacing.lg, paddingTop: spacing.md,
            borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.background,
        },
        prev: {
            width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
        },
    });
}
