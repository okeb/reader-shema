import { NextResponse } from 'next/server';
import { requireUser } from '@/src/infrastructure/auth/auth-guard';
import { getSql, base64ToBuffer, bytesToBase64 } from '@/src/infrastructure/database/neon-client';
import { SYNC_KINDS, type SyncKind } from '@/src/domain/entities/sync.entity';

/**
 * Routes per-kind de la sync — spec 22 §5.
 *
 * GET  /api/sync/[kind] — tire un kind (404 si absent).
 * PUT  /api/sync/[kind] — pousse un blob chiffré. Le serveur applique le garde
 *   last-write-wins : `ON CONFLICT ... DO UPDATE ... WHERE updated_at < EXCLUDED.updated_at`.
 *   Renvoie l'horodatage retenu (le nul si accepté, l'existant si rejeté) pour que le
 *   client aligne son horloge LWW.
 *
 * Le serveur ne voit jamais le clair ni la clé : body opaque `{ ciphertext, nonce, updatedAt }`.
 *
 * @see specs/22-compte-sync-admin.md §5
 */
export const dynamic = 'force-dynamic';

interface PutBody {
  ciphertext?: unknown;
  nonce?: unknown;
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
    SELECT ciphertext, nonce, updated_at
    FROM user_data
    WHERE user_id = ${guard.userId} AND kind = ${kind}
  `;

  if (rows.length === 0) {
    return new NextResponse(null, { status: 404 });
  }

  const r = rows[0] as { ciphertext: Uint8Array; nonce: Uint8Array; updated_at: string | number };
  return NextResponse.json({
    ciphertext: bytesToBase64(r.ciphertext),
    nonce: bytesToBase64(r.nonce),
    updatedAt: Number(r.updated_at),
  });
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
    typeof body.ciphertext !== 'string' ||
    typeof body.nonce !== 'string' ||
    typeof body.updatedAt !== 'number' ||
    !Number.isFinite(body.updatedAt)
  ) {
    return NextResponse.json({ error: 'Payload invalide' }, { status: 400 });
  }

  const ciphertext = base64ToBuffer(body.ciphertext);
  const nonce = base64ToBuffer(body.nonce);
  const updatedAt = Math.floor(body.updatedAt);

  const sql = getSql();
  // Upsert LWW : on n'écrase que si le blob entrant est plus récent.
  const upserted = await sql`
    INSERT INTO user_data (user_id, kind, ciphertext, nonce, updated_at)
    VALUES (${guard.userId}, ${kind}, ${ciphertext}, ${nonce}, ${updatedAt})
    ON CONFLICT (user_id, kind) DO UPDATE SET
      ciphertext = EXCLUDED.ciphertext,
      nonce = EXCLUDED.nonce,
      updated_at = EXCLUDED.updated_at
    WHERE user_data.updated_at < EXCLUDED.updated_at
    RETURNING updated_at
  `;

  let retained: number;
  if (upserted.length > 0) {
    retained = Number((upserted[0] as { updated_at: string | number }).updated_at);
  } else {
    // LWW a rejeté la mise à jour (remote plus récent) — on renvoie l'existant.
    const existing = await sql`
      SELECT updated_at FROM user_data WHERE user_id = ${guard.userId} AND kind = ${kind}
    `;
    retained = existing.length > 0
      ? Number((existing[0] as { updated_at: string | number }).updated_at)
      : updatedAt;
  }

  return NextResponse.json({ updatedAt: retained });
}