import { Resend } from 'resend';
import { env } from '@/env.mjs';

/**
 * Transport e-mail transactionnel (Resend) — spec 26.
 *
 * Source unique d'envoi pour les e-mails Better Auth (vérification, reset mot de passe,
 * lien magique) et, plus tard (spec ultérieure), la recovery key à l'inscription.
 *
 * `RESEND_API_KEY` est optionnelle : en dev (clé absente) `sendEmail` no-op + `console.warn`
 * plutôt que de planter les flux d'auth. En prod, le domaine expéditeur
 * (`send.shemaproject.org`) doit être vérifié dans Resend.
 */

let _resend: Resend | null = null;

function getResend(): Resend {
  if (_resend) return _resend;
  if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY manquant');
  _resend = new Resend(env.RESEND_API_KEY);
  return _resend;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
}

/** Expéditeur transactionnel. Domaine `send.shemaproject.org` à vérifier dans Resend. */
const FROM = 'The Shema Email <hello@send.shemaproject.org>';

export async function sendEmail(msg: OutgoingEmail): Promise<void> {
  if (!env.RESEND_API_KEY) {
    // dev/no-op : on ne bloque pas l'auth faute de prestataire mail configuré.
    console.warn('[email] RESEND_API_KEY absent — e-mail non envoyé:', msg.to, msg.subject);
    return;
  }
  const { error } = await getResend().emails.send({
    from: FROM,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
  });
  if (error) throw new Error(`Envoi e-mail échoué: ${error.message}`);
}