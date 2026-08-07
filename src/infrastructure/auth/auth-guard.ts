import { NextResponse } from 'next/server';
import { auth, isAuthConfigured } from '@/lib/auth/server';
import { isDbConfigured } from '@/src/infrastructure/database/neon-client';

/**
 * Garde d'authentification partagée par les routes sync/account — spec 22 §5.
 *
 * Résout la session Neon et renvoie l'identifiant utilisateur (`session.user.id`),
 * seul fondement d'isolation des données côté serveur (jamais d'identité client).
 *
 * @returns
 *  - `{ ok: false, response }` : 503 (Neon absent) ou 401 (pas de session) — à retourner tel quel.
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

  const { data: session } = await auth!.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Non authentifie' }, { status: 401 }),
    };
  }

  return { ok: true, userId };
}