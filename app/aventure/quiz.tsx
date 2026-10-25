import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import { useColors } from '../../lib/useColors';
import { spacing, radius, typography, type ThemeColors } from '../../lib/theme';
import {
    getDailyQuiz, startDailyQuiz, answerDailyQuiz, getHero, isUnavailable,
    type DailyQuiz, type HeroState, type Battle,
} from '../../lib/gamification';
import { EmptyState, XpBar } from '../../components/wk';
import { PrimaryButton } from '../../components/mobile';
import { error as hapticError, success, tapMedium } from '../../lib/haptics';
import { getSiteOrigin } from '../../lib/siteOrigin';

/**
 * Quiz du jour façon combat (site : components/adventure/rpg/BattleModal) :
 * une question, quatre réponses. Bonne réponse = attaque ; du premier coup =
 * critique. Le chrono serveur ne démarre qu'au tap sur « Commencer ».
 */
export default function DailyQuizBattle() {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);

    const [quiz, setQuiz] = useState<DailyQuiz | null>(null);
    const [hero, setHero] = useState<HeroState | null>(null);
    const [loading, setLoading] = useState(true);
    const [unavailable, setUnavailable] = useState(false);
    const [err, setErr] = useState('');
    const [engaged, setEngaged] = useState(false);
    const [starting, setStarting] = useState(false);
    const [submitting, setSubmitting] = useState<number | null>(null);
    const [wrong, setWrong] = useState<number[]>([]);
    const [battle, setBattle] = useState<Battle>(null);
    const [result, setResult] = useState<{ correct: number; explanation?: string | null } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setErr('');
        try {
            const [q, h] = await Promise.all([getDailyQuiz(), getHero().catch(() => null)]);
            setQuiz(q);
            setHero(h);
            if (q.available && q.solved && q.correctAnswer != null) {
                setResult({ correct: q.correctAnswer, explanation: q.explanation });
            }
        } catch (e) {
            if (isUnavailable(e)) setUnavailable(true);
            else setErr((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const monster = hero?.monster;

    const start = async () => {
        tapMedium();
        setStarting(true);
        try {
            await startDailyQuiz();
            setEngaged(true);
        } catch (e) {
            setErr((e as Error).message);
        } finally {
            setStarting(false);
        }
    };

    const answer = async (i: number) => {
        if (submitting != null) return;
        setSubmitting(i);
        try {
            const res = await answerDailyQuiz(i);
            if (res.isCorrect) {
                success();
                setBattle(res.battle);
                setResult({ correct: res.correctAnswer ?? i, explanation: res.explanation });
                getHero().then(setHero).catch(() => {});
            } else {
                hapticError();
                setWrong((w) => [...w, i]);
                setBattle(res.battle);
                if (res.battle && res.battle.outcome === 'defeat') {
                    getHero().then(setHero).catch(() => {});
                }
            }
        } catch (e) {
            setErr((e as Error).message);
        } finally {
            setSubmitting(null);
        }
    };

    const Close = (
        <Pressable onPress={() => router.back()} style={[s.close, { top: insets.top + spacing.sm }]} accessibilityLabel="Fermer">
            <Icon name="close" size={22} color="#FDFAF4" />
        </Pressable>
    );

    if (loading) {
        return <View style={[s.root, s.center]}><Stack.Screen options={{ headerShown: false }} /><ActivityIndicator color="#FFB547" /></View>;
    }

    if (unavailable || !quiz || !quiz.available) {
        return (
            <View style={[s.root, { paddingTop: insets.top + 60 }]}>
                <Stack.Screen options={{ headerShown: false }} />
                {Close}
                <View style={s.paperBox}>
                    <EmptyState
                        icon={unavailable ? 'sparkles' : 'sunny'}
                        title={unavailable ? 'Bientôt dans l’app' : 'Pas de combat aujourd’hui'}
                        text={unavailable
                            ? 'Le quiz du jour arrive dans l’application. En attendant, il t’attend sur workyt.fr.'
                            : 'Aucun quiz n’est publié pour aujourd’hui. Reviens demain !'}
                        actionLabel={unavailable ? 'Ouvrir sur workyt.fr' : 'Retour'}
                        onAction={unavailable ? () => Linking.openURL(`${getSiteOrigin()}/recompenses`) : () => router.back()}
                    />
                </View>
            </View>
        );
    }

    const victory = battle && battle.outcome === 'victory' ? battle : null;
    const defeat = battle && battle.outcome === 'defeat' ? battle : null;
    const solved = !!result;
    const h = hero?.hero;

    return (
        <View style={s.root}>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: insets.bottom + 32, paddingHorizontal: spacing.lg }}>
                {/* Arène : héros contre monstre */}
                <View style={s.arena}>
                    <View style={s.fighter}>
                        <Text style={s.fighterEmoji}>🦊</Text>
                        <Text style={s.fighterName}>Toi · niv. {h?.level ?? '?'}</Text>
                        {h ? (
                            <View style={s.hpWrap}>
                                <View style={s.hpTrack}><View style={[s.hpFill, { width: `${(h.hp / h.hpMax) * 100}%` }]} /></View>
                                <Text style={s.hpText}>{h.hp}/{h.hpMax} PV</Text>
                            </View>
                        ) : null}
                    </View>
                    <Text style={s.vs}>VS</Text>
                    <View style={s.fighter}>
                        <Text style={[s.fighterEmoji, solved && { opacity: 0.35 }]}>{monster?.emoji ?? '👾'}</Text>
                        <Text style={s.fighterName} numberOfLines={1}>{monster?.name ?? 'Le monstre'}</Text>
                        {monster?.powerLabel ? <Text style={s.power}>{monster.powerLabel}</Text> : null}
                    </View>
                </View>

                {err ? <Text style={s.err}>{err}</Text> : null}

                {solved ? (
                    <View style={s.card}>
                        <Text style={s.kicker}>Victoire</Text>
                        <Text style={s.title}>🏆 {monster?.name ?? 'Le monstre'} est vaincu !</Text>
                        {victory ? (
                            <Text style={s.xp}>{victory.critical ? '⚡ COUP CRITIQUE ! ' : ''}+{victory.xpGained} XP{victory.leveledUp ? ` · Niveau ${victory.newLevel} !` : ''}</Text>
                        ) : null}
                        <Text style={s.q}>{quiz.question}</Text>
                        <View style={s.goodAnswer}>
                            <Icon name="checkmark-circle" size={18} color="#7ED957" />
                            <Text style={s.goodAnswerText}>{quiz.answers[result!.correct]}</Text>
                        </View>
                        {result?.explanation ? <Text style={s.explain}>{result.explanation}</Text> : null}
                        <Text style={s.hint}>Ta récompense du jour est débloquée dans le calendrier.</Text>
                        <PrimaryButton label="Récupérer ma récompense" icon="gift" onPress={() => router.replace('/aventure/calendrier')} style={{ flex: 0, marginTop: spacing.md }} />
                    </View>
                ) : !engaged && !quiz.started ? (
                    <View style={s.card}>
                        <Text style={s.kicker}>Quiz du jour</Text>
                        <Text style={s.title}>Prêt à affronter {monster?.name ?? 'le monstre'} ?</Text>
                        <Text style={s.body}>
                            Le chrono ne démarre qu'au tap. Plus tu réponds vite, plus tu gagnes d'XP ; prendre le temps de réfléchir ne coûte jamais de points de vie.
                        </Text>
                        <PrimaryButton label={starting ? 'Préparation…' : 'Commencer le combat'} icon="swords" onPress={start} disabled={starting} style={{ flex: 0, marginTop: spacing.md }} />
                    </View>
                ) : (
                    <View>
                        <Text style={s.question}>{quiz.question}</Text>
                        <View style={{ gap: spacing.sm }}>
                            {quiz.answers.map((a, i) => {
                                const isWrong = wrong.includes(i);
                                return (
                                    <Pressable
                                        key={i}
                                        disabled={isWrong || submitting != null}
                                        onPress={() => answer(i)}
                                        style={({ pressed }) => [s.answer, isWrong && s.answerWrong, pressed && s.answerPressed]}
                                    >
                                        <View style={[s.answerKey, isWrong && { backgroundColor: '#EF535033' }]}>
                                            {submitting === i ? <ActivityIndicator size="small" color="#FFB547" />
                                                : isWrong ? <Icon name="close" size={16} color="#EF5350" />
                                                : <Text style={s.answerKeyText}>{'ABCD'[i]}</Text>}
                                        </View>
                                        <Text style={[s.answerText, isWrong && { color: '#BDB5AC', textDecorationLine: 'line-through' }]}>{a}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                        <Text style={s.hint}>
                            {defeat
                                ? `Le monstre riposte : -${defeat.damage} PV${defeat.poisoned ? ' (empoisonné !)' : ''}. Attaque avec une autre réponse.`
                                : 'Bonne réponse = attaque réussie · du 1er coup = CRITIQUE (XP ×1.5)'}
                        </Text>
                        {defeat?.fainted ? (
                            <View style={s.card}>
                                <Text style={s.title}>Ton héros est évanoui…</Text>
                                <Text style={s.body}>Soigne-le avec un champignon 🍄 depuis l'aventure pour retenter ta chance.</Text>
                                <PrimaryButton label="Soigner mon héros" icon="heart-pulse" onPress={() => router.replace('/aventure')} style={{ flex: 0, marginTop: spacing.md }} />
                            </View>
                        ) : null}
                    </View>
                )}

                {h ? (
                    <View style={s.xpBox}>
                        <Text style={s.xpLabel}>XP du héros · niv. {h.level}</Text>
                        <XpBar percent={h.xpProgress * 100} color="#FFB547" />
                    </View>
                ) : null}
            </ScrollView>
            {Close}
        </View>
    );
}

// Arène sombre (encre), comme le combat du site ; textes papier
function createStyles(c: ThemeColors) {
    const paper = '#FDFAF4';
    return StyleSheet.create({
        root: { flex: 1, backgroundColor: '#1A1512' },
        center: { alignItems: 'center', justifyContent: 'center' },
        close: {
            position: 'absolute', left: spacing.lg, width: 42, height: 42, borderRadius: 21,
            alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(253,250,244,0.12)',
        },
        paperBox: { margin: spacing.lg, borderRadius: 24, backgroundColor: c.background },
        arena: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            padding: spacing.lg, borderRadius: 24, backgroundColor: 'rgba(253,250,244,0.06)',
            borderWidth: 1, borderColor: 'rgba(253,250,244,0.12)', marginBottom: spacing.xl,
        },
        fighter: { flex: 1, alignItems: 'center', gap: 4 },
        fighterEmoji: { fontSize: 56 },
        fighterName: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: paper },
        power: { fontFamily: typography.fontFamily.mono, fontSize: 10, color: '#FFB547', letterSpacing: 1 },
        vs: { fontFamily: typography.fontFamily.displayBold, fontSize: 20, color: '#FF6A1A' },
        hpWrap: { width: '90%', gap: 2 },
        hpTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(253,250,244,0.15)', overflow: 'hidden' },
        hpFill: { height: '100%', backgroundColor: '#EF5350', borderRadius: 4 },
        hpText: { fontFamily: typography.fontFamily.mono, fontSize: 10, color: '#BDB5AC', textAlign: 'center' },
        err: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: '#EF5350', marginBottom: spacing.md },
        card: { padding: spacing.xl, borderRadius: 24, backgroundColor: c.background, gap: spacing.sm, marginBottom: spacing.lg },
        kicker: { fontFamily: typography.fontFamily.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: c.accent },
        title: { fontFamily: typography.fontFamily.display, fontSize: 24, lineHeight: 28, color: c.text },
        body: { fontFamily: typography.fontFamily.regular, fontSize: 14, lineHeight: 21, color: c.textSecondary },
        xp: { fontFamily: typography.fontFamily.displayBold, fontSize: 18, color: c.accent },
        q: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.text, marginTop: spacing.sm },
        goodAnswer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: '#7ED95722' },
        goodAnswerText: { flex: 1, fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.text },
        explain: { fontFamily: typography.fontFamily.regular, fontSize: 13.5, lineHeight: 20, color: c.textSecondary },
        question: { fontFamily: typography.fontFamily.display, fontSize: 24, lineHeight: 30, color: paper, marginBottom: spacing.lg },
        answer: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, padding: spacing.md,
            borderRadius: 18, backgroundColor: 'rgba(253,250,244,0.08)', borderWidth: 1, borderColor: 'rgba(253,250,244,0.18)',
            borderBottomWidth: 4, borderBottomColor: 'rgba(253,250,244,0.18)',
        },
        answerPressed: { transform: [{ translateY: 2 }], borderBottomWidth: 2, backgroundColor: 'rgba(255,106,26,0.18)' },
        answerWrong: { borderColor: '#EF535066', backgroundColor: '#EF535014' },
        answerKey: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(253,250,244,0.12)' },
        answerKeyText: { fontFamily: typography.fontFamily.displayBold, fontSize: 15, color: '#FFB547' },
        answerText: { flex: 1, fontFamily: typography.fontFamily.medium, fontSize: 15, lineHeight: 21, color: paper },
        hint: { fontFamily: typography.fontFamily.regular, fontSize: 12.5, lineHeight: 18, color: '#BDB5AC', marginTop: spacing.md, textAlign: 'center' },
        xpBox: { marginTop: spacing.xl, gap: 6 },
        xpLabel: { fontFamily: typography.fontFamily.mono, fontSize: 10.5, letterSpacing: 1.5, textTransform: 'uppercase', color: '#BDB5AC' },
    });
}
