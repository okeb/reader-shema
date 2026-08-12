import { Link, Text } from '@react-email/components';
import { EMAIL } from '@/lib/email/theme';

/**
 * CTA lien-texte orange des e-mails (spec 32 §5.3 / §2) — signature de marque `Label →`.
 *
 * Contrairement à un bouton plein, le CTA est un **lien-texte** « Label → » en accent orange
 * `#f76808` (DM Sans, weight 600) — reprise du modèle « Skin ». L’accent est **identique dans les
 * deux thèmes** (contraste suffisant sur fond clair comme sombre) : pas de surcharge media query
 * sur le lien.
 *
 * Sous le lien, URL brute en muted pour les clients sans HTML / lien masqué (compat). `.e-muted`
 * = `#6b7280` en clair / `#98a1ad` en sombre (surcharge media query de `<EmailShell>`).
 */
export function EmailCta({ href, label }: { href: string; label: string }) {
  return (
    <>
      <Link
        href={href}
        style={{
          fontFamily: EMAIL.titleFont,
          color: EMAIL.accent,
          fontWeight: 600,
          fontSize: '16px',
          lineHeight: '1.5',
          textDecoration: 'none',
        }}
      >
        {label} →
      </Link>
      <Text
        className="e-muted"
        style={{ color: EMAIL.muted, fontSize: '12px', lineHeight: '1.5', margin: '14px 0 0' }}
      >
        Si le lien ne s&apos;affiche pas, copiez-collez celui-ci :
        <br />
        <Link href={href} style={{ color: EMAIL.muted, wordBreak: 'break-all' }}>
          {href}
        </Link>
      </Text>
    </>
  );
}