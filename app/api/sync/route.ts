import { NextResponse } from 'next/server';
import { requireUser } from '@/src/infrastructure/auth/auth-guard';
import { getSql } from '@/src/infrastructure/database/neon-client';
import type { SyncBlobMap } from '@/src/domain/entities/sync.entity';

/**
 * GET /api/sync — pull-all : tire tous les kinds du compte en un round trip.
 *
 * Renvoie `{ [kind]: { payload, updatedAt } }` depuis `user_sync` (JSON en clair, spec 39).
 *
 * @see specs/39-sync-sans-chiffrement.md §6.3
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const sql = getSql();
  const rows = await sql`
    SELECT kind, payload, updated_at
    FROM user_sync
    WHERE user_id = ${guard.userId}
  `;

  const map: SyncBlobMap = {};
  for (const r of rows as Array<{ kind: string; payload: string; updated_at: string | number }>) {
    map[r.kind as keyof SyncBlobMap] = {
      payload: r.payload,
      updatedAt: Number(r.updated_at),
    };
  }

  return NextResponse.json(map);
}
