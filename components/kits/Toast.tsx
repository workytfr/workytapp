/**
 * Petit bandeau de confirmation (équivalent des toasts « sonner » du site),
 * posé en bas de l'écran au-dessus de l'inset. `useToast` renvoie le bandeau
 * à rendre et la fonction pour l'afficher.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../Icon';
import { useColors } from '../../lib/useColors';
import { radius, spacing, typography } from '../../lib/theme';

export type ToastTone = 'ok' | 'ko' | 'info';

export function useToast() {
    const [toast, setToast] = useState<{ text: string; tone: ToastTone; key: number } | null>(null);
    const show = useCallback((text: string, tone: ToastTone = 'ok') => setToast({ text, tone, key: Date.now() }), []);
    const node = toast ? <ToastView key={toast.key} text={toast.text} tone={toast.tone} onDone={() => setToast(null)} /> : null;
    return { show, node };
}

function ToastView({ text, tone, onDone }: { text: string; tone: ToastTone; onDone: () => void }) {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const opacity = useRef(new Animated.Value(0)).current;
    const s = useMemo(() => styles(), []);
    // Le parent peut se re-rendre (minuteur) : on ne relance pas le délai pour autant
    const doneRef = useRef(onDone);
    doneRef.current = onDone;

    useEffect(() => {
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
        const t = setTimeout(() => {
            Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => doneRef.current());
        }, 2800);
        return () => clearTimeout(t);
    }, [opacity]);

    const color = tone === 'ok' ? colors.success : tone === 'ko' ? colors.error : colors.info;
    const icon = tone === 'ok' ? 'checkmark-circle' : tone === 'ko' ? 'alert-circle' : 'information-circle';

    return (
        <Animated.View
            accessibilityLiveRegion="polite"
            style={[s.wrap, { pointerEvents: 'none', bottom: insets.bottom + spacing.lg, opacity }]}
        >
            <View style={[s.toast, { backgroundColor: colors.text }]}>
                <Icon name={icon} size={18} color={color === colors.success ? '#7ED957' : color === colors.error ? '#FF8A80' : '#6EC1E4'} />
                <Text style={[s.text, { color: colors.background }]}>{text}</Text>
            </View>
        </Animated.View>
    );
}

function styles() {
    return StyleSheet.create({
        wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center' },
        toast: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderRadius: radius.lg,
            maxWidth: 480,
        },
        text: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.base, flexShrink: 1 },
    });
}
