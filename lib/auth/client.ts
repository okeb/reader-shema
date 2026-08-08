'use client';

import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';
import { env } from '@/env.mjs';

/**
 * Client d'authentification navigateur (self-hosted Better Auth) — spec 26.
 *
 * Remplace `createAuthClient()` du wrapper Neon. Les méthodes consommées par l'UI compte
 * (`useSession`, `signUp.email`, `signIn.email`, `signOut`) restent identiques → les
 * call sites (`m-account-dialog`, `account/page`, `o-account-provider`) ne changent pas.
 *
 * Nouvelles méthodes débloquées par Better Auth raw + Resend :
 *  - `forgetPassword({ email, callbackURL })` → `POST /api/auth/request-password-reset`
 *  - `resetPassword({ newPassword, token })` → `POST /api/auth/reset-password`
 *  - `sendVerificationEmail({ email, callbackURL? })` → `POST /api/auth/send-verification-email`
 *  - `signIn.magicLink({ email, callbackURL })` (plugin `magicLinkClient`)
 *
 * Les requêtes transitent par le handler `/api/auth/[...path]` (`toNextJsHandler`).
 */
export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  plugins: [magicLinkClient()],
});