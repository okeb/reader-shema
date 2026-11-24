'use client';

import { configureContainer, getCqrsBus } from '@/src/infrastructure/di/container';
import type { ICommandResult } from '@/src/domain/use-cases/base.command.interface';
import type { IQueryResult } from '@/src/domain/use-cases/base.query.interface';
import type {
  LegacyBlobMap,
  SyncBlob,
  SyncBlobMap,
  SyncKind,
} from '@/src/domain/entities/sync.entity';
import { PullAllSyncQuery, PullLegacySyncQuery } from '@/src/application/queries/sync/queries';
import {
  PushSyncCommand,
  DeleteAccountCommand,
  DeleteLegacySyncCommand,
} from '@/src/application/commands/sync/commands';
import {
  NotAuthenticatedError,
  AuthNotConfiguredError,
} from '@/src/infrastructure/repositories/sync.repository.impl';
import {
  decryptBlob,
  deriveKekPw,
  deriveMasterKey,
  parseEnvelope,
  unwrapDek,
} from '@/src/infrastructure/crypto/crypto.service';
import { useSyncMeta } from '@/src/presentation/stores/sync-meta.store';
import { useSyncQueue } from '@/src/presentation/stores/sync-queue.store';
import { useSyncStatus } from '@/src/presentation/stores/sync-status.store';
import { useAccount } from '@/src/presentation/stores/account.store';
import { useBookmarks } from '@/src/presentation/stores/bookmarks.store';
import { syncAdapters } from './sync-adapters';

/**
 * Moteur de synchronisation — spec 22 §4, spec 39.
 *
 * Orchestre le pull (fusion LWW + hydratation des stores), le push (sérialisation + commande) et
 * la migration du local vers le cloud à la connexion. Depuis la spec 39, il n'y a plus de clé :
 * la sync est active dès qu'une session existe (`setSyncUser`) et que l'utilisateur ne l'a pas
 * mise en pause (`syncPaused`).
 *
 * File offline : `notifyLocalChange` enfile le kind sale + planifie un `flush` debouncé. Le flush
 * se déclenche aussi sur `online` / `visibilitychange` (hidden). En pause, les modifications
 * restent en file et partent à la reprise.
 */

const FLUSH_DEBOUNCE_MS = 2000;

let configured = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
/** Supprime l'écho : quand on hydrate depuis le cloud, on ne renfile pas la modif. */
let suppress = false;
/** Utilisateur connecté dont on synchronise les données (`null` = pas de session). */
let syncUserId: string | null = null;

function ensureConfigured(): void {
  if (!configured) {
    configureContainer();
    configured = true;
  }
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

/**
 * Déclare l'utilisateur connecté (ou `null` à la déconnexion) — spec 39 §4.1.
 *
 * Changement d'utilisateur : on vide la file et les horloges locales, pour que les modifications en
 * attente d'un compte ne partent jamais dans un autre et que le local soit rapproché du nouveau
 * compte par `migrate()`.
 */
export function setSyncUser(userId: string | null): void {
  if (userId === syncUserId) return;
  const previous = syncUserId;
  syncUserId = userId;
  if (previous !== null) resetSyncState();
}

/** Vide la file, les horloges et l'état d'affichage (déconnexion / changement de compte). */
export function resetSyncState(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  useSyncQueue.getState().clear();
  useSyncMeta.getState().clear();
  useSyncStatus.getState().reset();
}

/** La sync échange-t-elle avec le serveur ? (session présente et pas en pause). */
export function isSyncActive(): boolean {
  return syncUserId !== null && !useAccount.getState().syncPaused;
}

/** Un kind opt-in (réglages) n'est actif que si l'utilisateur a opté pour la sync des réglages. */
function isKindActive(kind: SyncKind): boolean {
  const adapter = syncAdapters[kind];
  if (!adapter) return false;
  if (adapter.optIn) return useAccount.getState().settingsSyncOptIn;
  return true;
}

/** Appelé par `sync-subscribers` quand un store syncé mute. */
export function notifyLocalChange(kind: SyncKind): void {
  if (suppress) return; // hydratation depuis le cloud → pas d'écho-push
  if (!isKindActive(kind)) return;
  useSyncMeta.getState().bump(kind);
  useSyncQueue.getState().enqueue(kind);
  if (isSyncActive()) scheduleFlush();
}

function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_DEBOUNCE_MS);
}

