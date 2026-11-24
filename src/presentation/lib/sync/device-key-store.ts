'use client';

/**
 * Clé de l'appareil d'avant la spec 39 (« se souvenir de cet appareil », spec 28) — lecture seule.
 *
 * Jusqu'à la spec 39, le DEK de la sync chiffrée était gardé 30 jours dans IndexedDB
 * (`bym:device-keys`, clé = `userId`). La sync étant désormais en clair, on ne fait plus que le
 * **lire** pour convertir l'archive chiffrée sans rien demander à l'utilisateur, puis le purger.
 * À supprimer le 2027-06-01 avec l'archive.
 */

const DB_NAME = 'bym:device-keys';
const STORE_NAME = 'deks';
const DB_VERSION = 1;

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
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

const store = (db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore =>
  db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);

/**
 * Charge le DEK de l'appareil pour `userId` s'il est encore valide.
 * @returns le `CryptoKey`, ou `null` si absent / expiré / stockage indisponible.
 */
export async function loadDeviceDek(userId: string): Promise<CryptoKey | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise<CryptoKey | null>((resolve) => {
    const req = store(db, 'readonly').get(userId);
    req.onsuccess = () => {
      const entry = req.result as StoredDek | undefined;
      resolve(entry?.dek && Date.now() < entry.expiresAt ? entry.dek : null);
    };
    req.onerror = () => resolve(null);
  });
}

/** Purge le DEK de l'appareil pour `userId`. Best-effort. */
export async function clearDeviceDek(userId: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const req = store(db, 'readwrite').delete(userId);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}
