-- Spec 26 — Migration du wrapper Neon Managed Better Auth vers self-hosted raw Better Auth 1.4.18.
--
-- Tables core Better Auth dans le schéma `public` (casing par défaut = "camel" → colonnes
-- camelCase, quotées). Types : id/strings = text, dates = timestamp, booléens = boolean.
-- Champs confirmés contre `@better-auth/core/dist/db/schema/*.d.mts` (1.4.18).
--
-- PAS de FK vers `user_data` : doctrine d'isolation spec 22 préservée (user_id vient de la
-- session seulement). Les rows `user_data` orphelins de l'ancien compte de test neon_auth
-- restent sans référence — aucun blocage, cleanup optionnel non requis.
--
-- Les anciennes tables `neon_auth.*` (gérées par Neon) ne sont PAS supprimées ici (schéma
-- managé, hors périmètre applicatif) ; elles deviennent orphelines et inutilisées.

CREATE TABLE IF NOT EXISTS "user" (
  "id"            text PRIMARY KEY,
  "createdAt"     timestamp NOT NULL DEFAULT now(),
  "updatedAt"     timestamp NOT NULL DEFAULT now(),
  "email"         text NOT NULL,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "name"          text NOT NULL,
  "image"         text
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_email_unique" ON "user" ("email");

CREATE TABLE IF NOT EXISTS "session" (
  "id"         text PRIMARY KEY,
  "createdAt"  timestamp NOT NULL DEFAULT now(),
  "updatedAt"  timestamp NOT NULL DEFAULT now(),
  "userId"     text NOT NULL,
  "expiresAt"  timestamp NOT NULL,
  "token"      text NOT NULL,
  "ipAddress"  text,
  "userAgent"  text
);
CREATE UNIQUE INDEX IF NOT EXISTS "session_token_unique" ON "session" ("token");
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");

CREATE TABLE IF NOT EXISTS "account" (
  "id"                     text PRIMARY KEY,
  "createdAt"              timestamp NOT NULL DEFAULT now(),
  "updatedAt"              timestamp NOT NULL DEFAULT now(),
  "providerId"             text NOT NULL,
  "accountId"              text NOT NULL,
  "userId"                 text NOT NULL,
  "accessToken"            text,
  "refreshToken"           text,
  "idToken"                text,
  "accessTokenExpiresAt"   timestamp,
  "refreshTokenExpiresAt"  timestamp,
  "scope"                  text,
  "password"               text
);
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");

CREATE TABLE IF NOT EXISTS "verification" (
  "id"         text PRIMARY KEY,
  "createdAt"  timestamp NOT NULL DEFAULT now(),
  "updatedAt"  timestamp NOT NULL DEFAULT now(),
  "value"      text NOT NULL,
  "expiresAt"  timestamp NOT NULL,
  "identifier" text NOT NULL
);
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");