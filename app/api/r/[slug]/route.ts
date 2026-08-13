import { NextResponse } from 'next/server';

/**
 * GET /api/r/:slug — passerelle de redirection pour les liens externes des e-mails (spec 32).
 *
 * Pourquoi cette route existe : les filtres anti-spam (Resend / Mail-Tester) signalent
 * « Ensure link URLs match sending domain » quand un e-mail envoyé depuis `send.shemaproject.org`
 * contient un lien direct vers un domaine tiers (ex. `t.me`). En routant le lien visible via
 * notre propre domaine (`reader.shemaproject.org`, sous-domaine du domaine d'envoi), on satisfait
 * la règle d'alignement et la 302 redirige silencieusement vers la destination réelle.
 *
 * `DESTINATIONS` est la source unique de vérité des destinations. Le `slug` est validé contre
 * cette map — toute valeur inconnue renvoie 404. On ne redirige **jamais** vers une URL fournie
 * par le client (pas de `?url=…`) : pas de vector d'open-redirect.
 */
const DESTINATIONS: Record<string, string> = {
  telegram: 'https://t.me/qZfwYAG7VSszMjgO',
  // facebook: 'https://facebook.com/...',
  // tiktok: 'https://tiktok.com/@...',
};

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const dest = DESTINATIONS[slug];
  if (!dest) return NextResponse.json({ error: 'Destination inconnue' }, { status: 404 });
  return NextResponse.redirect(dest, { status: 302 });
}