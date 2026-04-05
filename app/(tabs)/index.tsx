import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';

export default function HomeScreen() {
    const { user } = useAuth();

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.greeting}>
                    Salut {user?.username || 'Apprenti'} !
                </Text>
                <Text style={styles.subtitle}>
                    Prêt à apprendre aujourd&apos;hui ?
                </Text>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{user?.points || 0}</Text>
                    <Text style={styles.statLabel}>Points</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{user?.role || '-'}</Text>
                    <Text style={styles.statLabel}>Rôle</Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        padding: 24,
        paddingTop: 16,
    },
    greeting: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.primary,
    },
    statLabel: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 4,
    },
});
