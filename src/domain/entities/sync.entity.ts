/**
 * Entités de synchronisation (spec 22) — domain layer.
 *
 * Le serveur ne stocke que des blobs opaques : `EncryptedBlob` contient le chiffré
 * (AES-GCM, côté client) + le nonce + l'horodatage LWW. Le serveur ne voit jamais
 * le clair ni la clé.
 */

/** Kinds synchronisés (un blob chiffré par kind, last-write-wins par kind). */
export type SyncKind =
  | 'favorites'
  | 'bookmarkGroups'
  | 'bookmarks'
  | 'notes'
  | 'highlights'
  | 'readingPosition'
  | 'readerPrefs' // opt-in (phase 2)
  | 'themeAccent'; // opt-in (phase 2)

/** Liste des kinds (Phase 1 : favoris + position ; Phase 2 étendra via adaptateurs). */
export const SYNC_KINDS: SyncKind[] = [
  'favorites',
  'readingPosition',
  'bookmarkGroups',
  'bookmarks',
  'notes',
  'highlights',
  'readerPrefs',
  'themeAccent',
];

/** Blob chiffré côté client, stocké tel quel par le serveur. */
export interface EncryptedBlob {
  ciphertext: string; // base64 (AES-GCM)
  nonce: string; // base64 (IV 12 bytes)
  updatedAt: number; // horodatage ms (horloge LWW par kind)
}

/** Carte kind → blob chiffré (résultat du pull-all). */
export type SyncBlobMap = Partial<Record<SyncKind, EncryptedBlob>>;