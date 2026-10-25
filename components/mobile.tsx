/**
 * Briques d'interaction propres au mobile (le site n'en a pas l'équivalent) :
 * barre de recherche, bouton de filtres, feuille qui monte du bas, bouton
 * flottant. Même habillage papier / encre / orange que components/wk.tsx.
 */
import { memo, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    Modal,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import { useColors } from '../lib/useColors';
import { radius, spacing, typography, type ThemeColors } from '../lib/theme';
import { tapLight, tapMedium } from '../lib/haptics';

function useStyles() {
    const colors = useColors();
    return useMemo(() => ({ colors, s: createStyles(colors) }), [colors]);
}

/** Champ de recherche arrondi, avec bouton d'effacement */
export const SearchBar = memo(function SearchBar({
    value, onChangeText, placeholder, style,
}: { value: string; onChangeText: (t: string) => void; placeholder: string; style?: StyleProp<ViewStyle> }) {
    const { colors, s } = useStyles();
    return (
        <View style={[s.search, style]}>
            <Icon name="search" size={18} color={colors.textMuted} />
            <TextInput
                style={s.searchInput}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
                value={value}
                onChangeText={onChangeText}
                returnKeyType="search"
                autoCorrect={false}
            />
            {value ? (
                <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Effacer la recherche">
                    <Icon name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
            ) : null}
        </View>
    );
});

/** Bouton « Filtres » avec le nombre de filtres actifs */
export const FilterButton = memo(function FilterButton({ count, onPress }: { count: number; onPress: () => void }) {
    const { colors, s } = useStyles();
    const active = count > 0;
    return (
        <Pressable
            onPress={() => { tapLight(); onPress(); }}
            style={({ pressed }) => [s.filterBtn, active && s.filterBtnActive, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={active ? `Filtres, ${count} actifs` : 'Filtres'}
        >
            <Icon name="options-outline" size={18} color={active ? colors.background : colors.text} />
            {active ? (
                <View style={s.filterBadge}><Text style={s.filterBadgeText}>{count}</Text></View>
            ) : null}
        </Pressable>
    );
});

/**
 * Feuille modale qui monte du bas (filtres, options, guide) : poignée,
 * titre, contenu défilant et pied d'action optionnel.
 */
export function BottomSheet({
    visible, onClose, title, children, footer,
}: {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    const { colors, s } = useStyles();
    const insets = useSafeAreaInsets();
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            {/* Le clavier pousse la feuille vers le haut (éditeurs de réponse, recherche) */}
            <KeyboardAvoidingView style={s.sheetRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <Pressable style={s.sheetBackdrop} onPress={onClose} accessibilityLabel="Fermer" />
                <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
                    <View style={s.sheetHandle} />
                    <View style={s.sheetHead}>
                        <Text style={s.sheetTitle}>{title}</Text>
                        <Pressable onPress={onClose} hitSlop={10} style={s.sheetClose} accessibilityLabel="Fermer">
                            <Icon name="close" size={20} color={colors.text} />
                        </Pressable>
                    </View>
                    <ScrollView style={s.sheetBody} contentContainerStyle={{ paddingBottom: spacing.lg }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {children}
                    </ScrollView>
                    {footer ? <View style={s.sheetFoot}>{footer}</View> : null}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

/** Groupe de choix en pastilles dans une feuille (choix unique, « Tous » = '') */
export function SheetChoices({
    label, options, value, onChange, allLabel = 'Tous',
}: {
    label: string;
    options: string[] | { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
    allLabel?: string;
}) {
    const { s } = useStyles();
    const items = [{ value: '', label: allLabel }, ...options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))];
    return (
        <View style={s.choices}>
            <Text style={s.choicesLabel}>{label}</Text>
            <View style={s.choicesWrap}>
                {items.map((o) => {
                    const active = o.value === value;
                    return (
                        <Pressable
                            key={o.value || '__all'}
                            onPress={() => { tapLight(); onChange(o.value); }}
                            style={[s.choice, active && s.choiceActive]}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: active }}
                        >
                            <Text style={[s.choiceText, active && s.choiceTextActive]}>{o.label}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

/** Bouton principal pleine largeur (pied de feuille, barre d'action collante) */
export function PrimaryButton({
    label, onPress, icon, variant = 'orange', disabled, style,
}: {
    label: string;
    onPress: () => void;
    icon?: string;
    variant?: 'orange' | 'ink' | 'ghost';
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
}) {
    const { colors, s } = useStyles();
    const fg = variant === 'ghost' ? colors.text : variant === 'ink' ? colors.background : '#fff';
    return (
        <Pressable
            onPress={() => { tapMedium(); onPress(); }}
            disabled={disabled}
            style={({ pressed }) => [
                s.btn,
                variant === 'orange' && s.btnOrange,
                variant === 'ink' && s.btnInk,
                variant === 'ghost' && s.btnGhost,
                pressed && s.btnPressed,
                disabled && { opacity: 0.5 },
                style,
            ]}
            accessibilityRole="button"
        >
            {icon ? <Icon name={icon} size={18} color={fg} /> : null}
            <Text style={[s.btnText, { color: fg }]}>{label}</Text>
        </Pressable>
    );
}

/** Bouton flottant étendu (icône + libellé), au-dessus de la barre d'onglets */
export function Fab({ label, icon = 'add', onPress, bottom = spacing.lg }: { label: string; icon?: string; onPress: () => void; bottom?: number }) {
    const { s } = useStyles();
    return (
        <Pressable
            onPress={() => { tapMedium(); onPress(); }}
            style={({ pressed }) => [s.fab, { bottom }, pressed && s.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel={label}
        >
            <Icon name={icon} size={20} color="#fff" />
            <Text style={s.fabText}>{label}</Text>
        </Pressable>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        search: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            minHeight: 46,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.full,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
        },
        searchInput: {
            flex: 1,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.size.base,
            color: c.text,
            paddingVertical: 10,
        },

        filterBtn: {
            width: 46,
            height: 46,
            borderRadius: 23,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
            alignItems: 'center',
            justifyContent: 'center',
        },
        filterBtnActive: { backgroundColor: c.text, borderColor: c.text },
        filterBadge: {
            position: 'absolute',
            top: -3,
            right: -3,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: 9,
            backgroundColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: c.background,
        },
        filterBadgeText: { fontFamily: typography.fontFamily.heading, fontSize: 9, color: '#fff' },

        sheetRoot: { flex: 1, justifyContent: 'flex-end' },
        sheetBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(26,21,18,0.45)' },
        sheet: {
            maxHeight: '86%',
            backgroundColor: c.background,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: spacing.sm,
        },
        sheetHandle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginBottom: spacing.sm },
        sheetHead: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.xl,
            paddingBottom: spacing.md,
        },
        sheetTitle: { fontFamily: typography.fontFamily.display, fontSize: 26, color: c.text, letterSpacing: -0.4 },
        sheetClose: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: c.surfaceVariant,
            alignItems: 'center',
            justifyContent: 'center',
        },
        sheetBody: { paddingHorizontal: spacing.xl },
        sheetFoot: {
            flexDirection: 'row',
            gap: spacing.sm,
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: c.divider,
        },

        choices: { marginBottom: spacing.xl },
        choicesLabel: {
            fontFamily: typography.fontFamily.mono,
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: c.textSecondary,
            marginBottom: spacing.sm,
        },
        choicesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
        choice: {
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: radius.full,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
        },
        choiceActive: { backgroundColor: c.text, borderColor: c.text },
        choiceText: { fontFamily: typography.fontFamily.semiBold, fontSize: 13, color: c.textSecondary },
        choiceTextActive: { color: c.background },

        btn: {
            flex: 1,
            minHeight: 50,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            paddingHorizontal: spacing.xl,
            borderRadius: radius.full,
        },
        // Ombre « socle » des boutons du site (.wk-btn-orange : 0 4px 0 #c24a0a)
        btnOrange: { backgroundColor: c.primary, borderBottomWidth: 4, borderBottomColor: c.primaryDark },
        btnInk: { backgroundColor: c.text, borderBottomWidth: 3, borderBottomColor: '#000' },
        btnGhost: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
        btnPressed: { transform: [{ translateY: 2 }], borderBottomWidth: 2 },
        btnText: { fontFamily: typography.fontFamily.semiBold, fontSize: 15 },

        fab: {
            position: 'absolute',
            right: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            height: 54,
            paddingHorizontal: spacing.xl,
            borderRadius: 27,
            backgroundColor: c.primary,
            borderBottomWidth: 4,
            borderBottomColor: c.primaryDark,
            shadowColor: c.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 14,
            elevation: 6,
        },
        fabText: { fontFamily: typography.fontFamily.semiBold, fontSize: 15, color: '#fff' },
    });
}
