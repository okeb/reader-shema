import type { IQuery, IQueryResult } from '@/src/domain/use-cases/base.query.interface';
import type { StrongFetchItem } from '@/src/domain/entities';

export interface GetVersesTextQuery extends IQuery {
  readonly queryType: 'GetVersesText';
  readonly version: string;
  readonly items: StrongFetchItem[];
}

/** `id → texte` (ids sans données sont absents du résultat). */
export type VersesTextData = Record<string, string>;

export interface GetVersesTextResult extends IQueryResult<VersesTextData> {}