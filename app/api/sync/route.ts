import { NextResponse } from 'next/server';
import { requireUser } from '@/src/infrastructure/auth/auth-guard';
import { getSql, bytesToBase64 } from '@/src/infrastructure/database/neon-client';
import type { SyncBlobMap } from '@/src/domain/entities/sync.entity';

/**
 * GET /api/sync — pull-all : tire tous les kinds du compte en un round trip.
 *
 * Le serveur ne fait que lire ses blobs opaques et les renvoie tels quels
 * (ciphertext/nonce en base64 + updatedAt). Le déchiffrement est client (E2EE).
 *
 * @see specs/22-compte-sync-admin.md §5
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

  const map: SyncBlobMap = {};
  for (const r of rows as Array<{ kind: string; ciphertext: Uint8Array; nonce: Uint8Array; updated_at: string | number }>) {
    map[r.kind as keyof SyncBlobMap] = {
      ciphertext: bytesToBase64(r.ciphertext),
      nonce: bytesToBase64(r.nonce),
      updatedAt: Number(r.updated_at),
    };
  }

  return NextResponse.json(map);
}