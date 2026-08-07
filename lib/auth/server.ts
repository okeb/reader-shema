import { createNeonAuth, type NeonAuth } from '@neondatabase/auth/next/server';
import { env } from '@/env.mjs';

/**
 * Instance d'authentification serveur (Neon Managed Better Auth) — spec 22.
 *
 * Unique point d'accès aux méthodes serveur Better Auth (`getSession`, `signIn`, `signUp`,
 * `signOut`), au handler d'API routes (`auth.handler()`) et au middleware de protection
 * (`auth.middleware()`). Les variables sont serveur-only (jamais exposées au client).
 *
 * `null` tant que Neon n'est pas provisionné : l'app démarre alors en mode local-only
 * (lecture anonyme inchangée) et les routes/feature compte renvoient 503 / sont masquées.
 *
 * @see https://neon.com/docs/auth/quick-start/nextjs-api-only
 */
const configured = Boolean(env.NEON_AUTH_BASE_URL && env.NEON_AUTH_COOKIE_SECRET);

export const isAuthConfigured = configured;

export const auth: NeonAuth | null = configured
  ? createNeonAuth({
      baseUrl: env.NEON_AUTH_BASE_URL as string,
      cookies: { secret: env.NEON_AUTH_COOKIE_SECRET as string },
    })
  : null;