// --- push ----------------------------------------------------------------------

/**
 * Pousse un kind. Renvoie `false` si le serveur a rejeté le blob (LWW : le distant est plus récent).
 */
async function pushKind(kind: SyncKind): Promise<boolean> {
  const adapter = syncAdapters[kind];
  if (!adapter || !isKindActive(kind)) {
    useSyncQueue.getState().markPushed(kind);
    return true;
  }

  const payload = adapter.serialize();
  // Horloge LWW : on ne pousse jamais un horodatage nul. La migration enfile des kinds sans
  // « bumper » le méta (meta[kind] === 0) ; poussé à 0, le blob serait ignoré au pull d'un autre
  // appareil (`0 > 0` = faux). On date donc au moment du push quand l'horloge est vide.
  // Kind « ensemble » : le payload vient d'être fusionné avec le distant (pull avant push) → il le
  // contient, on le date maintenant pour qu'il passe la garde LWW.
  const metaTs = useSyncMeta.getState().get(kind);
  const updatedAt = adapter.merge ? Math.max(Date.now(), metaTs + 1) : metaTs > 0 ? metaTs : Date.now();
  const blob: SyncBlob = { payload, updatedAt };

  const res = await getCqrsBus().executeCommand<ICommandResult<{ updatedAt: number }>>(
    new PushSyncCommand(kind, blob),
  );
  const accepted = res.data.updatedAt === updatedAt;
  if (!accepted && adapter.merge) {
    // Un autre appareil a écrit entre notre pull et notre push : on reste en file, le prochain
    // flush re-fusionnera avant de repousser (rien n'est perdu).
    return false;
  }
  if (accepted) {
    // Le serveur renvoie l'horodatage retenu — on aligne l'horloge locale.
    useSyncMeta.getState().set(kind, res.data.updatedAt);
  }
  // Rejet LWW d'un kind « remplacement » : on n'avance PAS l'horloge, pour que le pull qui suit
  // hydrate la version distante plus récente au lieu de l'ignorer.
  useSyncQueue.getState().markPushed(kind);
  return accepted;
}

/** Pousse tous les kinds en attente (file offline). */
export async function flush(): Promise<void> {
  ensureConfigured();
  if (!isOnline() || !isSyncActive()) return;

  // Kind « ensemble » en attente : on tire et fusionne d'abord, pour que le push porte l'union
  // des appareils au lieu d'écraser les entrées des autres.
  if (useSyncQueue.getState().pending.some((k) => syncAdapters[k]?.merge)) {
    await pullAndMerge();
  }

  let rejected = false;
  let failed = false;
  const pending = [...useSyncQueue.getState().pending];
  for (const kind of pending) {
    try {
      if (!(await pushKind(kind))) rejected = true;
    } catch (err) {
      if (err instanceof NotAuthenticatedError || err instanceof AuthNotConfiguredError) {
        // Session expirée / base absente : on garde la file, elle repartira à la reconnexion.
        return;
      }
      // Erreur transitoire (réseau) : on laisse en file pour le prochain flush.
      failed = true;
      console.warn(`sync: echec push ${kind}`, err);
    }
  }
  if (!failed && pending.length > 0) useSyncStatus.getState().markSynced();
  // Un push rejeté = le distant est plus récent : on le récupère tout de suite (le pull
  // replanifie un flush si une union reste à republier).
  if (rejected) await pullAndMerge();
}

// --- pull ----------------------------------------------------------------------

