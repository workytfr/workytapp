import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Icon from '../../components/Icon';
import DuoButton from '../../components/DuoButton';
import { AuthField, AuthMessage, AuthShell } from '../../components/AuthForm';
import { useAuth } from '../../lib/auth';
import { apiFetch } from '../../lib/api';
import { openWeb } from '../../lib/links';
import { getSiteOrigin } from '../../lib/siteOrigin';
import { useColors } from '../../lib/useColors';
import { spacing, typography, type ThemeColors } from '../../lib/theme';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME = /^[a-zA-Z0-9_]{3,20}$/;

/**
 * Inscription dans l'app (POST /api/auth/register, comme la fenêtre
 * d'inscription du site), puis connexion directe : pas de navigateur.
 */
export default function RegisterScreen() {
    const colors = useColors();
    const router = useRouter();
    const { signIn } = useAuth();
    const s = useMemo(() => createStyles(colors), [colors]);

    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [accepted, setAccepted] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        const e = email.trim();
        if (!name.trim() || !username.trim() || !e || !password) return setError('Remplis tous les champs.');
        if (!USERNAME.test(username.trim())) return setError('Pseudo : 3 à 20 caractères, lettres, chiffres ou « _ » (sans espace ni accent).');
        if (!EMAIL.test(e)) return setError('Cette adresse e-mail ne semble pas valide.');
        if (password.length < 6) return setError('Le mot de passe doit contenir au moins 6 caractères.');
        if (!accepted) return setError('Accepte la politique de confidentialité pour continuer.');
        setError('');
        setLoading(true);
        try {
            await apiFetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name: name.trim(), username: username.trim(), email: e, password, hasAcceptedPrivacyPolicy: true }),
            });
            await signIn(e, password); // la navigation suit l'état connecté
        } catch (err: any) {
            setError(err?.message || 'Inscription impossible pour le moment.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title="Crée ton compte"
            subtitle="Gratuit, pour toujours : cours, fiches, forum et aventure."
            footer={
                <View style={s.footer}>
                    <Text style={s.footerText}>Déjà inscrit ?</Text>
                    <Pressable onPress={() => router.back()} hitSlop={8}><Text style={s.footerLink}>Se connecter</Text></Pressable>
                </View>
            }
        >
            {error ? <AuthMessage kind="error" text={error} /> : null}
            <AuthField label="Prénom et nom" icon="person-outline" placeholder="Camille Martin" value={name} onChangeText={setName} autoCapitalize="words" textContentType="name" />
            <AuthField label="Pseudo" icon="at" placeholder="camille_m" value={username} onChangeText={setUsername} autoCapitalize="none" hint="Visible par les autres sur le forum." />
            <AuthField label="Email" icon="mail-outline" placeholder="ton@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" />
            <AuthField label="Mot de passe" icon="lock-closed-outline" placeholder="6 caractères minimum" value={password} onChangeText={setPassword} secure textContentType="newPassword" onSubmitEditing={submit} />

            <Pressable style={s.consent} onPress={() => setAccepted((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: accepted }}>
                <View style={[s.box, accepted && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                    {accepted ? <Icon name="checkmark" size={14} color="#fff" /> : null}
                </View>
                <Text style={s.consentText}>
                    J’accepte la{' '}
                    <Text style={s.link} onPress={() => openWeb(`${getSiteOrigin()}/politique-confidentialite`, 'Politique de confidentialité')}>
                        politique de confidentialité
                    </Text>
                    {' '}de Workyt.
                </Text>
            </Pressable>

            <DuoButton label={loading ? 'Création…' : 'Créer mon compte'} icon="arrow-forward" onPress={submit} disabled={loading} />
        </AuthShell>
    );
}

function createStyles(c: ThemeColors) {
    return StyleSheet.create({
        consent: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.xl },
        box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: c.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
        consentText: { flex: 1, fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: c.textSecondary, lineHeight: 20 },
        link: { fontFamily: typography.fontFamily.semiBold, color: c.primary, textDecorationLine: 'underline' },
        footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs, marginTop: spacing['2xl'] },
        footerText: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: c.textSecondary },
        footerLink: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.base, color: c.primary },
    });
}
