import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import { useRouter, useFocusEffect } from 'expo-router';
import { useColors } from '../lib/useColors';
import { typography } from '../lib/theme';
import { getNotifications } from '../lib/api';
import { useAuth } from '../lib/auth';

interface NotificationBellProps {
    /** Couleur de l'icône (par défaut blanc, pour les en-têtes en dégradé). */
    color?: string;
    /** Pastille ronde sur fond carte (en-têtes papier) */
    round?: boolean;
}

/**
 * Cloche de notifications avec pastille du nombre de non-lues.
 * Rafraîchit le compteur à chaque fois que l'écran reprend le focus.
 */
export default function NotificationBell({ color = '#fff', round = false }: NotificationBellProps) {
    const colors = useColors();
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [unread, setUnread] = useState(0);

    const refresh = useCallback(() => {
        if (!isAuthenticated) {
            setUnread(0);
            return;
        }
        getNotifications(1, 1)
            .then((r) => setUnread(r.unreadCount))
            .catch(() => {});
    }, [isAuthenticated]);

    useFocusEffect(refresh);

    if (!isAuthenticated) return null;

    return (
        <TouchableOpacity
            onPress={() => router.push('/notifications')}
            hitSlop={10}
            accessibilityLabel={unread > 0 ? `Notifications, ${unread} non lues` : 'Notifications'}
            style={[styles.wrap, round && [styles.round, { backgroundColor: colors.surface, borderColor: colors.border }]]}
        >
            <Icon name="notifications-outline" size={round ? 20 : 24} color={color} />
            {unread > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                    <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    wrap: { position: 'relative', padding: 2 },
    round: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 0 },
    badge: {
        position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9,
        paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center', borderWidth: 2,
    },
    badgeText: { color: '#fff', fontFamily: typography.fontFamily.heading, fontSize: 10 },
});
