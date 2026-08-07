import type {
  ICommandHandler,
  ICommandResult,
} from '@/src/domain/use-cases/base.command.interface';
import type {
  IQueryHandler,
  IQueryResult,
} from '@/src/domain/use-cases/base.query.interface';
import type { ISyncRepository } from '@/src/domain/repositories/sync.repository';
import type {
  EncryptedBlob,
  SyncBlobMap,
} from '@/src/domain/entities/sync.entity';
import { PullAllSyncQuery, PullSyncQuery } from '@/src/application/queries/sync/queries';
import {
  DeleteAccountCommand,
  PushSyncCommand,
} from '@/src/application/commands/sync/commands';

export class PullAllSyncQueryHandler
  implements IQueryHandler<PullAllSyncQuery, IQueryResult<SyncBlobMap>>
{
  readonly queryType = 'PullAllSync';
  constructor(private readonly repo: ISyncRepository) {}
  handle(_q: PullAllSyncQuery): Promise<IQueryResult<SyncBlobMap>> {
    return this.repo.pullAll().then((data) => ({ data }));
  }
}

export class PullSyncQueryHandler
  implements IQueryHandler<PullSyncQuery, IQueryResult<EncryptedBlob | null>>
{
  readonly queryType = 'PullSync';
  constructor(private readonly repo: ISyncRepository) {}
  handle(q: PullSyncQuery): Promise<IQueryResult<EncryptedBlob | null>> {
    return this.repo.pullKind(q.kind).then((data) => ({ data }));
  }
}

export class PushSyncCommandHandler
  implements ICommandHandler<PushSyncCommand, { updatedAt: number }>
{
  readonly commandType = 'PushSync';
  constructor(private readonly repo: ISyncRepository) {}
  handle(c: PushSyncCommand): Promise<ICommandResult<{ updatedAt: number }>> {
    return this.repo.pushKind(c.kind, c.blob).then((data) => ({ data }));
  }
}

export class DeleteAccountCommandHandler
  implements ICommandHandler<DeleteAccountCommand, void>
{
  readonly commandType = 'DeleteAccount';
  constructor(private readonly repo: ISyncRepository) {}
  async handle(_c: DeleteAccountCommand): Promise<ICommandResult<void>> {
    await this.repo.deleteAccount();
    return { data: undefined };
  }
}