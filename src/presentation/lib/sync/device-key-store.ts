'use client';

/**
 * Store du DEK « se souvenir de cet appareil » — spec 28.
 *
 * Persiste le DEK (`CryptoKey` non-extractable à steady state) côté appareil dans IndexedDB, clé par
 * `userId`, avec une expiration (30 j par défaut). Au rechargement, si une entrée valide existe, on
 * restaure le DEK en mémoire (`useCryptoSession.setMasterKey`) sans redemander le mot de passe.
 *
 * Pourquoi IndexedDB (pas localStorage) : un `CryptoKey` est structured-cloneable et se stocke dans
 * IndexedDB tout en restant non-extractable — pas d'octets bruts sur disque, contrairement à une
 * base64 en localStorage. Le compromis friction/sécurité est assumé (opt-in) : quiconque accède à
 * l'appareil peut utiliser le DEK tant qu'il est valide, mais ne l'exfiltre pas en octets.
 *
 * Opt-in : l'entrée n'est créée que si l'utilisateur coche « se souvenir de cet appareil » à
 * l'étape `unlock-password` / `unlock-recovery`. Elle est purgée au signOut / suppression de compte.
 */

const DB_NAME = 'bym:device-keys';
const STORE_NAME = 'deks';
const DB_VERSION = 1;

/** Durée de vie par défaut d'un DEK persisté sur l'appareil (30 jours). */
export const DEVICE_DEK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface StoredDek {
  dek: CryptoKey;
  expiresAt: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null); // stockage indisponible → mode sans souvenir
  });
  return dbPromise;
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

/**
 * Persiste le DEK pour `userId` avec une expiration `ttlMs` (défaut 30 j).
 * Best-effort : échoue silencieusement si IndexedDB n'est pas disponible.
 */
export async function storeDeviceDek(
  userId: string,
  dek: CryptoKey,
  ttlMs: number = DEVICE_DEK_TTL_MS,
): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const entry: StoredDek = { dek, expiresAt: Date.now() + ttlMs };
  await new Promise<void>((resolve) => {
    const req = tx(db, 'readwrite').put(entry, userId);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}

/**
 * Charge le DEK persisté pour `userId` s'il est encore valide (non expiré).
 * @returns le `CryptoKey`, ou `null` si absent / expiré / stockage indisponible. Les entrées
 *          expirées sont purgées au passage.
 */
export async function loadDeviceDek(userId: string): Promise<CryptoKey | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise<CryptoKey | null>((resolve) => {
    const req = tx(db, 'readonly').get(userId);
    req.onsuccess = () => {
      const entry = req.result as StoredDek | undefined;
      if (!entry || !entry.dek) return resolve(null);
      if (Date.now() >= entry.expiresAt) {
        // Expiré : on purge et considère comme absent.
        const del = tx(db, 'readwrite').delete(userId);
        del.onsuccess = () => resolve(null);
        del.onerror = () => resolve(null);
        return;
      }
      resolve(entry.dek);
    };
    req.onerror = () => resolve(null);
  });
}

/** Purge le DEK persisté pour `userId` (au signOut / suppression de compte). Best-effort. */
export async function clearDeviceDek(userId: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const req = tx(db, 'readwrite').delete(userId);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}