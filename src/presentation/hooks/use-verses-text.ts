'use client';

import { useQuery } from '@tanstack/react-query';
import type { StrongFetchItem } from '@/src/domain/entities';
import { createGetVersesTextQuery } from '@/src/application/factories/bible';
import { runQuery } from './use-cqrs';

/** Texte nu d'une sélection de versets (`id → texte`). */
export function useVersesText(version: string, items: StrongFetchItem[]) {
  const key = items.map((i) => i.id).join('|');
  return useQuery<Record<string, string>>({
    queryKey: ['bible', 'verses-text', version, key],
    queryFn: () =>
      runQuery<{ data: Record<string, string> }>(createGetVersesTextQuery(version, items)),
    enabled: Boolean(version && items.length > 0),
    staleTime: 1000 * 60 * 60,
  });
}