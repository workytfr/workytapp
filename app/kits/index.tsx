import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import { IconButton, PageHeader } from '../../components/wk';
import { useColors } from '../../lib/useColors';
import { radius, spacing, typography, type ThemeColors } from '../../lib/theme';

// Mêmes kits et mêmes textes que /kits sur le site
const KITS = [
    {
        route: '/kits/pomodoro',
        icon: 'alarm',
        tag: 'Concentration',
        title: 'Pomodoro : Corvy et Foxy',
        text: "Des sessions de travail entrecoupées de pauses. Foxy tente de te distraire : garde ton fromage !",
        emoji: '🧀',
    },
    {
        route: '/kits/moyenne-bac',
        icon: 'school',
        tag: 'Lycée',
        title: 'Calculateur de moyenne du bac 2027',
        text: "Général ou technologique, avec l'épreuve anticipée de maths, le grand oral, le contrôle continu et les options. Mention et rattrapage.",
        emoji: '🎓',
    },
    {
        route: '/kits/moyenne-brevet',
        icon: 'calculator',
        tag: 'Collège',
        title: 'Calculateur de moyenne du brevet',
        text: "Le nouveau calcul sur 20 : 40 % de moyennes de 3e, 60 % d'épreuves finales. Découvre la note qu'il te faut le jour J.",
        emoji: '📝',
    },
] as const;

/** Kits de l'élève — équivalent de /kits sur le site. */
export default function KitsScreen() {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const s = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <PageHeader
                topInset={insets.top}
                eyebrow="Kits de l'élève"
                title="Des outils pour réviser"
                subtitle="Gratuits, sans publicité, utilisables sans compte. Connecte-toi pour garder l'historique de tes sessions de travail."
                right={<IconButton icon="close" label="Fermer" onPress={() => router.back()} />}
            />
            <ScrollView contentContainerStyle={[s.list, { paddingBottom: insets.bottom + spacing['3xl'] }]}>
                {KITS.map((k) => (
                    <Pressable
                        key={k.route}
                        onPress={() => router.push(k.route as any)}
                        style={({ pressed }) => [s.card, pressed && s.cardPressed]}
                        accessibilityRole="button"
                        accessibilityLabel={k.title}
                    >
                        <View style={s.cardTop}>
                            <View style={s.iconBox}><Icon name={k.icon} size={22} color={colors.accent} /></View>
                            <Icon name="arrow-forward" size={20} color={colors.textMuted} />
                        </View>
                        <Text style={s.tag}>{k.tag}</Text>
                        <Text style={s.title}>{k.title} <Text>{k.emoji}</Text></Text>
                        <Text style={s.text}>{k.text}</Text>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        list: { padding: spacing.lg, gap: spacing.md },
        card: {
            backgroundColor: c.surface,
            borderRadius: radius['3xl'],
            borderWidth: 1,
            borderColor: c.border,
            padding: spacing.xl,
        },
        cardPressed: { transform: [{ scale: 0.985 }], borderColor: c.textMuted },
        cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        iconBox: {
            width: 44,
            height: 44,
            borderRadius: radius.lg,
            backgroundColor: '#fff1e3',
            alignItems: 'center',
            justifyContent: 'center',
        },
        tag: {
            fontFamily: typography.fontFamily.semiBold,
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: c.textMuted,
            marginTop: spacing.xl,
        },
        title: { fontFamily: typography.fontFamily.display, fontSize: 23, lineHeight: 27, color: c.text, marginTop: spacing.xs },
        text: { fontFamily: typography.fontFamily.regular, fontSize: 14, lineHeight: 20, color: c.textSecondary, marginTop: spacing.sm },
    });
}
