import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, Linking, ActivityIndicator, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Icon from '../components/Icon';
import { useColors } from '../lib/useColors';
import { spacing, radius, typography, type ThemeColors } from '../lib/theme';
import { searchAll, type SearchCategory, type SearchResult } from '../lib/api';
import { ChipTabs, EmptyState } from '../components/wk';

type IconName = string;

const TYPE_META: Record<SearchResult['type'], { label: string; icon: IconName }> = {
    forum: { label: 'Forum', icon: 'chatbubbles-outline' },
    fiches: { label: 'Fiche', icon: 'document-text-outline' },
    cours: { label: 'Cours', icon: 'book-outline' },
    blog: { label: 'Blog', icon: 'newspaper-outline' },
};

const DEBOUNCE_MS = 300;

/** Recherche globale (forum, fiches, cours, blog) — même API que la palette ⌘K du site. */
export default function SearchScreen() {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);

    const [q, setQ] = useState('');
    const [category, setCategory] = useState<SearchCategory>('all');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const requestId = useRef(0);

    // Recherche différée : pas une requête par frappe
    useEffect(() => {
        const term = q.trim();
        if (term.length < 2) {
            requestId.current++;
            setResults([]);
            setLoading(false);
            setError('');
            return;
        }
        setLoading(true);
        const t = setTimeout(async () => {
            const rid = ++requestId.current;
            try {
                const res = await searchAll(term, category, category === 'all' ? 6 : 15);
                if (rid !== requestId.current) return;
                setResults(res.results || []);
                setError('');
            } catch (e: any) {
                if (rid === requestId.current) setError(e.message || 'Recherche impossible.');
            } finally {
                if (rid === requestId.current) setLoading(false);
            }
        }, DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [q, category]);

    const open = useCallback((r: SearchResult) => {
        Keyboard.dismiss();
        if (r.type === 'blog' || r.external) { Linking.openURL(r.url); return; }
        if (r.type === 'forum') router.push(`/forum/${r.id}`);
        else if (r.type === 'fiches') router.push(`/fiches/${r.id}`);
        else if (r.type === 'cours') router.push(`/cours/${r.id}`);
    }, [router]);

    const renderItem = useCallback(({ item }: { item: SearchResult }) => {
        const meta = TYPE_META[item.type];
        return (
            <Pressable style={({ pressed }) => [s.row, pressed && s.rowPressed]} onPress={() => open(item)}>
                <View style={s.rowIcon}><Icon name={meta.icon} size={18} color={colors.accent} /></View>
                <View style={s.rowBody}>
                    <Text style={s.rowTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={s.rowSub} numberOfLines={1}>{meta.label}{item.subtitle ? ` · ${item.subtitle}` : ''}</Text>
                </View>
                <Icon name={item.type === 'blog' ? 'open-outline' : 'chevron-forward'} size={16} color={colors.textMuted} />
            </Pressable>
        );
    }, [s, colors, open]);

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />
            <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
                <View style={s.searchRow}>
                    <View style={s.searchBox}>
                        <Icon name="search" size={18} color={colors.textMuted} />
                        <TextInput
                            style={s.input}
                            value={q}
                            onChangeText={setQ}
                            placeholder="Fiches, questions, cours…"
                            placeholderTextColor={colors.textMuted}
                            autoFocus
                            returnKeyType="search"
                            autoCorrect={false}
                        />
                        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : q ? (
                            <Pressable onPress={() => setQ('')} hitSlop={8}><Icon name="close-circle" size={18} color={colors.textMuted} /></Pressable>
                        ) : null}
                    </View>
                    <Pressable onPress={() => router.back()} hitSlop={8}>
                        <Text style={s.cancel}>Annuler</Text>
                    </Pressable>
                </View>
                <ChipTabs<SearchCategory>
                    value={category}
                    onChange={setCategory}
                    style={{ paddingTop: spacing.md }}
                    options={[
                        { value: 'all', label: 'Tout' },
                        { value: 'fiches', label: 'Fiches' },
                        { value: 'forum', label: 'Forum' },
                        { value: 'cours', label: 'Cours' },
                        { value: 'blog', label: 'Blog' },
                    ]}
                />
            </View>

            <FlatList
                data={results}
                keyExtractor={(r) => `${r.type}:${r.id}`}
                renderItem={renderItem}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={[s.list, { paddingBottom: insets.bottom + spacing['3xl'] }]}
                ListEmptyComponent={
                    error ? <EmptyState icon="cloud-offline-outline" title="Oups" text={error} />
                        : q.trim().length < 2 ? <EmptyState icon="search" title="Que cherches-tu ?" text="Tape au moins 2 lettres : un chapitre, une notion, une matière…" />
                            : loading ? undefined
                                : <EmptyState icon="file-tray-outline" title="Aucun résultat" text={`Rien pour « ${q.trim()} ». Essaie un autre mot-clé.`} />
                }
            />
        </View>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: c.border },
        searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        searchBox: {
            flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
            backgroundColor: c.surface, borderRadius: radius.full, borderWidth: 1, borderColor: c.border,
            paddingHorizontal: spacing.lg, minHeight: 46,
        },
        input: { flex: 1, fontFamily: typography.fontFamily.regular, fontSize: 15, color: c.text, paddingVertical: spacing.sm },
        cancel: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.accent },
        list: { padding: spacing.lg, gap: spacing.sm },
        row: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.md,
            backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border,
            padding: spacing.md,
        },
        rowPressed: { backgroundColor: c.surfaceVariant },
        rowIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.surfaceVariant, alignItems: 'center', justifyContent: 'center' },
        rowBody: { flex: 1, minWidth: 0 },
        rowTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, lineHeight: 19, color: c.text },
        rowSub: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 2 },
    });
}
