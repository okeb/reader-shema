import { Text, Section } from '@react-email/components';
import { EmailShell } from '@/lib/email/components/email-shell';
import { EmailButton } from '@/lib/email/components/email-button';

/**
 * E-mail de vérification d'adresse (spec 32) — click → `/api/auth/verify-email?token=…`.
 *
 * `url` est pré-construite par Better Auth (déjà tokenisée) : on la réutilise telle quelle, aucun
 * rebuilding d'URL. Le lien expire dans 1 h (rappel dans la copie).
 */
export function VerificationEmail({ url }: { url: string }) {
  return (
    <EmailShell
      title="Vérifiez votre e-mail"
      preview="Confirmez votre adresse e-mail pour activer votre compte ShemaProject."
    >
      <Text className="text-fg" style={{ color: '#111111', fontSize: '14px', lineHeight: '1.5', margin: '0 0 16px' }}>
        Bonjour,
        <br />
        <br />
        Confirmez votre adresse e-mail pour activer votre compte ShemaProject. Le lien expire dans
        1 heure.
      </Text>
      <Section style={{ textAlign: 'center', margin: '8px 0 16px' }}>
        <EmailButton href={url} label="Vérifier mon e-mail" />
      </Section>
    </EmailShell>
  );
}