/** Kinds « collection » fusionnables entrée par entrée (listes à `id`, ou maps). */
const COLLECTION_KINDS: SyncKind[] = ['favorites', 'bookmarkGroups', 'bookmarks', 'notes', 'highlights'];

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Union de deux versions d'une collection, `primary` prioritaire en cas de conflit. `null` si les
 * formes ne s'y prêtent pas.
 */
function unionEntries(primaryPayload: string, otherPayload: string): string | null {
  try {
    const primary: unknown = JSON.parse(primaryPayload);
    const other: unknown = JSON.parse(otherPayload);
    if (Array.isArray(primary) && Array.isArray(other)) {
      const ids = new Set(primary.map((e) => (isPlainObject(e) ? e.id : undefined)));
      const extra = other.filter((e) => isPlainObject(e) && typeof e.id === 'string' && !ids.has(e.id));
      return JSON.stringify([...primary, ...extra]);
    }
    if (isPlainObject(primary) && isPlainObject(other)) return JSON.stringify({ ...other, ...primary });
  } catch {
    // Payload illisible : rien à fusionner.
  }
  return null;
}

/**
 * Ajoute au local les entrées de `payload` qui lui manquent (le local l'emporte en cas de conflit),
 * puis date et enfile le kind pour publier l'union.
 */
function addMissingEntries(kind: SyncKind, payload: string): void {
  const adapter = syncAdapters[kind];
  if (!adapter) return;
  const local = adapter.serialize();
  const union = unionEntries(local, payload);
  if (union === null || union === local) return;
  suppress = true;
  try {
    adapter.hydrate(JSON.parse(union));
  } finally {
    suppress = false;
  }
  // Le local contient maintenant plus que le cloud : on le date pour qu'il passe la garde LWW.
  useSyncMeta.getState().bump(kind);
  useSyncQueue.getState().enqueue(kind);
}

/**
 * Entrées locales d'une collection jamais synchronisée, à conserver à la connexion. Les groupes de
 * signets sans aucun signet sont écartés : chaque appareil crée d'office un groupe « Mes versets »
 * vide, qui ferait doublon avec celui du compte.
 */
function unsyncedEntries(kind: SyncKind): string {
  const payload = syncAdapters[kind]!.serialize();
  if (kind !== 'bookmarkGroups') return payload;
  const used = new Set(useBookmarks.getState().bookmarks.map((b) => b.groupId));
  const groups = JSON.parse(payload) as { id: string }[];
  return JSON.stringify(groups.filter((g) => used.has(g.id)));
}

/**
 * Intègre un payload distant (JSON) dans le store local du kind — règles communes au pull et à la
 * conversion de l'archive chiffrée (spec 39 §4.3) :
 *  - kind « ensemble » : fusion à chaque fois, puis republication si le local contient plus ;
 *  - kind « remplacement » : hydratation seulement si le distant est plus récent que l'horloge ;
 *    une collection locale jamais synchronisée (horloge vide) garde alors ses entrées en plus.
 */
export function applyRemotePayload(kind: SyncKind, payload: string, remoteUpdatedAt: number): void {
  const adapter = syncAdapters[kind];
  if (!adapter || !isKindActive(kind)) return;
  const localTs = useSyncMeta.getState().get(kind);

  suppress = true;
  try {
    if (adapter.merge) {
      adapter.hydrate(payload ? JSON.parse(payload) : null);
      useSyncMeta.getState().set(kind, Math.max(localTs, remoteUpdatedAt));
      // Le local contient des entrées absentes du distant → on republie l'union.
      if (adapter.serialize() !== payload) useSyncQueue.getState().enqueue(kind);
      return;
    }
    if (remoteUpdatedAt > localTs) {
      // Collection locale jamais synchronisée (appareil utilisé sans compte avant la connexion) :
      // on garde ses entrées en plus de celles du cloud au lieu de les écraser.
      const unsynced =
        localTs === 0 && COLLECTION_KINDS.includes(kind) && adapter.hasLocal() ? unsyncedEntries(kind) : null;
      adapter.hydrate(payload ? JSON.parse(payload) : null);
      useSyncMeta.getState().set(kind, remoteUpdatedAt);
      if (unsynced !== null) addMissingEntries(kind, unsynced);
    }
  } catch (err) {
    // Payload corrompu : on garde le local, on ne plante pas.
    console.warn(`sync: payload illisible ${kind}`, err);
  } finally {
    suppress = false;
  }
}

