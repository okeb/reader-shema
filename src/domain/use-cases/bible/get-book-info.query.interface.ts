import type { IQuery, IQueryResult } from '@/src/domain/use-cases/base.query.interface';
import type { BookInfo } from '@/src/domain/entities';

export interface GetBookInfoQuery extends IQuery {
  readonly queryType: 'GetBookInfo';
  readonly version: string;
  readonly bookId: string;
}

export interface GetBookInfoResult extends IQueryResult<BookInfo> {}