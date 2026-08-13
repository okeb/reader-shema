import { Img } from '@react-email/components';
import { env } from '@/env.mjs';

/**
 * Logo ShemaProject pour les e-mails (spec 32 §5.5) — **PNG** (le SVG ne rend pas dans Gmail /
 * Outlook desktop ; c’était la cause du bug « logo ne s’affiche pas »).
 *
 * **Variante aléatoire par e-mail** : un logo est tiré au hasard parmi 5 déclinaisons colorées
 * (or, laine, pelouse, plume, sable) à chaque envoi. La sélection se fait **au rendu du
 * composant**, pas au niveau module — sinon le même logo serait figé pour toute la durée de vie
 * du process serveur. L'e-mail étant rendu une seule fois côté serveur à l'envoi (react-dom/
 * server via `renderEmail`), l'impureté (`Math.random()` dans le rendu) est acceptable ici : pas
 * d'hydratation client, pas de rerender dynamique.
 *
 * URLs dérivées de `NEXT_PUBLIC_APP_URL` (prod = https://reader.shemaproject.org).
 */
const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
const LOGOS = [
  `${base}/logo/reader-shema_logo_or.png`,
  `${base}/logo/reader-shema_logo_laine.png`,
  `${base}/logo/reader-shema_logo_pelouse.png`,
  `${base}/logo/reader-shema_logo_plume.png`,
  `${base}/logo/reader-shema_logo_sable.png`,
] as const;

export function EmailHeaderLogo() {
  const src = LOGOS[Math.floor(Math.random() * LOGOS.length)];
  return (
    <Img
      src={src}
      alt="ShemaProject reader logo"
      width="77"
      height="77"
    />
  );
}