import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { env } from '@/env.mjs';

/**
 * Client Neon Postgres (server-only) — spec 22 §5.
 *
 * Driver HTTP sans connexion persistante (`@neondatabase/serverless`), utilisé par
 * les routes API de sync (`/api/sync/*`) et de compte (`/api/account`). Lazy singleton
 * : la connexion n'est établie que si `DATABASE_URL` est renseignée. Tant qu'elle
 * est absente, `isDbConfigured()` renvoie `false` et les routes répondent 503
 * (mode local-only, lecteur anonyme inchangé).
 *
 * Jamais importé côté client (driver serveur + secret `DATABASE_URL`).
 */

let sql: NeonQueryFunction<false, false> | null = null;

/** `DATABASE_URL` est-elle renseignée ? (gate des routes sync/account). */
export function isDbConfigured(): boolean {
  return Boolean(env.DATABASE_URL);
}

/** Singleton du query builder Neon. Lève si `DATABASE_URL` est absente. */
export function getSql(): NeonQueryFunction<false, false> {
  if (!sql) {
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL non configuree (neon absent)');
    }
    sql = neon(env.DATABASE_URL);
  }
  return sql;
}

// --- bytea <-> base64 ---------------------------------------------------------
// Le serveur stocke ciphertext/nonce en BYTEA ; le client les échange en base64.

/** Convertit un champ BYTEA (Buffer / Uint8Array) issu de Neon en chaîne base64. */
export function bytesToBase64(bytes: Uint8Array | ArrayBuffer): string {
  return Buffer.from(bytes as Uint8Array).toString('base64');
}

/** Décode une chaîne base64 (client) en Buffer (paramètre BYTEA pour Neon). */
export function base64ToBuffer(b64: string): Buffer {
  return Buffer.from(b64, 'base64');
}