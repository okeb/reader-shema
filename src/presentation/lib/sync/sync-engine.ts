'use client';

import { configureContainer, getCqrsBus } from '@/src/infrastructure/di/container';
import type { ICommandResult } from '@/src/domain/use-cases/base.command.interface';
import type { IQueryResult } from '@/src/domain/use-cases/base.query.interface';
import type { EncryptedBlob, SyncBlobMap, SyncKind } from '@/src/domain/entities/sync.entity';
import { PullAllSyncQuery } from '@/src/application/queries/sync/queries';
import { PushSyncCommand, DeleteAccountCommand } from '@/src/application/commands/sync/commands';
import {
  NotAuthenticatedError,
  AuthNotConfiguredError,
} from '@/src/infrastructure/repositories/sync.repository.impl';
import { encryptBlob, decryptBlob } from '@/src/infrastructure/crypto/crypto.service';
import { useCryptoSession } from '@/src/presentation/stores/crypto-session.store';
import { useSyncMeta } from '@/src/presentation/stores/sync-meta.store';
import { useSyncQueue } from '@/src/presentation/stores/sync-queue.store';
import { useAccount } from '@/src/presentation/stores/account.store';
import { syncAdapters } from './sync-adapters';

/**
 * Moteur de synchronisation — spec 22 §4.
 *
 * Orchestre le pull (déchiffrement + fusion LWW + hydratation des stores), le push
 * (sérialisation + chiffrement + commande) et la migration du local vers le cloud
 * au premier login. La master key vient de `useCryptoSession` (en mémoire seule) ;
 * sans elle, le moteur est inerte (pas de sync, pas de perte de données).
 *
 * File offline : `notifyLocalChange` enfile le kind sale + planifie un `flush`
 * debouncé. Le flush se déclenche aussi sur `online` / `visibilitychange` (hidden).
 */

const FLUSH_DEBOUNCE_MS = 2000;

let configured = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
/** Supprime l'écho : quand on hydrate depuis le cloud, on ne renfile pas la modif. */
let suppress = false;

function ensureConfigured(): void {
  if (!configured) {
    configureContainer();
    configured = true;
  }
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

/** Un kind opt-in (réglages) n'est actif que si l'utilisateur a opté pour la sync des réglages. */
function isKindActive(kind: SyncKind): boolean {
  const adapter = syncAdapters[kind];
  if (!adapter) return false;
  if (adapter.optIn) return useAccount.getState().settingsSyncOptIn;
  return true;
}

/** Sera appelé par `sync-subscribers` quand un store syncé mute. */
export function notifyLocalChange(kind: SyncKind): void {
  if (suppress) return; // hydratation depuis le cloud → pas d'écho-push
  if (!isKindActive(kind)) return;
  useSyncMeta.getState().bump(kind);
  useSyncQueue.getState().enqueue(kind);
  scheduleFlush();
}

function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_DEBOUNCE_MS);
}

// --- push ----------------------------------------------------------------------

async function pushKind(kind: SyncKind): Promise<void> {
  const adapter = syncAdapters[kind];
  if (!adapter || !isKindActive(kind)) return;
  const masterKey = useCryptoSession.getState().masterKey;
  if (!masterKey) return; // verrouillé : on garde en file, on réessaiera au déblocage

  const plaintext = adapter.serialize();
  const { ciphertext, nonce } = await encryptBlob(masterKey, plaintext);
  const updatedAt = useSyncMeta.getState().get(kind);
  const blob: EncryptedBlob = { ciphertext, nonce, updatedAt };

  const bus = getCqrsBus();
  const res = await bus.executeCommand<ICommandResult<{ updatedAt: number }>>(
    new PushSyncCommand(kind, blob),
  );
  // Le serveur renvoie l'horodatage retenu (LWW) — on aligne l'horloge locale.
  useSyncMeta.getState().set(kind, res.data.updatedAt);
  useSyncQueue.getState().markPushed(kind);
}

/** Pousse tous les kinds en attente (file offline). */
export async function flush(): Promise<void> {
  ensureConfigured();
  if (!isOnline()) return;
  if (!useCryptoSession.getState().unlocked) return;

  const pending = [...useSyncQueue.getState().pending];
  for (const kind of pending) {
    try {
      await pushKind(kind);
    } catch (err) {
      if (err instanceof NotAuthenticatedError || err instanceof AuthNotConfiguredError) {
        // Pas de compte / Neon absent : on garde la file, mode local-only silencieux.
        return;
      }
      // Erreur transitoire (réseau) : on laisse en file pour le prochain flush.
      console.warn(`sync: echec push ${kind}`, err);
    }
  }
}

// --- pull ----------------------------------------------------------------------

/**
 * Tire tous les kinds, déchiffre et hydrate les stores quand le remote est plus
 * récent que l'horloge LWW locale. À appeler au déblocage (recovery key saisie)
 * et au retour en ligne.
 */
