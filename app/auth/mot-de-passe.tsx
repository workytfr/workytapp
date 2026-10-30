import { useState } from 'react';
import DuoButton from '../../components/DuoButton';
import { AuthField, AuthMessage, AuthShell } from '../../components/AuthForm';
import { apiFetch } from '../../lib/api';

/**
 * Mot de passe oublié : le site envoie le lien de réinitialisation par
 * e-mail (POST /api/auth/reset). La réponse est volontairement la même
 * que le compte existe ou non.
 */
export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState('');
    const [error, setError] = useState('');

    const submit = async () => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Indique l’adresse e-mail de ton compte.');
        setError('');
        setLoading(true);
        try {
            const res = await apiFetch<{ message?: string }>('/auth/reset', { method: 'POST', body: JSON.stringify({ email: email.trim() }) });
            setSent(res?.message || 'Si un compte existe avec cet e-mail, un lien de réinitialisation vient d’être envoyé.');
        } catch (e: any) {
            setError(e?.message || 'Envoi impossible pour le moment. Réessaie dans quelques minutes.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell title="Mot de passe oublié" subtitle="On t’envoie un lien par e-mail pour en choisir un nouveau.">
            {error ? <AuthMessage kind="error" text={error} /> : null}
            {sent ? <AuthMessage kind="success" text={sent} /> : null}
            <AuthField
                label="Email"
                icon="mail-outline"
                placeholder="ton@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                textContentType="emailAddress"
                onSubmitEditing={submit}
            />
            <DuoButton label={loading ? 'Envoi…' : sent ? 'Renvoyer le lien' : 'Envoyer le lien'} icon="paper-plane" onPress={submit} disabled={loading} />
        </AuthShell>
    );
}
