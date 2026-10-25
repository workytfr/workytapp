import { useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, FlatList,
    KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import { useColors } from '../../lib/useColors';
import { spacing, radius, typography, type ThemeColors } from '../../lib/theme';
import { SUBJECTS, LEVELS } from '../../lib/education';
import { FORMAT_LABELS, GOAL_TYPE_LABELS, createSuiviRequest, type SuiviFormat } from '../../lib/suivi';

const NEED_MIN = 20;
const NEED_MAX = 1000;

/** Demande de suivi — même formulaire que la section « Ta demande » du site. */
export default function SuiviRequestScreen() {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);

    const [format, setFormat] = useState<SuiviFormat>('suivi');
    const [subject, setSubject] = useState('');
    const [level, setLevel] = useState('');
    const [goalType, setGoalType] = useState('');
    const [need, setNeed] = useState('');
    const [availability, setAvailability] = useState('');
    const [picker, setPicker] = useState<'subject' | 'level' | null>(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const needOk = need.trim().length >= NEED_MIN;
    const ready = !!(subject && level && goalType && needOk);

    const submit = async () => {
        if (!ready || sending) return;
        setSending(true);
        setError('');
        try {
            const res = await createSuiviRequest({ format, subject, level, goalType, need, availability });
            router.replace(`/suivi/${res.id}`);
        } catch (e: any) {
            setError(e.message || "Impossible d'envoyer la demande.");
            setSending(false);
        }
    };

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[s.topbar, { paddingTop: insets.top + spacing.sm }]}>
                <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Retour">
                    <Icon name="arrow-back" size={22} color={colors.text} />
                </Pressable>
                <Text style={s.topbarTitle}>Ta demande</Text>
                <View style={{ width: 22 }} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing['3xl'] }} keyboardShouldPersistTaps="handled">
                    <Text style={s.title}>Dis-nous où tu en es<Text style={{ color: colors.primary }}>.</Text></Text>
                    <Text style={s.lead}>Plus tu es précis, plus le bénévole pourra t'aider vite. Écris comme tu parles.</Text>

                    <Text style={s.label}>De quoi as-tu besoin ?</Text>
                    <View style={{ gap: spacing.sm }}>
                        {(['suivi', 'ponctuel'] as const).map((f) => (
                            <Pressable
                                key={f}
                                onPress={() => setFormat(f)}
                                style={[s.option, format === f && s.optionActive]}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: format === f }}
                            >
                                <Icon name={format === f ? 'radio-button-on' : 'radio-button-off'} size={20} color={format === f ? colors.primary : colors.textMuted} />
                                <View style={{ flex: 1 }}>
                                    <Text style={s.optionTitle}>{FORMAT_LABELS[f].label}</Text>
                                    <Text style={s.optionHint}>{FORMAT_LABELS[f].hint}</Text>
                                </View>
                            </Pressable>
                        ))}
                    </View>

                    <Text style={s.label}>Matière</Text>
                    <Pressable style={s.select} onPress={() => setPicker('subject')}>
                        <Text style={[s.selectText, !subject && s.placeholder]} numberOfLines={1}>{subject || 'Choisir…'}</Text>
                        <Icon name="chevron-down" size={18} color={colors.textMuted} />
                    </Pressable>

                    <Text style={s.label}>Niveau</Text>
                    <Pressable style={s.select} onPress={() => setPicker('level')}>
                        <Text style={[s.selectText, !level && s.placeholder]}>{level || 'Choisir…'}</Text>
                        <Icon name="chevron-down" size={18} color={colors.textMuted} />
                    </Pressable>

                    <Text style={s.label}>Ton objectif</Text>
                    <View style={s.goals}>
                        {Object.entries(GOAL_TYPE_LABELS).map(([key, text]) => (
                            <Pressable
                                key={key}
                                onPress={() => setGoalType(key)}
                                style={[s.goal, goalType === key && s.goalActive]}
                                accessibilityState={{ selected: goalType === key }}
                            >
                                <Text style={[s.goalText, goalType === key && s.goalTextActive]}>{text}</Text>
                            </Pressable>
                        ))}
                    </View>

                    <Text style={s.label}>Qu'est-ce qui te bloque ?</Text>
                    <TextInput
                        style={[s.input, s.textarea]}
                        value={need}
                        onChangeText={(t) => setNeed(t.slice(0, NEED_MAX))}
                        multiline
                        textAlignVertical="top"
                        placeholder="Ex. Je ne comprends pas les équations depuis le début du trimestre. Je me trompe toujours en passant les termes de l'autre côté…"
                        placeholderTextColor={colors.textMuted}
                    />
                    <View style={s.counter}>
                        <Text style={[s.counterText, needOk && { color: colors.success }]}>
                            {needOk ? "C'est parfait." : `Encore quelques mots (${NEED_MIN} caractères minimum).`}
                        </Text>
                        <Text style={s.counterText}>{need.length}/{NEED_MAX}</Text>
                    </View>

                    <Text style={s.label}>Tes disponibilités <Text style={s.optional}>(facultatif)</Text></Text>
                    <TextInput
                        style={s.input}
                        value={availability}
                        onChangeText={(t) => setAvailability(t.slice(0, 200))}
                        placeholder="Ex. le mercredi après-midi et le week-end"
                        placeholderTextColor={colors.textMuted}
                    />

                    {error ? <Text style={s.error} accessibilityRole="alert">{error}</Text> : null}

                    <Pressable
                        onPress={submit}
                        disabled={!ready || sending}
                        style={({ pressed }) => [s.submit, (!ready || sending) && { opacity: 0.5 }, pressed && ready && s.submitPressed]}
                    >
                        {sending ? <ActivityIndicator color="#fff" /> : null}
                        <Text style={s.submitText}>Envoyer ma demande</Text>
                        <Icon name="arrow-forward" size={18} color="#fff" />
                    </Pressable>
                    <Text style={s.note}>
                        Les échanges sont conservés et peuvent être relus par la modération en cas de signalement.
                        Ne partage jamais tes coordonnées.
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
                <Pressable style={s.backdrop} onPress={() => setPicker(null)}>
                    <Pressable style={[s.sheet, { paddingBottom: insets.bottom + spacing.md }]} onPress={(e) => e.stopPropagation()}>
                        <View style={s.handle} />
                        <Text style={s.sheetTitle}>{picker === 'subject' ? 'Matière' : 'Niveau'}</Text>
                        <FlatList
                            data={picker === 'subject' ? SUBJECTS : LEVELS}
                            keyExtractor={(x) => x}
                            initialNumToRender={20}
                            renderItem={({ item }) => {
                                const selected = (picker === 'subject' ? subject : level) === item;
                                return (
                                    <Pressable
                                        style={[s.sheetRow, selected && { backgroundColor: colors.surfaceVariant }]}
                                        onPress={() => { (picker === 'subject' ? setSubject : setLevel)(item); setPicker(null); }}
                                    >
                                        <Text style={s.sheetRowText}>{item}</Text>
                                        {selected ? <Icon name="checkmark" size={18} color={colors.primary} /> : null}
                                    </Pressable>
                                );
                            }}
                        />
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