export async function pullAndMerge(): Promise<void> {
  ensureConfigured();
  const masterKey = useCryptoSession.getState().masterKey;
  if (!masterKey) return;

  const bus = getCqrsBus();
  let remoteMap;
  try {
    const res = await bus.executeQuery<IQueryResult<SyncBlobMap>>(new PullAllSyncQuery());
    remoteMap = res.data ?? {};
  } catch (err) {
    if (err instanceof NotAuthenticatedError || err instanceof AuthNotConfiguredError) return;
    console.warn('sync: echec pull', err);
    return;
  }

  suppress = true;
  try {
    for (const kindStr of Object.keys(remoteMap)) {
      const kind = kindStr as SyncKind;
      const adapter = syncAdapters[kind];
      const remote = remoteMap[kind];
      if (!adapter || !remote || !isKindActive(kind)) continue;

      const localTs = useSyncMeta.getState().get(kind);
      if (remote.updatedAt > localTs) {
        try {
          const plaintext = await decryptBlob(masterKey, remote.ciphertext, remote.nonce);
          const parsed = plaintext ? JSON.parse(plaintext) : null;
          adapter.hydrate(parsed);
          useSyncMeta.getState().set(kind, remote.updatedAt);
        } catch (err) {
          // Clé incorrecte ou blob corrompu : on garde le local, on ne plante pas.
          console.warn(`sync: echec decrypt ${kind}`, err);
        }
      }
    }
  } finally {
    suppress = false;
  }
}

// --- suppression du compte cloud ----------------------------------------------

/**
 * Supprime toutes les données cloud du compte — spec 22 §5.
 *
 * Exécute `DELETE /api/account` (purge des blobs `user_data`), verrouille la master
 * key et vide l'horloge + la file de sync locales. La fermeture de l'identité Neon
 * (signOut) est laissée à l'UI appelante. En cas de compte non configuré ou non
 * authentifié, l'appel est silencieux (mode local-only).
 */
export async function deleteAccount(): Promise<void> {
  ensureConfigured();
  const bus = getCqrsBus();
  try {
    await bus.executeCommand<ICommandResult<void>>(new DeleteAccountCommand());
  } catch (err) {
    if (err instanceof NotAuthenticatedError || err instanceof AuthNotConfiguredError) return;
    throw err;
  }
  useCryptoSession.getState().lock();
  useSyncMeta.getState().clear();
  useSyncQueue.getState().clear();
}

// --- detection cloud (decide premier login vs retour) -------------------------

/**
 * Indique si le compte possède déjà des blobs cloud — spec 22 §4.3.
 *
 * Sert à l'UI compte à distinguer le premier login (cloud vide → on génère une
 * recovery key et on migre le local) du retour sur un nouvel appareil (cloud
 * rempli → on demande la recovery key existante). Ne déchiffre rien : on regarde
 * seulement si la carte de blobs est non vide.
 *
 * @returns `true`/`false` si la requête aboutit, `null` si pas de compte / Neon
 *  absent (mode local-only).
 */
export async function hasCloudData(): Promise<boolean | null> {
  ensureConfigured();
  const bus = getCqrsBus();
  try {
    const res = await bus.executeQuery<IQueryResult<SyncBlobMap>>(new PullAllSyncQuery());
    return Object.keys(res.data ?? {}).length > 0;
  } catch (err) {
    if (err instanceof NotAuthenticatedError || err instanceof AuthNotConfiguredError) return null;
    console.warn('sync: echec hasCloudData', err);
    return null;
  }
}

// --- migration premier login ---------------------------------------------------

/**
 * Migration local → cloud au premier login — spec 22 §4.3.
 *
 * Tire d'abord le cloud (fusion LWW). Puis, pour chaque kind ayant une donnée
 * locale mais aucune trace d'horloge (`meta[kind] === 0`, i.e. jamais poussé), on
 * enfile et on pousse. Le cloud vide + local présent → le local devient la source.
 */
export async function migrate(): Promise<void> {
  await pullAndMerge();

  const meta = useSyncMeta.getState();
  const queue = useSyncQueue.getState();
  for (const kindStr of Object.keys(syncAdapters)) {
    const kind = kindStr as SyncKind;
    const adapter = syncAdapters[kind];
    if (!adapter || !isKindActive(kind)) continue;
    if (meta.get(kind) === 0 && adapter.hasLocal()) {
      queue.enqueue(kind);
    }
  }
  await flush();
}

// --- écouteurs globaux ---------------------------------------------------------

let listenersAttached = false;

/** Branche `online` + `visibilitychange` (hidden) pour vider la file. */
export function attachSyncListeners(): () => void {
  if (listenersAttached || typeof window === 'undefined') {
    return () => void 0;
  }
  listenersAttached = true;

  const onOnline = () => void flush();
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') void flush();
  };

  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onVisibility);
    listenersAttached = false;
  };
}