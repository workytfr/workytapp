import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, ScrollView, Pressable, TextInput, Image, Alert, Linking,
    KeyboardAvoidingView, Platform, ActivityIndicator, AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '../../lib/useColors';
import { spacing, radius, typography, type ThemeColors } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { getToken } from '../../lib/api';
import { getSiteOrigin } from '../../lib/siteOrigin';
import { useThreadRealtime } from '../../lib/realtime';
import {
    AUTO_DETECTED_KINDS, BLOCK_META, FORMAT_LABELS, GOAL_TYPE_LABELS, KIND_META, MOOD_META, STATUS_META,
    appRouteForResource, attachmentUri, getSuivi, getSuiviMessages, markAssignmentDone, postSuiviMessage,
    postSuiviPhoto, suiviAction,
    type Assignment, type MentorshipDetail, type Mood, type SuiviMessage,
} from '../../lib/suivi';
import Avatar from '../../components/Avatar';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import TypingIndicator from '../../components/TypingIndicator';
import { ChipTabs, EmptyState, Eyebrow, SkeletonList, StatusPill, XpBar } from '../../components/wk';

type Tab = 'chat' | 'plan';
const POLL_MS = 30_000;

/** Espace d'un suivi : discussion avec le bénévole + plan (objectifs, ressources). */
export default function SuiviWorkspaceScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const suiviId = String(id);
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();
    const s = useMemo(() => createStyles(colors), [colors]);

    const [detail, setDetail] = useState<MentorshipDetail | null>(null);
    const [messages, setMessages] = useState<SuiviMessage[]>([]);
    const [error, setError] = useState('');
    const [tab, setTab] = useState<Tab>('chat');
    const [token, setTokenState] = useState<string | null>(null);
    const lastAt = useRef<string | null>(null);

    useEffect(() => { getToken().then(setTokenState); }, []);

    const loadDetail = useCallback(async () => {
        try {
            setDetail(await getSuivi(suiviId));
            setError('');
        } catch (e: any) {
            setError(e.message || 'Suivi introuvable.');
        }
    }, [suiviId]);

    // Messages en incrémental : seuls les nouveaux depuis le dernier reçu
    const loadMessages = useCallback(async () => {
        try {
            const fresh = await getSuiviMessages(suiviId, lastAt.current);
            if (!fresh?.length) return;
            lastAt.current = fresh[fresh.length - 1].createdAt;
            setMessages((prev) => {
                const seen = new Set(prev.map((m) => m.id));
                const add = fresh.filter((m) => !seen.has(m.id));
                return add.length ? [...prev, ...add] : prev;
            });
        } catch {
            // candidat : pas d'accès au fil, c'est normal
        }
    }, [suiviId]);

    const refresh = useCallback(async () => {
        await Promise.all([loadDetail(), loadMessages()]);
    }, [loadDetail, loadMessages]);

    useEffect(() => { refresh(); }, [refresh]);

    // Temps réel : la salle du suivi signale « du nouveau »
    const room = detail?.roomKey ? `mentorship:${detail.roomKey}` : undefined;
    const { typingUsers, startTyping, stopTyping } = useThreadRealtime(room, refresh);

    // Filet de sécurité si le temps réel est coupé, seulement app au premier plan
    useEffect(() => {
        if (!detail || detail.viewer !== 'student') return;
        const t = setInterval(() => {
            if (AppState.currentState === 'active') refresh();
        }, POLL_MS);
        return () => clearInterval(t);
    }, [detail, refresh]);

    const report = useCallback(() => {
        Alert.alert(
            'Signaler ce suivi',
            "Le signalement se fait sur le site : la modération pourra relire la conversation. Si tu es en danger, appelle le 119 ou le 3018.",
            [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Ouvrir le site', onPress: () => Linking.openURL(`${getSiteOrigin()}/suivi/${suiviId}`) },
            ],
        );
    }, [suiviId]);

    const header = (
        <View style={[s.topbar, { paddingTop: insets.top + spacing.sm }]}>
            <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Retour">
                <Icon name="arrow-back" size={22} color={colors.text} />
            </Pressable>
            <Text style={s.topbarTitle} numberOfLines={1}>{detail?.subject ?? 'Suivi'}</Text>
            <Pressable onPress={report} hitSlop={10} accessibilityLabel="Signaler">
                <Icon name="flag-outline" size={20} color={colors.textSecondary} />
            </Pressable>
        </View>
    );

    if (!detail) {
        return (
            <View style={s.container}>
                <Stack.Screen options={{ headerShown: false }} />
                {header}
                {error
                    ? <EmptyState icon="lock-closed-outline" title="Suivi indisponible" text={error} actionLabel="Réessayer" onAction={refresh} />
                    : <SkeletonList count={3} />}
            </View>
        );
    }

    // L'app est réservée à l'élève : les outils bénévoles restent sur le site
    if (detail.viewer !== 'student') {
        return (
            <View style={s.container}>
                <Stack.Screen options={{ headerShown: false }} />
                {header}
                <EmptyState
                    icon="desktop-outline"
                    title="Espace bénévole sur le site"
                    text="L'application est réservée aux élèves. Accompagne tes élèves depuis workyt.fr."
                    actionLabel="Ouvrir le site"
                    onAction={() => Linking.openURL(`${getSiteOrigin()}/suivi/${suiviId}`)}
                />
            </View>
        );
    }

    const other = detail.mentor;
    const st = STATUS_META[detail.status];
    const canChat = detail.status === 'active' || detail.status === 'paused';

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            {header}

            {/* Bandeau : avec qui, statut, série */}
            <View style={s.band}>
                {other ? <Avatar name={other.username} userId={other.id} size="sm" /> : (
                    <View style={s.waitIcon}><Icon name="hourglass-outline" size={16} color={colors.accent} /></View>
                )}
                <View style={s.flex}>
                    <Text style={s.bandTitle} numberOfLines={1}>
                        {other ? other.username : 'En attente d’un bénévole'}
                        {other ? <Text style={s.bandRole}> · bénévole</Text> : null}
                    </Text>
                    <Text style={s.bandSub} numberOfLines={1}>{detail.level} · {FORMAT_LABELS[detail.format]?.label}</Text>
                </View>
                {detail.duoStreak && detail.duoStreak.current > 0 ? (
                    <View style={s.streak}><Icon name="flame" size={13} color={colors.primary} /><Text style={s.streakText}>{detail.duoStreak.current} sem.</Text></View>
                ) : null}
                <StatusPill label={st.label} color={st.color} />
            </View>

            {detail.status === 'pending' ? (
                <PendingView detail={detail} s={s} colors={colors} onChanged={refresh} />
            ) : (
                <>
                    <ChipTabs<Tab>
                        value={tab}
                        onChange={setTab}
                        style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs }}
                        options={[
                            { value: 'chat', label: 'Discussion', icon: 'chatbubbles-outline' },
                            { value: 'plan', label: 'Mon plan', icon: 'flag-outline' },
                        ]}
                    />
                    {tab === 'chat' ? (
                        <ChatView
                            detail={detail}
                            messages={messages}
                            meId={user?.id}
                            token={token}
                            canChat={canChat}
                            s={s}
                            colors={colors}
                            bottomInset={insets.bottom}
                            typing={typingUsers}
                            onTyping={startTyping}
                            onStopTyping={stopTyping}
                            onSent={refresh}
                        />
                    ) : (
                        <PlanView detail={detail} s={s} colors={colors} bottomInset={insets.bottom} onChanged={refresh} />
                    )}
                </>
            )}
        </View>
    );
}

