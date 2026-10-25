import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { IconButton, PageHeader } from '../../components/wk';
import KitSection from '../../components/kits/KitSection';
import NoteInput from '../../components/kits/NoteInput';
import ResultCard, { ResultBar, ResultLine, ResultText } from '../../components/kits/ResultCard';
import { useColors } from '../../lib/useColors';
import { spacing, typography, type ThemeColors } from '../../lib/theme';
import { confirmAction } from '../../lib/confirm';
import { useStoredState } from '../../lib/kits/useStoredState';
import { BREVET_DISCIPLINES, BREVET_EXAMS, computeBrevet } from '../../lib/kits/brevet';
import { fmt, parseNote } from '../../lib/kits/common';

/** Calculateur de moyenne du brevet — équivalent de /kits/moyenne-brevet. */
export default function MoyenneBrevetScreen() {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);
    // Bas de la carte de résultat : au-delà, un rappel collant prend le relais
    const [cardBottom, setCardBottom] = useState(Infinity);
    const [scrollY, setScrollY] = useState(0);

    // Mêmes clés que le localStorage du site
    const [exams, setExams] = useStoredState<Record<string, string>>('wk-brevet-epreuves', {});
    const [cc, setCc] = useStoredState<Record<string, string>>('wk-brevet-controle', {});
    const [option, setOption] = useStoredState<string>('wk-brevet-option', '');

    const examNotes = BREVET_EXAMS.map((e) => ({ note: parseNote(exams[e.key] ?? ''), coef: e.coef }));
    const ccNotes = BREVET_DISCIPLINES.map((d) => parseNote(cc[d] ?? ''));
    const r = computeBrevet(examNotes, ccNotes, parseNote(option));
    // Une matière de contrôle continu laissée vide = non suivie, pas une note manquante
    const partial = examNotes.some((n) => n.note === null) || r.controle === null;
    const optionBonus = parseNote(option);

    const clearAll = async () => {
        if (await confirmAction('Effacer toutes les notes ?', '', 'Effacer')) {
            setExams({});
            setCc({});
            setOption('');
        }
    };

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <PageHeader
                topInset={insets.top}
                eyebrow="Calculateur · brevet"
                title="Ma moyenne au brevet"
                right={<IconButton icon="arrow-back" label="Kits de l'élève" onPress={() => router.back()} />}
            />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing['3xl'] + 64 }]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    scrollEventThrottle={64}
                    onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
                >
                    <Text style={s.intro}>
                        Depuis 2026, le brevet est noté sur 20 : 40 % pour tes moyennes de 3e, 60 % pour les épreuves
                        finales. Il faut 10/20 pour l'obtenir. Tes notes restent sur ton appareil.
                    </Text>

                    <View onLayout={(e) => setCardBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
                    <ResultCard
                        average={r.final}
                        partial={partial}
                        verdict={r.final !== null && !partial ? (r.final >= 10 ? { label: 'Admis', tone: 'ok' } : { label: 'Non admis', tone: 'ko' }) : null}
                    >
                        <ResultLine label="Contrôle continu (40 %)" value={r.controle !== null ? `${fmt(r.controle)}/20` : '—'} />
                        {optionBonus !== null && optionBonus > 10 ? (
                            <ResultLine muted label="dont bonus option" value={`+${fmt(optionBonus - 10)} pts au total`} />
                        ) : null}
                        <ResultLine label="Épreuves finales (60 %)" value={r.exams !== null ? `${fmt(r.exams)}/20` : '—'} />
                        {r.neededExams !== null && r.exams === null ? (
                            <ResultText style={{ marginTop: spacing.md }}>
                                Avec ce contrôle continu, il te faut{' '}
                                <ResultText strong>{r.neededExams <= 0 ? "n'importe quelle note" : `${fmt(r.neededExams)}/20`}</ResultText>{' '}
                                de moyenne aux épreuves finales pour avoir ton brevet.
                            </ResultText>
                        ) : null}
                    </ResultCard>
                    </View>

                    <KitSection
                        title="Contrôle continu"
                        text="40 % de la note. Mets ta moyenne annuelle de 3e dans chaque matière : elles comptent toutes pareil. Laisse vide une matière que tu ne suis pas."
                    >
                        {BREVET_DISCIPLINES.map((d) => (
                            <NoteInput key={d} label={d} value={cc[d] ?? ''} onChange={(v) => setCc((c) => ({ ...c, [d]: v }))} />
                        ))}
                        <NoteInput
                            label="Enseignement facultatif (bonus)"
                            hint="Latin, grec, LCE, chant choral, langue régionale… Seuls les points au-dessus de 10 comptent."
                            value={option}
                            onChange={setOption}
                            last
                        />
                    </KitSection>

                    <KitSection title="Épreuves finales" text="60 % de la note · chaque épreuve est notée sur 20.">
                        {BREVET_EXAMS.map((e, i) => (
                            <NoteInput
                                key={e.key}
                                label={e.label}
                                hint={e.hint}
                                coef={e.coef}
                                value={exams[e.key] ?? ''}
                                onChange={(v) => setExams((x) => ({ ...x, [e.key]: v }))}
                                last={i === BREVET_EXAMS.length - 1}
                            />
                        ))}
                    </KitSection>

                    <Pressable onPress={clearAll} style={s.clear} accessibilityRole="button">
                        <Text style={s.clearText}>Tout effacer</Text>
                    </Pressable>

                    <Text style={s.legal}>
                        Simulation indicative, sans valeur officielle, d'après l'arrêté du 10 avril 2025 et la note de
                        service du 11 septembre 2026 (sessions 2026 et suivantes). Candidats individuels non pris en charge
                        (pas de contrôle continu, épreuve de langue vivante en plus).
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
            <ResultBar visible={scrollY > cardBottom} average={r.final} partial={partial} bottomInset={insets.bottom} />
        </View>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        body: { padding: spacing.lg, gap: spacing.lg },
        intro: { fontFamily: typography.fontFamily.regular, fontSize: 15, lineHeight: 22, color: c.textSecondary },
        clear: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
        clearText: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.textMuted, textDecorationLine: 'underline' },
        legal: { fontFamily: typography.fontFamily.regular, fontSize: 12, lineHeight: 18, color: c.textMuted },
    });
}
