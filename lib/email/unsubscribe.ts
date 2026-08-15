import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/env.mjs';

/**
 * Lien de désinscription e-mail — token signé HMAC (spec 32, footer modèle Tech).
 *
 * Pourquoi un token signé : le lien `Se désinscrire` est posé dans le footer de **tous** les
 * e-mails transactionnels (vérification, reset, lien magique, clé de récupération, welcome).
 * Il doit être (a) forgeable par personne — d'où un HMAC-SHA256 sur l'e-mail destinataire,
 * (b) sans base de données pour vérifier — le secret (`BETTER_AUTH_SECRET`, ≥ 32 en prod) suffit
 * à valider la signature côté route, (c) durable (pas d'expiration : une préférence de désinscription
 * ne devrait pas expirer).
 *
 * Format : `base64url(email).base64url(hmac)`. `base64url` n'utilise que `A-Za-z0-9-_` (pas de
 * `+`, `/` ni `=`) → sûr dans un query string ; le séparateur `.` n'apparaît jamais dans le corps.
 *
 * Si le secret est absent (mode dev local-only — `RESEND_API_KEY` absent aussi, e-mails no-op),
 * `createUnsubscribeUrl` renvoie `undefined` : le shell n'affiche alors **pas** le lien plutôt
 * que de forger un token non vérifiable.
 *
 * Note persistance : il n'existe pas encore de liste d'envoi marketing à supprimer — la route
 * `/api/email/unsubscribe` renvoie une page de confirmation validée par token. Le câblage d'une
 * préférence persistante (table user / flag) est reporté à la spec marketing qui introduira les
 * e-mails concernés. Le token est réel et vérifié (lien non mort / non forgeable).
 */

const b64url = (b: Buffer) => b.toString('base64url');

/** Construit l'URL de désinscription signée pour `email`, ou `undefined` si le secret est absent. */
export function createUnsubscribeUrl(email: string): string | undefined {
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret) return undefined;
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const mac = createHmac('sha256', secret).update(email).digest();
  const token = `${b64url(Buffer.from(email, 'utf8'))}.${b64url(mac)}`;
  return `${base}/api/email/unsubscribe?token=${token}`;
}

/** Vérifie un token et renvoie l'e-mail qu'il porte, ou `null` si invalide / secret absent. */
export function verifyUnsubscribeToken(token: string): string | null {
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret) return null;
  const [emailB64, macB64] = token.split('.');
  if (!emailB64 || !macB64) return null;

  let email: string;
  try {
    email = Buffer.from(emailB64, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const expected = createHmac('sha256', secret).update(email).digest();
  let given: Buffer;
  try {
    given = Buffer.from(macB64, 'base64url');
  } catch {
    return null;
  }
  if (given.length !== expected.length) return null;
  if (!timingSafeEqual(given, expected)) return null;
  return email;
}