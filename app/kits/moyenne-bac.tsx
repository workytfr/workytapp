import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import { IconButton, PageHeader } from '../../components/wk';
import KitSection from '../../components/kits/KitSection';
import NoteInput from '../../components/kits/NoteInput';
import ResultCard, { ResultBar, ResultLine, ResultText } from '../../components/kits/ResultCard';
import { useColors } from '../../lib/useColors';
import { radius, spacing, typography, type ThemeColors } from '../../lib/theme';
import { confirmAction } from '../../lib/confirm';
import { useStoredState } from '../../lib/kits/useStoredState';
import { bacStatus, bacSubjects, computeBac, OPTION_COEF_PER_YEAR, type BacVoie } from '../../lib/kits/bac';
import { fmt, parseNote, type WeightedNote } from '../../lib/kits/common';

interface OptionRow {
    id: number;
    label: string;
    note: string;
    years: 1 | 2;
}

const VERDICT = {
    admis: { label: 'Admis', tone: 'ok' },
    rattrapage: { label: 'Oral de rattrapage', tone: 'warn' },
    ajourne: { label: 'Ajourné', tone: 'ko' },
} as const;

/** Calculateur de moyenne du bac 2027 — équivalent de /kits/moyenne-bac. */
export default function MoyenneBacScreen() {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);
    // Bas de la carte de résultat : au-delà, un rappel collant prend le relais
    const [cardBottom, setCardBottom] = useState(Infinity);
    const [scrollY, setScrollY] = useState(0);

    // Mêmes clés que le localStorage du site
    const [voie, setVoie] = useStoredState<BacVoie>('wk-bac-voie', 'generale');
    const [notes, setNotes] = useStoredState<Record<string, string>>('wk-bac-notes', {});
    const [options, setOptions] = useStoredState<OptionRow[]>('wk-bac-options', []);

    const subjects = bacSubjects(voie);
    const items: WeightedNote[] = [
        ...subjects.map((sub) => ({ note: parseNote(notes[sub.key] ?? ''), coef: sub.coef })),
        ...options.map((o) => ({ note: parseNote(o.note), coef: OPTION_COEF_PER_YEAR * o.years })),
    ];
    const r = computeBac(items);
    const partial = r.filledCoef < r.totalCoef;

    const setNote = (key: string, v: string) => setNotes((n) => ({ ...n, [key]: v }));
    const updateOption = (id: number, patch: Partial<OptionRow>) =>
        setOptions((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)));

    const group = (g: 'epreuves' | 'controle') => subjects.filter((sub) => sub.group === g);

    const clearAll = async () => {
        if (await confirmAction('Effacer toutes les notes ?', '', 'Effacer')) {
            setNotes({});
            setOptions([]);
        }
    };

    const epreuves = group('epreuves');
    const controle = group('controle');

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <PageHeader
                topInset={insets.top}
                eyebrow="Calculateur · session 2027"
                title="Ma moyenne au bac"
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
                        Avec les coefficients du bac 2027 : nouvelle épreuve anticipée de mathématiques en fin de
                        première (coef 2) et grand oral à 8 en voie générale, 12 en voie technologique. Tes notes
                        restent sur ton appareil.
                    </Text>

                    {/* Voie */}
                    <View style={s.segment} accessibilityRole="radiogroup" accessibilityLabel="Voie">
                        {(['generale', 'technologique'] as const).map((v) => {
                            const on = voie === v;
                            return (
                                <Pressable
                                    key={v}
                                    onPress={() => setVoie(v)}
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: on }}
                                    style={[s.segBtn, on && s.segBtnOn]}
                                >
                                    <Text style={[s.segText, on && s.segTextOn]}>Bac {v === 'generale' ? 'général' : 'technologique'}</Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* Résultat en premier : sur téléphone, il n'y a pas de colonne collante */}
                    <View onLayout={(e) => setCardBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
                    <ResultCard
                        average={r.average}
                        partial={partial}
                        verdict={r.average !== null && !partial ? VERDICT[bacStatus(r.average)] : null}
                    >
                        <ResultText>
                            <ResultText strong>{fmt(r.points, 1)}</ResultText> points sur{' '}
                            <ResultText strong>{fmt(r.filledCoef * 20, 0)}</ResultText> possibles
                            {partial ? ` (coefficients saisis : ${fmt(r.filledCoef, 0)} / ${fmt(r.totalCoef, 0)})` : ''}.
                        </ResultText>
                        {r.needed ? (
                            <View style={{ marginTop: spacing.md, gap: 4 }}>
                                <ResultText strong>Moyenne à viser sur le reste :</ResultText>
                                {r.needed.map((n) => (
                                    <ResultLine
                                        key={n.target}
                                        label={n.target === 10 ? "Pour l'avoir" : `Pour ${n.target}/20`}
                                        value={n.note <= 0 ? 'déjà acquis' : n.note > 20 ? "hors d'atteinte" : `${fmt(n.note)}/20`}
                                    />
                                ))}
                            </View>
                        ) : null}
                        {!partial && r.average !== null && bacStatus(r.average) === 'rattrapage' ? (
                            <ResultText style={{ marginTop: spacing.md }}>
                                Entre 8 et 10 : tu passes deux oraux de rattrapage (français, philosophie, spécialités ou
                                maths de première). Le jury garde la meilleure des deux notes.
                            </ResultText>
                        ) : null}
                    </ResultCard>
                    </View>

                    <KitSection title="Épreuves finales" text="60 % de la note · 60 coefficients">
                        {epreuves.map((sub, i) => (
                            <NoteInput key={sub.key} label={sub.label} hint={sub.hint} coef={sub.coef} value={notes[sub.key] ?? ''} onChange={(v) => setNote(sub.key, v)} last={i === epreuves.length - 1} />
                        ))}
                    </KitSection>

                    <KitSection
                        title="Contrôle continu"
                        text="40 % de la note · 40 coefficients. Pour chaque matière, mets la moyenne de tes moyennes annuelles de première et de terminale."
                    >
                        {controle.map((sub, i) => (
                            <NoteInput key={sub.key} label={sub.label} hint={sub.hint} coef={sub.coef} value={notes[sub.key] ?? ''} onChange={(v) => setNote(sub.key, v)} last={i === controle.length - 1} />
                        ))}
                    </KitSection>

                    <KitSection
                        title="Options"
                        text={`Chaque enseignement optionnel ajoute un coefficient ${OPTION_COEF_PER_YEAR} par année suivie (latin, maths expertes, DGEMC…).`}
                    >
                        <View style={{ gap: spacing.sm }}>
                            {options.map((o) => {
                                const invalid = o.note.trim() !== '' && parseNote(o.note) === null;
                                return (
                                    <View key={o.id} style={s.option}>
                                        <View style={s.optionTop}>
                                            <TextInput
                                                value={o.label}
                                                onChangeText={(v) => updateOption(o.id, { label: v })}
                                                placeholder="Nom de l'option"
                                                placeholderTextColor={colors.textMuted}
                                                accessibilityLabel="Nom de l'option"
                                                style={[s.input, { flex: 1 }]}
                                            />
                                            <Pressable
                                                onPress={() => setOptions((list) => list.filter((x) => x.id !== o.id))}
                                                accessibilityRole="button"
                                                accessibilityLabel="Retirer l'option"
                                                style={s.trash}
                                            >
                                                <Icon name="trash-outline" size={18} color={colors.textMuted} />
                                            </Pressable>
                                        </View>
                                        <View style={s.optionBottom}>
                                            <View style={s.years} accessibilityRole="radiogroup" accessibilityLabel="Années suivies">
                                                {([1, 2] as const).map((y) => {
                                                    const on = o.years === y;
                                                    return (
                                                        <Pressable
                                                            key={y}
                                                            onPress={() => updateOption(o.id, { years: y })}
                                                            accessibilityRole="radio"
                                                            accessibilityState={{ checked: on }}
                                                            style={[s.yearBtn, on && s.yearBtnOn]}
                                                        >
                                                            <Text style={[s.yearText, on && s.yearTextOn]}>{y} an{y > 1 ? 's' : ''} · coef {OPTION_COEF_PER_YEAR * y}</Text>
                                                        </Pressable>
                                                    );
                                                })}
                                            </View>
                                            <View style={[s.noteBox, invalid && { borderColor: colors.error }]}>
                                                <TextInput
                                                    value={o.note}
                                                    onChangeText={(v) => updateOption(o.id, { note: v })}
                                                    keyboardType="decimal-pad"
                                                    inputMode="decimal"
                                                    placeholder="—"
                                                    placeholderTextColor={colors.textMuted}
                                                    maxLength={5}
                                                    accessibilityLabel="Moyenne de l'option sur 20"
                                                    style={s.noteInput}
                                                />
                                                <Text style={s.unit}>/20</Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                            <Pressable
                                onPress={() => setOptions((list) => [...list, { id: Date.now(), label: '', note: '', years: 2 }])}
                                style={s.addOpt}
                                accessibilityRole="button"
                            >
                                <Icon name="add" size={18} color={colors.accent} />
                                <Text style={s.addOptText}>Ajouter une option</Text>
                            </Pressable>
                        </View>
                    </KitSection>

                    <Pressable onPress={clearAll} style={s.clear} accessibilityRole="button">
                        <Text style={s.clearText}>Tout effacer</Text>
                    </Pressable>

                    <Text style={s.legal}>
                        Simulation indicative, sans valeur officielle. Les coefficients suivent la réforme du baccalauréat
                        applicable à la session 2027 : vérifie toujours auprès de ton lycée. Candidats individuels et voie
                        professionnelle non pris en charge.
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
            <ResultBar visible={scrollY > cardBottom} average={r.average} partial={partial} bottomInset={insets.bottom} />
        </View>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        body: { padding: spacing.lg, gap: spacing.lg },
        intro: { fontFamily: typography.fontFamily.regular, fontSize: 15, lineHeight: 22, color: c.textSecondary },
        segment: { flexDirection: 'row', backgroundColor: c.surfaceVariant, borderRadius: radius.full, padding: 4, alignSelf: 'flex-start' },
        segBtn: { minHeight: 40, paddingHorizontal: spacing.lg, borderRadius: radius.full, justifyContent: 'center' },
        segBtnOn: { backgroundColor: c.text },
        segText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13.5, color: c.textSecondary },
        segTextOn: { color: c.background },

        option: { backgroundColor: c.background, borderRadius: radius.xl, padding: spacing.md, gap: spacing.sm },
        optionTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        optionBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'space-between' },
        input: {
            minHeight: 44,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            fontFamily: typography.fontFamily.regular,
            fontSize: 14,
            color: c.text,
        },
        trash: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
        years: { flexDirection: 'row', backgroundColor: c.surfaceVariant, borderRadius: radius.full, padding: 3, flexShrink: 1 },
        yearBtn: { minHeight: 38, paddingHorizontal: 10, borderRadius: radius.full, justifyContent: 'center' },
        yearBtnOn: { backgroundColor: c.surface },
        yearText: { fontFamily: typography.fontFamily.medium, fontSize: 12, color: c.textSecondary },
        yearTextOn: { fontFamily: typography.fontFamily.semiBold, color: c.text },
        noteBox: {
            width: 88,
            minHeight: 44,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
            borderRadius: radius.md,
            paddingHorizontal: spacing.sm,
        },
        noteInput: { flex: 1, minWidth: 0, textAlign: 'right', fontFamily: typography.fontFamily.heading, fontSize: 15, color: c.text, paddingVertical: 6 },
        unit: { fontFamily: typography.fontFamily.regular, fontSize: 11, color: c.textMuted, paddingLeft: 3 },
        addOpt: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, alignSelf: 'flex-start' },
        addOptText: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.accent },

        clear: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
        clearText: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.textMuted, textDecorationLine: 'underline' },
        legal: { fontFamily: typography.fontFamily.regular, fontSize: 12, lineHeight: 18, color: c.textMuted },
    });
}
