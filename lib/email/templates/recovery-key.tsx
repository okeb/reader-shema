import { Text } from '@react-email/components';
import { EmailShell } from '@/lib/email/components/email-shell';
import { BODY_TEXT, CODE_BLOCK, MUTED_TEXT } from '@/lib/email/theme';

/**
 * Clé de récupération de secours (spec 28 + spec 32) — e-mailée à l'inscription et au re-keying.
 *
 * Pas de bouton : c'est un **code à conserver**, pas à cliquer. Affichée dans un bloc `<code>`
 * monospace adaptatif (`CODE_BLOCK` : fond `code`/`code-dark`, bord `line`/`line-dark`, bascule
 * `dark:` générée par `<Tailwind>`), `break-all`. C'est la clé d'URGENCE pour retrouver l'accès
 * aux données synchronisées si le mot de passe est perdu (ou déverrouillage routine pour les
 * comptes magic-link). Jamais persistée serveur.
 */
export function RecoveryKeyEmail({ recoveryKey, unsubscribeUrl }: { recoveryKey: string; unsubscribeUrl?: string }) {
  return (
    <EmailShell
      title="Votre clé de récupération"
      preview="Conservez cette clé de récupération en lieu sûr."
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text className={BODY_TEXT}>
        Bonjour,
        <br />
        <br />
        Conservez cette clé de récupération en lieu sûr. Elle vous permet de retrouver vos données
        synchronisées si vous perdez votre mot de passe.
      </Text>
      <Text className={MUTED_TEXT}>
        Sans cette clé, vos données sont irrécupérables. Nous ne la stockons pas.
      </Text>
      <Text className={CODE_BLOCK}>
        {recoveryKey}
      </Text>
      <Text className={MUTED_TEXT}>
        À utiliser uniquement en cas de besoin. En cas de perte, nous ne pourrons pas la régénérer.
      </Text>
    </EmailShell>
  );
}