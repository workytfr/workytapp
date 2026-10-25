import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    Platform,
    Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Icon from './Icon';
import { useColors } from '../lib/useColors';
import { spacing, radius, typography, shadows } from '../lib/theme';

interface PdfViewerProps {
    url: string;
    /** Libellé optionnel (ex. "Document #2" quand il y a plusieurs fichiers). */
    label?: string;
}

/**
 * Affiche un PDF directement dans l'écran (comme le site web) via une WebView.
 * - iOS : la WebView rend le PDF nativement à partir de l'URL.
 * - Android : la WebView ne sait pas rendre un PDF → on passe par le viewer Google
 *   (nécessite une URL publiquement accessible, ce qui est le cas des fichiers R2).
 * Un mode plein écran et une ouverture externe en secours sont proposés.
 */
function viewerUri(url: string): string {
    if (Platform.OS === 'ios') return url;
    return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
}

export default function PdfViewer({ url, label }: PdfViewerProps) {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const styles = createStyles(colors);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);

    const uri = viewerUri(url);

    const renderWeb = (onDone: () => void, onError: () => void) => (
        <WebView
            source={{ uri }}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState={false}
            androidLayerType="hardware"
            onLoadEnd={onDone}
            onError={onError}
            onHttpError={onError}
            style={{ flex: 1, backgroundColor: 'transparent' }}
        />
    );

    return (
        <View style={styles.wrap}>
            {/* Barre d'outils */}
            <View style={styles.toolbar}>
                <View style={styles.toolbarLeft}>
                    <Icon name="document-text" size={16} color={colors.error} />
                    <Text style={styles.toolbarLabel} numberOfLines={1}>{label || 'Document PDF'}</Text>
                </View>
                <View style={styles.toolbarActions}>
                    <TouchableOpacity onPress={() => setFullscreen(true)} hitSlop={8} style={styles.iconBtn}>
                        <Icon name="expand" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => Linking.openURL(url)} hitSlop={8} style={styles.iconBtn}>
                        <Icon name="open-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Aperçu inline */}
            <View style={styles.preview}>
                {failed ? (
                    <View style={styles.center}>
                        <Icon name="alert-circle-outline" size={32} color={colors.textMuted} />
                        <Text style={styles.errText}>Impossible d'afficher le PDF ici.</Text>
                        <TouchableOpacity style={styles.openBtn} onPress={() => Linking.openURL(url)} activeOpacity={0.85}>
                            <Icon name="open-outline" size={16} color="#fff" />
                            <Text style={styles.openBtnText}>Ouvrir le PDF</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {renderWeb(() => setLoading(false), () => { setLoading(false); setFailed(true); })}
                        {loading && (
                            <View style={styles.loader} pointerEvents="none">
                                <ActivityIndicator color={colors.primary} />
                                <Text style={styles.loaderText}>Chargement du document…</Text>
                            </View>
                        )}
                    </>
                )}
            </View>

            {/* Plein écran */}
            <Modal visible={fullscreen} animationType="slide" onRequestClose={() => setFullscreen(false)}>
                <View style={[styles.fsContainer, { paddingTop: insets.top }]}>
                    <View style={styles.fsBar}>
                        <Text style={styles.fsTitle} numberOfLines={1}>{label || 'Document PDF'}</Text>
                        <TouchableOpacity onPress={() => setFullscreen(false)} hitSlop={10}>
                            <Icon name="close" size={26} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }}>
                        {renderWeb(() => {}, () => {})}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function createStyles(colors: ReturnType<typeof useColors>) {
    return StyleSheet.create({
        wrap: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            overflow: 'hidden',
            backgroundColor: colors.surface,
            ...shadows.sm,
        },
        toolbar: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.surfaceVariant,
        },
        toolbarLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
        toolbarLabel: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.sm, color: colors.text, flex: 1 },
        toolbarActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
        iconBtn: { padding: 6 },
        preview: { height: 460, backgroundColor: colors.surfaceVariant },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
        errText: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary, textAlign: 'center' },
        openBtn: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm,
            backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md,
        },
        openBtnText: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.sm, color: '#fff' },
        loader: {
            ...StyleSheet.absoluteFill,
            alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
            backgroundColor: colors.surfaceVariant,
        },
        loaderText: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary },
        fsContainer: { flex: 1, backgroundColor: colors.background },
        fsBar: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
            borderBottomWidth: 1, borderBottomColor: colors.border,
        },
        fsTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg, color: colors.text, flex: 1, marginRight: spacing.md },
    });
}
