import { auth } from '@/lib/auth/server';

/**
 * Handler d'API catch-all pour Neon Managed Better Auth — spec 22.
 * Proxie toutes les requêtes d'auth du client (`/api/auth/*`) vers le backend Neon.
 * 503 tant que Neon n'est pas provisionné (mode local-only).
 */
const handler = auth?.handler();

export const GET =
  handler?.GET ??
  (() => new Response('Auth non configuré', { status: 503 }));

export const POST =
  handler?.POST ??
  (() => new Response('Auth non configuré', { status: 503 }));