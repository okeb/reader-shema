'use client';

import { useCallback, useMemo } from 'react';
import { getBookById } from '@/src/shared/constants/bible-books';
import { useAnnotations } from '@/src/presentation/stores/annotations.store';
import { useBookmarks } from '@/src/presentation/stores/bookmarks.store';
import { useActiveVersion } from '@/src/presentation/stores/active-version.store';
import { useAudioManifest } from '@/src/presentation/hooks/use-audio-manifest';

/** Couleurs (surlignages, groupes de signets) d'un chapitre ou d'un livre, triées par fréquence décroissante. */
export interface HighlightSummary {
  colors: string[];
  /** Nombre de versets concernés. */
  count: number;
}

const summarize = (byColor: Map<string, number>): HighlightSummary => ({
  colors: [...byColor.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c),
  count: [...byColor.values()].reduce((a, b) => a + b, 0),
});

/**
 * Repères du sélecteur de passages : chapitres avec audio, surlignages, notes et signets par
 * chapitre / par livre. Surlignages, notes et signets sont ceux de la **version active**
 * (clé `${version}:${bookId}:${chapter}:${verse}`), pour correspondre à ce que l'on verra en
 * ouvrant le chapitre. Une note liée à plusieurs versets d'un même chapitre compte une fois.
 */
export function useChapterMarkers() {
  const primaryId = useActiveVersion((s) => s.primaryId);
  const highlights = useAnnotations((s) => s.highlights);
  const notes = useAnnotations((s) => s.notes);
  const bookmarks = useBookmarks((s) => s.bookmarks);
  const groups = useBookmarks((s) => s.groups);
  const { chaptersByOsis } = useAudioManifest();

  // bookId → chapitre → couleur → nb de versets.
  const index = useMemo(() => {
    const out = new Map<string, Map<number, Map<string, number>>>();
    const prefix = `${primaryId}:`;
    for (const [key, color] of Object.entries(highlights)) {
      if (!key.startsWith(prefix) || !color) continue;
      const parts = key.slice(prefix.length).split(':');
      if (parts.length < 3) continue;
      const chapter = Number(parts[parts.length - 2]);
      const bookId = parts.slice(0, -2).join(':');
      if (!Number.isFinite(chapter)) continue;
      let chapters = out.get(bookId);
      if (!chapters) out.set(bookId, (chapters = new Map()));
      let colors = chapters.get(chapter);
      if (!colors) chapters.set(chapter, (colors = new Map()));
      colors.set(color, (colors.get(color) ?? 0) + 1);
    }
    return out;
  }, [highlights, primaryId]);

  // bookId → chapitre → ids de notes ; bookId → ids de notes.
  const notesIndex = useMemo(() => {
    const byChapter = new Map<string, Map<number, Set<string>>>();
    const byBook = new Map<string, Set<string>>();
    const prefix = `${primaryId}:`;
    for (const note of Object.values(notes)) {
      for (const v of note.verses) {
        if (!v.verseId.startsWith(prefix)) continue;
        let chapters = byChapter.get(v.bookId);
        if (!chapters) byChapter.set(v.bookId, (chapters = new Map()));
        let ids = chapters.get(v.chapter);
        if (!ids) chapters.set(v.chapter, (ids = new Set()));
        ids.add(note.id);
        let bookIds = byBook.get(v.bookId);
        if (!bookIds) byBook.set(v.bookId, (bookIds = new Set()));
        bookIds.add(note.id);
      }
    }
    return { byChapter, byBook };
  }, [notes, primaryId]);

  // Signets : bookId → chapitre → couleur de groupe → nb ; bookId → couleur → nb.
  const bookmarksIndex = useMemo(() => {
    const colorOf = new Map(groups.map((g) => [g.id, g.color]));
    const byChapter = new Map<string, Map<number, Map<string, number>>>();
    const byBook = new Map<string, Map<string, number>>();
    for (const b of bookmarks) {
      if (b.version !== primaryId) continue;
      const color = colorOf.get(b.groupId);
      if (!color) continue;
      let chapters = byChapter.get(b.bookId);
      if (!chapters) byChapter.set(b.bookId, (chapters = new Map()));
      let colors = chapters.get(b.chapter);
      if (!colors) chapters.set(b.chapter, (colors = new Map()));
      colors.set(color, (colors.get(color) ?? 0) + 1);
      let bookColors = byBook.get(b.bookId);
      if (!bookColors) byBook.set(b.bookId, (bookColors = new Map()));
      bookColors.set(color, (bookColors.get(color) ?? 0) + 1);
    }
    return { byChapter, byBook };
  }, [bookmarks, groups, primaryId]);

  const bookSummaries = useMemo(() => {
    const out = new Map<string, HighlightSummary>();
    for (const [bookId, chapters] of index) {
      const merged = new Map<string, number>();
      for (const colors of chapters.values()) {
        for (const [c, n] of colors) merged.set(c, (merged.get(c) ?? 0) + n);
      }
      out.set(bookId, summarize(merged));
    }
    return out;
  }, [index]);

  /** Chapitres disposant d'un audio (manifest global ; vide tant qu'il n'est pas chargé). */
  const audioChaptersOf = useCallback(
    (bookId: string): Set<number> | undefined => {
      const osis = getBookById(bookId)?.osis;
      return osis ? chaptersByOsis.get(osis) : undefined;
    },
    [chaptersByOsis],
  );

  const chapterHighlights = useCallback(
    (bookId: string, chapter: number): HighlightSummary | undefined => {
      const colors = index.get(bookId)?.get(chapter);
      return colors ? summarize(colors) : undefined;
    },
    [index],
  );

  const bookHighlights = useCallback(
    (bookId: string): HighlightSummary | undefined => bookSummaries.get(bookId),
    [bookSummaries],
  );

  /** Nombre de notes touchant ce chapitre (0 si aucune). */
  const chapterNotes = useCallback(
    (bookId: string, chapter: number): number => notesIndex.byChapter.get(bookId)?.get(chapter)?.size ?? 0,
    [notesIndex],
  );

  /** Nombre de notes touchant ce livre (0 si aucune). */
  const bookNotes = useCallback(
    (bookId: string): number => notesIndex.byBook.get(bookId)?.size ?? 0,
    [notesIndex],
  );

  /** Signets du chapitre (couleurs de groupe par fréquence), ou `undefined` si aucun. */
  const chapterBookmarks = useCallback(
    (bookId: string, chapter: number): HighlightSummary | undefined => {
      const colors = bookmarksIndex.byChapter.get(bookId)?.get(chapter);
      return colors ? summarize(colors) : undefined;
    },
    [bookmarksIndex],
  );

  /** Signets du livre (couleurs de groupe par fréquence), ou `undefined` si aucun. */
  const bookBookmarks = useCallback(
    (bookId: string): HighlightSummary | undefined => {
      const colors = bookmarksIndex.byBook.get(bookId);
      return colors ? summarize(colors) : undefined;
    },
    [bookmarksIndex],
  );

  return {
    audioChaptersOf,
    chapterHighlights,
    bookHighlights,
    chapterNotes,
    bookNotes,
    chapterBookmarks,
    bookBookmarks,
  };
}
