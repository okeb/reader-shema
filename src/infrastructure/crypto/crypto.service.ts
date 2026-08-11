/**
 * Service de chiffrement bout-en-bout (E2EE) — spec 22 §4.4.
 *
 * Web Crypto natif, zéro dépendance. Le serveur ne stocke que des blobs opaques :
 * il n'a jamais la clé, jamais la recovery key. La master key est dérivée de la
 * recovery key (aléatoire 256 bits) via PBKDF2, puis utilisée en AES-GCM 256.
 *
 * La recovery key est purement client ; sa perte = données irrécupérables (spec assumé).
 *
 * Toutes les opérations crypto tournent côté navigateur. Les fonctions ne font rien
 * côté serveur (garde `crypto.subtle` indisponible) — elles ne sont appelées que client.
 */

// Sel d'application (domain separation) — 16 bytes, constant, non secret.
// Encodage base64 d'un sel fixe ; décodé à l'usage.
const APP_SALT_B64 = 'c2hlbWEtcmVhZGVyLXNwZWMtMjItc2FsdA=='; // "shema-reader-spec-22-salt"
const PBKDF2_ITERATIONS = 250_000;
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // AES-GCM recommande 96 bits

function isCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

function assertCrypto(): void {
  if (!isCryptoAvailable()) {
    throw new Error('crypto.subtle indisponible (contexte non navigateur ?)');
  }
}

// --- base64 helpers -------------------------------------------------------------

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return base64ToBytes(b64 + pad);
}

function utf8ToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

// --- clé de récupération --------------------------------------------------------

/**
 * Génère une recovery key aléatoire 256 bits, encodée base64url (~43 caractères).
 * Affichée une fois à l'inscription, à conserver par l'utilisateur.
 */
export function generateRecoveryKey(): string {
  assertCrypto();
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64Url(bytes);
}

// --- dérivation de la master key -----------------------------------------------

let appSaltBytes: Uint8Array | null = null;
function getAppSalt(): Uint8Array {
  if (!appSaltBytes) appSaltBytes = base64ToBytes(APP_SALT_B64);
  return appSaltBytes;
}

/**
 * Dérive la master key (AES-GCM 256, non-extractable) depuis la recovery key via PBKDF2.
 * L'entrée étant 256 bits aléatoires, PBKDF2 suffit (l'entropie est haute, pas un mot de passe).
 */
export async function deriveMasterKey(recoveryKey: string): Promise<CryptoKey> {
  assertCrypto();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    utf8ToBytes(recoveryKey) as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: getAppSalt() as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false, // non-extractable : la master key ne quitte jamais le handle crypto
    ['encrypt', 'decrypt'],
  );
}

// --- chiffrement / déchiffrement des blobs --------------------------------------

export interface EncryptedBlob {
  ciphertext: string; // base64
  nonce: string; // base64 (IV 12 bytes)
}

/**
 * Chiffre un plaintext (JSON stringifié) en AES-GCM. IV frais par blob (jamais réutilisé).
 */
export async function encryptBlob(masterKey: CryptoKey, plaintext: string): Promise<EncryptedBlob> {
  assertCrypto();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    masterKey,
    utf8ToBytes(plaintext) as BufferSource,
  );
  return { ciphertext: bytesToBase64(new Uint8Array(cipherBuf)), nonce: bytesToBase64(iv) };
}

/**
 * Déchiffre un blob. Lève en cas de clé incorrecte (auth tag AES-GCM invalide).
 */
export async function decryptBlob(
  masterKey: CryptoKey,
  ciphertext: string,
  nonce: string,
): Promise<string> {
  assertCrypto();
  const iv = base64ToBytes(nonce);
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    masterKey,
    base64ToBytes(ciphertext) as BufferSource,
  );
  return bytesToUtf8(new Uint8Array(plainBuf));
}

export { base64UrlToBytes };

// --- Enveloppe DEK/KEK (spec 28) ----------------------------------------------
//
// La master key (spec 22) était dérivée directement de la recovery key. Spec 28 : un DEK
// aléatoire chiffre les blobs `user_data` ; le DEK est wrappé par une KEK mot de passe (routine)
// ET par une KEK recovery (urgence). L'enveloppe (JSON des deux wraps + le sel pw) est stockée
// dans `user_data` kind=`keyEnvelope`. On déverrouille au mot de passe (qu'on connaît) ; la
// recovery key (e-mailée à l'inscription) ne sert qu'en cas de compte perdu.
//
// Le DEK est volontairement `extractable` en mémoire (contrairement à la master key spec 22,
// non-extractable) : `rewrapPassword` et `upgradeLegacyToEnvelope` doivent pouvoir exporter le
// DEK raw pour le re-wrapper/re-chiffrer. Sur le plan menace, un attaquant ayant le handle du DEK
// en page (XSS) peut déchiffrer les blobs directement — extractable ou non — donc le delta de
// sécurité est négligeable, et l'extractabilité débloque le re-wrap (filet post-reset mot de
// passe, qui préserve la doctrine « recovery = urgence uniquement »).