/**
 * Tire tous les kinds et hydrate les stores quand le distant est plus récent que l'horloge LWW
 * locale. Appelé à la connexion, au chargement, au retour sur l'onglet et au retour en ligne.
 *
 * @returns la carte distante, ou `null` si la sync est inactive ou le serveur injoignable.
 */
export async function pullAndMerge(): Promise<SyncBlobMap | null> {
  ensureConfigured();
  if (!isSyncActive()) return null;

  let remoteMap: SyncBlobMap;
  try {
    const res = await getCqrsBus().executeQuery<IQueryResult<SyncBlobMap>>(new PullAllSyncQuery());
    remoteMap = res.data ?? {};
  } catch (err) {
    if (!(err instanceof NotAuthenticatedError || err instanceof AuthNotConfiguredError)) {
      console.warn('sync: echec pull', err);
    }
    return null;
  }

  for (const kindStr of Object.keys(remoteMap)) {
    const kind = kindStr as SyncKind;
    const remote = remoteMap[kind];
    if (remote) applyRemotePayload(kind, remote.payload, remote.updatedAt);
  }
  useSyncStatus.getState().markSynced();

  // Modifs locales en attente, ou union à republier après fusion.
  if (useSyncQueue.getState().pending.length > 0) scheduleFlush();
  return remoteMap;
}

// --- suppression du compte cloud ----------------------------------------------

/**
 * Supprime toutes les données cloud du compte — spec 22 §5.
 *
 * Exécute `DELETE /api/account` (purge des données synchronisées et de l'archive chiffrée), puis
 * vide l'horloge + la file de sync locales. La fermeture de session (signOut) est laissée à l'UI.
 */
export async function deleteAccount(): Promise<void> {
  ensureConfigured();
  try {
    await getCqrsBus().executeCommand<ICommandResult<void>>(new DeleteAccountCommand());
  } catch (err) {
    if (err instanceof NotAuthenticatedError || err instanceof AuthNotConfiguredError) return;
    throw err;
  }
  resetSyncState();
}

// --- migration (connexion / chargement) -----------------------------------------

/**
 * Rapproche le local du compte — spec 22 §4.3, spec 39.
 *
 * Tire d'abord le cloud (fusion LWW ; les collections locales jamais synchronisées y sont fusionnées
 * plutôt qu'écrasées, cf. `applyRemotePayload`). Puis on enfile chaque kind qui a une donnée locale
 * et qui n'est pas encore dans le cloud (jamais poussé, ou cloud vidé — cas du premier passage en clair, où
 * le local d'avant la spec 39 a des horloges mais aucune ligne `user_sync`), et on pousse.
 */
export async function migrate(): Promise<void> {
  const remote = await pullAndMerge();
  if (remote === null) return;

  const meta = useSyncMeta.getState();
  const queue = useSyncQueue.getState();
  for (const kindStr of Object.keys(syncAdapters)) {
    const kind = kindStr as SyncKind;
    const adapter = syncAdapters[kind];
    if (!adapter || !isKindActive(kind)) continue;
    if (adapter.hasLocal() && (meta.get(kind) === 0 || !remote[kind])) {
      queue.enqueue(kind);
    }
  }
  await flush();
}

// --- écouteurs globaux ---------------------------------------------------------

let listenersAttached = false;

/** Intervalle minimal entre deux pulls déclenchés par un retour sur l'onglet. */
const PULL_THROTTLE_MS = 30_000;
let lastPullAt = 0;

