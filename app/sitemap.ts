import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { SITE, INFO_LINKS } from '@/src/shared/constants/legal';

/**
 * Sitemap indexé par locale (`fr` / `en`), chemins localisés via `routing.pathnames` (spec 15).
 * Inclut l'accueil, le lecteur, les favoris et les pages informationnelles (+ nouveautés). Chaque
 * entrée pointe vers la variante localisée canonique (`/${locale}${chemin localisé}`).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  // Clés de chemin non localisées → chemins localisés via `routing.pathnames`.
  const pathKeys = [
    '/accueil',
    '/read',
    '/favoris',
    ...INFO_LINKS.map((l) => l.href),
    '/nouveautes',
  ] as const;

  const entries: MetadataRoute.Sitemap = [];
  for (const locale of routing.locales) {
    for (const key of pathKeys) {
      const localized = routing.pathnames[key as keyof typeof routing.pathnames][locale];
      entries.push({
        url: `${SITE.url}/${locale}${localized}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: key === '/accueil' ? 1 : 0.6,
      });
    }
  }
  return entries;
}