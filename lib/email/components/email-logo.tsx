import { Img } from '@react-email/components';
import { env } from '@/env.mjs';

/**
 * Logo ShemaProject pour les e-mails (spec 32 §5.5).
 *
 * **Deux `<img>` empilés** (variante claire + variante sombre) basculés par la media query
 * `prefers-color-scheme: dark` posée par `<EmailShell>` :
 *  - `.logo-light` (encre sombre, lisible sur carte blanche) → visible par défaut (`display:inline`).
 *  - `.logo-dark`  (encre claire,  lisible sur carte noire)  → masquée par défaut (`display:none`).
 * En dark mode la media query inverse les `display`. Un seul asset est visible à la fois : pas
 * besoin de positionnement absolu (fragile en mail), ils sont siblings dans le flux.
 *
 * SVG rendu par Gmail/webmail ; **Outlook desktop ne rend pas les SVG** → fallback `alt="ShemaProject"`
 * (assumé spec §8 — pas de PNG dédié cette itération).
 *
 * URLs dérivées de `NEXT_PUBLIC_APP_URL` (domaine fixe de prod = `reader.shemaproject.org`) pour
 * que les previews pointent aussi vers des assets résolvables.
 */
const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
const LIGHT_LOGO = `${base}/logo/shema_reader-icon_light.svg`;
const DARK_LOGO = `${base}/logo/shema_reader-icon_dark.svg`;

export function EmailLogo() {
  return (
    <>
      <Img
        src={LIGHT_LOGO}
        alt="ShemaProject"
        width="56"
        height="56"
        className="logo-light mx-auto"
        // `display:inline` = base claire (lue par tous les clients, même ceux qui stripent `<style>`).
        // La media query de `<EmailShell>` pose `display:none !important` en sombre.
        style={{ display: 'inline', margin: '0 auto' }}
      />
      <Img
        src={DARK_LOGO}
        alt="ShemaProject"
        width="56"
        height="56"
        className="logo-dark mx-auto"
        // `display:none` = base claire ; la media query pose `display:inline !important` en sombre.
        style={{ display: 'none', margin: '0 auto' }}
      />
    </>
  );
}