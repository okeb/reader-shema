'use client';

import { useQuery } from '@tanstack/react-query';
import type { StrongConcordance } from '@/src/domain/entities';
import { createGetStrongOccurrencesQuery } from '@/src/application/factories/bible';
import { runQuery } from './use-cqrs';

/** Concordance paginée d'un code Strong (endpoint /bym/strong/:code). */
export function useStrongOccurrences(code: string | null, page = 1, size = 20) {
  return useQuery<StrongConcordance>({
    queryKey: ['bible', 'strong-occurrences', code, page, size],
    queryFn: () =>
      runQuery<{ data: StrongConcordance }>(createGetStrongOccurrencesQuery(code ?? '', page, size)),
    enabled: Boolean(code),
    staleTime: 1000 * 60 * 60,
  });
}
