import { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useColors } from '../../lib/useColors';
import { spacing, radius, shadows, typography } from '../../lib/theme';
import { SUBJECTS, LEVELS, subjectIcon } from '../../lib/education';
import { createFiche, FicheAttachment } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import MindMap from '../../components/MindMap';
import PdfComposer from '../../components/PdfComposer';

type IconName = string;

const STEPS = ['Décris', 'Contenu', 'Publie'];

export default function CreerFicheScreen() {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [step, setStep] = useState(0);
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [level, setLevel] = useState('');
    const [intro, setIntro] = useState('');
    const [files, setFiles] = useState<FicheAttachment[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [mindOpen, setMindOpen] = useState(false);
    const [pdfOpen, setPdfOpen] = useState(false);
    const { user } = useAuth();

    const step1Valid = title.trim().length > 0 && !!subject && !!level;

    const addFile = (f: FicheAttachment) => setFiles((prev) => [...prev, f]);
    const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

    const takePhoto = async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('Autorisation', "Accès à l'appareil photo refusé."); return; }
        const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
        if (!res.canceled && res.assets[0]) {
            const a = res.assets[0];
            addFile({ uri: a.uri, name: a.fileName || `photo-${Date.now()}.jpg`, mimeType: a.mimeType || 'image/jpeg' });
        }
    };

    const pickImage = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: true });
        if (!res.canceled) {
            res.assets.forEach((a) => addFile({ uri: a.uri, name: a.fileName || `image-${Date.now()}.jpg`, mimeType: a.mimeType || 'image/jpeg' }));
        }
    };

    const handleMindSave = async (base64: string) => {
        try {
            const name = `carte-${Date.now()}.png`;
            const path = (FileSystem.cacheDirectory || '') + name;
            await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
            addFile({ uri: path, name, mimeType: 'image/png' });
        } catch {
            Alert.alert('Erreur', "La carte n'a pas pu être enregistrée.");
        }
        setMindOpen(false);
    };

    const handlePdfSave = (uri: string, name: string) => {
        addFile({ uri, name, mimeType: 'application/pdf' });
        setPdfOpen(false);
    };

    const pickPdf = async () => {
        const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: true });
        if (!res.canceled) {
            res.assets.forEach((a) => addFile({ uri: a.uri, name: a.name || `document-${Date.now()}.pdf`, mimeType: a.mimeType || 'application/pdf' }));
        }
    };

    const submit = async () => {
        setSubmitting(true);
        try {
            const content = intro.trim() ? `<p>${intro.trim().replace(/\n/g, '<br>')}</p>` : '';
            await createFiche({ title: title.trim(), content, subject, level, files });
            Alert.alert('Publié 🎉', 'Ta fiche est en ligne (+10 points).', [
                { text: 'Voir les fiches', onPress: () => router.replace('/fiches') },
            ]);
        } catch (e: any) {
            Alert.alert('Erreur', e.message || 'Publication impossible.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm }]}>
                <TouchableOpacity onPress={() => (step === 0 ? router.back() : setStep((s) => s - 1))} hitSlop={10}>
                    <Icon name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.topbarTitle}>Nouvelle fiche</Text>
                <View style={{ width: 22 }} />
            </View>

            {/* Progression étapes */}
            <View style={styles.steps}>
                {STEPS.map((label, i) => (
                    <View key={label} style={styles.stepItem}>
                        <View style={[styles.stepDot, i <= step && styles.stepDotActive, i < step && styles.stepDotDone]}>
                            {i < step ? <Icon name="checkmark" size={14} color="#fff" /> : <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>{i + 1}</Text>}
                        </View>
                        <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{label}</Text>
                        {i < STEPS.length - 1 && <View style={[styles.stepBar, i < step && styles.stepBarDone]} />}
                    </View>
                ))}
            </View>

            <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {step === 0 && (
                        <>
                            <Text style={styles.h2}>Décris ta fiche</Text>
                            <Text style={styles.label}>Titre *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex. Théorème de Thalès — 3ème"
                                placeholderTextColor={colors.textMuted}
                                value={title}
                                onChangeText={setTitle}
                                maxLength={120}
                            />

                            <Text style={styles.label}>Matière *</Text>
                            <View style={styles.chipsWrap}>
                                {SUBJECTS.map((s) => {
                                    const active = subject === s;
                                    return (
                                        <TouchableOpacity key={s} style={[styles.chip, active && styles.chipActive]} onPress={() => setSubject(s)} activeOpacity={0.8}>
                                            <Icon name={subjectIcon(s) as IconName} size={14} color={active ? '#fff' : colors.primary} />
                                            <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>{s}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={styles.label}>Niveau *</Text>
                            <View style={styles.chipsWrap}>
                                {LEVELS.map((l) => {
                                    const active = level === l;
                                    return (
                                        <TouchableOpacity key={l} style={[styles.chipSm, active && styles.chipActive]} onPress={() => setLevel(l)} activeOpacity={0.8}>
                                            <Text style={[styles.chipText, active && styles.chipTextActive]}>{l}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <Text style={styles.h2}>Ajoute le contenu</Text>
                            <Text style={styles.label}>Présentation (optionnel)</Text>
                            <TextInput
                                style={[styles.input, styles.textarea]}
                                placeholder="Présente ta fiche en quelques lignes…"
                                placeholderTextColor={colors.textMuted}
                                value={intro}
                                onChangeText={setIntro}
                                multiline
                                textAlignVertical="top"
                            />

                            <Text style={styles.label}>Pièces jointes</Text>
                            <View style={styles.attachRow}>
                                <AttachBtn icon="camera" label="Photo" color={colors.primary} onPress={takePhoto} styles={styles} />
                                <AttachBtn icon="image" label="Galerie" color={colors.info} onPress={pickImage} styles={styles} />
                                <AttachBtn icon="document-attach" label="Joindre" color={colors.success} onPress={pickPdf} styles={styles} />
                            </View>
                            <View style={[styles.attachRow, { marginTop: spacing.sm }]}>
                                <AttachBtn icon="git-network" label="Carte mentale" color={colors.accent} onPress={() => setMindOpen(true)} styles={styles} />
                                <AttachBtn icon="create" label="Rédiger un PDF" color={colors.warning} onPress={() => setPdfOpen(true)} styles={styles} />
                            </View>

                            {files.length === 0 ? (
                                <Text style={styles.hint}>Photographie tes notes, ou joins un PDF/image.</Text>
                            ) : (
                                <View style={styles.fileList}>
                                    {files.map((f, i) => {
                                        const isImg = f.mimeType.startsWith('image/');
                                        return (
                                            <View key={i} style={styles.fileItem}>
                                                {isImg ? (
                                                    <Image source={{ uri: f.uri }} style={styles.fileThumb} />
                                                ) : (
                                                    <View style={[styles.fileThumb, styles.pdfThumb]}><Icon name="document-text" size={20} color={colors.error} /></View>
                                                )}
                                                <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
                                                <TouchableOpacity onPress={() => removeFile(i)} hitSlop={8}>
                                                    <Icon name="close-circle" size={20} color={colors.textMuted} />
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Text style={styles.h2}>Prête à publier ?</Text>
                            <View style={styles.recap}>
                                <RecapRow label="Titre" value={title} styles={styles} />
                                <RecapRow label="Matière" value={subject} styles={styles} />
                                <RecapRow label="Niveau" value={level} styles={styles} />
                                <RecapRow label="Pièces jointes" value={`${files.length} fichier${files.length > 1 ? 's' : ''}`} styles={styles} last />
                            </View>
                            <View style={styles.rewardBox}>
                                <Icon name="star" size={18} color={colors.warning} />
                                <Text style={styles.rewardText}>+10 points dès la publication</Text>
                            </View>
                            <Text style={styles.hint}>En publiant, ta fiche devient visible par toute la communauté Workyt.</Text>
                        </>
                    )}
                </ScrollView>

                {/* Barre d'action */}
                <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
                    {step < 2 ? (
                        <TouchableOpacity
                            style={[styles.nextBtn, step === 0 && !step1Valid && styles.nextBtnDisabled]}
                            disabled={step === 0 && !step1Valid}
                            onPress={() => setStep((s) => s + 1)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.nextText}>Continuer</Text>
                            <Icon name="arrow-forward" size={18} color="#fff" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[styles.nextBtn, submitting && styles.nextBtnDisabled]} disabled={submitting} onPress={submit} activeOpacity={0.85}>
                            {submitting ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <Icon name="send" size={18} color="#fff" />
                                    <Text style={styles.nextText}>Publier la fiche</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>

            <MindMap visible={mindOpen} onClose={() => setMindOpen(false)} onSave={handleMindSave} />
            <PdfComposer
                visible={pdfOpen}
                onClose={() => setPdfOpen(false)}
                onSave={handlePdfSave}
                defaultTitle={title}
                subject={subject}
                level={level}
                authorName={user?.username}
            />
        </View>
    );
}

function AttachBtn({ icon, label, color, onPress, styles }: { icon: IconName; label: string; color: string; onPress: () => void; styles: any }) {
    return (
        <TouchableOpacity style={styles.attachBtn} onPress={onPress} activeOpacity={0.8}>
            <View style={[styles.attachIcon, { backgroundColor: color + '18' }]}><Icon name={icon} size={22} color={color} /></View>
            <Text style={styles.attachLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

function RecapRow({ label, value, styles, last }: { label: string; value: string; styles: any; last?: boolean }) {
    return (
        <View style={[styles.recapRow, !last && styles.recapRowBorder]}>
            <Text style={styles.recapLabel}>{label}</Text>
            <Text style={styles.recapValue} numberOfLines={1}>{value || '—'}</Text>
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
        steps: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface },
        stepItem: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
        stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surfaceVariant, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
        stepDotActive: { borderColor: colors.primary },
        stepDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
        stepNum: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.sm, color: colors.textMuted },
        stepNumActive: { color: colors.primary },
        stepLabel: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.xs, color: colors.textMuted, marginLeft: 6 },
        stepLabelActive: { color: colors.text, fontFamily: typography.fontFamily.semiBold },
        stepBar: { position: 'absolute', right: -20, width: 24, height: 2, backgroundColor: colors.border },
        stepBarDone: { backgroundColor: colors.primary },

        h2: { fontFamily: typography.fontFamily.display, fontSize: typography.size['2xl'], color: colors.text, marginBottom: spacing.lg },
        label: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.sm, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md },
        input: {
            backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg,
            paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontFamily: typography.fontFamily.regular,
            fontSize: typography.size.base, color: colors.text,
        },
        textarea: { minHeight: 110 },
        chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
        chip: {
            flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%',
            backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
            paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full,
        },
        chipSm: {
            backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
            paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full,
        },
        chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
        chipText: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm, color: colors.text, flexShrink: 1 },
        chipTextActive: { color: '#fff', fontFamily: typography.fontFamily.semiBold },

        attachRow: { flexDirection: 'row', gap: spacing.sm },
        attachBtn: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center', gap: spacing.sm, ...shadows.sm },
        attachIcon: { width: 44, height: 44, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
        attachLabel: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.sm, color: colors.text },
        hint: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textMuted, marginTop: spacing.md, fontStyle: 'italic' },
        fileList: { marginTop: spacing.md, gap: spacing.sm },
        fileItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.sm },
        fileThumb: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surfaceVariant },
        pdfThumb: { justifyContent: 'center', alignItems: 'center' },
        fileName: { flex: 1, fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.text },

        recap: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, paddingHorizontal: spacing.md, ...shadows.sm },
        recapRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
        recapRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
        recapLabel: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm, color: colors.textSecondary },
        recapValue: { flex: 1, textAlign: 'right', fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.base, color: colors.text },
        rewardBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.warning + '14', borderRadius: radius.lg, paddingVertical: spacing.md, marginTop: spacing.lg },
        rewardText: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.base, color: colors.text },

        footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
        nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.lg },
        nextBtnDisabled: { opacity: 0.5 },
        nextText: { fontFamily: typography.fontFamily.heading, color: '#fff', fontSize: typography.size.lg },
    });
}
