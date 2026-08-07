import type { IQuery, IQueryResult } from '@/src/domain/use-cases/base.query.interface';
import type { ChapterVerse } from '@/src/domain/entities';

export interface GetChapterQuery extends IQuery {
  readonly queryType: 'GetChapter';
  readonly version: string;
  readonly bookId: string;
  readonly chapter: number;
}

export interface GetChapterResult extends IQueryResult<ChapterVerse[]> {}