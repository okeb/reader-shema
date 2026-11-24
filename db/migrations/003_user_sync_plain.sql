-- Spec 39 — Synchronisation sans chiffrement de bout en bout.
--
-- Nouvelle table des données synchronisées, en clair : une ligne par (utilisateur, kind), le
-- `payload` étant le JSON sérialisé par l'adapter côté client, stocké TEL QUEL (TEXT, pas JSONB :
-- les kinds « ensemble » comparent la chaîne exacte pour décider de republier ; un JSONB
-- normaliserait l'ordre des clés et les espaces → republication sans fin).
--
-- Isolation : `user_id` provient de la session Better Auth (`requireUser()`), le route handler est
-- le seul writer. Chiffrement au repos assuré par l'hébergeur (Neon), transport en TLS.
--
-- L'ancienne table `user_data` (blobs E2EE, spec 22/28) est GELÉE : lecture + suppression
-- seulement (`/api/sync/legacy`), le temps que les appareils la convertissent. Elle sera supprimée
-- le 2027-06-01 (`DROP TABLE user_data`, migration 004).
--
-- À appliquer AVANT le déploiement du code de la spec 39 (additive, sans risque).

CREATE TABLE IF NOT EXISTS user_sync (
  user_id        TEXT    NOT NULL,
  kind           TEXT    NOT NULL,
  payload        TEXT    NOT NULL,
  updated_at     BIGINT  NOT NULL,
  schema_version INT     NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, kind)
);

CREATE INDEX IF NOT EXISTS user_sync_user_id_idx ON user_sync (user_id);
