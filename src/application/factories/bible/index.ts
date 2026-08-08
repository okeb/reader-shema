import type { StrongFetchItem } from '@/src/domain/entities';
import {
  GetChapterQuery,
  GetReferencesQuery,
  GetVersesTextQuery,
  GetStrongsForVersesQuery,
  GetStrongOccurrencesQuery,
  GetBookInfoQuery,
} from '@/src/application/queries/bible/queries';

/**
 * Fabriques de queries Bible. Les hooks/presentation construisent les queries
 * via ces fonctions plutôt qu'en instanciant directement les classes, ce qui
 * garde le point d'entrée unique et facilite d'éventuelles validations futures.
 */
export const createGetChapterQuery = (version: string, bookId: string, chapter: number) =>
  new GetChapterQuery(version, bookId, chapter);

export const createGetReferencesQuery = (version: string, refs: string[]) =>
  new GetReferencesQuery(version, refs);

export const createGetVersesTextQuery = (version: string, items: StrongFetchItem[]) =>
  new GetVersesTextQuery(version, items);

export const createGetStrongsForVersesQuery = (version: string, items: StrongFetchItem[]) =>
  new GetStrongsForVersesQuery(version, items);

export const createGetStrongOccurrencesQuery = (code: string, page = 1, size = 20) =>
  new GetStrongOccurrencesQuery(code, page, size);

export const createGetBookInfoQuery = (version: string, bookId: string) =>
  new GetBookInfoQuery(version, bookId);