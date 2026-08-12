/**
 * E-mails transactionnels ShemaProject — refonte react.email (spec 32).
 *
 * Remplace les templates HTML écrits à la main (CSS inline, design neutre) par des composants
 * **[react.email](https://react.email/)** rendus en HTML via `renderEmail` (`@react-email/render`,
 * React 19 / react-dom/server). Design moderne et cohérent avec l'identité ShemaProject : thème
 * adaptatif clair/sombre (`prefers-color-scheme`), accent orange `#f76808`, logo apposé.
 *
 * Décision inversée vs spec 26 qui évitait `@react-email/*` par prudence (déps transitive fragiles) :
 * les déps sont désormais acceptées (spec 32 §8). Si une dep casse le build, retomber sur les
 * styles inline react.email (sans `<Tailwind>`) — les composants `@react-email/components` restent
 * utilisables sans `@react-email/tailwind`.
 *
 * **Contrat transport inchangé** : chaque fonction async renvoie une chaîne HTML passée à
 * `sendEmail({ to, subject, html })`. Les sujets et destinataires ne changent pas. Les `url`
 * pré-construites par Better Auth (déjà tokenisées) sont réutilisées telles quelles — aucun
 * rebuilding d'URL. Signatures `string` → `Promise<string>` (async) : les callers `await`.
 */

import { renderEmail } from '@/lib/email/render';
import { VerificationEmail } from '@/lib/email/templates/verification';
import { ResetPasswordEmail } from '@/lib/email/templates/reset-password';
import { MagicLinkEmail } from '@/lib/email/templates/magic-link';
import { RecoveryKeyEmail } from '@/lib/email/templates/recovery-key';
import { WelcomeEmail } from '@/lib/email/templates/welcome';

// Composants React ré-exportés (prévisualisation / réutilisation).
export { VerificationEmail, ResetPasswordEmail, MagicLinkEmail, RecoveryKeyEmail, WelcomeEmail };

/** E-mail de vérification d'adresse (click → `/api/auth/verify-email?token=…`). */
export async function verificationEmailHtml(url: string): Promise<string> {
  return renderEmail(<VerificationEmail url={url} />);
}

/** E-mail de réinitialisation de mot de passe (click → `/api/auth/reset-password/:token?…`). */
export async function resetPasswordEmailHtml(url: string): Promise<string> {
  return renderEmail(<ResetPasswordEmail url={url} />);
}

/** Lien magique de connexion (click → `/api/auth/magic-link/verify?token=…`). */
export async function magicLinkEmailHtml(email: string, url: string): Promise<string> {
  return renderEmail(<MagicLinkEmail email={email} url={url} />);
}

/**
 * Clé de récupération de secours (spec 28) — e-mailée à l'inscription (et au re-keying legacy).
 * Bloc `<code>` monospace adaptatif, sans bouton (code à conserver, pas à cliquer).
 */
export async function recoveryKeyEmailHtml(recoveryKey: string): Promise<string> {
  return renderEmail(<RecoveryKeyEmail recoveryKey={recoveryKey} />);
}

/** Mail de bienvenue post-inscription (nouveau, spec 32) — déclenché par le hook Better Auth. */
export async function welcomeEmailHtml(name: string, baseUrl: string): Promise<string> {
  return renderEmail(<WelcomeEmail name={name} baseUrl={baseUrl} />);
}