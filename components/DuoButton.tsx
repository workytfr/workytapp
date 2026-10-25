import { useState } from 'react';
import {
    Pressable,
    Text,
    View,
    StyleSheet,
    ViewStyle,
    TextStyle,
    GestureResponderEvent,
} from 'react-native';
import Icon from './Icon';
import { useColors } from '../lib/useColors';
import { radius, spacing, typography } from '../lib/theme';

type DuoVariant = 'primary' | 'accent' | 'success' | 'white' | 'danger';
type DuoSize = 'sm' | 'md' | 'lg';

interface DuoButtonProps {
    label: string;
    onPress?: (e: GestureResponderEvent) => void;
    variant?: DuoVariant;
    size?: DuoSize;
    icon?: string;
    disabled?: boolean;
    fullWidth?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

/**
 * Bouton 3D façon Duolingo.
 * Une couche "face" repose sur une couche "socle" plus foncée.
 * Au tap, la face descend de `DEPTH`px pour donner l'effet d'enfoncement.
 */
export default function DuoButton({
    label,
    onPress,
    variant = 'primary',
    size = 'lg',
    icon,
    disabled = false,
    fullWidth = true,
    style,
    textStyle,
}: DuoButtonProps) {
    const colors = useColors();
    const [pressed, setPressed] = useState(false);

    const palette: Record<DuoVariant, { face: string; base: string; text: string }> = {
        primary: { face: colors.primary, base: colors.primaryDark, text: '#fff' },
        accent: { face: colors.accent, base: colors.accentDark, text: '#fff' },
        success: { face: colors.success, base: '#059669', text: '#fff' },
        danger: { face: colors.error, base: '#b91c1c', text: '#fff' },
        white: { face: colors.surface, base: colors.border, text: colors.text },
    };

    const sizing: Record<DuoSize, { padV: number; font: number; height: number }> = {
        sm: { padV: spacing.sm, font: typography.size.base, height: 44 },
        md: { padV: spacing.md, font: typography.size.lg, height: 52 },
        lg: { padV: spacing.md + 2, font: typography.size.xl, height: 58 },
    };

    const DEPTH = 5;
    const c = palette[variant];
    const s = sizing[size];
    const isDisabled = disabled;

    return (
        <Pressable
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            disabled={isDisabled}
            style={[
                styles.wrapper,
                fullWidth && { alignSelf: 'stretch' },
                { opacity: isDisabled ? 0.5 : 1 },
                style,
            ]}
        >
            {/* Socle (couche arrière plus foncée) */}
            <View
                style={[
                    styles.base,
                    { backgroundColor: c.base, height: s.height + DEPTH },
                ]}
            />
            {/* Face avant */}
            <View
                style={[
                    styles.face,
                    {
                        backgroundColor: c.face,
                        height: s.height,
                        transform: [{ translateY: pressed ? DEPTH : 0 }],
                    },
                ]}
            >
                {icon && (
                    <Icon
                        name={icon}
                        size={s.font + 2}
                        color={c.text}
                        style={{ marginRight: spacing.sm }}
                    />
                )}
                <Text
                    style={[
                        styles.label,
                        { color: c.text, fontSize: s.font },
                        textStyle,
                    ]}
                    numberOfLines={1}
                >
                    {label}
                </Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        justifyContent: 'flex-end',
    },
    base: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        borderRadius: radius.lg,
    },
    face: {
        borderRadius: radius.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    label: {
        fontFamily: typography.fontFamily.displayBold,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
});
