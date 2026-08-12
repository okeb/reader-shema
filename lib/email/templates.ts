/**
 * Templates HTML des e-mails transactionnels (spec 26) — strings simples, CSS inline.
 *
 * On évite `@react-email/*` (déps transitive fragiles) : HTML en dur, copie FR. Chaque
 * template reçoit l'`url` pré-construite par Better Auth (contient déjà le token + le bon
 * endpoint `/api/auth/...`). Le bouton est un lien `<a>` ; un fallback texte URL est
 * affiché dessous (compat lecteurs mail sans HTML).
 */

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#f6f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;padding:32px 0">
      <tr><td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e8ee">
          <tr><td style="padding:24px 32px 0;font-size:16px;font-weight:700">${title}</td></tr>
          <tr><td style="padding:16px 32px 8px;font-size:14px;line-height:1.5;color:#333">${bodyHtml}</td></tr>
          <tr><td style="padding:0 32px 24px;font-size:12px;line-height:1.5;color:#888;border-top:1px solid #eee;margin-top:8px">
            <p style="margin:16px 0 0">ShemaProject — Lecture de la Bible.<br/>Si vous n'êtes pas à l'origine de cet e-mail, ignorez-le sans suite.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px">${label}</a>
          <p style="margin:14px 0 0;font-size:12px;color:#888">Si le bouton ne s'affiche pas, copiez-collez ce lien :<br/><a href="${url}" style="color:#444;word-break:break-all">${url}</a></p>`;
}

/** E-mail de vérification d'adresse (click → `/api/auth/verify-email?token=…`). */
export function verificationEmailHtml(url: string): string {
  return shell(
    'Vérifiez votre e-mail',
    `<p style="margin:0 0 14px">Confirmez votre adresse e-mail pour activer votre compte ShemaProject. Le lien expire dans 1 heure.</p>
     ${button(url, 'Vérifier mon e-mail')}`,
  );
}

/** E-mail de réinitialisation de mot de passe (click → `/api/auth/reset-password/:token?…`). */
export function resetPasswordEmailHtml(url: string): string {
  return shell(
    'Réinitialisez votre mot de passe',
    `<p style="margin:0 0 14px">Vous avez demandé à réinitialiser le mot de passe de votre compte ShemaProject. Ce lien est à usage unique et expire rapidement.</p>
     ${button(url, 'Réinitialiser mon mot de passe')}`,
  );
}

/** Lien magique de connexion (click → `/api/auth/magic-link/verify?token=…`). */
export function magicLinkEmailHtml(email: string, url: string): string {
  return shell(
    'Votre lien de connexion',
    `<p style="margin:0 0 14px">Cliquez pour vous connecter à ShemaProject avec <strong>${email}</strong>. Ce lien expire dans 5 minutes et est à usage unique.</p>
     ${button(url, 'Se connecter')}`,
  );
}

/**
 * Clé de récupération de secours (spec 28) — e-mailée à l'inscription (et au re-keying legacy).
 *
 * Affichée une fois à l'écran ET envoyée par e-mail (filet pour ne jamais la perdre). C'est la clé
 * d'URGENCE : sert à récupérer l'accès aux données si le mot de passe est perdu (ou pour les
 * comptes magic-link, de déverrouillage routine). Pas de bouton : c'est un code à conserver.
 */
export function recoveryKeyEmailHtml(recoveryKey: string): string {
  return shell(
    'Votre clé de récupération',
    `<p style="margin:0 0 14px">Conservez cette clé de récupération en lieu sûr. Elle vous permet de
     retrouver vos données synchronisées si vous perdez votre mot de passe.</p>
     <p style="margin:0 0 10px;font-size:12px;color:#888">Sans cette clé, vos données sont irrécupérables.
     Nous ne la stockons pas.</p>
     <p style="margin:0 0 14px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
     font-size:15px;letter-spacing:.5px;background:#f2f2f5;border:1px solid #e8e8ee;border-radius:8px;
     padding:14px 16px;word-break:break-all">${recoveryKey}</p>
     <p style="margin:0;font-size:12px;color:#888">À utiliser uniquement en cas de besoin.
     En cas de perte, nous ne pourrons pas la régénérer.</p>`,
  );
}