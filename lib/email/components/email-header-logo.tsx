import { Img } from '@react-email/components';
import { env } from '@/env.mjs';

/**
 * Logo ShemaProject pour les e-mails (spec 32 §5.5) — **PNG** (le SVG ne rend pas dans Gmail /
 * Outlook desktop ; c’était la cause du bug « logo ne s’affiche pas »).
 *
 * **Deux `<img>` empilés** (variante claire = encre sombre, variante sombre = encre claire)
 * basculés par la media query `prefers-color-scheme: dark` posée par `<EmailShell>` :
 *  - `.logo-light` (encre sombre, lisible sur fond clair) → visible par défaut (`display:inline`).
 *  - `.logo-dark` (encre claire, lisible sur fond sombre) → masquée par défaut (`display:none`).
 * En dark mode la media query inverse les `display`. Un seul asset visible à la fois (siblings
 * dans le flux — pas de positionnement absolu, fragile en mail).
 *
 * PNG générés depuis `shema_reader-icon_{light,dark}.svg` (icône monochrome 734×734) → 128×128
 * (rendu net à l’affichage 40px). URLs dérivées de `NEXT_PUBLIC_APP_URL`.
 */
const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
const LIGHT_LOGO = `${base}/logo/reader-shema_logo_or.webp`;
const DARK_LOGO = `${base}/logo/shema_reader-logo_dark.webp`;

export function EmailHeaderLogo() {
  return (
    <>
      <Img
        src={LIGHT_LOGO}
        alt="ShemaProject reader logo"
        width="45"
        height="45"
        className="!dark:hidden margin-0 !inline-block"
      />
      <Img
        src={DARK_LOGO}
        alt="Shema reader logo"
        width="45"
        height="45"
        className="!hidden !dark:inline-block margin-0"
      />
    </>
  );
}