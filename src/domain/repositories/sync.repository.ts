import type {
  LegacyBlobMap,
  SyncBlob,
  SyncBlobMap,
  SyncKind,
} from '@/src/domain/entities/sync.entity';

/**
 * Repository de synchronisation (spec 22, spec 39) — couche transport.
 *
 * Transporte les `SyncBlob` (JSON en clair) entre le client et les routes `/api/sync/*`, et
 * donne accès en lecture/suppression à l'archive chiffrée d'avant la spec 39.
 */
export interface ISyncRepository {
  /** Tire tous les kinds en un round trip. Vide → `{}`. */
  pullAll(): Promise<SyncBlobMap>;
  /** Tire un kind ; `null` si aucune donnée côté serveur. */
  pullKind(kind: SyncKind): Promise<SyncBlob | null>;
  /** Pousse un kind ; le serveur applique le garde LWW. */
  pushKind(kind: SyncKind, blob: SyncBlob): Promise<{ updatedAt: number }>;
  /** Supprime toutes les données du compte (cloud, archive comprise). */
  deleteAccount(): Promise<void>;
  /** Tire l'archive chiffrée (spec 39 §4.3). Vide → `{}`. */
  pullLegacy(): Promise<LegacyBlobMap>;
  /** Supprime l'archive chiffrée une fois convertie. */
  deleteLegacy(): Promise<void>;
}
