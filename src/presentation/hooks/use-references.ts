'use client';

import { useQuery } from '@tanstack/react-query';
import type { BiblicalVerse } from '@/src/domain/entities';
import { createGetReferencesQuery } from '@/src/application/factories/bible';
import { runQuery } from './use-cqrs';

/**
 * Cartes de référence (mode "références") via GetReferences.
 * `refs` = slugs "livre/chap/selection".
 */
export function useReferences(version: string, refs: string[]) {
  const key = refs.join('|');
  return useQuery<BiblicalVerse[]>({
    queryKey: ['bible', 'references', version, key],
    queryFn: () => runQuery<{ data: BiblicalVerse[] }>(createGetReferencesQuery(version, refs)),
    enabled: Boolean(version && refs.length > 0),
    staleTime: 1000 * 60 * 60,
  });
}