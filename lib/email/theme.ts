/**
 * Palette + typographies des e-mails transactionnels (spec 32 §5.5).
 *
 * **Thème = celui du projet** (`app/styles/base/globals.scss`, converti HSL → hex) :
 *  - clair : fond `#fcfcfc`, encre chaude `#3f3e3b`, muted `#6b7280`, bord `#e8e9ec`.
 *  - sombre (surcharge `@media` dans `email-shell`) : fond `#090909`, encre `#d8d3c5`,
 *    muted `#98a1ad`, bord `#1f2937`.
 * Le mail est **à plat sur le fond du projet** (pas de carte distincte) — conformément à la
 * reprise du modèle « Skin » sans son fond bordeaux.
 *
 * **Accent** `#f76808` = signature de marque spec 32 §2 (orange, identique dans les 2 thèmes).
 *
 * **Typo** : DM Sans (web-font variable, 1 woff2) pour les gros titres + le CTA ; corps en stack
 * système (pas de web-font pour le corps — fiabilité maximale sur tous les clients).
 */

export const EMAIL = {
  bg: '#fcfcfc',
  fg: '#3f3e3b',
  muted: '#6b7280',
  border: '#e8e9ec',
  codeBg: '#f4f4f6',
  accent: '#f76808',
  bodyFont:
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  titleFont:
    "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif",
} as const;

/** Style inline partagé du corps de texte (paragraphe standard des templates). */
export const BODY_TEXT = {
  color: EMAIL.fg,
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 16px',
} as const;

/** Style inline partagé d'une ligne muted (note, rappel). */
export const MUTED_TEXT = {
  color: EMAIL.muted,
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '0 0 12px',
} as const;

/** Style inline partagé du bloc `<code>` (clé de récupération). */
export const CODE_BLOCK = {
  color: EMAIL.fg,
  fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
  fontSize: '15px',
  letterSpacing: '0.5px',
  background: EMAIL.codeBg,
  border: `1px solid ${EMAIL.border}`,
  borderRadius: '8px',
  padding: '14px 16px',
  wordBreak: 'break-all',
  margin: '0 0 16px',
} as const;