import type { IBibleRepository } from '@/src/domain/repositories/bible.repository';
import type { IQueryHandler, IQueryResult } from '@/src/domain/use-cases/base.query.interface';
import type {
  GetChapterQuery,
  GetReferencesQuery,
  GetVersesTextQuery,
  GetStrongsForVersesQuery,
  GetStrongOccurrencesQuery,
  GetBookInfoQuery,
} from '@/src/application/queries/bible/queries';
import type {
  GetChapterResult,
  GetReferencesResult,
  GetVersesTextResult,
  GetStrongsForVersesResult,
  GetStrongOccurrencesResult,
  GetBookInfoResult,
} from '@/src/domain/use-cases/bible';
import { BookId, VersionId } from '@/src/domain/value-objects';

const ok = <T>(data: T): IQueryResult<T> => ({ data });

/** Handler GetChapter. */
export class GetChapterQueryHandler implements IQueryHandler<GetChapterQuery, GetChapterResult> {
  readonly queryType = 'GetChapter';
  constructor(private readonly repo: IBibleRepository) {}
  async handle(query: GetChapterQuery): Promise<GetChapterResult> {
    const data = await this.repo.getChapter(
      VersionId.create(query.version),
      BookId.create(query.bookId),
      query.chapter,
    );
    return ok(data);
  }
}

/** Handler GetReferences. */
export class GetReferencesQueryHandler implements IQueryHandler<GetReferencesQuery, GetReferencesResult> {
  readonly queryType = 'GetReferences';
  constructor(private readonly repo: IBibleRepository) {}
  async handle(query: GetReferencesQuery): Promise<GetReferencesResult> {
    const data = await this.repo.getReferences(VersionId.create(query.version), query.refs);
    return ok(data);
  }
}

/** Handler GetVersesText. */
export class GetVersesTextQueryHandler implements IQueryHandler<GetVersesTextQuery, GetVersesTextResult> {
  readonly queryType = 'GetVersesText';
  constructor(private readonly repo: IBibleRepository) {}
  async handle(query: GetVersesTextQuery): Promise<GetVersesTextResult> {
    const data = await this.repo.getVersesText(VersionId.create(query.version), query.items);
    return ok(data);
  }
}

/** Handler GetStrongsForVerses. */
export class GetStrongsForVersesQueryHandler
  implements IQueryHandler<GetStrongsForVersesQuery, GetStrongsForVersesResult>
{
  readonly queryType = 'GetStrongsForVerses';
  constructor(private readonly repo: IBibleRepository) {}
  async handle(query: GetStrongsForVersesQuery): Promise<GetStrongsForVersesResult> {
    const data = await this.repo.getStrongsForVerses(VersionId.create(query.version), query.items);
    return ok(data);
  }
}

/** Handler GetStrongOccurrences. */
export class GetStrongOccurrencesQueryHandler
  implements IQueryHandler<GetStrongOccurrencesQuery, GetStrongOccurrencesResult>
{
  readonly queryType = 'GetStrongOccurrences';
  constructor(private readonly repo: IBibleRepository) {}
  async handle(query: GetStrongOccurrencesQuery): Promise<GetStrongOccurrencesResult> {
    const data = await this.repo.getStrongOccurrences(query.code, query.page, query.size);
    // 404 → concordance vide plutôt que null côté UI.
    return ok(
      data ?? {
        code: query.code,
        total: 0,
        page: query.page,
        size: query.size,
        lexicon: {},
        items: [],
      },
    );
  }
}

/** Handler GetBookInfo. */
export class GetBookInfoQueryHandler implements IQueryHandler<GetBookInfoQuery, GetBookInfoResult> {
  readonly queryType = 'GetBookInfo';
  constructor(private readonly repo: IBibleRepository) {}
  async handle(query: GetBookInfoQuery): Promise<GetBookInfoResult> {
    const data = await this.repo.getBookInfo(VersionId.create(query.version), BookId.create(query.bookId));
    return ok(data ?? {});
  }
}