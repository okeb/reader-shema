/**
 * Logos marque « icône » colorés (spec 32 §5.5) — 5 déclinaisons (or, laine, pelouse, plume,
 * sable) servies depuis `public/logo/`. Un logo est tiré au hasard parmi cette liste pour :
 *
 *  - le **favicon** applicatif — via la route dynamique `app/brand-icon/route.ts` (un PNG
 *    différent à chaque requête navigateur, `Cache-Control: no-store`) ;
 *  - l'**icône du bloc marque de l'accueil** (`o-home.tsx`) — tirage côté client après hydratation
 *    (déterministe pendant l'hydratation pour éviter le mismatch, swap aléatoire au montage).
 *
 * Cf. aussi `lib/email/components/email-header-logo.tsx` qui dérive les URLs absolues
 * (`NEXT_PUBLIC_APP_URL`) pour les e-mails — même set, rendu une seule fois côté serveur.
 *
 * Dimensions natives : 1254 × 1254 (carré).
 */
export const BRAND_ICON_LOGOS = [
  '/logo/reader-shema_logo_or.png',
  '/logo/reader-shema_logo_laine.png',
  '/logo/reader-shema_logo_pelouse.png',
  '/logo/reader-shema_logo_plume.png',
  '/logo/reader-shema_logo_sable.png',
] as const;