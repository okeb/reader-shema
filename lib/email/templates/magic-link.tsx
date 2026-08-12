import { Text, Section } from '@react-email/components';
import { EmailShell } from '@/lib/email/components/email-shell';
import { EmailButton } from '@/lib/email/components/email-button';

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
      <Text className="text-fg" style={{ color: '#111111', fontSize: '14px', lineHeight: '1.5', margin: '0 0 16px' }}>
        Bonjour,
        <br />
        <br />
        Cliquez pour vous connecter à ShemaProject avec <strong>{email}</strong>. Ce lien expire
        dans 5 minutes et est à usage unique.
      </Text>
      <Section style={{ textAlign: 'center', margin: '8px 0 16px' }}>
        <EmailButton href={url} label="Se connecter" />
      </Section>
    </EmailShell>
  );
}