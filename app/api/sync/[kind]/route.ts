import { NextResponse } from 'next/server';
import { requireUser } from '@/src/infrastructure/auth/auth-guard';
import { getSql } from '@/src/infrastructure/database/neon-client';
import { SYNC_KINDS, type SyncKind } from '@/src/domain/entities/sync.entity';

/**
 * Routes per-kind de la sync — spec 22 §5, spec 39.
 *
 * GET  /api/sync/[kind] — tire un kind (404 si absent).
 * PUT  /api/sync/[kind] — pousse `{ payload, updatedAt }` (JSON en clair). Le serveur applique le
 *   garde last-write-wins : `ON CONFLICT ... DO UPDATE ... WHERE updated_at < EXCLUDED.updated_at`.
 *   Renvoie l'horodatage retenu (le nôtre si accepté, l'existant si rejeté) pour que le client
 *   aligne son horloge LWW.
 *
 * Le `payload` est stocké tel quel (TEXT) : on vérifie seulement que c'est du JSON valide et qu'il
 * ne dépasse pas 2 Mo.
 *
 * @see specs/39-sync-sans-chiffrement.md §6.3
 */
export const dynamic = 'force-dynamic';

/** Taille maximale d'un payload (octets UTF-8). */
const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;

interface PutBody {
  payload?: unknown;
  updatedAt?: unknown;
}

function isSyncKind(kind: string): kind is SyncKind {
  return (SYNC_KINDS as string[]).includes(kind);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> },
): Promise<NextResponse> {
  const { kind } = await params;
  if (!isSyncKind(kind)) {
    return NextResponse.json({ error: 'Kind inconnu' }, { status: 400 });
  }

  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const sql = getSql();
  const rows = await sql`
    SELECT payload, updated_at
    FROM user_sync
    WHERE user_id = ${guard.userId} AND kind = ${kind}
  `;

  if (rows.length === 0) {
    return new NextResponse(null, { status: 404 });
  }

  const r = rows[0] as { payload: string; updated_at: string | number };
  return NextResponse.json({ payload: r.payload, updatedAt: Number(r.updated_at) });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
): Promise<NextResponse> {
  const { kind } = await params;
  if (!isSyncKind(kind)) {
    return NextResponse.json({ error: 'Kind inconnu' }, { status: 400 });
  }

  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 });
  }

  if (
    typeof body.payload !== 'string' ||
    typeof body.updatedAt !== 'number' ||
    !Number.isFinite(body.updatedAt)
  ) {
    return NextResponse.json({ error: 'Payload invalide' }, { status: 400 });
  }
  if (Buffer.byteLength(body.payload, 'utf8') > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: 'Payload trop volumineux' }, { status: 413 });
  }
  try {
    JSON.parse(body.payload);
  } catch {
    return NextResponse.json({ error: 'Payload JSON invalide' }, { status: 400 });
  }

  const payload = body.payload;
  const updatedAt = Math.floor(body.updatedAt);

  const sql = getSql();
  // Upsert LWW : on n'écrase que si le blob entrant est plus récent.
  const upserted = await sql`
    INSERT INTO user_sync (user_id, kind, payload, updated_at)
    VALUES (${guard.userId}, ${kind}, ${payload}, ${updatedAt})
    ON CONFLICT (user_id, kind) DO UPDATE SET
      payload = EXCLUDED.payload,
      updated_at = EXCLUDED.updated_at
    WHERE user_sync.updated_at < EXCLUDED.updated_at
    RETURNING updated_at
  `;

  let retained: number;
  if (upserted.length > 0) {
    retained = Number((upserted[0] as { updated_at: string | number }).updated_at);
  } else {
    // LWW a rejeté la mise à jour (remote plus récent) — on renvoie l'existant.
    const existing = await sql`
      SELECT updated_at FROM user_sync WHERE user_id = ${guard.userId} AND kind = ${kind}
    `;
    retained = existing.length > 0
      ? Number((existing[0] as { updated_at: string | number }).updated_at)
      : updatedAt;
  }

  return NextResponse.json({ updatedAt: retained });
}
