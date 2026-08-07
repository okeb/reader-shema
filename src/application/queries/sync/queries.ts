import type { IQuery, IQueryResult } from '@/src/domain/use-cases/base.query.interface';
import type { EncryptedBlob, SyncBlobMap, SyncKind } from '@/src/domain/entities/sync.entity';

/** Tire tous les kinds en un round trip. */
export class PullAllSyncQuery implements IQuery {
  readonly queryType = 'PullAllSync';
}
export type PullAllSyncResult = IQueryResult<SyncBlobMap>;

/** Tire un kind. */
export class PullSyncQuery implements IQuery {
  readonly queryType = 'PullSync';
  constructor(readonly kind: SyncKind) {}
}
export type PullSyncResult = IQueryResult<EncryptedBlob | null>;