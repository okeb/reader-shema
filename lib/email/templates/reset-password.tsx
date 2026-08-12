import { Text } from '@react-email/components';
import { EmailShell } from '@/lib/email/components/email-shell';
import { EmailCta } from '@/lib/email/components/email-cta';
import { BODY_TEXT } from '@/lib/email/theme';

/**
 * E-mail de réinitialisation de mot de passe (spec 32) — click →
 * `/api/auth/reset-password/:token?…`. Lien à usage unique, expiration rapide (rappel copie).
 */
export function ResetPasswordEmail({ url }: { url: string }) {
  return (
    <EmailShell
      title="Réinitialisez votre mot de passe"
      preview="Vous avez demandé à réinitialiser votre mot de passe ShemaProject."
    >
      <Text className="e-fg" style={BODY_TEXT}>
        Bonjour,
        <br />
        <br />
        Vous avez demandé à réinitialiser le mot de passe de votre compte ShemaProject. Ce lien
        est à usage unique et expire rapidement.
      </Text>
      <Text style={{ margin: '8px 0 0' }}>
        <EmailCta href={url} label="Réinitialiser mon mot de passe" />
      </Text>
    </EmailShell>
  );
}