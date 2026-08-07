import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  // Secrets serveur — première dépendance serveur runtime du projet (spec 22) :
  // auth (Neon Managed Better Auth) + base de données (Neon Postgres) pour la sync E2EE.
  // Optionnels : tant qu'ils ne sont pas renseignés, l'app démarre en mode local-only
  // (lecture anonyme inchangée) et les fonctionnalités compte/sync restent désactivées.
  server: {
    NEON_AUTH_BASE_URL: z.string().url().optional(),
    NEON_AUTH_COOKIE_SECRET: z.string().min(32).optional(),
    DATABASE_URL: z.string().url().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  },
  runtimeEnv: {
    NEON_AUTH_BASE_URL: process.env.NEON_AUTH_BASE_URL,
    NEON_AUTH_COOKIE_SECRET: process.env.NEON_AUTH_COOKIE_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  // Valeurs par défaut appliquées côté client quand la var d'env n'est pas définie.
  // (createEnv n'accepte pas de default dans le schema zod pour les NEXT_PUBLIC_*,
  // on passe donc par un .env.local à la racine.)
});