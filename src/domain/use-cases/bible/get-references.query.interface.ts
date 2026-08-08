import type { IQuery, IQueryResult } from '@/src/domain/use-cases/base.query.interface';
import type { BiblicalVerse } from '@/src/domain/entities';

export interface GetReferencesQuery extends IQuery {
  readonly queryType: 'GetReferences';
  readonly version: string;
  /** Slugs "livre/chap/selection" (ex. "jean/3/16", "jean/3/1-5,8"). */
  readonly refs: string[];
}

export interface GetReferencesResult extends IQueryResult<BiblicalVerse[]> {}