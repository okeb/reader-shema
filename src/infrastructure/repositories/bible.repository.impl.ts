import type { IBibleRepository } from '@/src/domain/repositories/bible.repository';
import type {
  ChapterVerse,
  BiblicalVerse,
  StrongToken,
  StrongFetchItem,
  StrongConcordance,
  BookInfo,
} from '@/src/domain/entities';
import { BookId, VersionId } from '@/src/domain/value-objects';
import * as api from '@/src/infrastructure/api/bible-api';

/**
 * Implémentation de `IBibleRepository` au-dessus du client HTTP `bible-api.ts`.
 * Construit les Value-Objects (`BookId`/`VersionId`) à partir de chaînes et
 * délègue les appels réseau à la couche API.
 */
export class BibleRepositoryImpl implements IBibleRepository {
  async getChapter(version: VersionId, book: BookId, chapter: number): Promise<ChapterVerse[]> {
    return api.getChapter(version.value, book.value, chapter);
  }

  async getReferences(version: VersionId, refs: string[]): Promise<BiblicalVerse[]> {
    return api.getReferences(version.value, refs);
  }

  async getVersesText(
    version: VersionId,
    items: StrongFetchItem[],
  ): Promise<Record<string, string>> {
    return api.getVersesText(version.value, items);
  }

  async getStrongsForVerses(
    version: VersionId,
    items: StrongFetchItem[],
  ): Promise<Record<string, StrongToken[]>> {
    return api.getStrongsForVerses(version.value, items);
  }

  async getStrongOccurrences(
    code: string,
    page: number,
    size: number,
  ): Promise<StrongConcordance | null> {
    return api.getStrongOccurrences(code, { page, size });
  }

  async getBookInfo(version: VersionId, book: BookId): Promise<BookInfo | null> {
    return api.getBookInfo(version.value, book.value);
  }
}

// Helpers conservés pour les consommateurs qui construisent des VOs à la volée.
export { BookId, VersionId };