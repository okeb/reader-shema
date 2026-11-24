import type { ICommand } from '@/src/domain/use-cases/base.command.interface';
import type { SyncBlob, SyncKind } from '@/src/domain/entities/sync.entity';

/** Pousse un kind. */
export class PushSyncCommand implements ICommand {
  readonly commandType = 'PushSync';
  constructor(readonly kind: SyncKind, readonly blob: SyncBlob) {}
}

/** Supprime toutes les données cloud du compte. */
export class DeleteAccountCommand implements ICommand {
  readonly commandType = 'DeleteAccount';
}

/** Supprime l'archive chiffrée (spec 39 §4.3) une fois convertie. */
export class DeleteLegacySyncCommand implements ICommand {
  readonly commandType = 'DeleteLegacySync';
}