/** Tire les changements des autres appareils (throttlé), puis vide la file. */
async function refreshFromCloud(): Promise<void> {
  if (!isOnline() || !isSyncActive()) return;
  const now = Date.now();
  if (now - lastPullAt < PULL_THROTTLE_MS) return;
  lastPullAt = now;
  await pullAndMerge();
}

/**
 * Branche `online` + `visibilitychange` : on vide la file en quittant l'onglet (hidden) et on tire
 * les changements des autres appareils en y revenant (visible / focus / retour en ligne) — c'est ce
 * qui permet de reprendre sur une machine ce qu'on a lu sur une autre sans recharger la page.
 */
export function attachSyncListeners(): () => void {
  if (listenersAttached || typeof window === 'undefined') {
    return () => void 0;
  }
  listenersAttached = true;

  const onOnline = () => {
    lastPullAt = 0;
    void refreshFromCloud().then(flush);
  };
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') void flush();
    else void refreshFromCloud();
  };
  const onFocus = () => void refreshFromCloud();

  window.addEventListener('online', onOnline);
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
    listenersAttached = false;
  };
}

// --- Archive chiffrée d'avant la spec 39 (temporaire — à retirer le 2027-06-01) ----

/**
 * Conversion de l'archive chiffrée d'avant la spec 39 — spec 39 §4.3.
 *
 * L'archive (`user_data` : un blob AES-GCM par kind + l'enveloppe `keyEnvelope`) est gelée. Avec
 * une clé (DEK de l'appareil, mot de passe ou clé de récupération), on la déchiffre, on l'intègre
 * aux stores locaux, puis la sync en clair publie le résultat. L'archive n'est supprimée que si tout
 * a été publié ; sinon elle reste, et la conversion (idempotente) pourra être rejouée.
 *
 * Intégration, kind par kind, APRÈS un pull du cloud en clair (le local est alors le plus à jour
 * connu) : si l'archive est plus récente, elle remplace (LWW, comme un pull) ; sinon, pour les
 * collections (favoris, signets, notes, surlignages), on fusionne ses entrées absentes du local —
 * le local l'emporte en cas de conflit. Sans cette fusion, des entrées créées avant la mise à jour
 * et jamais transférées seraient perdues à la suppression de l'archive.
 *
 * Jamais bloquant : sans clé, la sync en clair fonctionne déjà et l'archive attend.
 * À supprimer le 2027-06-01 avec l'archive.
 */

/** Résultat d'une conversion. */
export type ConvertResult =
  /** Archive intégrée, publiée et supprimée. */
  | 'ok'
  /** Archive intégrée localement ; publication en attente (hors ligne / sync en pause) — archive gardée. */
  | 'partial'
  /** Aucune archive. */
  | 'none'
  /** La clé ne déchiffre rien (archive intacte). */
  | 'wrong'
  /** Le mot de passe ne peut pas ouvrir cette archive (pas d'enveloppe mot de passe) : clé de récupération requise. */
  | 'no-pw-wrap';

/** Secret permettant d'ouvrir l'archive. */
export type LegacySecret = { dek: CryptoKey } | { password: string } | { recoveryKey: string };

/** Intègre un kind de l'archive au local (voir la doc de la section). */
function integrateArchiveKind(kind: SyncKind, payload: string, updatedAt: number): void {
  const adapter = syncAdapters[kind];
  if (!adapter || !isKindActive(kind)) return;
  if (adapter.merge || updatedAt > useSyncMeta.getState().get(kind) || !COLLECTION_KINDS.includes(kind)) {
    applyRemotePayload(kind, payload, updatedAt);
    return;
  }
  addMissingEntries(kind, payload);
}

