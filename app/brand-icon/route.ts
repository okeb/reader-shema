import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { BRAND_ICONS } from '@/src/shared/constants/brand-logos';

/**
 * Favicon applicatif (spec 32 §5.5) — servit une des 5 déclinaisons colorées (or, laine, pelouse,
 * plume, sable).
 *
 * - `?icon=<key>` (clé nommée valide) → servit **cette** variante. Utilisé par `FaviconSync` quand
 *   l'utilisateur a choisi une icône (`appIcon !== 'auto'`).
 * - sans paramètre (ou `'auto'`/invalide) → **tirage aléatoire** à chaque requête (comportement
 *   d'origine, surprise).
 *
 * Pourquoi une route dynamique plutôt que `metadata.icons` avec un tirage dans `generateMetadata` :
 * le layout localisé est rendu statiquement par locale (`setRequestLocale`), donc un
 * `Math.random()` dans `generateMetadata` serait figé au build. Une route `force-dynamic` +
 * `Cache-Control: no-store` tire vraiment au hasard à chaque hit, et permet aussi de servir une
 * variante choisie via query param.
 *
 * Les 5 PNG (1254 × 1254) sont lus une seule fois au chargement du module et conservés en mémoire
 * (`byKey` + `buffers`) — pas de lecture disque par requête.
 *
 * `metadata.icons.icon` (`app/[locale]/layout.tsx`) pointe vers `/brand-icon` ; `FaviconSync`
 * ajuste le href en `/brand-icon?icon=<key>` côté client selon la préférence.
 */
export const dynamic = 'force-dynamic';

const entries = await Promise.all(
  BRAND_ICONS.map(async (b) => {
    // `Uint8Array` (et non `Buffer`) : la signature de `NextResponse` attend un `BodyInit`
    // (`BufferSource`), et le `Buffer<ArrayBufferLike>` générique de Node 22 n'est plus
    // assignable à ce type. Copie unique au chargement du module — pas de lecture disque ni de
    // copie par requête.
    const buf = new Uint8Array(await readFile(path.join(process.cwd(), 'public', b.path.slice(1))));
    return [b.key, buf] as const;
  }),
);

/** Buffer par clé nommée (pour `?icon=<key>`). */
const byKey = new Map<string, Uint8Array>(entries);
/** Buffers en ordre canonique (pour le tirage aléatoire). */
const buffers: Uint8Array[] = entries.map(([, buf]) => buf);

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get('icon');
  const chosen = key ? byKey.get(key) : undefined;
  const buf = chosen ?? buffers[Math.floor(Math.random() * buffers.length)]!;
  // Cast : les tableaux typés génériques de TS 5.7 (`Uint8Array<ArrayBufferLike>`) ne matchent
  // plus le `BufferSource` d'undici, mais un `Uint8Array` est un body valide au runtime.
  return new NextResponse(buf as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      // Le navigateur doit re-demander l'icône (variantes aléatoires en mode `auto`).
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}