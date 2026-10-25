import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useColors } from '../lib/useColors';
import { spacing, radius, typography } from '../lib/theme';
import type { TypingUser } from '../lib/realtime';

interface TypingIndicatorProps {
    users: TypingUser[];
}

function label(users: TypingUser[]): string {
    if (users.length === 1) {
        const u = users[0];
        const wc = u.wordCount && u.wordCount > 0 ? ` (${u.wordCount} mot${u.wordCount > 1 ? 's' : ''})` : '';
        return `${u.username || 'Quelqu\'un'} est en train d'écrire${wc}…`;
    }
    if (users.length === 2) return `${users[0].username} et ${users[1].username} écrivent…`;
    return `${users.length} personnes écrivent…`;
}

function Dot({ delay, color }: { delay: number; color: string }) {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(v, { toValue: 1, duration: 400, delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(v, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ]),
        );
        anim.start();
        return () => anim.stop();
    }, [v, delay]);
    const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
    const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
    return <Animated.View style={[styles.dot, { backgroundColor: color, transform: [{ translateY }], opacity }]} />;
}

export default function TypingIndicator({ users }: TypingIndicatorProps) {
    const colors = useColors();
    if (!users || users.length === 0) return null;

    return (
        <View style={[styles.wrap, { backgroundColor: colors.primary + '12' }]}>
            <View style={styles.dots}>
                <Dot delay={0} color={colors.primary} />
                <Dot delay={150} color={colors.primary} />
                <Dot delay={300} color={colors.primary} />
            </View>
            <Text style={[styles.text, { color: colors.primary }]} numberOfLines={1}>
                {label(users)}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        alignSelf: 'flex-start',
        marginVertical: spacing.sm,
    },
    dots: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 8 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    text: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm },
});
