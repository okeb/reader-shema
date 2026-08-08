import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  // Secrets serveur — première dépendance serveur runtime du projet (spec 22 → spec 26) :
  // auth (self-hosted Better Auth) + base de données (Neon Postgres) pour la sync E2EE +
  // e-mails transactionnels (Resend). Optionnels : tant qu'ils ne sont pas renseignés,
  // l'app démarre en mode local-only (lecture anonyme inchangée) et les fonctionnalités
  // compte/sync/email restent désactivées.
  server: {
    // Better Auth auto-hébergé (spec 26) — remplace NEON_AUTH_BASE_URL / NEON_AUTH_COOKIE_SECRET.
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    BETTER_AUTH_URL: z.string().url().optional(),
    DATABASE_URL: z.string().url().optional(),
    RESEND_API_KEY: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  },
  runtimeEnv: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  // Valeurs par défaut appliquées côté client quand la var d'env n'est pas définie.
  // (createEnv n'accepte pas de default dans le schema zod pour les NEXT_PUBLIC_*,
  // on passe donc par un .env.local à la racine.)
});