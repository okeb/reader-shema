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
  LegacyBlobMap,
  SyncBlob,
  SyncBlobMap,
} from '@/src/domain/entities/sync.entity';
import {
  PullAllSyncQuery,
  PullLegacySyncQuery,
  PullSyncQuery,
} from '@/src/application/queries/sync/queries';
import {
  DeleteAccountCommand,
  DeleteLegacySyncCommand,
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
  implements IQueryHandler<PullSyncQuery, IQueryResult<SyncBlob | null>>
{
  readonly queryType = 'PullSync';
  constructor(private readonly repo: ISyncRepository) {}
  handle(q: PullSyncQuery): Promise<IQueryResult<SyncBlob | null>> {
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

export class PullLegacySyncQueryHandler
  implements IQueryHandler<PullLegacySyncQuery, IQueryResult<LegacyBlobMap>>
{
  readonly queryType = 'PullLegacySync';
  constructor(private readonly repo: ISyncRepository) {}
  handle(_q: PullLegacySyncQuery): Promise<IQueryResult<LegacyBlobMap>> {
    return this.repo.pullLegacy().then((data) => ({ data }));
  }
}

export class DeleteLegacySyncCommandHandler
  implements ICommandHandler<DeleteLegacySyncCommand, void>
{
  readonly commandType = 'DeleteLegacySync';
  constructor(private readonly repo: ISyncRepository) {}
  async handle(_c: DeleteLegacySyncCommand): Promise<ICommandResult<void>> {
    await this.repo.deleteLegacy();
    return { data: undefined };
  }
}
