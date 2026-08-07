import type { ISyncRepository } from '@/src/domain/repositories/sync.repository';
import type { EncryptedBlob, SyncBlobMap, SyncKind } from '@/src/domain/entities/sync.entity';

/** Le compte n'est pas (encore) authentifié — la sync reste inactive sans perte. */
export class NotAuthenticatedError extends Error {
  constructor() {
    super('compte non authentifie');
    this.name = 'NotAuthenticatedError';
  }
}

/** L'auth n'est pas provisionnée (Neon absent) — mode local-only. */
export class AuthNotConfiguredError extends Error {
  constructor() {
    super('auth non configuree (neon absent)');
    this.name = 'AuthNotConfiguredError';
  }
}

async function parseSync(res: Response): Promise<unknown> {
  if (res.status === 401) throw new NotAuthenticatedError();
  if (res.status === 503) throw new AuthNotConfiguredError();
  if (!res.ok) throw new Error(`sync: echec ${res.status}`);
  return res.json();
}

/**
 * Implémentation client du repository de sync — `fetch` vers les routes
 * `/api/sync/*` (cookies de session Neon envoyés automatiquement, same-origin).
 */
export class SyncRepositoryImpl implements ISyncRepository {
  async pullAll(): Promise<SyncBlobMap> {
    const res = await fetch('/api/sync', { credentials: 'same-origin' });
    const data = (await parseSync(res)) as SyncBlobMap;
    return data ?? {};
  }

  async pullKind(kind: SyncKind): Promise<EncryptedBlob | null> {
    const res = await fetch(`/api/sync/${kind}`, { credentials: 'same-origin' });
    if (res.status === 404) return null;
    return (await parseSync(res)) as EncryptedBlob;
  }

  async pushKind(kind: SyncKind, blob: EncryptedBlob): Promise<{ updatedAt: number }> {
    const res = await fetch(`/api/sync/${kind}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blob),
    });
    return (await parseSync(res)) as { updatedAt: number };
  }

  async deleteAccount(): Promise<void> {
    const res = await fetch('/api/account', {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    if (!res.ok && res.status !== 204) {
      if (res.status === 401) throw new NotAuthenticatedError();
      if (res.status === 503) throw new AuthNotConfiguredError();
      throw new Error(`account: echec ${res.status}`);
    }
  }
}