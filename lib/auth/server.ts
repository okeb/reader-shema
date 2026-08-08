import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { magicLink } from 'better-auth/plugins/magic-link';
import { env } from '@/env.mjs';
import { pool } from '@/src/infrastructure/database/pg-pool';
import { sendEmail } from '@/lib/email/transport';
import {
  verificationEmailHtml,
  resetPasswordEmailHtml,
  magicLinkEmailHtml,
} from '@/lib/email/templates';

/**
 * Instance d'authentification serveur (self-hosted Better Auth) — spec 26.
 *
 * Remplace le wrapper Neon Managed Better Auth : on possède désormais les tables d'auth
 * (`user`, `session`, `account`, `verification`) dans `public`, et on câble `sendEmail`
 * (Resend) pour la vérification d'e-mail, le mot de passe oublié et le lien magique.
 *
 * API Better Auth 1.4.18 (vérifiée contre le package installé) :
 *  - `database` accepte un `pg.Pool` (duck-typé vers Kysely `PostgresDialect`) — d'où le cast.
 *  - `sendResetPassword` est sous `emailAndPassword` (pas de `forgotPassword` top-level).
 *  - `emailVerification` est top-level.
 *  - `nextCookies()` est OBLIGATOIRE en App Router pour propager Set-Cookie via `next/headers`.
 *  - `getSession({ headers })` côté serveur ; `getSessionCookie(req)` pour la gate proxy.
 *
 * `null` tant que Better Auth n'est pas configuré (`BETTER_AUTH_SECRET` + `DATABASE_URL`) :
 * l'app démarre en mode local-only (lecture anonyme inchangée) et les routes/features compte
 * renvoient 503 / sont masquées. Le chiffrage E2EE (recovery key → master key) est INTOUCHÉ.
 */
const configured = Boolean(env.BETTER_AUTH_SECRET && env.DATABASE_URL);

export const isAuthConfigured = configured;

export const auth = configured
  ? betterAuth({
      baseURL: env.BETTER_AUTH_URL,
      secret: env.BETTER_AUTH_SECRET,
      basePath: '/api/auth',
      database: pool as any,
      trustedOrigins: [env.NEXT_PUBLIC_APP_URL],
      emailAndPassword: {
        enabled: true,
        // La data reste gated par la recovery key (E2EE) ; on n'exige pas un e-mail vérifié
        // pour se connecter (Neon pouvait ne pas livrer ; ici Resend livre, mais on garde
        // la porte ouverte pour ne pas enfermer l'utilisateur hors de son compte).
        requireEmailVerification: false,
        minPasswordLength: 8,
        sendResetPassword: async ({ user, url }) => {
          await sendEmail({
            to: user.email,
            subject: 'Réinitialisation de votre mot de passe — ShemaProject',
            html: resetPasswordEmailHtml(url),
          });
        },
      },
      emailVerification: {
        sendVerificationEmail: async ({ user, url }) => {
          await sendEmail({
            to: user.email,
            subject: 'Vérifiez votre e-mail — ShemaProject',
            html: verificationEmailHtml(url),
          });
        },
        autoSignInAfterVerification: true,
        expiresIn: 3600,
      },
      plugins: [
        nextCookies(), // propagation Set-Cookie en App Router (obligatoire)
        magicLink({
          expiresIn: 5 * 60, // 5 min, à usage unique
          sendMagicLink: async ({ email, url }) => {
            await sendEmail({
              to: email,
              subject: 'Votre lien de connexion — ShemaProject',
              html: magicLinkEmailHtml(email, url),
            });
          },
        }),
      ],
    })
  : null;