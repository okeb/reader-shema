import { NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe';

/**
 * GET /api/email/unsubscribe?token=… — page de confirmation de désinscription (spec 32, footer Tech).
 *
 * Lien posé dans le footer de tous les e-mails transactionnels. Le token est signé HMAC
 * (`lib/email/unsubscribe.ts`) : on ne fait confiance à aucune charge utile client — un token
 * invalide renvoie 400, un token valide rend une page de confirmation on-brand.
 *
 * Stub de persistance : il n'existe pas encore d'e-mails marketing à supprimer (les e-mails
 * actuels sont transactionnels — reset, vérification, lien magique, clé, welcome — légalement
 * non désinscriptibles). La page confirme donc l'intention ; le câblage d'une préférence
 * persistante est reporté à la spec marketing. Le token reste réel et vérifié (lien vivant,
 * non forgeable) — on ne renvoie jamais une fausse confirmation pour un token invalide.
 */
export const dynamic = 'force-dynamic';

export function GET(request: Request): NextResponse {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) return new NextResponse('Token manquant', { status: 400 });

  const email = verifyUnsubscribeToken(token);
  if (!email) return new NextResponse('Token invalide', { status: 400 });

  return new NextResponse(renderConfirmation(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/** Page de confirmation statique on-brand (accent orange #f76808, DM Sans). */
function renderConfirmation(): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Désinscription confirmée — ShemaProject</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; background: #fcfcfc; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #3f3e3b; }
  main { max-width: 448px; margin: 64px auto; padding: 0 24px; text-align: center; }
  h1 { font-size: 32px; line-height: 1; letter-spacing: -0.05em; font-weight: 700; margin: 0 0 24px; }
  p { font-size: 16px; line-height: 1.5; color: #6b7280; margin: 0 0 16px; }
  a { color: #f76808; text-decoration: none; }
  @media (prefers-color-scheme: dark) {
    body { background: #090909; color: #d8d3c5; }
    p { color: #98a1ad; }
  }
</style>
</head>
<body>
<main>
  <h1>Désinscription confirmée</h1>
  <p>Vous ne recevrez plus d’e-mails de la part de ShemaProject.</p>
  <p>Les e-mails liés à la sécurité de votre compte (réinitialisation de mot de passe, lien de connexion) restent nécessaires et continueront de vous être adressés si vous les déclenchez.</p>
  <p><a href="https://reader.shemaproject.org">Revenir à la lecture →</a></p>
</main>
</body>
</html>`;
}