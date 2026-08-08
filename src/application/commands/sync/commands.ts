import type { ICommand } from '@/src/domain/use-cases/base.command.interface';
import type { EncryptedBlob, SyncKind } from '@/src/domain/entities/sync.entity';

/** Pousse un kind (blob déjà chiffré côté client). */
export class PushSyncCommand implements ICommand {
  readonly commandType = 'PushSync';
  constructor(readonly kind: SyncKind, readonly blob: EncryptedBlob) {}
}

/** Supprime toutes les données cloud du compte. */
export class DeleteAccountCommand implements ICommand {
  readonly commandType = 'DeleteAccount';
}