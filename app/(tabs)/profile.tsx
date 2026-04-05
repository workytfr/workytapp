import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';

export default function ProfileScreen() {
    const { user, signOut } = useAuth();

    return (
        <View style={styles.container}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                    {user?.username?.charAt(0).toUpperCase() || '?'}
                </Text>
            </View>
            <Text style={styles.username}>{user?.username}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <Text style={styles.role}>{user?.role}</Text>

            <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
                <Text style={styles.logoutText}>Se déconnecter</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 60,
        backgroundColor: colors.background,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: '700',
        color: '#fff',
    },
    username: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
    },
    email: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 4,
    },
    role: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '600',
        marginTop: 8,
        backgroundColor: colors.primaryLight,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
    },
    logoutBtn: {
        marginTop: 40,
        backgroundColor: colors.error,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
    },
    logoutText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});
