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
import {
  encryptBlob,
  decryptBlob,
  generateRecoveryKey,
  deriveMasterKey,
  generateDek,
  generatePwSalt,
  deriveKekPw,
  wrapDek,
  unwrapDek,
  buildEnvelope,
  serializeEnvelope,
  parseEnvelope,
  envelopePlaceholderNonce,
} from '@/src/infrastructure/crypto/crypto.service';
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
  // Horloge LWW : on ne pousse jamais un horodatage nul. La migration premier-login
  // enfile les kinds sans « bumper » le méta (meta[kind] === 0) ; si on poussait 0, le
  // blob serait daté 0 et ignoré au pull sur un autre appareil (`remote.updatedAt >
  // localTs` → `0 > 0` = faux). On date donc au moment du push quand l'horloge est vide.
  const metaTs = useSyncMeta.getState().get(kind);
  const updatedAt = metaTs > 0 ? metaTs : Date.now();
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

// --- Enveloppe DEK/KEK (spec 28) ----------------------------------------------
//
// Déverrouillage routine au mot de passe (KEK_pw) + urgence à la clé de récupération (KEK_rec).
// L'enveloppe (DEK wrappé par les deux KEK + sel pw) vit dans `user_data` kind=`keyEnvelope` (pas
// d'adapter — la moteur la skip dans pullAndMerge via `!adapter`). Le DEK unwrappé devient la
// master key en mémoire (et peut être persisté sur l'appareil via device-key-store).

/** Un autre appareil a créé l'enveloppe avant nous (race LWW perdue au bootstrap). */
export class BootstrapLostError extends Error {
  constructor() {
    super('Enveloppe déjà créée par un autre appareil');
    this.name = 'BootstrapLostError';
  }
}

/** Résultat d'un déverrouillage par mot de passe. */
export type UnlockResult = 'ok' | 'no-envelope' | 'no-pw-wrap' | 'wrong';

/** Résultat d'un déverrouillage par clé de récupération. */
export type UnlockRecoveryResult = 'ok' | 'no-envelope' | 'wrong';

/**
 * Tire l'enveloppe DEK/KEK du cloud — spec 28.
 *
 * Pull-all puis extrait le kind `keyEnvelope`. `null` si absent (premier login / compte legacy
 * pré-spec-28) ou mode local-only. Ne déchiffre rien : l'enveloppe est lue telle quelle (son contenu
 * est wrappé, pas chiffré au niveau de la row). Sert de gate premier-login vs retour : la PRÉSENCE
 * de l'enveloppe = « déjà configuré », indépendamment des blobs de données.
 */
export async function getEnvelope(): Promise<EncryptedBlob | null> {
  ensureConfigured();
  const bus = getCqrsBus();
  try {
    const res = await bus.executeQuery<IQueryResult<SyncBlobMap>>(new PullAllSyncQuery());
    return res.data?.keyEnvelope ?? null;
  } catch (err) {
    if (err instanceof NotAuthenticatedError || err instanceof AuthNotConfiguredError) return null;
    console.warn('sync: echec getEnvelope', err);
    return null;
  }
}

/**
 * Déverrouille la sync au mot de passe — spec 28 (routine).
 *
 * Tire l'enveloppe, dérive la KEK mot de passe (sel par-utilisateur), déwrap le DEK, le pose comme
 * master key puis tire et fusionne les blobs de données. `no-envelope` → l'UI bootstrappe ;
 * `no-pw-wrap` (magic-link) → l'UI bascule sur la recovery key ; `wrong` → mauvais mot de passe
 * (auth tag AES-GCM invalide).
 */
export async function unlockWithPassword(password: string): Promise<UnlockResult> {
  ensureConfigured();
  const blob = await getEnvelope();
  if (!blob) return 'no-envelope';
  const env = parseEnvelope(blob.ciphertext);
  if (!env || !env.pwWrapPresent || !env.pwWrap || !env.pwSalt) return 'no-pw-wrap';
  let dek: CryptoKey;
  try {
    const kek = await deriveKekPw(password, env.pwSalt);
    dek = await unwrapDek(kek, env.pwWrap.ct, env.pwWrap.nonce);
  } catch {
    return 'wrong';
  }
  useCryptoSession.getState().setMasterKey(dek);
  await pullAndMerge();
  return 'ok';
}

