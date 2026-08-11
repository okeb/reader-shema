import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'fr'],
  defaultLocale: 'fr',
  // Préfixe de locale toujours présent (y compris pour la locale par défaut).
  localePrefix: 'always',
  pathnames: {
    '/read': { en: '/read', fr: '/read' },
    // Fiche détail d'un numéro Strong (spec 29) — identique dans les deux locales ; `[code]` n'est
    // pas énumérable, donc pas de `generateStaticParams` (dynamicParams = true par défaut).
    '/strong/[code]': { en: '/strong/[code]', fr: '/strong/[code]' },
    '/accueil': { en: '/home', fr: '/accueil' },
    '/favoris': { en: '/favorites', fr: '/favoris' },
    '/a-propos': { en: '/about', fr: '/a-propos' },
    '/confidentialite': { en: '/privacy', fr: '/confidentialite' },
    '/credits': { en: '/credits', fr: '/credits' },
    '/mentions-legales': { en: '/legal-notice', fr: '/mentions-legales' },
    '/nouveautes': { en: '/changelog', fr: '/nouveautes' },
    // /account reste identique dans les deux locales : le proxy (proxy.ts) matche le chemin
    // sans locale (`pathWithoutLocale(...).startsWith('/account)`) pour le gating auth.
    // Toute traduction (ex. /compte) casserait ce gating — à ne jamais faire. (spec 25)
    '/account': { en: '/account', fr: '/account' },
    // Page publique de réinitialisation de mot de passe (spec 26) — ne PAS l'ajouter à
    // `protectedRoutes` (proxy.ts) : l'utilisateur y arrive SANS session, via le lien mail.
    '/reinitialiser': { en: '/reset-password', fr: '/reinitialiser' },
  },
});

export type Locale = (typeof routing.locales)[number];

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);