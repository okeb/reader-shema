'use client';

import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';

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
// `baseURL` volontairement absent : l'API auth vit sur la même origine que l'app, donc Better
// Auth utilise `window.location.origin` (+ préfixe `/api/auth` par défaut). Correct sur tout
// déploiement — alias prod (`reader-shema.vercel.app`), previews (`$VERCEL_URL`) et domaine final
// (`reader.shemaproject.org`) — sans dépendre d'une URL client inline au build. Fixée à
// `NEXT_PUBLIC_APP_URL`, elle pointait sur le domaine de prod même depuis l'alias, cassant l'auth
// navigateur tant que le domaine n'est pas basculé sur ce projet. Miroir du serveur qui dérive son
// `baseURL` de `VERCEL_URL` (lib/auth/server.ts).
export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
});