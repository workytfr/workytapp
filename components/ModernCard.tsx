import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import Icon from './Icon';
import { spacing, radius, typography, type ThemeColors } from '../lib/theme';
import { useColors } from '../lib/useColors';

function useCardStyles() {
    const colors = useColors();
    return useMemo(() => ({ colors, styles: createStyles(colors) }), [colors]);
}

interface ModernCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    elevated?: boolean;
}

/** Carte « feuille » : fond blanc, trait fin, grands rayons (design du site). */
export function ModernCard({ children, style, elevated = false }: ModernCardProps) {
    const { styles } = useCardStyles();
    return <View style={[styles.card, elevated && styles.cardElevated, style]}>{children}</View>;
}

interface StatCardProps {
    icon: string;
    value: string | number;
    label: string;
    color?: string;
    onPress?: () => void;
}

export function StatCard({ icon, value, label, color, onPress }: StatCardProps) {
    const { colors, styles } = useCardStyles();
    const tint = color ?? colors.primary;
    const Container = onPress ? TouchableOpacity : View;

    return (
        <Container onPress={onPress} style={styles.statCard}>
            <View style={[styles.iconContainer, { backgroundColor: tint + '1A' }]}>
                <Icon name={icon} size={20} color={tint} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </Container>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        card: {
            backgroundColor: c.surface,
            borderRadius: radius['2xl'],
            borderWidth: 1,
            borderColor: c.border,
            padding: spacing.lg,
        },
        cardElevated: {
            borderColor: c.textMuted + '55',
        },
        statCard: {
            flex: 1,
            backgroundColor: c.surface,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: c.border,
            padding: spacing.md,
            alignItems: 'center',
            minWidth: 90,
        },
        iconContainer: {
            width: 40,
            height: 40,
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: spacing.sm,
        },
        statValue: {
            fontFamily: typography.fontFamily.display,
            fontSize: 22,
            color: c.text,
        },
        statLabel: {
            fontFamily: typography.fontFamily.medium,
            fontSize: 12,
            color: c.textSecondary,
            marginTop: 2,
        },
    });
}