/**
 * Déverrouille la sync au moyen de la clé de récupération — spec 28 (urgence / magic-link / legacy).
 *
 * Dérive la KEK recovery (réutilise `deriveMasterKey` + sel app global), déwrap le DEK depuis
 * `recoveryWrap`, le pose comme master key puis tire et fusionne. `wrong` si la clé est incorrecte.
 */
export async function unlockWithRecoveryKey(recoveryKey: string): Promise<UnlockRecoveryResult> {
  ensureConfigured();
  const blob = await getEnvelope();
  if (!blob) return 'no-envelope';
  const env = parseEnvelope(blob.ciphertext);
  if (!env) return 'wrong';
  let dek: CryptoKey;
  try {
    const kek = await deriveMasterKey(recoveryKey.trim());
    dek = await unwrapDek(kek, env.recoveryWrap.ct, env.recoveryWrap.nonce);
  } catch {
    return 'wrong';
  }
  useCryptoSession.getState().setMasterKey(dek);
  await pullAndMerge();
  return 'ok';
}

/** Options du bootstrap d'enveloppe. */
export interface BootstrapOptions {
  /** Mot de passe (comptes e-mail/mot de passe). Omis pour magic-link → `pwWrapPresent:false`. */
  password?: string;
  /** Clé de récupération à utiliser (sinon générée). */
  recoveryKey?: string;
  /** E-mailer la clé de récupération à l'adresse du compte (POST /api/email/recovery-key). */
  emailKey?: boolean;
}

/**
 * Crée l'enveloppe DEK/KEK au premier login / reset legacy — spec 28.
 *
 * Génère un DEK + une clé de récupération (+ e-mail si `emailKey`) + un sel pw, wrap le DEK par la
 * KEK mot de passe (si `password`) et par la KEK recovery, pousse l'enveloppe, pose le DEK comme
 * master key. Après push, re-tire l'enveloppe pour détecter la race deux-appareils : si le
 * `ciphertext` stocké ≠ poussé, un autre appareil a gagné → `BootstrapLostError` (l'UI bascule en
 * `unlock-recovery` avec la clé e-mailée du gagnant ; le DEK local est abandonné).
 *
 * @returns la clé de récupération générée (à afficher en `recovery-display`).
 */
export async function bootstrapEnvelope(opts: BootstrapOptions): Promise<string> {
  ensureConfigured();
  const dek = await generateDek();
  const recoveryKey = opts.recoveryKey ?? generateRecoveryKey();
  const recoveryKek = await deriveMasterKey(recoveryKey);
  const recoveryWrap = await wrapDek(recoveryKek, dek);

  let pwWrap: { ct: string; nonce: string } | undefined;
  let pwSalt: string | undefined;
  if (opts.password) {
    pwSalt = generatePwSalt();
    const pwKek = await deriveKekPw(opts.password, pwSalt);
    pwWrap = await wrapDek(pwKek, dek);
  }

  const env = buildEnvelope({ pwSalt, pwWrap, recoveryWrap });
  const blob: EncryptedBlob = {
    ciphertext: serializeEnvelope(env),
    nonce: envelopePlaceholderNonce(),
    updatedAt: Date.now(),
  };

  const bus = getCqrsBus();
  await bus.executeCommand<ICommandResult<{ updatedAt: number }>>(
    new PushSyncCommand('keyEnvelope', blob),
  );

  // Race deux-appareils : si le `ciphertext` stocké ≠ poussé, un autre appareil a gagné.
  const stored = await getEnvelope();
  if (!stored || stored.ciphertext !== blob.ciphertext) {
    throw new BootstrapLostError(); // DEK local orphelin — on ne le pose pas.
  }

  useCryptoSession.getState().setMasterKey(dek);
  useAccount.getState().setSyncEnabled(true);

  if (opts.emailKey) {
    // Best-effort : la clé est aussi affichée en `recovery-display` ; l'e-mail est un filet.
    void fetch('/api/email/recovery-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recoveryKey }),
    }).catch(() => {});
  }

  return recoveryKey;
}

