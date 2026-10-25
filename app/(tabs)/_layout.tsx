import { Tabs } from 'expo-router';
import Icon from '../../components/Icon';
import { StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '../../lib/theme';
import { useColors } from '../../lib/useColors';

/** Hauteur utile des onglets (icône + libellé), hors safe area */
const TAB_CONTENT_HEIGHT = 56;

type IconName = string;

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
    { name: 'index', title: 'Accueil', icon: 'home-outline', iconActive: 'home' },
    { name: 'courses', title: 'Cours', icon: 'book-outline', iconActive: 'book' },
    { name: 'fiches', title: 'Fiches', icon: 'document-text-outline', iconActive: 'document-text' },
    { name: 'forum', title: 'Forum', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
    { name: 'profile', title: 'Profil', icon: 'person-outline', iconActive: 'person' },
];

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const colors = useColors();
    const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: colors.accent,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarStyle: {
                    ...styles.tabBar,
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    height: TAB_CONTENT_HEIGHT + bottomInset,
                    paddingBottom: bottomInset,
                },
                tabBarItemStyle: styles.tabBarItem,
                tabBarLabelStyle: styles.tabBarLabel,
                headerShown: false,
                tabBarHideOnKeyboard: true,
                // Les onglets déjà visités restent montés : retour instantané
                lazy: true,
                freezeOnBlur: true,
            }}
        >
            {TABS.map((t) => (
                <Tabs.Screen
                    key={t.name}
                    name={t.name}
                    options={{
                        title: t.title,
                        tabBarIcon: ({ color, focused }) => (
                            <Icon name={focused ? t.iconActive : t.icon} size={24} color={color as string} />
                        ),
                    }}
                />
            ))}
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 6,
        elevation: 0,
        shadowOpacity: 0,
    },
    tabBarItem: {
        paddingTop: 2,
    },
    tabBarLabel: {
        fontSize: 11,
        fontFamily: typography.fontFamily.semiBold,
        marginTop: 2,
    },
});