type Styles = ReturnType<typeof createStyles>;

/* ───────────── Demande en attente ───────────── */

function PendingView({ detail, s, colors, onChanged }: { detail: MentorshipDetail; s: Styles; colors: ThemeColors; onChanged: () => void }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const cancel = () => {
        Alert.alert('Annuler la demande ?', 'Tu pourras en refaire une plus tard.', [
            { text: 'Garder', style: 'cancel' },
            {
                text: 'Annuler la demande',
                style: 'destructive',
                onPress: async () => {
                    setBusy(true);
                    try {
                        await suiviAction(detail.id, 'cancel');
                        onChanged();
                        router.back();
                    } catch (e: any) {
                        Alert.alert('Suivi', e.message);
                    } finally {
                        setBusy(false);
                    }
                },
            },
        ]);
    };

    return (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
            <View style={[s.card, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={s.cardTitle}>Ta demande est envoyée ✉️</Text>
                <Text style={s.cardText}>
                    Un bénévole va la prendre, en général sous 48 h. Tu recevras une notification dès qu'il te répond.
                </Text>
            </View>
            <View style={s.card}>
                <Eyebrow>La demande</Eyebrow>
                <Text style={[s.cardTitle, { marginTop: spacing.md }]}>{GOAL_TYPE_LABELS[detail.goalType] ?? detail.goalType}</Text>
                <Text style={[s.cardText, { marginTop: spacing.sm }]}>{detail.need}</Text>
                {detail.availability ? (
                    <View style={s.row}>
                        <Icon name="calendar-outline" size={15} color={colors.textMuted} />
                        <Text style={s.cardText}>{detail.availability}</Text>
                    </View>
                ) : null}
            </View>
            {detail.status === 'pending' ? (
                <Pressable style={s.ghostBtn} onPress={cancel} disabled={busy}>
                    {busy ? <ActivityIndicator color={colors.error} /> : <Text style={[s.ghostBtnText, { color: colors.error }]}>Annuler ma demande</Text>}
                </Pressable>
            ) : null}
        </ScrollView>
    );
}

/* ───────────── Discussion ───────────── */

function ChatView({
    detail, messages, meId, token, canChat, s, colors, bottomInset, typing, onTyping, onStopTyping, onSent,
}: {
    detail: MentorshipDetail;
    messages: SuiviMessage[];
    meId?: string;
    token: string | null;
    canChat: boolean;
    s: Styles;
    colors: ThemeColors;
    bottomInset: number;
    typing: any[];
    onTyping: (words?: number) => void;
    onStopTyping: () => void;
    onSent: () => Promise<void> | void;
}) {
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Liste inversée : le plus récent en bas, sans scroll manuel
    const data = useMemo(() => [...messages].reverse(), [messages]);
    const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
    const pinned = useMemo(
        () => (detail.pinnedMessageIds ?? []).map((pid) => byId.get(pid)).filter(Boolean) as SuiviMessage[],
        [detail.pinnedMessageIds, byId],
    );

    const checkinPending = detail.viewer === 'student' && !!detail.checkin?.askedAt && !detail.checkin?.answeredAt;

    const onChange = (t: string) => {
        setText(t);
        onTyping(t.trim().split(/\s+/).filter(Boolean).length);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(onStopTyping, 2500);
    };

    const send = async () => {
        const body = text.trim();
        if (!body || sending) return;
        setSending(true);
        try {
            await postSuiviMessage(detail.id, { text: body });
            setText('');
            onStopTyping();
            await onSent();
        } catch (e: any) {
            Alert.alert('Message non envoyé', e.message);
        } finally {
            setSending(false);
        }
    };

    const sendPhoto = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
        if (res.canceled || !res.assets?.[0]) return;
        const a = res.assets[0];
        setSending(true);
        try {
            await postSuiviPhoto(detail.id, text.trim(), {
                uri: a.uri,
                name: a.fileName ?? `photo-${Date.now()}.jpg`,
                mimeType: a.mimeType ?? 'image/jpeg',
            });
            setText('');
            await onSent();
        } catch (e: any) {
            Alert.alert('Photo non envoyée', e.message);
        } finally {
            setSending(false);
        }
    };

    const answerCheckin = async (mood: Mood) => {
        try {
            await postSuiviMessage(detail.id, { kind: 'checkin_reply', mood });
            await onSent();
        } catch (e: any) {
            Alert.alert("Point d'étape", e.message);
        }
    };

    const confused = useCallback(async (m: SuiviMessage) => {
        try {
            await postSuiviMessage(detail.id, { kind: 'confused', replyTo: m.id });
            await onSent();
        } catch (e: any) {
            Alert.alert('Suivi', e.message);
        }
    }, [detail.id, onSent]);

    const renderItem = useCallback(({ item }: { item: SuiviMessage }) => (
        <MessageRow m={item} mine={item.author?.id === meId} viewer={detail.viewer} token={token} s={s} colors={colors} onConfused={confused} replyTo={item.meta?.replyTo ? byId.get(item.meta.replyTo) : undefined} />
    ), [meId, detail.viewer, token, s, colors, confused, byId]);

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
            {pinned.length > 0 ? (
                <View style={s.pinned}>
                    <Icon name="pin" size={14} color={colors.accent} />
                    <Text style={s.pinnedText} numberOfLines={2}>{pinned[pinned.length - 1].meta?.blockTitle || pinned[pinned.length - 1].text}</Text>
                </View>
            ) : null}
            <FlatList
                data={data}
                inverted
                keyExtractor={(m) => m.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={9}
                keyboardDismissMode="interactive"
                ListEmptyComponent={
                    <View style={{ transform: [{ scaleY: -1 }] }}>
                        <EmptyState icon="chatbubbles-outline" title="Dites-vous bonjour 👋" text="Présente-toi et explique où tu en es : c'est le début du suivi." />
                    </View>
                }
            />
            <TypingIndicator users={typing} />

            {checkinPending ? (
                <View style={s.checkin}>
                    <Text style={s.checkinTitle}>Point d'étape : comment ça va ?</Text>
                    <View style={s.moods}>
                        {(Object.keys(MOOD_META) as Mood[]).map((mood) => (
                            <Pressable key={mood} style={({ pressed }) => [s.mood, pressed && { opacity: 0.7 }]} onPress={() => answerCheckin(mood)}>
                                <Text style={s.moodEmoji}>{MOOD_META[mood].emoji}</Text>
                                <Text style={s.moodText}>{MOOD_META[mood].label}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>
            ) : null}

            {canChat ? (
                <View style={[s.composer, { paddingBottom: Math.max(bottomInset, spacing.sm) }]}>
                    <Pressable onPress={sendPhoto} hitSlop={8} disabled={sending} accessibilityLabel="Envoyer une photo" style={s.composerBtn}>
                        <Icon name="image-outline" size={22} color={colors.textSecondary} />
                    </Pressable>
                    <TextInput
                        style={s.composerInput}
                        value={text}
                        onChangeText={onChange}
                        placeholder="Écris ton message…"
                        placeholderTextColor={colors.textMuted}
                        multiline
                        maxLength={4000}
                    />
                    <Pressable
                        onPress={send}
                        disabled={!text.trim() || sending}
                        style={[s.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
                        accessibilityLabel="Envoyer"
                    >
                        {sending ? <ActivityIndicator color="#fff" size="small" /> : <Icon name="arrow-up" size={20} color="#fff" />}
                    </Pressable>
                </View>
            ) : (
                <ClosedFooter detail={detail} s={s} colors={colors} bottomInset={bottomInset} onChanged={onSent} />
            )}
        </KeyboardAvoidingView>
    );
}

const MessageRow = memo(function MessageRow({
    m, mine, viewer, token, s, colors, onConfused, replyTo,
}: {
    m: SuiviMessage; mine: boolean; viewer: string; token: string | null; s: Styles; colors: ThemeColors;
    onConfused: (m: SuiviMessage) => void; replyTo?: SuiviMessage;
}) {
    const [revealed, setRevealed] = useState(false);
    const time = new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    if (m.status === 'blocked') {
        return (
            <View style={[s.system, { borderColor: colors.error + '55' }]}>
                <Icon name="shield-outline" size={14} color={colors.error} />
                <Text style={[s.systemText, { color: colors.error }]}>
                    Message bloqué : il semblait contenir des coordonnées. Tout doit rester sur Workyt.
                </Text>
            </View>
        );
    }

    // Événements, ressources, objectifs, point d'étape : ligne centrée
    if (m.kind === 'event' || m.kind === 'resource' || m.kind === 'goal' || m.kind === 'checkin' || m.authorRole === 'system') {
        const icon = m.kind === 'resource' ? 'book-outline' : m.kind === 'goal' ? 'flag-outline' : m.kind === 'checkin' ? 'pulse-outline' : 'information-circle-outline';
        return (
            <View style={s.system}>
                <Icon name={icon} size={14} color={colors.accent} />
                <Text style={s.systemText}>{m.text}</Text>
            </View>
        );
    }

    if (m.kind === 'block') {
        const meta = BLOCK_META[m.meta?.blockType ?? ''] ?? BLOCK_META.remarque;
        const hidden = m.meta?.blockType === 'indice' && !revealed && viewer === 'student';
        return (
            <View style={[s.block, { borderLeftColor: meta.color }]}>
                <View style={s.row}>
                    <Icon name={meta.icon} size={15} color={meta.color} />
                    <Text style={[s.blockLabel, { color: meta.color }]}>{meta.label}</Text>
                    {m.meta?.blockTitle ? <Text style={s.blockTitle} numberOfLines={2}>{m.meta.blockTitle}</Text> : null}
                </View>
                {hidden ? (
                    <Pressable style={s.reveal} onPress={() => setRevealed(true)}>
                        <Icon name="eye-outline" size={16} color={meta.color} />
                        <Text style={[s.revealText, { color: meta.color }]}>Afficher l'indice</Text>
                    </Pressable>
                ) : (
                    <View style={{ marginTop: spacing.xs }}><MarkdownRenderer content={m.text} /></View>
                )}
                {viewer === 'student' && !hidden ? (
                    <Pressable onPress={() => onConfused(m)} hitSlop={6} style={s.confusedBtn}>
                        <Icon name="help-circle-outline" size={15} color={colors.textSecondary} />
                        <Text style={s.confusedText}>Je n'ai pas compris</Text>
                    </Pressable>
                ) : null}
            </View>
        );
    }

    const moodLabel = m.kind === 'checkin_reply' && m.meta?.mood ? `${MOOD_META[m.meta.mood].emoji} ${MOOD_META[m.meta.mood].label}` : null;
    const confusedAbout = m.kind === 'confused' ? replyTo?.meta?.blockTitle || BLOCK_META[replyTo?.meta?.blockType ?? '']?.label : null;

    return (
        <View style={[s.bubbleWrap, mine ? s.right : s.left]}>
            {!mine && m.author ? <Text style={s.author}>{m.author.username}</Text> : null}
            <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleOther]}>
                {moodLabel ? <Text style={[s.mood2, mine && s.textMine]}>{moodLabel}</Text> : null}
                {m.kind === 'confused' ? (
                    <Text style={[s.bubbleText, mine && s.textMine]}>🤔 Je n'ai pas compris{confusedAbout ? ` : ${confusedAbout}` : ''}</Text>
                ) : null}
                {m.attachment && token ? (
                    <Image
                        source={{ uri: attachmentUri(m.attachment.url), headers: { Authorization: `Bearer ${token}` } }}
                        style={s.photo}
                        resizeMode="cover"
                        accessibilityLabel={m.attachment.name}
                    />
                ) : null}
                {m.text && m.kind !== 'confused' ? <Text style={[s.bubbleText, mine && s.textMine]} selectable>{m.text}</Text> : null}
            </View>
            <Text style={s.time}>{time}</Text>
        </View>
    );
});

function ClosedFooter({ detail, s, colors, bottomInset, onChanged }: { detail: MentorshipDetail; s: Styles; colors: ThemeColors; bottomInset: number; onChanged: () => Promise<void> | void }) {
    const needsFeedback = detail.viewer === 'student' && detail.status === 'closed' && detail.closure && !detail.closure.studentFeedback;
    const give = async (feedback: 'helpful' | 'neutral' | 'not_helpful') => {
        try {
            await suiviAction(detail.id, 'feedback', { feedback });
            await onChanged();
        } catch (e: any) {
            Alert.alert('Suivi', e.message);
        }
    };
    return (
        <View style={[s.closed, { paddingBottom: Math.max(bottomInset, spacing.md) }]}>
            <Text style={s.closedText}>
                {detail.status === 'closed' ? 'Ce suivi est terminé. La conversation reste consultable.' : 'La conversation est fermée.'}
            </Text>
            {needsFeedback ? (
                <View style={[s.moods, { marginTop: spacing.sm }]}>
                    {([['helpful', '👍', 'Ça m’a aidé'], ['neutral', '😐', 'Bof'], ['not_helpful', '👎', 'Pas vraiment']] as const).map(([k, e, l]) => (
                        <Pressable key={k} style={s.mood} onPress={() => give(k)}>
                            <Text style={s.moodEmoji}>{e}</Text>
                            <Text style={s.moodText}>{l}</Text>
                        </Pressable>
                    ))}
                </View>
            ) : null}
        </View>
    );
}

/* ───────────── Plan ───────────── */

function PlanView({ detail, s, colors, bottomInset, onChanged }: { detail: MentorshipDetail; s: Styles; colors: ThemeColors; bottomInset: number; onChanged: () => Promise<void> | void }) {
    const router = useRouter();
    const goals = detail.goals ?? [];
    const assignments = detail.assignments ?? [];
    const open = detail.status === 'active' || detail.status === 'paused';
    const doneGoals = goals.filter((g) => g.done).length;

    const markDone = async (a: Assignment) => {
        try { await markAssignmentDone(detail.id, a.id); await onChanged(); }
        catch (e: any) { Alert.alert('Ressource', e.message); }
    };

    const openResource = (a: Assignment) => {
        const route = appRouteForResource(a.url, a.title);
        if (route) router.push(route as any);
        else Linking.openURL(`${getSiteOrigin()}${a.url}`);
    };

    return (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: bottomInset + spacing['3xl'], gap: spacing.md }}>
            <View style={s.card}>
                <View style={[s.row, { marginTop: 0, justifyContent: 'space-between' }]}>
                    <Text style={s.cardTitle}>Objectifs</Text>
                    <Text style={s.cardMeta}>{doneGoals}/{goals.length}</Text>
                </View>
                {goals.length > 0 ? <View style={{ marginTop: spacing.md }}><XpBar percent={(doneGoals / goals.length) * 100} /></View> : null}
                {goals.length === 0 ? (
                    <Text style={[s.cardText, { marginTop: spacing.sm }]}>Ton bénévole posera bientôt des objectifs avec toi.</Text>
                ) : goals.map((g) => (
                    <View key={g.id} style={s.goalRow} accessibilityState={{ checked: g.done }}>
                        <Icon name={g.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={g.done ? colors.success : colors.textMuted} />
                        <Text style={[s.goalText, g.done && s.goalDone]}>{g.title}</Text>
                    </View>
                ))}
            </View>

            <Eyebrow style={{ marginTop: spacing.sm }}>{`Ressources · ${assignments.filter((a) => a.doneAt).length}/${assignments.length}`}</Eyebrow>
            {assignments.length === 0 ? (
                <EmptyState icon="library-outline" title="Pas encore de ressource" text="Ton bénévole choisira des cours, quiz et fiches pour toi." />
            ) : assignments.map((a) => {
                const meta = KIND_META[a.kind];
                const done = !!a.doneAt;
                const canCheck = detail.viewer === 'student' && open && !done && !AUTO_DETECTED_KINDS.includes(a.kind);
                return (
                    <Pressable key={a.id} style={({ pressed }) => [s.res, pressed && { opacity: 0.85 }]} onPress={() => openResource(a)}>
                        <View style={[s.resIcon, { backgroundColor: meta.color + '1F' }]}>
                            <Icon name={meta.icon} size={18} color={meta.color} />
                        </View>
                        <View style={s.flex}>
                            <Text style={s.resKind}>{meta.label}{a.dueAt ? ` · pour le ${new Date(a.dueAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}</Text>
                            <Text style={[s.resTitle, done && s.goalDone]} numberOfLines={2}>{a.title}</Text>
                            {a.note ? <Text style={s.cardText} numberOfLines={3}>{a.note}</Text> : null}
                            {a.score !== null && a.maxScore ? <Text style={s.resScore}>Score : {a.score}/{a.maxScore}</Text> : null}
                        </View>
                        {done ? (
                            <Icon name="checkmark-circle" size={22} color={colors.success} />
                        ) : canCheck ? (
                            <Pressable onPress={() => markDone(a)} hitSlop={8} style={s.doneBtn} accessibilityLabel="J'ai terminé">
                                <Text style={s.doneBtnText}>Fini</Text>
                            </Pressable>
                        ) : (
                            <Icon name="chevron-forward" size={18} color={colors.textMuted} />
                        )}
                    </Pressable>
                );
            })}
            {assignments.some((a) => AUTO_DETECTED_KINDS.includes(a.kind) && !a.doneAt) && detail.viewer === 'student' ? (
                <Text style={s.hint}>Les cours, leçons, quiz et évaluations se valident tout seuls quand tu les termines.</Text>
            ) : null}
        </ScrollView>
    );
}

function createStyles(c: ThemeColors) {
    const card = { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.xl } as const;
    return StyleSheet.create({
        flex: { flex: 1, minWidth: 0 },
        container: { flex: 1, backgroundColor: c.background },
        row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
        topbar: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md,
            paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.border,
        },
        topbarTitle: { flex: 1, textAlign: 'center', fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg, color: c.text },
        band: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
            paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: c.divider,
        },
        waitIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.surfaceVariant, alignItems: 'center', justifyContent: 'center' },
        bandTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.text },
        bandRole: { fontFamily: typography.fontFamily.regular, color: c.textMuted },
        bandSub: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 1 },
        streak: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: c.accent2 + '40' },
        streakText: { fontFamily: typography.fontFamily.semiBold, fontSize: 11, color: c.text },

        card: { ...card, padding: spacing.lg },
        cardTitle: { fontFamily: typography.fontFamily.heading, fontSize: 15, color: c.text },
        cardMeta: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.textSecondary },
        cardText: { fontFamily: typography.fontFamily.regular, fontSize: 14, lineHeight: 20, color: c.textSecondary, flexShrink: 1 },
        ghostBtn: { alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.full, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
        ghostBtnText: { fontFamily: typography.fontFamily.semiBold, fontSize: 14 },

        pinned: {
            flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.sm,
            padding: spacing.sm, borderRadius: radius.md, backgroundColor: c.surfaceVariant,
        },
        pinnedText: { flex: 1, fontFamily: typography.fontFamily.medium, fontSize: 12.5, color: c.text },

        system: {
            flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, maxWidth: '92%',
            paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: c.border,
        },
        systemText: { fontFamily: typography.fontFamily.medium, fontSize: 12, color: c.textSecondary, flexShrink: 1 },

        block: { ...card, borderLeftWidth: 4, padding: spacing.md, maxWidth: '96%' },
        blockLabel: { fontFamily: typography.fontFamily.heading, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
        blockTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.text, flexShrink: 1 },
        reveal: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, alignSelf: 'flex-start', paddingVertical: 6 },
        revealText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13 },
        confusedBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: spacing.xs },
        confusedText: { fontFamily: typography.fontFamily.medium, fontSize: 12, color: c.textSecondary },

        bubbleWrap: { maxWidth: '82%' },
        left: { alignSelf: 'flex-start' },
        right: { alignSelf: 'flex-end', alignItems: 'flex-end' },
        author: { fontFamily: typography.fontFamily.semiBold, fontSize: 11.5, color: c.textMuted, marginBottom: 2, marginLeft: 4 },
        bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, overflow: 'hidden' },
        bubbleMine: { backgroundColor: c.text, borderTopRightRadius: 6 },
        bubbleOther: { backgroundColor: c.surfaceVariant, borderTopLeftRadius: 6 },
        bubbleText: { fontFamily: typography.fontFamily.regular, fontSize: 15, lineHeight: 21, color: c.text },
        textMine: { color: c.background },
        mood2: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, color: c.text, marginBottom: 2 },
        photo: { width: 220, height: 220, borderRadius: 12, marginVertical: 4, backgroundColor: c.border },
        time: { fontFamily: typography.fontFamily.regular, fontSize: 10.5, color: c.textMuted, marginTop: 2, marginHorizontal: 4 },

        checkin: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.md, borderRadius: radius.xl, backgroundColor: c.success + '14', borderWidth: 1, borderColor: c.success + '40' },
        checkinTitle: { fontFamily: typography.fontFamily.heading, fontSize: 14, color: c.text, marginBottom: spacing.sm },
        moods: { flexDirection: 'row', gap: spacing.sm },
        mood: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: spacing.sm, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
        moodEmoji: { fontSize: 22 },
        moodText: { fontFamily: typography.fontFamily.semiBold, fontSize: 11.5, color: c.text, textAlign: 'center' },

        composer: {
            flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
            paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.background,
        },
        composerBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
        composerInput: {
            flex: 1, maxHeight: 120, minHeight: 44, paddingHorizontal: spacing.lg, paddingTop: 11, paddingBottom: 11,
            borderRadius: 22, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
            fontFamily: typography.fontFamily.regular, fontSize: 15, color: c.text,
        },
        sendBtn: {
            width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
            borderBottomWidth: 3, borderBottomColor: c.primaryDark,
        },
        closed: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.border },
        closedText: { fontFamily: typography.fontFamily.medium, fontSize: 13, color: c.textSecondary, textAlign: 'center' },

        goalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.xs },
        goalText: { flex: 1, fontFamily: typography.fontFamily.medium, fontSize: 14.5, color: c.text },
        goalDone: { color: c.textMuted, textDecorationLine: 'line-through' },
        res: { ...card, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
        resIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
        resKind: { fontFamily: typography.fontFamily.heading, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', color: c.textMuted },
        resTitle: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: c.text, marginTop: 2 },
        resScore: { fontFamily: typography.fontFamily.semiBold, fontSize: 12, color: c.success, marginTop: 2 },
        doneBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: c.text },
        doneBtnText: { fontFamily: typography.fontFamily.heading, fontSize: 12, color: c.background },
        hint: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: c.textMuted, textAlign: 'center' },
    });
}
