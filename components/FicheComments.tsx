import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from './Icon';
import { useColors } from '../lib/useColors';
import { spacing, radius, typography } from '../lib/theme';
import { getFicheComments, postFicheComment, FicheComment } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useThreadRealtime } from '../lib/realtime';
import Avatar from './Avatar';
import TypingIndicator from './TypingIndicator';

interface FicheCommentsProps {
    revisionId: string;
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} h`;
    const days = Math.floor(hours / 24);
    return `${days} j`;
}

export default function FicheComments({ revisionId }: FicheCommentsProps) {
    const colors = useColors();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { user, isAuthenticated } = useAuth();

    const [comments, setComments] = useState<FicheComment[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await getFicheComments(revisionId, 1, 50);
            setComments(res.comments || []);
            setTotal(res.pagination?.totalComments ?? res.comments?.length ?? 0);
        } catch {
            // silencieux
        } finally {
            setLoading(false);
        }
    }, [revisionId]);

    useEffect(() => { load(); }, [load]);

    // Temps réel : frappe + présence + arrivée live des nouveaux commentaires
    const room = revisionId ? `fiche:${revisionId}` : undefined;
    const { typingUsers, startTyping, stopTyping, presentMembers } = useThreadRealtime(room, load);

    useEffect(() => {
        if (text.trim().length === 0) return;
        const wc = text.trim().split(/\s+/).filter(Boolean).length;
        startTyping(wc);
        const t = setTimeout(() => stopTyping(), 2500);
        return () => clearTimeout(t);
    }, [text, startTyping, stopTyping]);

    const submit = async () => {
        if (!text.trim() || sending) return;
        setSending(true);
        try {
            await postFicheComment(revisionId, text.trim());
            setText('');
            stopTyping();
            await load();
        } catch {
            // silencieux
        } finally {
            setSending(false);
        }
    };

    return (
        <View style={styles.wrap}>
            <View style={styles.header}>
                <Icon name="chatbubbles-outline" size={18} color={colors.text} />
                <Text style={styles.title}>Commentaires ({total})</Text>
                {presentMembers.length > 0 && (
                    <View style={styles.presenceBadge}>
                        <View style={styles.presenceDot} />
                        <Text style={styles.presenceText}>
                            {presentMembers.length} en ligne
                        </Text>
                    </View>
                )}
            </View>

            {isAuthenticated ? (
                <View style={styles.inputRow}>
                    <Avatar name={user?.username || '?'} userId={user?.id} imageUri={user?.image} size="sm" />
                    <TextInput
                        style={styles.input}
                        placeholder="Ajouter un commentaire…"
                        placeholderTextColor={colors.textMuted}
                        value={text}
                        onChangeText={setText}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
                        onPress={submit}
                        disabled={!text.trim() || sending}
                    >
                        {sending ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="send" size={16} color="#fff" />}
                    </TouchableOpacity>
                </View>
            ) : (
                <Text style={styles.loginHint}>Connecte-toi pour commenter.</Text>
            )}

            <TypingIndicator users={typingUsers} />

            {loading ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
            ) : comments.length === 0 ? (
                <Text style={styles.empty}>Aucun commentaire pour l'instant.</Text>
            ) : (
                comments.map((c) => (
                    <View key={c.id} style={styles.comment}>
                        <Avatar name={c.username || '?'} userId={c.userId || undefined} size="sm" />
                        <View style={styles.commentBody}>
                            <View style={styles.commentTop}>
                                <Text style={styles.commentAuthor}>{c.username}</Text>
                                <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                            </View>
                            <Text style={styles.commentText}>{c.content}</Text>
                        </View>
                    </View>
                ))
            )}
        </View>
    );
}

function createStyles(colors: ReturnType<typeof useColors>) {
    return StyleSheet.create({
        wrap: { marginTop: spacing.xl, gap: spacing.md },
        header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        title: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg, color: colors.text },
        presenceBadge: {
            flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 'auto',
            backgroundColor: colors.success + '18', paddingHorizontal: spacing.sm, paddingVertical: 3,
            borderRadius: radius.full,
        },
        presenceDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
        presenceText: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.xs, color: colors.success },
        inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
        input: {
            flex: 1, minHeight: 44, maxHeight: 120,
            backgroundColor: colors.surfaceVariant, borderRadius: radius.lg,
            paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm,
            fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: colors.text,
        },
        sendBtn: {
            width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.primary,
            justifyContent: 'center', alignItems: 'center',
        },
        loginHint: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary },
        empty: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textMuted, paddingVertical: spacing.md },
        comment: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
        commentBody: {
            flex: 1, backgroundColor: colors.surfaceVariant, borderRadius: radius.lg,
            paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2,
        },
        commentTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        commentAuthor: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.sm, color: colors.text },
        commentTime: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textMuted },
        commentText: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: colors.textSecondary, lineHeight: typography.size.base * 1.4 },
    });
}
