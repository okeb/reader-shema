import type { IQuery, IQueryResult } from '@/src/domain/use-cases/base.query.interface';
import type { StrongConcordance } from '@/src/domain/entities';

export interface GetStrongOccurrencesQuery extends IQuery {
  readonly queryType: 'GetStrongOccurrences';
  readonly code: string;
  readonly page: number;
  readonly size: number;
}

export interface GetStrongOccurrencesResult extends IQueryResult<StrongConcordance> {}