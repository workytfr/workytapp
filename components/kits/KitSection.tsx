/** Carte blanche bordée des kits : titre Funnel Display + texte d'aide. */
import { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useColors } from '../../lib/useColors';
import { radius, spacing, typography, type ThemeColors } from '../../lib/theme';

export default function KitSection({ title, text, right, children, style }: {
    title: string;
    text?: string;
    right?: React.ReactNode;
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}) {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    return (
        <View style={[s.card, style]}>
            <View style={s.head}>
                <Text style={s.title}>{title}</Text>
                {right}
            </View>
            {text ? <Text style={s.text}>{text}</Text> : null}
            {children ? <View style={s.body}>{children}</View> : null}
        </View>
    );
}

export function createKitStyles(c: ThemeColors) {
    return createStyles(c);
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        card: {
            backgroundColor: c.surface,
            borderRadius: radius['3xl'],
            borderWidth: 1,
            borderColor: c.border,
            padding: spacing.xl,
        },
        head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
        title: { flex: 1, fontFamily: typography.fontFamily.display, fontSize: 23, lineHeight: 27, color: c.text },
        text: { fontFamily: typography.fontFamily.regular, fontSize: 13.5, lineHeight: 19, color: c.textSecondary, marginTop: spacing.xs },
        body: { marginTop: spacing.sm },
    });
}
