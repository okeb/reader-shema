import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth, isAuthConfigured } from '@/lib/auth/server';
import { isDbConfigured } from '@/src/infrastructure/database/neon-client';

/**
 * Garde d'authentification partagée par les routes sync/account — spec 22 §5 (spec 26 : Better
 * Auth raw).
 *
 * Résout la session Better Auth (`auth.api.getSession({ headers })`) et renvoie l'identifiant
 * utilisateur (`session.user.id`), seul fondement d'isolation des données côté serveur (jamais
 * d'identité client). Note : `headers()` est asynchrone en Next.js 16 → `await headers()`.
 *
 * @returns
 *  - `{ ok: false, response }` : 503 (auth absent) ou 401 (pas de session) — à retourner tel quel.
 *  - `{ ok: true, userId }` : session valide, on continue.
 */
export type AuthGuardResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export async function requireUser(): Promise<AuthGuardResult> {
  if (!isAuthConfigured || !isDbConfigured()) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Auth non configuree' }, { status: 503 }),
    };
  }

  const session = await auth!.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Non authentifie' }, { status: 401 }),
    };
  }

  return { ok: true, userId };
}