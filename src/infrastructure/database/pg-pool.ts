import { Pool } from 'pg';
import { env } from '@/env.mjs';

/**
 * Pool Postgres (`pg`) pour les tables d'auth Better Auth (spec 26).
 *
 * Better Auth 1.4.18 attend un pool Kysely `PostgresDialect` mais duck-type à l'exécution
 * tout objet possédant `connect` — un `pg.Pool` convient (cf. `better-auth/adapters/kysely-adapter/
 * dialect.mjs`). On lui passe donc directement le pool (cast `as any` si TS râle sur le type).
 *
 * Partage la même `DATABASE_URL` que `neon-client.ts`, mais celle-ci DOIT être l'endpoint
 * Neon **pooled** (`-pooler`) : `pg.Pool` a besoin du pooler PgBouncer, tandis que le driver
 * HTTP `neon()` l'accepte aussi (les deux chemins cohabitent, même base, schéma `public`).
 *
 * `isDbConfigured` reste la source unique dans `neon-client.ts` (importé par `auth-guard.ts`).
 */
const configured = Boolean(env.DATABASE_URL);

let _pool: Pool | null = null;

function createPool(): Pool {
  return new Pool({
    connectionString: env.DATABASE_URL,
    // Neon exige TLS ; `rejectUnauthorized: true` est la posture sûre (cert Neon valide).
    ssl: { rejectUnauthorized: true },
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}

export const pool: Pool | null = configured ? createPool() : null;