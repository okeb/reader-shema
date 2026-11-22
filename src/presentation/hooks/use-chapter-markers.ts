'use client';

import { useCallback, useMemo } from 'react';
import { getBookById } from '@/src/shared/constants/bible-books';
import { useAnnotations } from '@/src/presentation/stores/annotations.store';
import { useActiveVersion } from '@/src/presentation/stores/active-version.store';
import { useAudioManifest } from '@/src/presentation/hooks/use-audio-manifest';

/** Couleurs de surlignage d'un chapitre ou d'un livre, triées par fréquence décroissante. */
export interface HighlightSummary {
  colors: string[];
  /** Nombre de versets surlignés. */
  count: number;
}

const summarize = (byColor: Map<string, number>): HighlightSummary => ({
  colors: [...byColor.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c),
  count: [...byColor.values()].reduce((a, b) => a + b, 0),
});

/**
 * Repères du sélecteur de passages : chapitres avec audio et surlignages par chapitre / par livre.
 * Les surlignages sont ceux de la **version active** (clé `${version}:${bookId}:${chapter}:${verse}`),
 * pour correspondre à ce que l'on verra en ouvrant le chapitre.
 */
export function useChapterMarkers() {
  const primaryId = useActiveVersion((s) => s.primaryId);
  const highlights = useAnnotations((s) => s.highlights);
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

  return { audioChaptersOf, chapterHighlights, bookHighlights };
}