async function pullLegacy(): Promise<LegacyBlobMap | null> {
  ensureConfigured();
  try {
    const res = await getCqrsBus().executeQuery<IQueryResult<LegacyBlobMap>>(new PullLegacySyncQuery());
    return res.data ?? {};
  } catch (err) {
    if (!(err instanceof NotAuthenticatedError || err instanceof AuthNotConfiguredError)) {
      console.warn('sync: echec lecture archive', err);
    }
    return null;
  }
}

/** L'utilisateur connecté a-t-il une archive chiffrée à convertir ? `false` si indéterminable. */
export async function hasLegacyArchive(): Promise<boolean> {
  const map = await pullLegacy();
  return map !== null && Object.keys(map).length > 0;
}

/** Résout la clé de déchiffrement des données de l'archive, ou la raison de l'échec. */
async function resolveKey(
  map: LegacyBlobMap,
  secret: LegacySecret,
): Promise<CryptoKey | 'wrong' | 'no-pw-wrap'> {
  if ('dek' in secret) return secret.dek;
  const env = map.keyEnvelope ? parseEnvelope(map.keyEnvelope.ciphertext) : null;
  try {
    if ('password' in secret) {
      if (!env?.pwWrap || !env.pwSalt) return 'no-pw-wrap';
      const kek = await deriveKekPw(secret.password, env.pwSalt);
      return await unwrapDek(kek, env.pwWrap.ct, env.pwWrap.nonce);
    }
    const kek = await deriveMasterKey(secret.recoveryKey.trim());
    // Compte spec 28 : la clé de récupération déwrappe le DEK. Compte antérieur (pas d'enveloppe) :
    // elle EST la clé de chiffrement des données.
    return env ? await unwrapDek(kek, env.recoveryWrap.ct, env.recoveryWrap.nonce) : kek;
  } catch {
    return 'wrong';
  }
}

/**
 * Convertit l'archive chiffrée de l'utilisateur connecté.
 *
 * Rien n'est supprimé sans qu'au moins un kind ait été déchiffré.
 */
export async function convertLegacy(secret: LegacySecret): Promise<ConvertResult> {
  const map = await pullLegacy();
  if (map === null || Object.keys(map).length === 0) return 'none';

  const key = await resolveKey(map, secret);
  if (key === 'wrong' || key === 'no-pw-wrap') return key;

  // Déchiffre chaque kind de données. Une clé incorrecte échoue sur tous les blobs.
  const decrypted: { kind: SyncKind; payload: string; updatedAt: number }[] = [];
  let attempted = 0;
  for (const [kindStr, blob] of Object.entries(map)) {
    if (kindStr === 'keyEnvelope' || !blob) continue;
    const kind = kindStr as SyncKind;
    if (!syncAdapters[kind]) continue;
    attempted++;
    try {
      decrypted.push({ kind, payload: await decryptBlob(key, blob.ciphertext, blob.nonce), updatedAt: blob.updatedAt });
    } catch (err) {
      console.warn(`sync: archive indéchiffrable ${kind}`, err);
    }
  }
  if (attempted > 0 && decrypted.length === 0) return 'wrong';

  // 1. Rapproche d'abord du cloud en clair (un autre appareil a pu y publier entre-temps).
  await pullAndMerge();

  // 2. Intègre l'archive (LWW si plus récente, sinon fusion des collections), puis publie.
  for (const { kind, payload, updatedAt } of decrypted) integrateArchiveKind(kind, payload, updatedAt);
  const queue = useSyncQueue.getState();
  for (const { kind } of decrypted) {
    if (syncAdapters[kind]?.hasLocal()) queue.enqueue(kind);
  }
  await flush();

  // 3. Supprime l'archive seulement si tout est publié.
  if (!isSyncActive() || useSyncQueue.getState().pending.length > 0) return 'partial';
  try {
    await getCqrsBus().executeCommand<ICommandResult<void>>(new DeleteLegacySyncCommand());
  } catch (err) {
    console.warn('sync: suppression archive échouée', err);
    return 'partial';
  }
  return 'ok';
}
