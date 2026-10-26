import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import Icon from '../../components/Icon';
import { Image } from 'react-native';
import { useAuth } from '../../lib/auth';
import { getToken, API_ORIGIN } from '../../lib/api';
import { colors } from '../../lib/colors';
import { typography } from '../../lib/theme';
import RichMarkdown from '../../components/RichMarkdown';

const SUBJECTS = ['Mathématiques', 'Français', 'Histoire-Géo', 'Physique-Chimie', 'SVT', 'Anglais', 'SES', 'Philosophie', 'NSI', 'Autre'];
const LEVELS = ['Seconde', 'Première', 'Terminale', 'BTS'];
const POINTS_OPTIONS = [1, 3, 5, 10, 15];

// Toujours la prod (le serveur LAN de dev n'existe plus)
const API_URL = `${API_ORIGIN}/api`;

function getSubjectColor(subject: string) {
    const colors: Record<string, string> = {
        'Français': '#dc2626',
        'Mathématiques': '#2563eb',
        'Histoire-Géographie': '#16a34a',
        'Histoire-Géo': '#16a34a',
        'SVT': '#ca8a04',
        'Sciences de la Vie et de la Terre (SVT)': '#ca8a04',
        'Physique-Chimie': '#9333ea',
        'Technologie': '#db2777',
        'Anglais': '#C24A0A',
        'Espagnol': '#0d9488',
        'Allemand': '#ea580c',
        'Italien': '#e11d48',
        'Philosophie': '#0891b2',
        'Économie': '#65a30d',
        'SES': '#65a30d',
        'Sciences Économiques et Sociales (SES)': '#65a30d',
        'Informatique': '#d97706',
        'NSI': '#0284c7',
        'Numérique et Sciences Informatiques (NSI)': '#0284c7',
        'Arts Plastiques': '#c026d3',
        'Éducation Musicale': '#7c3aed',
        'EPS': '#059669',
        'Autre': '#4b5563',
    };
    return colors[subject] || '#2563eb';
}

// Composant d'éditeur Markdown réutilisable
interface MarkdownEditorProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    label: string;
    icon: string;
    iconColor: string;
    borderColor: string;
}

function MarkdownEditor({ value, onChangeText, placeholder, label, icon, iconColor, borderColor }: MarkdownEditorProps) {
    const [showPreview, setShowPreview] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    const insertMarkdown = (before: string, after: string = '') => {
        const newText = value + before + after;
        onChangeText(newText);
    };

    return (
        <View style={styles.editorContainer}>
            <View style={styles.labelRow}>
                <View style={styles.labelLeft}>
                    <Icon name={icon as any} size={18} color={iconColor} />
                    <Text style={styles.label}>{label}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowHelp(!showHelp)}>
                    <Icon name="help-circle-outline" size={20} color="#635E5A" />
                </TouchableOpacity>
            </View>

            {showHelp && (
                <View style={styles.helpCard}>
                    <Text style={styles.helpTitle}>Formatage disponible :</Text>
                    <Text style={styles.helpText}>**gras** → <Text style={{fontWeight: 'bold'}}>gras</Text></Text>
                    <Text style={styles.helpText}>*italique* → <Text style={{fontStyle: 'italic'}}>italique</Text></Text>
                    <Text style={styles.helpText}># Titre → Grand titre</Text>
                    <Text style={styles.helpText}>- liste → Liste à puces</Text>
                    <Text style={styles.helpText}>```code``` → Bloc de code</Text>
                    <Text style={styles.helpText}>$x^2$ → Formule LaTeX</Text>
                </View>
            )}

            {/* Barre d'outils */}
            <View style={styles.toolbar}>
                <TouchableOpacity style={styles.toolBtn} onPress={() => insertMarkdown('**', '**')}>
                    <Text style={styles.toolTextBold}>B</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => insertMarkdown('*', '*')}>
                    <Text style={styles.toolTextItalic}>I</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => insertMarkdown('# ', '')}>
                    <Icon name="text" size={16} color="#635E5A" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => insertMarkdown('- ', '')}>
                    <Icon name="list" size={16} color="#635E5A" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => insertMarkdown('```\n', '\n```')}>
                    <Icon name="code-slash" size={16} color="#635E5A" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => insertMarkdown('$', '$')}>
                    <Text style={styles.toolText}>∑</Text>
                </TouchableOpacity>
                <View style={styles.toolbarDivider} />
                <TouchableOpacity 
                    style={[styles.toolBtn, showPreview && styles.toolBtnActive]} 
                    onPress={() => setShowPreview(!showPreview)}
                >
                    <Icon name="eye" size={16} color={showPreview ? '#C24A0A' : '#635E5A'} />
                </TouchableOpacity>
            </View>

            {showPreview ? (
                <View style={[styles.previewBox, { borderColor }]}>
                    <Text style={styles.previewLabel}>Aperçu</Text>
                    <RichMarkdown content={value || '*Aucun contenu*'} />
                </View>
            ) : (
                <TextInput
                    style={[styles.markdownInput, { borderColor }]}
                    placeholder={placeholder}
                    placeholderTextColor="#8C8883"
                    value={value}
                    onChangeText={onChangeText}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                />
            )}
        </View>
    );
}

