import { cqrsBus } from './cqrs-bus';
import type { IBibleRepository } from '@/src/domain/repositories/bible.repository';
import {
  GetChapterQueryHandler,
  GetReferencesQueryHandler,
  GetVersesTextQueryHandler,
  GetStrongsForVersesQueryHandler,
  GetStrongOccurrencesQueryHandler,
  GetBookInfoQueryHandler,
} from '@/src/application/handlers/bible/handlers';

/**
 * Configurateur CQRS — branche les 6 query handlers sur le bus.
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