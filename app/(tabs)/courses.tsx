import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../lib/colors';

export default function CoursesScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Cours - Coming soon</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    text: { fontSize: 18, color: colors.textSecondary },
});
