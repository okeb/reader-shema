import { cqrsBus } from './cqrs-bus';
import type { IBibleRepository } from '@/src/domain/repositories/bible.repository';
import type { ISyncRepository } from '@/src/domain/repositories/sync.repository';
import {
  GetChapterQueryHandler,
  GetReferencesQueryHandler,
  GetVersesTextQueryHandler,
  GetStrongsForVersesQueryHandler,
  GetStrongOccurrencesQueryHandler,
  GetBookInfoQueryHandler,
} from '@/src/application/handlers/bible/handlers';
import {
  PullAllSyncQueryHandler,
  PullSyncQueryHandler,
  PushSyncCommandHandler,
  DeleteAccountCommandHandler,
} from '@/src/application/handlers/sync/handlers';

/**
 * Configurateur CQRS — branche les 6 query handlers Bible sur le bus.
 * Miroir de `whatpass_web/src/application/cqrs/cqrs-container.ts`, sans les commandes auth
 * (TODO spec 22 : compte-sync).
 *
 * @returns la liste des query types enregistrés (utile pour la vérif Phase 2).
 */
export function configureCQRS(repository: IBibleRepository): string[] {
  // On évite le double-enregistrement en cas de re-configuration à chaud (HMR / tests).
  if (cqrsBus.getRegisteredQueries().length === 0) {
    cqrsBus.registerQueryHandler('GetChapter', new GetChapterQueryHandler(repository));
    cqrsBus.registerQueryHandler('GetReferences', new GetReferencesQueryHandler(repository));
    cqrsBus.registerQueryHandler('GetVersesText', new GetVersesTextQueryHandler(repository));
    cqrsBus.registerQueryHandler('GetStrongsForVerses', new GetStrongsForVersesQueryHandler(repository));
    cqrsBus.registerQueryHandler('GetStrongOccurrences', new GetStrongOccurrencesQueryHandler(repository));
    cqrsBus.registerQueryHandler('GetBookInfo', new GetBookInfoQueryHandler(repository));
  }
  return cqrsBus.getRegisteredQueries();
}

/**
 * Branche les handlers de sync (queries pull + commands push/delete) sur le bus — spec 22.
 * Utilise le registre `commandHandlers` jusqu'ici inutilisé, à la manière préparée pour le
 * compte-sync. Idempotent (HMR / re-config à chaud).
 *
 * @returns la liste des command types enregistrés.
 */
export function configureSync(repository: ISyncRepository): string[] {
  if (!cqrsBus.hasQueryHandler('PullAllSync')) {
    cqrsBus.registerQueryHandler('PullAllSync', new PullAllSyncQueryHandler(repository));
    cqrsBus.registerQueryHandler('PullSync', new PullSyncQueryHandler(repository));
    cqrsBus.registerCommandHandler('PushSync', new PushSyncCommandHandler(repository));
    cqrsBus.registerCommandHandler('DeleteAccount', new DeleteAccountCommandHandler(repository));
  }
  return cqrsBus.getRegisteredCommands();
}