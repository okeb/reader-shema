import { Text, Section } from '@react-email/components';
import { EmailShell } from '@/lib/email/components/email-shell';
import { EmailButton } from '@/lib/email/components/email-button';

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
      <Text className="text-fg" style={{ color: '#111111', fontSize: '14px', lineHeight: '1.5', margin: '0 0 16px' }}>
        Bonjour,
        <br />
        <br />
        Vous avez demandé à réinitialiser le mot de passe de votre compte ShemaProject. Ce lien est
        à usage unique et expire rapidement.
      </Text>
      <Section style={{ textAlign: 'center', margin: '8px 0 16px' }}>
        <EmailButton href={url} label="Réinitialiser mon mot de passe" />
      </Section>
    </EmailShell>
  );
}