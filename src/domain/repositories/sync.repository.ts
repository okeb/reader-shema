import type { EncryptedBlob, SyncBlobMap, SyncKind } from '@/src/domain/entities/sync.entity';

/**
 * Repository de synchronisation (spec 22) — couche transport des blobs opaques.
 *
 * Le repository ne déchiffre jamais : il ne fait que transporter des `EncryptedBlob`
 * entre le client et les routes `/api/sync/*`. Le chiffrement/déchiffrement est la
 * responsabilité du moteur de sync (presentation) via `crypto.service` (infrastructure).
 */
export interface ISyncRepository {
  /** Tire tous les kinds en un round trip (au login). Vide → `{}`. */
  pullAll(): Promise<SyncBlobMap>;
  /** Tire un kind ; `null` si aucune donnée côté serveur. */
  pullKind(kind: SyncKind): Promise<EncryptedBlob | null>;
  /** Pousse un kind ; le serveur applique le garde LWW. */
  pushKind(kind: SyncKind, blob: EncryptedBlob): Promise<{ updatedAt: number }>;
  /** Supprime toutes les données du compte (cloud). */
  deleteAccount(): Promise<void>;
}