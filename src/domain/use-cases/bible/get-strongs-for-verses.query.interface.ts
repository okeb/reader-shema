import type { IQuery, IQueryResult } from '@/src/domain/use-cases/base.query.interface';
import type { StrongToken, StrongFetchItem } from '@/src/domain/entities';

export interface GetStrongsForVersesQuery extends IQuery {
  readonly queryType: 'GetStrongsForVerses';
  readonly version: string;
  readonly items: StrongFetchItem[];
}

/** `id → StrongToken[]` (ids sans données sont absents du résultat). */
export type StrongsForVersesData = Record<string, StrongToken[]>;

export interface GetStrongsForVersesResult extends IQueryResult<StrongsForVersesData> {}