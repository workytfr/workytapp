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
import { getExercise } from '../../lib/api';
import { getSiteOrigin } from '../../lib/siteOrigin';
import HtmlContent from '../../components/HtmlContent';

function resolveImg(src?: string | null): string | null {
    if (!src) return null;
    if (src.startsWith('http')) return src;
    return `${getSiteOrigin()}${src.startsWith('/') ? '' : '/'}${src}`;
}

export default function ExerciseScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [ex, setEx] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCorrection, setShowCorrection] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                setEx(await getExercise(id));
            } catch (e: any) {
                setError(e.message || "Impossible de charger l'exercice.");
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const statement = ex && (ex.content || ex.enonce || ex.consigne || ex.description || ex.statement || '');
    const exImg = resolveImg(ex?.image);
    const correctionText = ex?.correction?.text || ex?.correctionText || '';
    const correctionImg = resolveImg(ex?.correction?.image);
    const hasCorrection = !!correctionText || !!correctionImg;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm }]}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
                    <Icon name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.topbarTitle} numberOfLines={1}>Exercice</Text>
                <View style={{ width: 22 }} />
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
            ) : error ? (
                <View style={styles.center}>
                    <Icon name="cloud-offline-outline" size={40} color={colors.textMuted} />
                    <Text style={styles.emptyText}>{error}</Text>
                </View>
            ) : ex ? (
                <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing['3xl'] }} showsVerticalScrollIndicator={false}>
                    {ex.difficulty ? (
                        <View style={styles.badge}><Icon name="barbell-outline" size={13} color={colors.accent} /><Text style={styles.badgeText}>{ex.difficulty}</Text></View>
                    ) : null}
                    <Text style={styles.title}>{ex.title}</Text>

                    {exImg ? <Image source={{ uri: exImg }} style={styles.image} resizeMode="contain" /> : null}
                    {statement ? <HtmlContent html={String(statement)} markdown /> : <Text style={styles.emptyText}>Pas d'énoncé disponible.</Text>}

                    {hasCorrection && (
                        <View style={styles.correctionWrap}>
                            <TouchableOpacity
                                style={[styles.revealBtn, showCorrection && styles.revealBtnActive]}
                                onPress={() => setShowCorrection((v) => !v)}
                                activeOpacity={0.85}
                            >
                                <Icon name={showCorrection ? 'eye-off-outline' : 'eye-outline'} size={18} color={showCorrection ? colors.text : '#fff'} />
                                <Text style={[styles.revealText, showCorrection && styles.revealTextActive]}>
                                    {showCorrection ? 'Masquer la correction' : 'Voir la correction'}
                                </Text>
                            </TouchableOpacity>

                            {showCorrection && (
                                <View style={styles.correctionCard}>
                                    <View style={styles.correctionHead}>
                                        <Icon name="checkmark-circle" size={18} color={colors.success} />
                                        <Text style={styles.correctionTitle}>Correction</Text>
                                    </View>
                                    {correctionImg ? <Image source={{ uri: correctionImg }} style={styles.image} resizeMode="contain" /> : null}
                                    {correctionText ? <HtmlContent html={correctionText} markdown /> : null}
                                </View>
                            )}
                        </View>
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
        badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, backgroundColor: colors.accent + '15', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full, marginBottom: spacing.sm },
        badgeText: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.xs, color: colors.accent },
        title: { fontFamily: typography.fontFamily.display, fontSize: typography.size['3xl'], color: colors.text, marginBottom: spacing.md },
        image: { width: '100%', height: 200, borderRadius: radius.lg, marginVertical: spacing.md, backgroundColor: colors.surfaceVariant },
        correctionWrap: { marginTop: spacing.lg },
        revealBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.success, paddingVertical: spacing.md, borderRadius: radius.lg },
        revealBtnActive: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
        revealText: { fontFamily: typography.fontFamily.heading, color: '#fff', fontSize: typography.size.base },
        revealTextActive: { color: colors.text },
        correctionCard: { backgroundColor: colors.success + '0D', borderWidth: 1, borderColor: colors.success + '33', borderRadius: radius.lg, padding: spacing.md },
        correctionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
        correctionTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.base, color: colors.success },
    });
}
