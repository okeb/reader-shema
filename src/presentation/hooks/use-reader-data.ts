'use client';

import type { ChapterVerse, BiblicalVerse, BookInfo } from '@/src/domain/entities';
import { useChapter } from './use-chapter';
import { useReferences } from './use-references';
import { useBookInfo } from './use-book-info';
import type { ReaderMode } from '@/src/presentation/lib/reader-helpers';

interface UseReaderDataArgs {
  mode: ReaderMode;
  version: string;
  bookId: string;
  chapter: number;
  /** Slugs "livre/chap/selection" (mode refs). */
  refs: string[];
}

interface ReaderData {
  verses: ChapterVerse[] | undefined;
  cards: BiblicalVerse[] | undefined;
  loading: boolean;
  error: unknown;
  bookInfo: BookInfo | undefined;
}

/**
 * Source unique des données affichées par le lecteur (read + refs), composée au-dessus
 * des hooks CQRS (React Query gère le cache + l'invalidation des requêtes obsolètes).
 */
export function useReaderData({ mode, version, bookId, chapter, refs }: UseReaderDataArgs): ReaderData {
  // En mode refs, on ne charge pas le chapitre (chapter=0 → useChapter désactivé).
  const chapterQ = useChapter(mode === 'read' ? version : '', bookId, mode === 'read' ? chapter : 0);
  // En mode read, pas de refs → useReferences désactivé.
  const refsQ = useReferences(mode === 'refs' ? version : '', mode === 'refs' ? refs : []);
  // Métadonnées du livre (surtout mode read ; mis en cache 1h).
  const bookInfoQ = useBookInfo(mode === 'read' ? version : '', bookId);

  if (mode === 'refs') {
    return {
      verses: undefined,
      cards: refsQ.data,
      loading: refsQ.isLoading,
      error: refsQ.error,
      bookInfo: undefined,
    };
  }

  return {
    verses: chapterQ.data,
    cards: undefined,
    loading: chapterQ.isLoading,
    error: chapterQ.error,
    bookInfo: bookInfoQ.data,
  };
}