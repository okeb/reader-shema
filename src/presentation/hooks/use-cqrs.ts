'use client';

import { configureContainer, getCqrsBus } from '@/src/infrastructure/di/container';
import type { IQuery, IQueryResult } from '@/src/domain/use-cases/base.query.interface';

/**
 * Garde d'initialisation CQRS côté client. `configureContainer()` est idempotent :
 * la 1ʳᵉ appel branche les 6 query handlers, les suivants sont immédiats (check de longueur).
 * Appelée par chaque hook Bible avant `executeQuery`.
 */
export function ensureCQRS(): void {
  configureContainer();
}

/** Exécute une query via le bus et renvoie son `data`. */
export async function runQuery<R extends IQueryResult>(query: IQuery): Promise<R['data']> {
  ensureCQRS();
  const result = await getCqrsBus().executeQuery<R>(query);
  return result.data;
}

export { getCqrsBus };