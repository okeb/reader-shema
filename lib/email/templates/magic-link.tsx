import { Text } from '@react-email/components';
import { EmailShell } from '@/lib/email/components/email-shell';
import { EmailCta } from '@/lib/email/components/email-cta';
import { BODY_TEXT } from '@/lib/email/theme';

/**
 * Lien magique de connexion (spec 32) — click → `/api/auth/magic-link/verify?token=…`.
 * Lien à usage unique, expire dans 5 min (rappel copie).
 */
export function MagicLinkEmail({ email, url }: { email: string; url: string }) {
  return (
    <EmailShell
      title="Votre lien de connexion"
      preview="Cliquez pour vous connecter à ShemaProject."
    >
      <Text className="e-fg" style={BODY_TEXT}>
        Bonjour,
        <br />
        <br />
        Cliquez pour vous connecter à ShemaProject avec <strong>{email}</strong>. Ce lien expire
        dans 5 minutes et est à usage unique.
      </Text>
      <Text style={{ margin: '8px 0 0' }}>
        <EmailCta href={url} label="Se connecter" />
      </Text>
    </EmailShell>
  );
}