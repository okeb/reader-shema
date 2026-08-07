-- Spec 22 — Compte, synchronisation multi-appareil & administration (Phase 1+2)
--
-- Table applicative des blobs de sync E2EE. Vit à côté du schéma `neon_auth`
-- (géré par Neon Managed Better Auth) dans la même base Postgres.
--
-- Une ligne par (utilisateur, kind). Le serveur ne stocke que des blobs opaques :
-- ciphertext + nonce (AES-GCM côté client) + horodatage LWW. Jamais de clé, jamais
-- de recovery key, jamais de clair. `user_id` provient de la session Neon
-- (`session.user.id`) — le route handler est le seul writer, scopé par session.
--
-- Isolation : pas de FK vers `neon_auth.users` (schéma managé, non garanti stable) ;
-- l'isolation repose sur `user_id` issu de la session. La suppression de compte
-- (DELETE /api/account) purge les lignes de l'utilisateur avant déconnexion.
--
-- Région : la base est provisionnée dans la région UE retenue en console Neon
-- (documentée côté légal). À confirmer au provisionnement.

CREATE TABLE IF NOT EXISTS user_data (
  user_id        TEXT       NOT NULL,
  kind           TEXT       NOT NULL,
  ciphertext     BYTEA      NOT NULL,
  nonce          BYTEA      NOT NULL,
  updated_at     BIGINT     NOT NULL,
  schema_version INT        NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, kind)
);

-- Accélère le pull-all (filtrage par utilisateur).
CREATE INDEX IF NOT EXISTS user_data_user_id_idx ON user_data (user_id);