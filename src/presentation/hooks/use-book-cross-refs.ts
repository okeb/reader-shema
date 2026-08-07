'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CrossRef, CrossRefMap } from '@/src/domain/entities';
import { crossRefsRepository } from '@/src/infrastructure/repositories/cross-refs.repository.impl';

export interface UseBookCrossRefs {
  /** Renvois du chapitre courant, indexés par numéro de verset. */
  refsByVerse: Map<number, CrossRef[]>;
  /** Nombre de renvois pour un verset (0 = pas d'indicateur). */
  countForVerse: (n: number) => number;
  /** Liste des renvois d'un verset (vide si aucun). */
  getForVerse: (n: number) => CrossRef[];
  loading: boolean;
}

/**
 * Charge les renvois bibliques (cross-references) d'un livre et expose ceux du chapitre courant,
 * indexés par numéro de verset. Cache 1h (données statiques). Désactivé hors mode read.
 */
export function useBookCrossRefs(bookId: string, chapter: number, enabled: boolean): UseBookCrossRefs {
  const q = useQuery<CrossRefMap>({
    queryKey: ['cross-refs', bookId],
    queryFn: () => crossRefsRepository.getForBook(bookId),
    enabled: enabled && Boolean(bookId),
    staleTime: 1000 * 60 * 60,
  });

  const refsByVerse = useMemo(() => {
    const map = new Map<number, CrossRef[]>();
    if (!q.data) return map;
    for (const [key, refs] of Object.entries(q.data)) {
      const parts = key.split(':');
      const chap = Number.parseInt(parts[0], 10);
      const verse = Number.parseInt(parts[1], 10);
      if (chap === chapter && Number.isFinite(verse)) {
        map.set(verse, refs);
      }
    }
    return map;
  }, [q.data, chapter]);

  return {
    refsByVerse,
    countForVerse: (n) => refsByVerse.get(n)?.length ?? 0,
    getForVerse: (n) => refsByVerse.get(n) ?? [],
    loading: q.isLoading,
  };
}