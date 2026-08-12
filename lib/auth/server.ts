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
 * `null` tant que Better Auth n'est pas configuré (`BETTER_AUTH_SECRET` + `DATABASE_URL` +
 * `baseURL`) : l'app démarre en mode local-only (lecture anonyme inchangée) et les
 * routes/features compte renvoient 503 / sont masquées. Le chiffrage E2EE (recovery key →
 * master key) est INTOUCHÉ.
 *
 * Déploiement Vercel : `BETTER_AUTH_URL` (serveur) et `trustedOrigins` sont dérivés de
 * `VERCEL_URL` (injecté par Vercel à chaque déploiement) quand l'env explicite ne couvre pas
 * l'origine servie — typiquement les previews `*.vercel.app`. Côté client, `NEXT_PUBLIC_APP_URL`
 * doit suivre le même principe (scope Vercel Preview = `https://$VERCEL_URL`, Production =
 * domaine fixe) car ce n'est pas dérivable côté serveur.
 */
// `VERCEL_URL` (sans protocole) est posé par Vercel au build + runtime ; absent en local.
const vercelOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
// `baseURL` n'est fixé QUE si `BETTER_AUTH_URL` est explicite (dev local). Sur Vercel on ne le
// fixe pas : Better Auth le déduit de la requête (origin servie = alias `reader-shema.vercel.app`,
// preview `$VERCEL_URL`, ou domaine final `reader.shemaproject.org`) → `trustedOrigins` englobe
// l'origin servie sur TOUT déploiement sans rien hardcoder. Fixait-on `baseURL` à `VERCEL_URL`
// (l'URL du déploiement *spécifique*), l'origin de l'alias n'était jamais trustée → « invalid
// origin ». Miroir du client (`lib/auth/client.ts`) qui n'a pas de `baseURL` non plus.
const baseURL = env.BETTER_AUTH_URL;

// `configured` reste vrai sur Vercel via `vercelOrigin` (téoin de déploiement Vercel) même si
// `baseURL` est laissé à la déduction par requête.
const configured = Boolean(
  env.BETTER_AUTH_SECRET && env.DATABASE_URL && (baseURL || vercelOrigin),
);

export const isAuthConfigured = configured;

export const auth = configured
  ? betterAuth({
      baseURL,
      secret: env.BETTER_AUTH_SECRET,
      basePath: '/api/auth',
      database: pool as any,
      // Complète l'origin auto-déduite du baseURL (requête servie) : domaine de prod explicite
      // (`NEXT_PUBLIC_APP_URL`) + origin preview Vercel dérivée. L'origin servie est déjà trustée
      // via le baseURL déduit de la requête, donc couvre alias/previews/domaine sans hardcodage.
      trustedOrigins: [
        env.NEXT_PUBLIC_APP_URL,
        ...(vercelOrigin ? [vercelOrigin] : []),
      ],
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