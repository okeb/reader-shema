import { Text } from '@react-email/components';
import { EmailShell } from '@/lib/email/components/email-shell';
import { BODY_TEXT, CODE_BLOCK, MUTED_TEXT } from '@/lib/email/theme';

/**
 * Clé de récupération de secours (spec 28 + spec 32) — e-mailée à l'inscription et au re-keying.
 *
 * Pas de bouton : c'est un **code à conserver**, pas à cliquer. Affichée dans un bloc `<code>`
 * monospace adaptatif : `e-code` = `#f4f4f5` en clair / `#161616` en sombre (surcharge media
 * query), `word-break: break-all`, bord `e-border`. C'est la clé d'URGENCE pour retrouver l'accès
 * aux données synchronisées si le mot de passe est perdu (ou déverrouillage routine pour les
 * comptes magic-link). Jamais persistée serveur.
 */
export function RecoveryKeyEmail({ recoveryKey }: { recoveryKey: string }) {
  return (
    <EmailShell
      title="Votre clé de récupération"
      preview="Conservez cette clé de récupération en lieu sûr."
    >
      <Text className="e-fg" style={BODY_TEXT}>
        Bonjour,
        <br />
        <br />
        Conservez cette clé de récupération en lieu sûr. Elle vous permet de retrouver vos données
        synchronisées si vous perdez votre mot de passe.
      </Text>
      <Text className="e-muted" style={MUTED_TEXT}>
        Sans cette clé, vos données sont irrécupérables. Nous ne la stockons pas.
      </Text>
      <Text className="e-code e-border e-fg" style={CODE_BLOCK}>
        {recoveryKey}
      </Text>
      <Text className="e-muted" style={MUTED_TEXT}>
        À utiliser uniquement en cas de besoin. En cas de perte, nous ne pourrons pas la régénérer.
      </Text>
    </EmailShell>
  );
}