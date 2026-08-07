'use client';

import { createAuthClient } from '@neondatabase/auth/next';

/**
 * Client d'authentification navigateur (Neon Managed Better Auth) — spec 22.
 *
 * Utilisé par l'UI compte (modal) pour les opérations browser : `signIn.email`,
 * `signIn.magicLink`, `signUp.email`, `signOut`, `useSession`. Les requêtes transitent
 * par le handler d'API `/api/auth/[...path]` (proxy serveur vers Neon).
 *
 * @see https://neon.com/docs/auth/quick-start/nextjs-api-only
 */
export const authClient = createAuthClient();