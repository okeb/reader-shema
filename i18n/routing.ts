import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'fr'],
  defaultLocale: 'fr',
  // Préfixe de locale toujours présent (y compris pour la locale par défaut).
  localePrefix: 'always',
  pathnames: {
    '/read': { en: '/read', fr: '/read' },
    '/accueil': { en: '/home', fr: '/accueil' },
    '/favoris': { en: '/favorites', fr: '/favoris' },
    '/a-propos': { en: '/about', fr: '/a-propos' },
    '/confidentialite': { en: '/privacy', fr: '/confidentialite' },
    '/credits': { en: '/credits', fr: '/credits' },
    '/mentions-legales': { en: '/legal-notice', fr: '/mentions-legales' },
    '/nouveautes': { en: '/changelog', fr: '/nouveautes' },
  },
});

export type Locale = (typeof routing.locales)[number];

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);