/**
 * Entités de synchronisation (spec 22, spec 39) — domain layer.
 *
 * Depuis la spec 39, la sync n'est plus chiffrée de bout en bout : chaque kind est un
 * `SyncBlob` dont le `payload` est le JSON sérialisé par l'adapter, stocké tel quel par le
 * serveur (table `user_sync`), avec son horodatage LWW.
 *
 * L'ancienne archive chiffrée (table `user_data`, spec 22/28) n'est plus que lue, le temps de
 * la convertir : `LegacyEncryptedBlob` / `LegacyBlobMap`. À retirer le 2027-06-01.
 */

/** Kinds synchronisés (un blob par kind, last-write-wins par kind). */
export type SyncKind =
  | 'favorites'
  | 'bookmarkGroups'
  | 'bookmarks'
  | 'notes'
  | 'highlights'
  | 'readingPosition'
  | 'readerPrefs' // opt-in (phase 2)
  | 'themeAccent' // opt-in (phase 2)
  | 'history'; // historique de navigation (fusion par id au pull — pas de replace pur)

/** Liste des kinds acceptés par l'API. */
export const SYNC_KINDS: SyncKind[] = [
  'favorites',
  'readingPosition',
  'bookmarkGroups',
  'bookmarks',
  'notes',
  'highlights',
  'readerPrefs',
  'themeAccent',
  'history',
];

/** Blob synchronisé : JSON sérialisé par l'adapter + horloge LWW. */
export interface SyncBlob {
  payload: string;
  updatedAt: number; // horodatage ms (horloge LWW par kind)
}

/** Carte kind → blob (résultat du pull-all). */
export type SyncBlobMap = Partial<Record<SyncKind, SyncBlob>>;

// --- Archive chiffrée (spec 22/28) — lecture seule, spec 39 §4.3 -------------------

/** Kinds de l'archive : données + enveloppe DEK/KEK (spec 28). */
export type LegacyKind = SyncKind | 'keyEnvelope';

/** Blob chiffré (AES-GCM côté client) de l'archive `user_data`. */
export interface LegacyEncryptedBlob {
  ciphertext: string; // base64
  nonce: string; // base64 (IV 12 octets)
  updatedAt: number;
}

/** Carte kind → blob chiffré de l'archive. */
export type LegacyBlobMap = Partial<Record<LegacyKind, LegacyEncryptedBlob>>;
