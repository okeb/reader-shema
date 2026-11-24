import { NextResponse } from 'next/server';
import { requireUser } from '@/src/infrastructure/auth/auth-guard';
import { getSql } from '@/src/infrastructure/database/neon-client';

/**
 * DELETE /api/account — supprime toutes les données cloud du compte — spec 22 §5.
 *
 * Purge les données synchronisées de l'utilisateur (`user_sync`, spec 39) et l'archive chiffrée
 * d'avant la spec 39 (`user_data`). La
 * fermeture complète de l'identité côté Neon (signOut / suppression du user) est
 * orchestrée côté client après ce 204 : on reste un dumb pipe sur nos données.
 * Immédiat et silencieux : aucun email de relance, aucune métrique.
 *
 * @see specs/22-compte-sync-admin.md §5, specs/39-sync-sans-chiffrement.md
 */
export const dynamic = 'force-dynamic';

export async function DELETE(): Promise<NextResponse> {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const sql = getSql();
  await sql`DELETE FROM user_sync WHERE user_id = ${guard.userId}`;
  await sql`DELETE FROM user_data WHERE user_id = ${guard.userId}`;

  return new NextResponse(null, { status: 204 });
}