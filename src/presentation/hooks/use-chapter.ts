'use client';

import { useQuery } from '@tanstack/react-query';
import type { ChapterVerse } from '@/src/domain/entities';
import { createGetChapterQuery } from '@/src/application/factories/bible';
import { runQuery } from './use-cqrs';

/**
 * Récupère un chapitre complet (mode "read") via la query CQRS GetChapter.
 * Clé de cache : `['bible','chapter',version,bookId,chapter]`.
 */
export function useChapter(version: string, bookId: string, chapter: number) {
  return useQuery<ChapterVerse[]>({
    queryKey: ['bible', 'chapter', version, bookId, chapter],
    queryFn: () => runQuery<{ data: ChapterVerse[] }>(createGetChapterQuery(version, bookId, chapter)),
    enabled: Boolean(version && bookId && chapter > 0),
    staleTime: 1000 * 60 * 60, // 1h — un chapitre ne change pas.
  });
}