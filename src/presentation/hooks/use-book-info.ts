'use client';

import { useQuery } from '@tanstack/react-query';
import type { BookInfo } from '@/src/domain/entities';
import { createGetBookInfoQuery } from '@/src/application/factories/bible';
import { runQuery } from './use-cqrs';

/** Métadonnées d'un livre (endpoint /:version/:livre/info). */
export function useBookInfo(version: string, bookId: string) {
  return useQuery<BookInfo>({
    queryKey: ['bible', 'book-info', version, bookId],
    queryFn: () => runQuery<{ data: BookInfo }>(createGetBookInfoQuery(version, bookId)),
    enabled: Boolean(version && bookId),
    staleTime: 1000 * 60 * 60,
  });
}