/**
 * Purge les blobs cloud sans re-verrouiller ni vider les horloges locales — spec 28.
 *
 * Réutilise `DeleteAccountCommand` (DELETE /api/account purge `user_data`) mais SANS le lock/clear
 * de `deleteAccount()`. Sert avant un fresh bootstrap quand des blobs legacy indéchiffrables
 * existent (compte pré-spec-28 sans enveloppe, clé de récupération perdue).
 */
export async function purgeCloudData(): Promise<void> {
  ensureConfigured();
  const bus = getCqrsBus();
  try {
    await bus.executeCommand<ICommandResult<void>>(new DeleteAccountCommand());
  } catch (err) {
    if (err instanceof NotAuthenticatedError || err instanceof AuthNotConfiguredError) return;
    throw err;
  }
}

/**
 * Migration legacy → enveloppe — spec 28.
 *
 * Pour un compte pré-spec-28 (blobs chiffrés à l'ancienne master key = `deriveMasterKey(oldKey)`,
 * pas d'enveloppe) où l'utilisateur a ENCORE son ancienne clé : on fusionne d'abord local+cloud sous
 * l'ancienne clé, puis on tire et décrypte tous les kinds, génère un nouveau DEK + enveloppe, et
 * re-chiffre chaque kind sous le nouveau DEK (horodatage frais → LWW écrase l'ancien blob). Aucune
 * perte. E-mail la nouvelle recovery key. One-shot.
 */
