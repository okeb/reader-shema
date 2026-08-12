import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth/server';
import { requireUser } from '@/src/infrastructure/auth/auth-guard';
import { sendEmail } from '@/lib/email/transport';
import { recoveryKeyEmailHtml } from '@/lib/email/templates';

/**
 * POST /api/email/recovery-key — e-maile la clé de récupération à l'adresse du compte — spec 28.
 *
 * La clé est générée côté client (jamais stockée serveur) et transit une fois par ici pour être
 * e-mailée via Resend. Le destinataire est lu depuis la session (on ne fait PAS confiance à un
 * e-mail fourni par le client) ; l'expéditeur est le domaine vérifié `send.shemaproject.org`.
 *
 * Throttle minimal en mémoire (1 envoi / 60 s / utilisateur) pour spec 28 — un robust rate-limiter
 * est reporté à une spec ultérieure. No-op silencieux si `RESEND_API_KEY` absent (dev).
 *
 * Doctrinal : la clé de récupération est désormais vue fugacement par le serveur (le temps de la
 * passer à Resend) et par le prestataire e-mail — compromis « backup code par e-mail » assumé
 * (spec 28). Elle n'est jamais persistée côté serveur.
 */
export const dynamic = 'force-dynamic';

const THROTTLE_MS = 60_000;
const lastSent = new Map<string, number>();

export async function POST(request: Request): Promise<NextResponse> {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  // Throttle : 1 envoi / 60 s / utilisateur.
  const now = Date.now();
  const last = lastSent.get(guard.userId) ?? 0;
  if (now - last < THROTTLE_MS) {
    return new NextResponse(null, { status: 429 });
  }

  let body: { recoveryKey?: unknown };
  try {
    body = (await request.json()) as { recoveryKey?: unknown };
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 });
  }
  if (typeof body.recoveryKey !== 'string' || !body.recoveryKey.trim()) {
    return NextResponse.json({ error: 'Clé de récupération manquante' }, { status: 400 });
  }

  // Destinataire depuis la session (pas de confiance au client).
  const session = await auth!.api.getSession({ headers: await headers() });
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'Session sans e-mail' }, { status: 400 });
  }

  try {
    await sendEmail({
      to: email,
      subject: 'Votre clé de récupération — ShemaProject',
      html: await recoveryKeyEmailHtml(body.recoveryKey),
    });
    lastSent.set(guard.userId, now);
    return new NextResponse(null, { status: 204 });
  } catch {
    // Échec Resend : on ne fuite pas le détail. La clé reste affichée à l'écran (filet UI).
    return NextResponse.json({ error: "Envoi de l'e-mail échoué" }, { status: 502 });
  }
}