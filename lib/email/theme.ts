/**
 * Palette + typographies des e-mails transactionnels (spec 32 §5.5) — **version Tailwind (hybride)**.
 *
 * `@react-email/tailwind@2.0.7` inline les classes utilitaires de base (layout, spacing, typo,
 * couleurs clair) en attributs `style="…"` — fiables sur tous les clients, même ceux qui stripent
 * `<style>`. **Mais** cette version ne sait pas générer un bloc `<style>` pour les media queries
 * `dark:` : elle inline la variante sombre comme base (bug — `isRuleInlinable` ne remonte pas aux
 * ancêtres `@media`). La variante `dark:` est donc **inutilisable** ici.
 *
 * → Le dark mode reste piloté par un **mini bloc `<style>` manuel** (`DARK_STYLE` ci-dessous) avec
 * `@media (prefers-color-scheme: dark)` + classes `dm-*` + `!important`. Tailwind gère le clair et
 * toute la mise en page ; le sombre est une surcharge bornée et centralisée. C'est aussi ce que la
 * doc react-email recommande en pratique pour le dark mode.
 *
 * **Thème = celui du projet** (`app/styles/base/globals.scss`, HSL → hex) :
 *  - clair : fond `#fcfcfc`, encre chaude `#3f3e3b`, muted `#6b7280`, bord `#e8e9ec`.
 *  - sombre : fond `#090909`, encre `#d8d3c5`, muted `#98a1ad`, bord `#1f2937`.
 *
 * **Accent** `#f76808` = signature de marque spec 32 §2 (orange, **identique dans les 2 thèmes**).
 *
 * **Typo** : DM Sans (web-font variable, 1 woff2) pour les gros titres + le CTA ; corps en stack
 * système (pas de web-font pour le corps — fiabilité maximale sur tous les clients).
 */

const FONTS = {
  title: [
    "'DM Sans'",
    '-apple-system',
    'BlinkMacSystemFont',
    "'Segoe UI'",
    'Roboto',
    'Arial',
    'sans-serif',
  ],
  body: [
    '-apple-system',
    'BlinkMacSystemFont',
    "'Segoe UI'",
    'Roboto',
    'Helvetica',
    'Arial',
    'sans-serif',
  ],
  mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
} as const;

/**
 * Config Tailwind **local aux e-mails** (passé au composant `<Tailwind>`).
 * Ne touche pas au `tailwind.config.ts` du web. `darkMode: 'media'` est laissé pour l'avenir mais
 * les variantes `dark:` ne sont pas utilisées (bug d'inlining de `@react-email/tailwind@2.0.7`).
 */
export const emailTailwindConfig = {
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // Foreground (encre) — clair inline par Tailwind, sombre via .dm-fg
        ink: '#3f3e3b',
        // Background (fond) — clair inline par Tailwind, sombre via body/td (DARK_STYLE)
        paper: '#fcfcfc',
        // Muted (notes, rappels) — clair inline, sombre via .dm-muted
        muted: '#6b7280',
        // Border — clair inline, sombre via .dm-border
        line: '#e8e9ec',
        // Bloc <code> — clair inline, sombre via .dm-code-bg / .dm-border
        code: '#f4f4f6',
        // Accent de marque (orange, identique clair/sombre — pas d'override sombre)
        accent: '#f76808',
      },
      fontFamily: {
        title: FONTS.title,
        body: FONTS.body,
        mono: FONTS.mono,
      },
    },
  },
} as const;

/**
 * Bloc dark mode — surcharge `@media (prefers-color-scheme: dark)` avec `!important` pour battre
 * l'inline clair. Les classes `dm-*` sont posées à côté des classes Tailwind sur chaque élément.
 *
 * `body > table > tbody > tr > td` cible le `<td>` interne qu'`<Body>` crée en copiant le `style`
 * (sans lui passer le `className`) — sans ce ciblage, le fond clair reste sur ce td en sombre
 * (cause du bug « reste clair » de l'itération précédente). Sélecteur structurel stable, et le
 * dark mode n'est actif que sur Apple Mail/iOS qui le supportent (Gmail strippe `<style>`,
 * Outlook desktop ignore `prefers-color-scheme` → fallback clair attendu, §8).
 */
export const DARK_STYLE = `@media (prefers-color-scheme: dark) {
  body { background-color: #090909 !important; }
  body > table > tbody > tr > td { background-color: #090909 !important; }
  .dm-fg { color: #d8d3c5 !important; }
  .dm-muted { color: #98a1ad !important; }
  .dm-border { border-color: #1f2937 !important; }
  .dm-code-bg { background-color: #161616 !important; }
  .dm-footer-bg { background-color: #1e1d1c !important; }
  .logo-light { display: none !important; }
  .logo-dark { display: inline !important; }
}`;

/** Classes partagées du corps de texte (paragraphe standard des templates). */
export const BODY_TEXT =
  'text-ink dm-fg text-[17px] leading-[1.5] mb-4';

/** Classes partagées d'une ligne muted (note, rappel). */
export const MUTED_TEXT =
  'text-muted dm-muted text-[14px] leading-[1.5] mb-3';

/** Classes partagées du bloc `<code>` (clé de récupération). */
export const CODE_BLOCK =
  'text-ink dm-fg font-mono text-[15px] tracking-[0.5px] bg-code dm-code-bg border border-line dm-border rounded-lg px-4 py-3.5 break-all mb-4';