export async function upgradeLegacyToEnvelope(
  oldRecoveryKey: string,
  password?: string,
): Promise<void> {
  ensureConfigured();
  const oldMasterKey = await deriveMasterKey(oldRecoveryKey.trim());

  // 1. On opère sous l'ancienne clé : hydrate le local depuis le cloud legacy (pull seul). Pas de
  //    push avant d'avoir vérifié la clé : un flush sous mauvaise clé écrirait le cloud legacy en
  //    chiffré illisible (horodatage frais → LWW écrase) = perte définitive des données.
  useCryptoSession.getState().setMasterKey(oldMasterKey);
  await pullAndMerge();

  // 2. Tire le cloud legacy et décrypte chaque kind non-envelope sous l'ancienne clé — ceci VÉRIFIE
  //    la clé. En mode legacy, hasCloudData()=true garantit au moins un blob de données, et tous les
  //    blobs partagent la même ancienne clé (single-key pre-spec-28), donc 0 récupéré = clé fausse.
  const bus = getCqrsBus();
  const verifyRes = await bus.executeQuery<IQueryResult<SyncBlobMap>>(new PullAllSyncQuery());
  const verifyMap = verifyRes.data ?? {};
  let attempted = 0;
  let recovered = 0;
  for (const kindStr of Object.keys(verifyMap)) {
    const kind = kindStr as SyncKind;
    if (kind === 'keyEnvelope') continue;
    const remote = verifyMap[kind];
    if (!remote) continue;
    attempted++;
    try {
      await decryptBlob(oldMasterKey, remote.ciphertext, remote.nonce);
      recovered++;
    } catch (err) {
      console.warn(`sync: legacy decrypt skip ${kind}`, err);
    }
  }
  if (attempted > 0 && recovered === 0) {
    // Ancienne clé fausse : rien n'a été poussé (cloud legacy préservé), on reverrouille.
    useCryptoSession.getState().lock();
    throw new Error('wrong-legacy-key');
  }

  // 3. Clé vérifiée : pousse le local en attente sous l'ancienne clé (safe), pour qu'il soit inclus
  //    dans le re-chiffrement sous le nouveau DEK (mutations post-reload en mode local-only).
  await flush();

  // 4. Re-tire le cloud fusionné (inclut le flush) et décrypte sous l'ancienne clé → plaintexts.
  const res = await bus.executeQuery<IQueryResult<SyncBlobMap>>(new PullAllSyncQuery());
  const map = res.data ?? {};
  const plaintexts: Partial<Record<SyncKind, string>> = {};
  for (const kindStr of Object.keys(map)) {
    const kind = kindStr as SyncKind;
    if (kind === 'keyEnvelope') continue;
    const remote = map[kind];
    if (!remote) continue;
    try {
      plaintexts[kind] = await decryptBlob(oldMasterKey, remote.ciphertext, remote.nonce);
    } catch (err) {
      console.warn(`sync: legacy decrypt skip ${kind}`, err);
    }
  }

  // 5. Nouveau DEK + enveloppe (recovery + pw si password), pousse l'enveloppe.
  const dek = await generateDek();
  const recoveryKey = generateRecoveryKey();
  const recoveryKek = await deriveMasterKey(recoveryKey);
  const recoveryWrap = await wrapDek(recoveryKek, dek);
  let pwWrap: { ct: string; nonce: string } | undefined;
  let pwSalt: string | undefined;
  if (password) {
    pwSalt = generatePwSalt();
    const pwKek = await deriveKekPw(password, pwSalt);
    pwWrap = await wrapDek(pwKek, dek);
  }
  const env = buildEnvelope({ pwSalt, pwWrap, recoveryWrap });
  const now = Date.now();
  await bus.executeCommand<ICommandResult<{ updatedAt: number }>>(
    new PushSyncCommand('keyEnvelope', {
      ciphertext: serializeEnvelope(env),
      nonce: envelopePlaceholderNonce(),
      updatedAt: now,
    }),
  );

  // 6. Pose le nouveau DEK, re-chiffre chaque kind sous le nouveau DEK (horodatage frais).
  useCryptoSession.getState().setMasterKey(dek);
  for (const kindStr of Object.keys(plaintexts)) {
    const kind = kindStr as SyncKind;
    const { ciphertext, nonce } = await encryptBlob(dek, plaintexts[kind]!);
    await bus.executeCommand<ICommandResult<{ updatedAt: number }>>(
      new PushSyncCommand(kind, { ciphertext, nonce, updatedAt: now }),
    );
    useSyncMeta.getState().set(kind, now);
  }
  useAccount.getState().setSyncEnabled(true);

  // 7. E-mail la nouvelle recovery key (désormais l'unique filet d'urgence).
  void fetch('/api/email/recovery-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recoveryKey }),
  }).catch(() => {});
}

/**
 * Re-wrap le DEK sous un nouveau mot de passe — spec 28 (filet post-reset mot de passe).
 *
 * Appelable tant que déverrouillé (DEK en mémoire, `extractable`). Régénère un sel pw, dérive la
 * nouvelle KEK, re-wrap le DEK (`recoveryWrap` inchangé), repousse l'enveloppe. Sert après un
 * déverrouillage via recovery key (urgence) pour re-lier le nouveau mot de passe — préserve la
 * doctrine « recovery = urgence uniquement ».
 */
export async function rewrapPassword(newPassword: string): Promise<void> {
  ensureConfigured();
  const dek = useCryptoSession.getState().masterKey;
  if (!dek) throw new Error('DEK absent (verrouillé) — rewrap impossible');

  const blob = await getEnvelope();
  if (!blob) throw new Error('Enveloppe absente');
  const env = parseEnvelope(blob.ciphertext);
  if (!env) throw new Error('Enveloppe illisible');

  const pwSalt = generatePwSalt();
  const pwKek = await deriveKekPw(newPassword, pwSalt);
  const pwWrap = await wrapDek(pwKek, dek);

  const newEnv = buildEnvelope({ pwSalt, pwWrap, recoveryWrap: env.recoveryWrap });
  const bus = getCqrsBus();
  await bus.executeCommand<ICommandResult<{ updatedAt: number }>>(
    new PushSyncCommand('keyEnvelope', {
      ciphertext: serializeEnvelope(newEnv),
      nonce: envelopePlaceholderNonce(),
      updatedAt: Date.now(),
    }),
  );
}