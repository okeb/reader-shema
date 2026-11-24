import { NextResponse } from 'next/server';
import { requireUser } from '@/src/infrastructure/auth/auth-guard';
import { getSql, bytesToBase64 } from '@/src/infrastructure/database/neon-client';
import type { LegacyBlobMap } from '@/src/domain/entities/sync.entity';

/**
 * Archive chiffrée d'avant la spec 39 (table `user_data`, blobs E2EE des specs 22/28).
 *
 * GET    /api/sync/legacy — renvoie les blobs `{ ciphertext, nonce, updatedAt }` (base64), enveloppe
 *        `keyEnvelope` comprise, pour que le client les déchiffre et les convertisse. `{}` si vide.
 * DELETE /api/sync/legacy — purge l'archive de l'utilisateur une fois convertie.
 *
 * Plus aucune écriture dans `user_data`. Table supprimée le 2027-06-01 (avec cette route).
 *
 * @see specs/39-sync-sans-chiffrement.md §4.3
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const sql = getSql();
  const rows = await sql`
    SELECT kind, ciphertext, nonce, updated_at
    FROM user_data
    WHERE user_id = ${guard.userId}
  `;

  const map: LegacyBlobMap = {};
  for (const r of rows as Array<{ kind: string; ciphertext: Uint8Array; nonce: Uint8Array; updated_at: string | number }>) {
    map[r.kind as keyof LegacyBlobMap] = {
      ciphertext: bytesToBase64(r.ciphertext),
      nonce: bytesToBase64(r.nonce),
      updatedAt: Number(r.updated_at),
    };
  }

  return NextResponse.json(map);
}

export async function DELETE(): Promise<NextResponse> {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const sql = getSql();
  await sql`DELETE FROM user_data WHERE user_id = ${guard.userId}`;

  return new NextResponse(null, { status: 204 });
}
