import { Button, Text, Link } from '@react-email/components';

/**
 * Bouton CTA orange pour les e-mails (spec 32 §5.3) + fallback URL texte.
 *
 * Le bouton est un `<Button href={url}>` react.email (rendu `<a>` inline-block, robuste Outlook
 * via table d'arrière-plan). L'accent orange `#f76808` est posé en **inline** (lu par tous les
 * clients) et est **identique dans les deux thèmes** — aucune surcharge `prefers-color-scheme`
 * sur le bouton (contraste suffisant sur blanc comme sur noir, §5.5).
 *
 * Sous le bouton, lien URL brut en `text-xs text-muted break-all` pour les lecteurs mail sans
 * HTML / bouton masqué (compat). `.text-muted` = `#888` en clair, `#a1a1aa` en sombre (surcharge
 * media query de `<EmailShell>`).
 */
export function EmailButton({ href, label }: { href: string; label: string }) {
  return (
    <>
      <Button
        href={href}
        style={{
          backgroundColor: '#f76808',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '14px',
          textDecoration: 'none',
          borderRadius: '6px',
          padding: '10px 20px',
        }}
      >
        {label}
      </Button>
      <Text style={{ margin: '14px 0 0', fontSize: '12px', color: '#888888' }} className="text-muted">
        Si le bouton ne s&apos;affiche pas, copiez-collez ce lien :
        <br />
        <Link href={href} style={{ color: '#444444', wordBreak: 'break-all' }}>
          {href}
        </Link>
      </Text>
    </>
  );
}