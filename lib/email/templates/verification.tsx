import { Text } from '@react-email/components';
import { EmailShell } from '@/lib/email/components/email-shell';
import { EmailCta } from '@/lib/email/components/email-cta';
import { BODY_TEXT } from '@/lib/email/theme';

/**
 * E-mail de vérification d'adresse (spec 32) — click → `/api/auth/verify-email?token=…`.
 *
 * `url` est pré-construite par Better Auth (déjà tokenisée) : on la réutilise telle quelle, aucun
 * rebuilding d'URL. Le lien expire dans 1 h (rappel dans la copie).
 */
export function VerificationEmail({ url, unsubscribeUrl }: { url: string; unsubscribeUrl?: string }) {
  return (
    <EmailShell
      title="Vérifiez votre e-mail"
      preview="Confirmez votre adresse e-mail pour activer votre compte ShemaProject."
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text className={BODY_TEXT}>
        Bonjour,
        <br />
        <br />
        Confirmez votre adresse e-mail pour activer votre compte ShemaProject. Le lien expire
        dans 1 heure.
      </Text>
      <Text style={{ margin: '8px 0 0' }}>
        <EmailCta href={url} label="Vérifier mon e-mail" />
      </Text>
    </EmailShell>
  );
}