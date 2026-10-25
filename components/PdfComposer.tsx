import { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import Icon from './Icon';
import { useColors } from '../lib/useColors';
import { spacing, radius, typography } from '../lib/theme';

interface PdfComposerProps {
    visible: boolean;
    onClose: () => void;
    onSave: (uri: string, name: string) => void;
    defaultTitle?: string;
    subject?: string;
    level?: string;
    authorName?: string;
}

const BRAND_ORANGE = '#ff6a1a';
const BRAND_DARK = '#1a1512';
const LOGO_URL = 'https://workyt.fr/Workyt%20Logo%202026.png';

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Aligné sur le générateur du site (src/app/fiches/_components/PdfComposerModal.tsx). */
function buildPdfHtml(title: string, markdownBody: string, subject?: string, level?: string, author?: string): string {
    const meta = [subject, level].filter(Boolean).join(' · ');
    return `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Funnel+Display:wght@700;800&display=swap" rel="stylesheet">
<style>
  @page { margin: 22mm 16mm; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:'Montserrat',system-ui,sans-serif; color:${BRAND_DARK}; }
  .pdf-header { display:flex; align-items:center; justify-content:space-between; gap:16px; padding-bottom:12px; margin-bottom:20px; border-bottom:3px solid ${BRAND_ORANGE}; }
  .pdf-header img { height:34px; }
  .pdf-header .meta { text-align:right; font-size:11px; color:#6b6b6b; }
  .pdf-header .meta b { color:${BRAND_DARK}; }
  .workyt-pdf-content { color:${BRAND_DARK}; font-family:'Montserrat',system-ui,sans-serif; font-size:13px; line-height:1.55; }
  .workyt-pdf-content h1 { font-family:'Funnel Display',sans-serif; font-weight:800; color:${BRAND_DARK}; font-size:26px; margin:0 0 8px; padding-bottom:8px; border-bottom:3px solid ${BRAND_ORANGE}; }
  .workyt-pdf-content h2 { font-family:'Funnel Display',sans-serif; font-weight:700; color:${BRAND_DARK}; font-size:19px; margin:22px 0 10px; padding-left:10px; border-left:4px solid ${BRAND_ORANGE}; }
  .workyt-pdf-content h3 { font-family:'Funnel Display',sans-serif; color:${BRAND_ORANGE}; font-size:16px; margin:18px 0 6px; }
  .workyt-pdf-content p { margin:0 0 10px; }
  .workyt-pdf-content strong { color:${BRAND_DARK}; }
  .workyt-pdf-content a { color:${BRAND_ORANGE}; text-decoration:underline; }
  .workyt-pdf-content ul, .workyt-pdf-content ol { margin:0 0 12px; padding-left:22px; }
  .workyt-pdf-content li { margin-bottom:4px; }
  .workyt-pdf-content blockquote { border-left:4px solid ${BRAND_ORANGE}; background:#fff7ed; color:${BRAND_DARK}; padding:10px 14px; margin:12px 0; font-style:italic; border-radius:0 6px 6px 0; }
  .workyt-pdf-content code { background:#fff3e6; color:${BRAND_DARK}; padding:2px 6px; border-radius:4px; font-size:.92em; font-family:ui-monospace,Menlo,monospace; }
  .workyt-pdf-content pre { background:#f6f6f6; padding:12px; border-radius:6px; overflow-x:auto; margin:12px 0; border-left:4px solid ${BRAND_ORANGE}; }
  .workyt-pdf-content pre code { background:transparent; padding:0; }
  .workyt-pdf-content table { width:100%; border-collapse:collapse; margin:12px 0; }
  .workyt-pdf-content th, .workyt-pdf-content td { border:1px solid #e5e5e5; padding:8px 10px; text-align:left; }
  .workyt-pdf-content th { background:#fff3e6; color:${BRAND_DARK}; font-weight:600; }
  .workyt-pdf-content img { max-width:100%; border-radius:6px; margin:10px 0; }
  .workyt-pdf-content hr { border:none; border-top:2px dashed ${BRAND_ORANGE}; margin:18px 0; }
  .workyt-pdf-content .katex-display { background:#fffaf3; border-radius:6px; padding:10px 8px; margin:10px 0; border:1px solid #ffe1c4; }
  .pdf-footer { margin-top:24px; padding-top:10px; border-top:1px solid #eee; color:#9C8672; font-size:10px; display:flex; justify-content:space-between; }
</style></head><body>
  <div class="pdf-header">
    <img src="${LOGO_URL}" alt="Workyt"/>
    <div class="meta"><b>Fiche de révision</b>${meta ? `<br>${esc(meta)}` : ''}${author ? `<br>par ${esc(author)}` : ''}</div>
  </div>
  <textarea id="md" style="display:none">${esc('# ' + (title || 'Fiche de révision') + '\n\n' + markdownBody)}</textarea>
  <div class="workyt-pdf-content" id="content"></div>
  <div class="pdf-footer"><span>Généré avec l'application Workyt</span><span>workyt.fr</span></div>
  <script src="https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
  <script>
    (function(){
      var raw = document.getElementById('md').value;
      var math = [];
      raw = raw.replace(/\\$\\$([\\s\\S]*?)\\$\\$/g, function(m){ math.push(m); return '@@M'+(math.length-1)+'@@'; });
      raw = raw.replace(/\\$([^\\$\\n]+?)\\$/g, function(m){ math.push(m); return '@@M'+(math.length-1)+'@@'; });
      var out = window.marked ? window.marked.parse(raw, { gfm:true, breaks:true }) : raw;
      out = out.replace(/@@M(\\d+)@@/g, function(_, i){ return math[i]; });
      var el = document.getElementById('content');
      el.innerHTML = out;
      try { renderMathInElement(el, { delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}], throwOnError:false }); } catch(e){}
    })();
  </script>
</body></html>`;
}

export default function PdfComposer({ visible, onClose, onSave, defaultTitle, subject, level, authorName }: PdfComposerProps) {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [title, setTitle] = useState(defaultTitle || '');
    const [body, setBody] = useState('');
    const [generating, setGenerating] = useState(false);

    const generate = async () => {
        if (!body.trim()) { Alert.alert('Vide', 'Écris le contenu de ta fiche.'); return; }
        setGenerating(true);
        try {
            const html = buildPdfHtml(title || defaultTitle || 'Fiche', body, subject, level, authorName);
            const { uri } = await Print.printToFileAsync({ html });
            const name = `${(title || 'fiche').replace(/[^\w\-]+/g, '_').slice(0, 40)}.pdf`;
            onSave(uri, name);
            setBody('');
        } catch (e: any) {
            Alert.alert('Erreur', e.message || 'Génération du PDF impossible.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                <View style={[styles.bar, { paddingTop: insets.top + spacing.sm }]}>
                    <TouchableOpacity onPress={onClose} hitSlop={10}>
                        <Text style={styles.cancel}>Annuler</Text>
                    </TouchableOpacity>
                    <Text style={styles.headTitle}>Rédiger un PDF</Text>
                    <View style={{ width: 54 }} />
                </View>

                <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
                        <View style={styles.tip}>
                            <Icon name="sparkles" size={16} color={colors.primary} />
                            <Text style={styles.tipText}>Mise en forme Markdown (## titres, **gras**, listes) et formules LaTeX entre $…$ — style Workyt appliqué automatiquement.</Text>
                        </View>

                        <Text style={styles.label}>Titre du document</Text>
                        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Titre de la fiche" placeholderTextColor={colors.textMuted} />

                        <Text style={styles.label}>Contenu</Text>
                        <TextInput
                            style={[styles.input, styles.textarea]}
                            value={body}
                            onChangeText={setBody}
                            placeholder={"Exemple :\nLe théorème de Pythagore : $a^2 + b^2 = c^2$\n\nDans un triangle rectangle…"}
                            placeholderTextColor={colors.textMuted}
                            multiline
                            textAlignVertical="top"
                        />
                    </ScrollView>

                    <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
                        <TouchableOpacity style={[styles.genBtn, generating && { opacity: 0.6 }]} onPress={generate} disabled={generating} activeOpacity={0.85}>
                            {generating ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <Icon name="document-text" size={18} color="#fff" />
                                    <Text style={styles.genText}>Générer le PDF</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

function createStyles(colors: ReturnType<typeof useColors>) {
    return StyleSheet.create({
        flex: { flex: 1 },
        container: { flex: 1, backgroundColor: colors.background },
        bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
        cancel: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.base, color: colors.textSecondary, width: 54 },
        headTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg, color: colors.text },
        tip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary + '12', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg },
        tipText: { flex: 1, fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary },
        label: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.sm, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md },
        input: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: colors.text },
        textarea: { minHeight: 220 },
        footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
        genBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.lg },
        genText: { fontFamily: typography.fontFamily.heading, color: '#fff', fontSize: typography.size.lg },
    });
}
