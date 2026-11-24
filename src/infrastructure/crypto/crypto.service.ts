/**
 * Lecture de l'archive chiffrée d'avant la spec 39 — déchiffrement seul.
 *
 * Jusqu'à la spec 39, la sync était chiffrée de bout en bout (AES-GCM 256, Web Crypto) : un DEK
 * aléatoire chiffrait chaque kind ; il était wrappé par une KEK dérivée du mot de passe (spec 28) et
 * par une KEK dérivée de la clé de récupération. Les comptes antérieurs à la spec 28 chiffraient
 * directement avec `deriveMasterKey(clé de récupération)`.
 *
 * La sync est désormais en clair ; ce module ne sert plus qu'à **déchiffrer** l'archive `user_data`
 * pour la convertir (`convertLegacy`, `sync-engine.ts`). Plus aucune primitive de chiffrement n'est exposée.
 * À supprimer le 2027-06-01 avec l'archive.
 */

// Sel d'application de la KEK « clé de récupération » (spec 22) — constant, non secret.
const APP_SALT_B64 = 'c2hlbWEtcmVhZGVyLXNwZWMtMjItc2FsdA=='; // "shema-reader-spec-22-salt"
const PBKDF2_ITERATIONS = 250_000;
const KEY_LENGTH = 256;
const ENVELOPE_VERSION = 1;

function assertCrypto(): void {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('crypto.subtle indisponible (contexte non navigateur ?)');
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const utf8ToBytes = (s: string): Uint8Array => new TextEncoder().encode(s);
const bytesToUtf8 = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

async function pbkdf2AesKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  assertCrypto();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    utf8ToBytes(secret) as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['decrypt'],
  );
}

/** KEK (ou master key pré-spec-28) dérivée d'une clé de récupération. */
export function deriveMasterKey(recoveryKey: string): Promise<CryptoKey> {
  return pbkdf2AesKey(recoveryKey, base64ToBytes(APP_SALT_B64));
}

/** KEK dérivée du mot de passe, avec le sel par-utilisateur de l'enveloppe. */
export function deriveKekPw(password: string, pwSaltB64: string): Promise<CryptoKey> {
  return pbkdf2AesKey(password, base64ToBytes(pwSaltB64));
}

/** Déchiffre un blob AES-GCM. Lève si la clé est incorrecte (auth tag invalide). */
export async function decryptBlob(key: CryptoKey, ciphertext: string, nonce: string): Promise<string> {
  assertCrypto();
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(nonce) as BufferSource },
    key,
    base64ToBytes(ciphertext) as BufferSource,
  );
  return bytesToUtf8(new Uint8Array(plainBuf));
}

/** Déwrappe le DEK avec une KEK. Lève si la KEK est incorrecte. */
export async function unwrapDek(kek: CryptoKey, ct: string, nonce: string): Promise<CryptoKey> {
  const b64 = await decryptBlob(kek, ct, nonce);
  return crypto.subtle.importKey(
    'raw',
    base64ToBytes(b64) as BufferSource,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['decrypt'],
  );
}

/** Enveloppe DEK/KEK (spec 28), stockée dans l'archive sous le kind `keyEnvelope`. */
export interface KeyEnvelope {
  v: number;
  pwSalt?: string;
  pwWrap?: { ct: string; nonce: string };
  recoveryWrap: { ct: string; nonce: string };
  pwWrapPresent: boolean;
}

/** Parse l'enveloppe depuis le `ciphertext` base64 de la ligne `keyEnvelope`. `null` si invalide. */
export function parseEnvelope(ciphertextB64: string): KeyEnvelope | null {
  try {
    const env = JSON.parse(bytesToUtf8(base64ToBytes(ciphertextB64))) as KeyEnvelope;
    if (env.v !== ENVELOPE_VERSION || !env.recoveryWrap) return null;
    return env;
  } catch {
    return null;
  }
}