export default function CreateQuestionScreen() {
    const router = useRouter();
    const { user } = useAuth();
    
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [classLevel, setClassLevel] = useState('');
    const [whatIDid, setWhatIDid] = useState('');
    const [whatINeed, setWhatINeed] = useState('');
    const [points, setPoints] = useState(5);
    const [loading, setLoading] = useState(false);
    const [showPointsInfo, setShowPointsInfo] = useState(false);

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('Champs manquants', 'Veuillez saisir un titre');
            return;
        }
        if (!subject) {
            Alert.alert('Champs manquants', 'Veuillez choisir une matière');
            return;
        }
        if (!classLevel) {
            Alert.alert('Champs manquants', 'Veuillez choisir un niveau');
            return;
        }
        if (!whatIDid.trim()) {
            Alert.alert('Champs manquants', 'Veuillez décrire ce que vous avez fait');
            return;
        }
        if (!whatINeed.trim()) {
            Alert.alert('Champs manquants', 'Veuillez décrire ce dont vous avez besoin');
            return;
        }

        if (user && user.points < points) {
            Alert.alert(
                'Points insuffisants',
                `Vous n'avez que ${user.points} points. Vous ne pouvez pas miser ${points} points.`
            );
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('title', title.trim());
            formData.append('subject', subject);
            formData.append('classLevel', classLevel);
            formData.append('whatIDid', whatIDid.trim());
            formData.append('whatINeed', whatINeed.trim());
            formData.append('points', points.toString());

            const token = await getToken();
            
            const res = await fetch(`${API_URL}/forum/creer`, {
                method: 'POST',
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: formData,
            });

            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || data.message || `Erreur ${res.status}`);
            }

            Alert.alert(
                'Succès !',
                'Votre question a été publiée avec succès !',
                [{ 
                    text: 'OK', 
                    onPress: () => router.replace('/(tabs)/forum')
                }]
            );
        } catch (e: any) {
            Alert.alert('Erreur', e.message || 'Impossible de publier la question');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Stack.Screen 
                options={{ 
                    title: 'Poser une question',
                    headerBackTitle: 'Forum',
                    headerTitleStyle: {
                        fontFamily: typography.fontFamily.display,
                    },
                    headerBackTitleStyle: {
                        fontFamily: typography.fontFamily.medium,
                    },
                }} 
            />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={90}
            >
                <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                    {/* Header info */}
                    <View style={styles.infoCard}>
                        <Icon name="bulb" size={24} color="#f59e0b" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.infoTitle}>Comment poser une bonne question ?</Text>
                            <Text style={styles.infoText}>
                                Utilisez le formatage Markdown et LaTeX pour des maths claires. 
                                Cliquez sur l'icône 👁 pour voir l'aperçu !
                            </Text>
                        </View>
                    </View>

                    {/* Points */}
                    <View style={styles.pointsCard}>
                        <View style={styles.pointsHeader}>
                            <View style={styles.pointsInfo}>
                                <Icon name="wallet-outline" size={20} color="#f59e0b" />
                                <Text style={styles.pointsLabel}>Points disponibles</Text>
                            </View>
                            <Text style={styles.pointsValue}>{user?.points || 0} pts</Text>
                        </View>
                    </View>

                    {/* Titre */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Titre de la question *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: Comment résoudre cette équation du second degré ?"
                            placeholderTextColor="#8C8883"
                            value={title}
                            onChangeText={setTitle}
                            maxLength={100}
                        />
                        <Text style={styles.counter}>{title.length}/100</Text>
                    </View>

                    {/* Matière */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Matière *</Text>
                        <View style={styles.chipsGrid}>
                            {SUBJECTS.map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[
                                        styles.chip,
                                        subject === s && { 
                                            backgroundColor: getSubjectColor(s),
                                            borderColor: getSubjectColor(s),
                                        }
                                    ]}
                                    onPress={() => setSubject(s)}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        subject === s && { color: '#fff' }
                                    ]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Niveau */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Niveau *</Text>
                        <View style={styles.chipsRow}>
                            {LEVELS.map((l) => (
                                <TouchableOpacity
                                    key={l}
                                    style={[
                                        styles.levelChip,
                                        classLevel === l && styles.levelChipActive
                                    ]}
                                    onPress={() => setClassLevel(l)}
                                >
                                    <Text style={[
                                        styles.levelChipText,
                                        classLevel === l && styles.levelChipTextActive
                                    ]}>{l}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Ce que j'ai fait - Avec Markdown */}
                    <MarkdownEditor
                        label="Ce que j'ai fait *"
                        icon="help-circle"
                        iconColor="#3b82f6"
                        borderColor="#bfdbfe"
                        placeholder="Décrivez vos tentatives, ce que vous avez compris...\n\nExemple : J'ai essayé de factoriser avec Δ = b² - 4ac = 9 - 8 = 1..."
                        value={whatIDid}
                        onChangeText={setWhatIDid}
                    />

                    {/* Ce dont j'ai besoin - Avec Markdown */}
                    <MarkdownEditor
                        label="Ce dont j'ai besoin *"
                        icon="alert-circle"
                        iconColor="#ec4899"
                        borderColor="#fbcfe8"
                        placeholder="Expliquez ce que vous attendez...\n\nExemple : Je ne comprends pas pourquoi $x = \\frac{-b \\pm \\sqrt{Δ}}{2a}$ donne deux solutions..."
                        value={whatINeed}
                        onChangeText={setWhatINeed}
                    />

                    {/* Points */}
                    <View style={styles.field}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>Points à miser *</Text>
                            <TouchableOpacity onPress={() => setShowPointsInfo(!showPointsInfo)}>
                                <Icon name="information-circle-outline" size={18} color="#635E5A" />
                            </TouchableOpacity>
                        </View>
                        
                        {showPointsInfo && (
                            <View style={styles.pointsInfoCard}>
                                <Text style={styles.pointsInfoText}>
                                    Plus vous misez de points, plus les Helpeurs seront motivés !
                                    {'\n'}• 1-3 pts : Question simple
                                    {'\n'}• 5 pts : Question standard  
                                    {'\n'}• 10-15 pts : Question complexe
                                </Text>
                            </View>
                        )}

                        <View style={styles.pointsRow}>
                            {POINTS_OPTIONS.map((p) => (
                                <TouchableOpacity
                                    key={p}
                                    style={[
                                        styles.pointChip,
                                        points === p && styles.pointChipActive,
                                        user && user.points < p && styles.pointChipDisabled
                                    ]}
                                    onPress={() => user && user.points >= p && setPoints(p)}
                                    disabled={user ? user.points < p : false}
                                >
                                    <Icon 
                                        name="diamond" 
                                        size={14} 
                                        color={points === p ? '#fff' : user && user.points < p ? '#D9D3C9' : '#f59e0b'} 
                                    />
                                    <Text style={[
                                        styles.pointText,
                                        points === p && styles.pointTextActive,
                                        user && user.points < p && styles.pointTextDisabled
                                    ]}>{p}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        
                        {user && user.points < points && (
                            <Text style={styles.pointsError}>
                                Vous n'avez pas assez de points.
                            </Text>
                        )}
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        style={[
                            styles.submitBtn,
                            loading && { opacity: 0.6 }
                        ]}
                        onPress={handleSubmit}
                        disabled={loading || (user ? user.points < points : false)}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Icon name="paper-plane" size={20} color="#fff" />
                                <Text style={styles.submitText}>Publier la question</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.terms}>
                        En publiant, vous acceptez que votre question soit visible par tous.
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDFAF4',
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    infoCard: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: '#fef3c7',
        borderWidth: 1,
        borderColor: '#fcd34d',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
    },
    infoTitle: {
        fontSize: 14,
        color: '#92400e',
        marginBottom: 4,
        fontWeight: '700'
    },
    infoText: {
        fontSize: 13,
        color: '#a16207',
        lineHeight: 18,
    },
    pointsCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    pointsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pointsInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pointsLabel: {
        fontSize: 14,
        color: '#635E5A',
    },
    pointsValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#f59e0b',
    },
    field: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: '#1A1512',
        marginBottom: 8,
        fontWeight: '700'
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    labelLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E9E5DE',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1A1512',
    },
    counter: {
        fontSize: 12,
        color: '#8C8883',
        textAlign: 'right',
        marginTop: 4,
    },
    chipsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F5EFE3',
        borderWidth: 1,
        borderColor: '#E9E5DE',
    },
    chipText: {
        fontSize: 13,
        color: '#635E5A',
        fontWeight: '500',
    },
    chipsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    levelChip: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: '#F5EFE3',
        alignItems: 'center',
    },
    levelChipActive: {
        backgroundColor: '#10b981',
    },
    levelChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#635E5A',
    },
    levelChipTextActive: {
        color: '#fff',
    },
    // Markdown Editor styles
    editorContainer: {
        marginBottom: 20,
    },
    helpCard: {
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
    },
    helpTitle: {
        fontSize: 13,
        color: '#1e40af',
        marginBottom: 6,
        fontWeight: '700'
    },
    helpText: {
        fontSize: 12,
        color: '#3b82f6',
        marginBottom: 3,
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
        paddingHorizontal: 4,
    },
    toolBtn: {
        width: 38,
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: '#F5EFE3',
    },
    toolBtnActive: {
        backgroundColor: '#e0e7ff',
    },
    toolText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#635E5A',
    },
    toolTextBold: {
        fontSize: 16,
        fontWeight: '800',
        color: '#635E5A',
    },
    toolTextItalic: {
        fontSize: 16,
        fontWeight: '600',
        fontStyle: 'italic',
        color: '#635E5A',
    },
    toolbarDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E9E5DE',
        marginHorizontal: 4,
    },
    markdownInput: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: '#1A1512',
        minHeight: 140,
        textAlignVertical: 'top',
    },
    previewBox: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderRadius: 12,
        padding: 14,
        minHeight: 140,
    },
    previewLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8C8883',
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    pointsInfoCard: {
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
    pointsInfoText: {
        fontSize: 13,
        color: '#1e40af',
        lineHeight: 20,
    },
    pointsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    pointChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: '#F5EFE3',
        borderWidth: 2,
        borderColor: '#E9E5DE',
    },
    pointChipActive: {
        backgroundColor: '#f59e0b',
        borderColor: '#f59e0b',
    },
    pointChipDisabled: {
        backgroundColor: '#FDFAF4',
        borderColor: '#E9E5DE',
    },
    pointText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#635E5A',
    },
    pointTextActive: {
        color: '#fff',
    },
    pointTextDisabled: {
        color: '#D9D3C9',
    },
    pointsError: {
        fontSize: 13,
        color: '#ef4444',
        marginTop: 8,
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#C24A0A',
        borderRadius: 12,
        paddingVertical: 16,
        marginTop: 10,
    },
    submitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    terms: {
        fontSize: 12,
        color: '#8C8883',
        textAlign: 'center',
        marginTop: 16,
    },
});
