import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  // Pas de secrets serveur pour l'instant — l'API Bible est en lecture seule.
  // L'auth/le compte-sync (spec 22) ajouteront des clés serveur ici.
  server: {},
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  // Valeurs par défaut appliquées côté client quand la var d'env n'est pas définie.
  // (createEnv n'accepte pas de default dans le schema zod pour les NEXT_PUBLIC_*,
  // on passe donc par un .env.local à la racine.)
});