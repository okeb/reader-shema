'use client';

import { useQuery } from '@tanstack/react-query';
import type { StrongFetchItem, StrongToken } from '@/src/domain/entities';
import { createGetStrongsForVersesQuery } from '@/src/application/factories/bible';
import { runQuery } from './use-cqrs';

/** Tokens Strong d'une sélection de versets (`id → StrongToken[]`). */
export function useStrongsForVerses(version: string, items: StrongFetchItem[]) {
  const key = items.map((i) => i.id).join('|');
  return useQuery<Record<string, StrongToken[]>>({
    queryKey: ['bible', 'strongs', version, key],
    queryFn: () =>
      runQuery<{ data: Record<string, StrongToken[]> }>(createGetStrongsForVersesQuery(version, items)),
    enabled: Boolean(version && items.length > 0),
    staleTime: 1000 * 60 * 60,
  });
}