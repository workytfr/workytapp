/** Ligne de saisie d'une note sur 20 avec son coefficient (portage de kits/_components/NoteInput du site). */
import { memo, useMemo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useColors } from '../../lib/useColors';
import { radius, spacing, typography, type ThemeColors } from '../../lib/theme';
import { parseNote } from '../../lib/kits/common';

function NoteInput({ label, hint, coef, value, onChange, last }: {
    label: string;
    hint?: string;
    coef?: number;
    value: string;
    onChange: (v: string) => void;
    /** Pas de séparateur sous la dernière ligne */
    last?: boolean;
}) {
    const colors = useColors();
    const s = useMemo(() => createStyles(colors), [colors]);
    const invalid = value.trim() !== '' && parseNote(value) === null;

    return (
        <View style={[s.row, !last && s.sep]}>
            <View style={s.labelBox}>
                <Text style={s.label}>{label}</Text>
                {hint ? <Text style={s.hint}>{hint}</Text> : null}
            </View>
            {coef !== undefined ? (
                <View style={s.chip} accessibilityLabel={`Coefficient ${coef}`}>
                    <Text style={s.chipText}>coef {String(coef).replace('.', ',')}</Text>
                </View>
            ) : null}
            <View style={[s.field, invalid && { borderColor: colors.error }]}>
                <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="—"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    maxLength={5}
                    style={s.input}
                    accessibilityLabel={`${label}, note sur 20`}
                    selectTextOnFocus
                />
                <Text style={s.unit}>/20</Text>
            </View>
        </View>
    );
}

export default memo(NoteInput);

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2 },
        sep: { borderBottomWidth: 1, borderBottomColor: c.divider },
        labelBox: { flex: 1, minWidth: 0 },
        label: { fontFamily: typography.fontFamily.semiBold, fontSize: 14, lineHeight: 18, color: c.text },
        hint: { fontFamily: typography.fontFamily.regular, fontSize: 11.5, lineHeight: 15, color: c.textMuted, marginTop: 1 },
        chip: { backgroundColor: c.surfaceVariant, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
        chipText: { fontFamily: typography.fontFamily.semiBold, fontSize: 11, color: c.textSecondary },
        field: {
            width: 88,
            minHeight: 44,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.background,
            borderRadius: radius.md,
            paddingHorizontal: spacing.sm,
        },
        input: {
            flex: 1,
            minWidth: 0,
            textAlign: 'right',
            fontFamily: typography.fontFamily.heading,
            fontSize: 15,
            color: c.text,
            paddingVertical: 6,
        },
        unit: { fontFamily: typography.fontFamily.regular, fontSize: 11, color: c.textMuted, paddingLeft: 3 },
    });
}