const ENVELOPE_VERSION = 1;
// Placeholder pour la colonne `nonce` (BYTEA NOT NULL) de la row keyEnvelope. L'enveloppe n'est
// pas chiffrée au niveau de la row (elle doit être lisible sans le DEK pour déwraper) ; les IV
// réels vivent dans pwWrap/recoveryWrap. Préfixe `v:1` dans le JSON pour qu'un relecteur ne
// suppose pas de l'AES-GCM au niveau de la row.
const PLACEHOLDER_NONCE_B64 = bytesToBase64(new Uint8Array(IV_LENGTH));

/**
 * Génère le DEK (AES-GCM 256, extractable). L'extractabilité est nécessaire pour `exportKey('raw')`
 * au wrap (bootstrap) et au re-wrap (changement de mot de passe) — voir note module.
 */
export async function generateDek(): Promise<CryptoKey> {
  assertCrypto();
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt'],
  );
}

/** Sel par-utilisateur (16 octets aléatoires) pour la KEK mot de passe — distinct du sel app global. */
export function generatePwSalt(): string {
  assertCrypto();
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
}

/**
 * Dérive la KEK mot de passe (AES-GCM, `['encrypt','decrypt']`, non-extractable) via PBKDF2 sur un
 * sel par-utilisateur. Contrairement à `deriveMasterKey` (recovery key 256-bit, sel app global),
 * l'entrée est un mot de passe faible → sel par-utilisateur + 250k iters (domain separation).
 */
export async function deriveKekPw(password: string, pwSaltB64: string): Promise<CryptoKey> {
  assertCrypto();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    utf8ToBytes(password) as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: base64ToBytes(pwSaltB64) as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Wrap le DEK : exporte la clé raw (base64) puis la chiffre avec la KEK (AES-GCM via `encryptBlob`).
 * On évite `crypto.subtle.wrapKey` (qui exigerait des usages KEK `['wrapKey','unwrapKey']` et
 * casserait la réutilisation de `deriveMasterKey` pour KEK_rec) pour le même résultat.
 */
export async function wrapDek(
  kek: CryptoKey,
  dek: CryptoKey,
): Promise<{ ct: string; nonce: string }> {
  assertCrypto();
  const raw = await crypto.subtle.exportKey('raw', dek);
  const b64 = bytesToBase64(new Uint8Array(raw));
  const { ciphertext, nonce } = await encryptBlob(kek, b64);
  return { ct: ciphertext, nonce };
}

/**
 * Unwrap le DEK : déchiffre (AES-GCM) → base64 de la clé raw → `importKey` (extractable, pour le
 * re-wrap futur). Lève en cas de KEK incorrect (auth tag AES-GCM invalide) — signature d'un mauvais
 * mot de passe / mauvaise clé de récupération.
 */
export async function unwrapDek(
  kek: CryptoKey,
  ct: string,
  nonce: string,
): Promise<CryptoKey> {
  assertCrypto();
  const b64 = await decryptBlob(kek, ct, nonce);
  const raw = base64ToBytes(b64);
  return crypto.subtle.importKey(
    'raw',
    raw as BufferSource,
    { name: 'AES-GCM', length: KEY_LENGTH },
    true, // extractable : permet le re-wrap / re-chiffrement (voir note module)
    ['encrypt', 'decrypt'],
  );
}

/** Enveloppe DEK wrappée — stockée dans `user_data` kind=`keyEnvelope`. */
export interface KeyEnvelope {
  v: number;
  /** Sel par-utilisateur de la KEK mot de passe. Absent si `pwWrap` absent (magic-link). */
  pwSalt?: string;
  /** DEK wrappé par la KEK mot de passe. Absent pour les comptes sans mot de passe. */
  pwWrap?: { ct: string; nonce: string };
  /** DEK wrappé par la KEK recovery (toujours présent — filet d'urgence). */
  recoveryWrap: { ct: string; nonce: string };
  /** `false` pour les comptes magic-link (pas de mot de passe). */
  pwWrapPresent: boolean;
}

/** Construit l'enveloppe depuis ses parts (pwWrap optionnel pour magic-link). */
export function buildEnvelope(parts: {
  pwSalt?: string;
  pwWrap?: { ct: string; nonce: string };
  recoveryWrap: { ct: string; nonce: string };
}): KeyEnvelope {
  return {
    v: ENVELOPE_VERSION,
    pwSalt: parts.pwWrap ? parts.pwSalt : undefined,
    pwWrap: parts.pwWrap,
    recoveryWrap: parts.recoveryWrap,
    pwWrapPresent: Boolean(parts.pwWrap),
  };
}

/** Sérialise l'enveloppe en base64 (colonne `ciphertext` de la row keyEnvelope). */
export function serializeEnvelope(env: KeyEnvelope): string {
  return bytesToBase64(utf8ToBytes(JSON.stringify(env)));
}

/** Parse l'enveloppe depuis le `ciphertext` base64 d'un blob pull. `null` si invalide. */
export function parseEnvelope(ciphertextB64: string): KeyEnvelope | null {
  try {
    const env = JSON.parse(bytesToUtf8(base64ToBytes(ciphertextB64))) as KeyEnvelope;
    if (env.v !== ENVELOPE_VERSION || !env.recoveryWrap) return null;
    return env;
  } catch {
    return null;
  }
}

/** Placeholder nonce pour la row keyEnvelope (colonne `nonce` BYTEA NOT NULL). */
export function envelopePlaceholderNonce(): string {
  return PLACEHOLDER_NONCE_B64;
}