import { memo, useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import { useColors } from '../../lib/useColors';
import { spacing, radius, typography, type ThemeColors } from '../../lib/theme';
import {
    ANNOUNCED_DELAY_HOURS, FORMAT_LABELS, GOAL_TYPE_LABELS, MAX_OPEN_PER_STUDENT, STATUS_META,
    getSuiviHome, type MentorshipSummary, type SuiviHomeData,
} from '../../lib/suivi';
import Avatar from '../../components/Avatar';
import { EmptyState, Eyebrow, IconButton, PageHeader, SkeletonList, StatusPill } from '../../components/wk';

const HELP_LINES = [
    { name: '3018', detail: 'Harcèlement et violences numériques (gratuit, anonyme)' },
    { name: '119', detail: 'Enfance en danger (gratuit, 24 h/24)' },
    { name: 'Fil Santé Jeunes — 0 800 235 236', detail: 'Écoute des 12-25 ans (gratuit, anonyme)' },
];

const STEPS = [
    { n: '01', icon: 'sparkles-outline' as const, title: 'Tu expliques ce qui coince', text: 'La matière, ton niveau, ce que tu as essayé et ce que tu vises. Deux minutes, pas plus.' },
    { n: '02', icon: 'person-add-outline' as const, title: 'Un bénévole te répond', text: `Un membre de l'association prend ta demande, en général sous ${ANNOUNCED_DELAY_HOURS} h.` },
    { n: '03', icon: 'flag-outline' as const, title: 'Vous avancez ensemble', text: 'Des objectifs clairs, des cours et quiz choisis pour toi, et un point d’étape régulier.' },
];

/** Suivi personnalisé — équivalent de /suivi sur le site. */
export default function SuiviHomeScreen() {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);

    const [data, setData] = useState<SuiviHomeData | null>(null);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            setError('');
            setData(await getSuiviHome());
        } catch (e: any) {
            setError(e.message || 'Impossible de charger tes suivis.');
        } finally {
            setRefreshing(false);
        }
    }, []);

    // Recharge au retour d'un suivi (messages lus, statut changé)
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const mine = data?.asStudent ?? [];
    const openCount = mine.filter((m) => ['pending', 'active', 'paused'].includes(m.status)).length;
    const canRequest = !!data?.authenticated && openCount < MAX_OPEN_PER_STUDENT;
    const open = useCallback((id: string) => router.push(`/suivi/${id}`), [router]);

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <PageHeader
                topInset={insets.top}
                eyebrow="Suivi personnalisé"
                title="Suivi"
                subtitle="Un bénévole de l'association, rien que pour toi. Gratuit."
                right={<IconButton icon="close" label="Fermer" onPress={() => router.back()} />}
            />

            {!data && !error ? (
                <SkeletonList count={2} />
            ) : error ? (
                <EmptyState icon="cloud-offline-outline" title="Oups" text={error} actionLabel="Réessayer" onAction={load} />
            ) : !data?.authenticated ? (
                <EmptyState
                    icon="lock-closed-outline"
                    title="Suivi indisponible"
                    text="Le site n'a pas reconnu ta session. Déconnecte-toi puis reconnecte-toi, ou réessaie plus tard."
                    actionLabel="Réessayer"
                    onAction={load}
                />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing['3xl'], gap: spacing.md }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
                >
                    {/* Demander */}
                    {canRequest ? (
                        <Pressable style={({ pressed }) => [s.cta, pressed && s.ctaPressed]} onPress={() => router.push('/suivi/demande')}>
                            <View style={s.flex}>
                                <Text style={s.ctaTitle}>Demander un suivi</Text>
                                <Text style={s.ctaText}>Quand c'est tout un chapitre qui coince. Réponse sous {ANNOUNCED_DELAY_HOURS} h en général.</Text>
                            </View>
                            <View style={s.ctaIcon}><Icon name="arrow-forward" size={20} color={colors.primary} /></View>
                        </Pressable>
                    ) : (
                        <View style={s.card}>
                            <Text style={s.cardTitle}>Tu as déjà {openCount} demandes ou suivis en cours.</Text>
                            <Text style={s.cardText}>
                                Pour que chacun soit accompagné, on limite à {MAX_OPEN_PER_STUDENT} suivis en même temps.
                                Termine-en un pour en ouvrir un autre.
                            </Text>
                        </View>
                    )}

                    {/* Mes suivis */}
                    {mine.length > 0 ? (
                        <>
                            <Eyebrow style={s.eyebrow}>Mes suivis</Eyebrow>
                            {mine.map((m) => <SuiviCard key={m.id} m={m} who={m.mentor} s={s} colors={colors} onOpen={open} />)}
                        </>
                    ) : null}

                    {/* Comment ça marche */}
                    <Eyebrow style={s.eyebrow}>Comment ça marche</Eyebrow>
                    {STEPS.map((st) => (
                        <View key={st.n} style={s.step}>
                            <View style={s.stepHead}>
                                <Text style={s.stepNum}>{st.n}</Text>
                                <Icon name={st.icon} size={18} color={colors.textMuted} />
                            </View>
                            <Text style={s.stepTitle}>{st.title}</Text>
                            <Text style={s.cardText}>{st.text}</Text>
                        </View>
                    ))}

                    {/* Cadre */}
                    <View style={s.card}>
                        <View style={s.row}>
                            <Icon name="shield-checkmark-outline" size={20} color={colors.accent} />
                            <Text style={s.cardTitle}>Un cadre sûr</Text>
                        </View>
                        <Text style={s.cardText}>
                            Des bénévoles majeurs et identifiés, engagés par une charte. Tout reste sur Workyt : les coordonnées
                            (numéros, réseaux) sont bloquées automatiquement, et les échanges peuvent être relus par la modération
                            en cas de signalement.
                        </Text>
                    </View>
                    <View style={[s.card, { backgroundColor: colors.surfaceVariant }]}>
                        <View style={s.row}>
                            <Icon name="help-buoy-outline" size={20} color={colors.accent} />
                            <Text style={s.cardTitle}>Besoin de parler à quelqu'un ?</Text>
                        </View>
                        {HELP_LINES.map((h) => (
                            <View key={h.name} style={{ marginTop: spacing.sm }}>
                                <Text style={s.helpName}>{h.name}</Text>
                                <Text style={s.cardText}>{h.detail}</Text>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

type Styles = ReturnType<typeof createStyles>;

const SuiviCard = memo(function SuiviCard({
    m, who, s, colors, onOpen,
}: { m: MentorshipSummary; who: { id: string; username: string } | null; s: Styles; colors: ThemeColors; onOpen: (id: string) => void }) {
    const st = STATUS_META[m.status];
    return (
        <Pressable style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.985 }] }]} onPress={() => onOpen(m.id)}>
            <View style={s.suiviHead}>
                <View style={s.flex}>
                    <Text style={s.suiviKicker}>{m.level} · {FORMAT_LABELS[m.format]?.label}</Text>
                    <Text style={s.suiviTitle}>{m.subject}</Text>
                </View>
                <StatusPill label={st.label} color={st.color} />
            </View>
            <View style={s.row}>
                {who ? (
                    <>
                        <Avatar name={who.username} userId={who.id} size="xs" />
                        <Text style={s.cardText}>avec <Text style={s.strong}>{who.username}</Text></Text>
                    </>
                ) : m.status === 'pending' ? (
                    <>
                        <Icon name="time-outline" size={15} color={colors.textMuted} />
                        <Text style={s.cardText}>Demande envoyée le {m.createdAt ? new Date(m.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '—'}</Text>
                    </>
                ) : (
                    <Text style={s.cardText}>{GOAL_TYPE_LABELS[m.goalType]}</Text>
                )}
            </View>
            <View style={s.chipsRow}>
                {m.goals.total > 0 ? <Chip s={s} icon="flag-outline" text={`${m.goals.done}/${m.goals.total} objectifs`} color={colors.textSecondary} /> : null}
                {m.duoStreak > 0 ? <Chip s={s} icon="flame" text={`${m.duoStreak} sem.`} color={colors.primary} /> : null}
                {m.checkinPending ? <Chip s={s} icon="chatbubble-ellipses-outline" text="Point d'étape" color={colors.success} /> : null}
                {m.unread > 0 ? (
                    <View style={s.unread}><Text style={s.unreadText}>{m.unread} nouveau{m.unread > 1 ? 'x' : ''}</Text></View>
                ) : null}
                <Icon name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
            </View>
        </Pressable>
    );
});

