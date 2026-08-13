import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { BRAND_ICON_LOGOS } from '@/src/shared/constants/brand-logos';

/**
 * Favicon applicatif **aléatoire** (spec 32 §5.5) — servit un PNG différent parmi les 5
 * déclinaisons colorées (or, laine, pelouse, plume, sable) à **chaque requête navigateur**.
 *
 * Pourquoi une route dynamique plutôt que `metadata.icons` avec un tirage dans `generateMetadata` :
 * le layout localisé est rendu statiquement par locale (`setRequestLocale`), donc un
 * `Math.random()` dans `generateMetadata` serait figé au build (un seul logo par locale jusqu'au
 * prochain déploiement). Une route `force-dynamic` + `Cache-Control: no-store` tire vraiment au
 * hasard à chaque hit.
 *
 * Les 5 PNG (1254 × 1254, ~2,7 Mo chacun) sont lus une seule fois au chargement du module et
 * conservés en mémoire — pas de lecture disque par requête.
 *
 * `metadata.icons.icon` (`app/[locale]/layout.tsx`) pointe vers `/brand-icon`.
 */
export const dynamic = 'force-dynamic';

const buffers = await Promise.all(
  BRAND_ICON_LOGOS.map((p) =>
    readFile(path.join(process.cwd(), 'public', p.slice(1))),
  ),
);

export async function GET() {
  const i = Math.floor(Math.random() * buffers.length);
  return new NextResponse(buffers[i], {
    headers: {
      'Content-Type': 'image/png',
      // Le navigateur doit re-demander l'icône pour obtenir une variante différente.
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}