function createStyles(c: ThemeColors) {
    const field = { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg } as const;
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        topbar: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.border,
        },
        topbarTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg, color: c.text },
        title: { fontFamily: typography.fontFamily.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.4, color: c.text },
        lead: { fontFamily: typography.fontFamily.regular, fontSize: 14, lineHeight: 20, color: c.textSecondary, marginTop: spacing.sm },
        label: { fontFamily: typography.fontFamily.heading, fontSize: 14, color: c.text, marginTop: spacing.xl, marginBottom: spacing.sm },
        optional: { fontFamily: typography.fontFamily.regular, color: c.textMuted },
        option: { ...field, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
        optionActive: { borderColor: c.primary, backgroundColor: c.primary + '0D' },
        optionTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: c.text },
        optionHint: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: c.textSecondary, marginTop: 1 },
        select: { ...field, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, minHeight: 48 },
        selectText: { flex: 1, fontFamily: typography.fontFamily.medium, fontSize: 15, color: c.text },
        placeholder: { color: c.textMuted },
        goals: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
        goal: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
        goalActive: { backgroundColor: c.text, borderColor: c.text },
        goalText: { fontFamily: typography.fontFamily.medium, fontSize: 13.5, color: c.text },
        goalTextActive: { color: c.background },
        input: { ...field, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontFamily: typography.fontFamily.regular, fontSize: 15, color: c.text },
        textarea: { minHeight: 130, lineHeight: 21 },
        counter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
        counterText: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textMuted },
        error: {
            marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.lg, overflow: 'hidden',
            backgroundColor: c.error + '14', color: c.error, fontFamily: typography.fontFamily.medium, fontSize: 14,
        },
        submit: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xl,
            backgroundColor: c.primary, borderRadius: radius.full, paddingVertical: 16,
            borderBottomWidth: 4, borderBottomColor: c.primaryDark,
        },
        submitPressed: { transform: [{ translateY: 2 }], borderBottomWidth: 2 },
        submitText: { fontFamily: typography.fontFamily.heading, fontSize: 16, color: '#fff' },
        note: { fontFamily: typography.fontFamily.regular, fontSize: 12, lineHeight: 17, color: c.textMuted, marginTop: spacing.md, textAlign: 'center' },
        backdrop: { flex: 1, backgroundColor: 'rgba(26,21,18,0.45)', justifyContent: 'flex-end' },
        sheet: { backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', paddingTop: spacing.sm },
        handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: spacing.md },
        sheetTitle: { fontFamily: typography.fontFamily.display, fontSize: 20, color: c.text, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
        sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: 14 },
        sheetRowText: { fontFamily: typography.fontFamily.medium, fontSize: 15, color: c.text, flex: 1 },
    });
}
