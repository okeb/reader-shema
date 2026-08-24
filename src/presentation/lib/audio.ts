import { env } from '@/env.mjs';

/**
 * Résout une URL audio relative renvoyée par l'API (ex. "/audios/Gen.1.3.mp3")
 * en URL absolue préfixée par `NEXT_PUBLIC_API_BASE_URL`. Retourne `null` si
 * `rel` est absent (verset sans audio) — l'appelant ne propose alors pas l'écoute.
 *
 * L'audio est agnostique de la version (spec 37) : même narration servie sous
 * `/bym`, `/lsg`… L'URL est donc construite uniquement depuis la base de l'API.
 */
export function resolveAudioUrl(rel?: string): string | null {
  if (!rel) return null;
  const base = env.NEXT_PUBLIC_API_BASE_URL.replace(/\/+$/, '');
  return `${base}${rel.startsWith('/') ? '' : '/'}${rel}`;
}