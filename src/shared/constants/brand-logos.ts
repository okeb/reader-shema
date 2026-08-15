import type { AppIconKey } from '@/src/shared/constants/reader-preferences';

/**
 * Logos marque « icône » colorés (spec 32 §5.5) — 5 déclinaisons (or, laine, pelouse, plume,
 * sable) servies depuis `public/logo/`. Source unique keyée : la préférence `appIcon`
 * (`reader-preferences.ts`) référence ces `key`, et `appIconPath()` résout la clé en chemin.
 *
 * Un logo est tiré au hasard parmi cette liste pour :
 *
 *  - le **favicon** applicatif — via la route dynamique `app/brand-icon/route.ts` (un PNG
 *    différent à chaque requête navigateur, `Cache-Control: no-store`), sauf si l'utilisateur a
 *    choisi une variante (`?icon=<key>`) ;
 *  - l'**icône du bloc marque de l'accueil** (`o-home.tsx`) — tirage côté client après hydratation
 *    quand `appIcon === 'auto'`, sinon variante choisie ;
 *  - la **topbar du reader** (`o-reader-topbar.tsx`) — variante choisie quand `appIcon !== 'auto'`.
 *
 * Cf. aussi `lib/email/components/email-header-logo.tsx` qui dérive les URLs absolues
 * (`NEXT_PUBLIC_APP_URL`) pour les e-mails — même set, rendu une seule fois côté serveur.
 *
 * Dimensions natives : 1254 × 1254 (carré).
 */
export const BRAND_ICONS = [
  { key: 'or', path: '/logo/reader-shema_logo_or.png' },
  { key: 'laine', path: '/logo/reader-shema_logo_laine.png' },
  { key: 'pelouse', path: '/logo/reader-shema_logo_pelouse.png' },
  { key: 'plume', path: '/logo/reader-shema_logo_plume.png' },
  { key: 'sable', path: '/logo/reader-shema_logo_sable.png' },
] as const;

/** Tableau des chemins (ordre canonique) — utilisé par le tirage aléatoire (o-home, route). */
export const BRAND_ICON_LOGOS: readonly string[] = BRAND_ICONS.map((b) => b.path);

/**
 * Résout une clé `appIcon` en chemin public. Retourne `null` pour `'auto'` (tirage aléatoire
 * géré par l'appelant). Toute clé nommée inconnue retombe aussi sur `null` (robustesse).
 */
export function appIconPath(key: AppIconKey): string | null {
  if (key === 'auto') return null;
  return BRAND_ICONS.find((b) => b.key === key)?.path ?? null;
}