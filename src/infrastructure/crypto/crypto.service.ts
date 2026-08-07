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