function Chip({ s, icon, text, color }: { s: Styles; icon: string; text: string; color: string }) {
    return (
        <View style={s.chip}>
            <Icon name={icon} size={12} color={color} />
            <Text style={s.chipText}>{text}</Text>
        </View>
    );
}

function createStyles(c: ThemeColors) {
    const card = { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius['2xl'] } as const;
    return StyleSheet.create({
        flex: { flex: 1, minWidth: 0 },
        container: { flex: 1, backgroundColor: c.background },
        eyebrow: { marginTop: spacing.lg },
        row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
        card: { ...card, padding: spacing.lg },
        cardTitle: { fontFamily: typography.fontFamily.heading, fontSize: 15, color: c.text },
        cardText: { fontFamily: typography.fontFamily.regular, fontSize: 14, lineHeight: 20, color: c.textSecondary, marginTop: 2, flexShrink: 1 },
        strong: { fontFamily: typography.fontFamily.semiBold, color: c.text },
        helpName: { fontFamily: typography.fontFamily.heading, fontSize: 14, color: c.text },

        cta: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg,
            borderRadius: radius['2xl'], backgroundColor: c.primary, borderBottomWidth: 5, borderBottomColor: c.primaryDark,
        },
        ctaPressed: { transform: [{ translateY: 3 }], borderBottomWidth: 2 },
        ctaTitle: { fontFamily: typography.fontFamily.display, fontSize: 20, color: '#fff' },
        ctaText: { fontFamily: typography.fontFamily.regular, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.92)', marginTop: 2 },
        ctaIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

        suiviHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
        suiviKicker: { fontFamily: typography.fontFamily.heading, fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase', color: c.accent },
        suiviTitle: { fontFamily: typography.fontFamily.display, fontSize: 22, lineHeight: 26, color: c.text, marginTop: 2 },
        chipsRow: {
            flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs,
            marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.divider,
        },
        chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, borderColor: c.border },
        chipText: { fontFamily: typography.fontFamily.semiBold, fontSize: 11.5, color: c.text },
        unread: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full, backgroundColor: c.primary },
        unreadText: { fontFamily: typography.fontFamily.heading, fontSize: 11.5, color: '#fff' },

        step: { ...card, padding: spacing.lg },
        stepHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        stepNum: { fontFamily: typography.fontFamily.semiBold, fontSize: 12, letterSpacing: 2, color: c.accent },
        stepTitle: { fontFamily: typography.fontFamily.display, fontSize: 19, color: c.text, marginTop: spacing.md },
    });
}
