import { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking, Platform } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import Icon from '../components/Icon';
import { useColors } from '../lib/useColors';
import { spacing, typography, type ThemeColors } from '../lib/theme';
import { appPathForUrl, isSiteUrl } from '../lib/links';

/**
 * Page du site affichée DANS l'app (blog, pages légales, pages sans écran
 * natif…) : pas de détour par le navigateur. Les liens vers une page que
 * l'app sait afficher ouvrent l'écran natif ; les sites externes partent
 * dans le navigateur. Accessible sans être connecté (politique de
 * confidentialité depuis l'inscription).
 */
export default function WebScreen() {
    const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);
    const web = useRef<any>(null);
    const [pageTitle, setPageTitle] = useState(title || '');
    const [loading, setLoading] = useState(true);
    const [canBack, setCanBack] = useState(false);

    const onRequest = (req: WebViewNavigation) => {
        // Chargement initial ou navigation interne non couverte par l'app
        if (req.url === url) return true;
        if (isSiteUrl(req.url)) {
            const path = appPathForUrl(req.url);
            if (path) { router.push(path as Href); return false; }
            return true;
        }
        if (/^https?:/i.test(req.url)) { Linking.openURL(req.url).catch(() => {}); return false; }
        // mailto:, tel:… → application système
        Linking.openURL(req.url).catch(() => {});
        return false;
    };

    const onNav = (n: WebViewNavigation): void => {
        setCanBack(n.canGoBack);
        // « Titre | Workyt » → « Titre »
        if (n.title && !/^https?:/.test(n.title)) setPageTitle(n.title.replace(/\s*[|–-]\s*Workyt.*$/i, ''));
    };

    if (Platform.OS === 'web') {
        // Aperçu web : un simple lien suffit
        if (url) window.open(url, '_blank');
        router.back();
        return null;
    }

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[s.topbar, { paddingTop: insets.top + spacing.xs }]}>
                <Pressable
                    onPress={() => (canBack ? web.current?.goBack() : router.back())}
                    hitSlop={10}
                    style={s.btn}
                    accessibilityLabel="Retour"
                >
                    <Icon name="arrow-back" size={20} color={colors.text} />
                </Pressable>
                <View style={{ flex: 1 }}>
                    <Text style={s.title} numberOfLines={1}>{pageTitle || 'Workyt'}</Text>
                    <Text style={s.host} numberOfLines={1}>workyt.fr</Text>
                </View>
                <Pressable onPress={() => router.back()} hitSlop={10} style={s.btn} accessibilityLabel="Fermer">
                    <Icon name="close" size={20} color={colors.text} />
                </Pressable>
            </View>
            {url ? (
                <WebView
                    ref={web}
                    source={{ uri: url }}
                    onShouldStartLoadWithRequest={onRequest}
                    onNavigationStateChange={onNav}
                    onLoadEnd={() => setLoading(false)}
                    setSupportMultipleWindows={false}
                    pullToRefreshEnabled
                    style={{ flex: 1, backgroundColor: colors.background }}
                />
            ) : null}
            {loading ? (
                <View style={s.loader} pointerEvents="none"><ActivityIndicator color={colors.primary} /></View>
            ) : null}
        </View>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        topbar: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.md,
            paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
            borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.background,
        },
        btn: {
            width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
            backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
        },
        title: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: c.text },
        host: { fontFamily: typography.fontFamily.mono, fontSize: 10.5, letterSpacing: 0.6, color: c.textMuted },
        loader: { position: 'absolute', top: 120, left: 0, right: 0, alignItems: 'center' },
    });
}
