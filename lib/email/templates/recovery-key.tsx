import { Text } from '@react-email/components';
import { EmailShell } from '@/lib/email/components/email-shell';

/**
 * Clé de récupération de secours (spec 28 + spec 32) — e-mailée à l'inscription et au re-keying.
 *
 * Pas de bouton : c'est un **code à conserver**, pas à cliquer. Affichée dans un bloc `<code>`
 * monospace adaptatif (§5.3) : `bg-code` = `#f2f2f5` en clair / `#1a1a1a` en sombre (surcharge
 * media query), `word-break: break-all`, `border-card`. C'est la clé d'URGENCE pour retrouver
 * l'accès aux données synchronisées si le mot de passe est perdu (ou déverrouillage routine pour
 * les comptes magic-link). Jamais persistée serveur.
 */
export function RecoveryKeyEmail({ recoveryKey }: { recoveryKey: string }) {
  return (
    <EmailShell
      title="Votre clé de récupération"
      preview="Conservez cette clé de récupération en lieu sûr."
    >
      <Text className="text-fg" style={{ color: '#111111', fontSize: '14px', lineHeight: '1.5', margin: '0 0 14px' }}>
        Bonjour,
        <br />
        <br />
        Conservez cette clé de récupération en lieu sûr. Elle vous permet de retrouver vos données
        synchronisées si vous perdez votre mot de passe.
      </Text>
      <Text
        className="text-muted"
        style={{ color: '#888888', fontSize: '12px', lineHeight: '1.5', margin: '0 0 10px' }}
      >
        Sans cette clé, vos données sont irrécupérables. Nous ne la stockons pas.
      </Text>
      <Text
        className="bg-code border-card text-fg"
        style={{
          color: '#111111',
          fontFamily:
            'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
          fontSize: '15px',
          letterSpacing: '0.5px',
          background: '#f2f2f5',
          border: '1px solid #e8e8ee',
          borderRadius: '8px',
          padding: '14px 16px',
          wordBreak: 'break-all',
          margin: '0 0 14px',
        }}
      >
        {recoveryKey}
      </Text>
      <Text
        className="text-muted"
        style={{ color: '#888888', fontSize: '12px', lineHeight: '1.5', margin: '0' }}
      >
        À utiliser uniquement en cas de besoin. En cas de perte, nous ne pourrons pas la régénérer.
      </Text>
    </EmailShell>
  );
}