import { Link, Button, Text } from '@react-email/components';

/**
 * CTA lien-texte orange des e-mails (spec 32 §5.3 / §2) — signature de marque `Label →`.
 *
 * Bouton plein en accent orange `#f76808` (DM Sans, weight 600), texte blanc. L'accent est
 * **identique dans les deux thèmes** (contraste suffisant sur fond clair comme sombre) : pas de
 * surcharge `dark:` sur le bouton.
 *
 * Sous le lien, URL brute en muted pour les clients sans HTML / lien masqué (compat) —
 * `text-muted` en clair / `.dm-muted` en sombre (surcharge `DARK_STYLE`).
 */
export function EmailCta({ href, label }: { href: string; label: string }) {
  return (
    <>
      <Button
        href={href}
        className="font-title w-full mx-2 box-border p-3 font-semibold rounded-lg text-center bg-accent text-white no-underline"
      >
        {label} →
      </Button>
      <Text className="text-muted dm-muted text-[12px] leading-[1.5] mt-3.5">
        Si le lien ne s&apos;affiche pas, copiez-collez celui-ci :
        <br />
        <Link href={href} className="text-accent font-mono break-all">
          {href}
        </Link>
      </Text>
    </>
  );
}