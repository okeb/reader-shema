'use client';

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { getBookById } from '@/src/shared/constants/bible-books';
import type { BiblicalVerse, StrongFetchItem, StrongToken } from '@/src/domain/entities';
import type { StrongVerseView } from '@/src/presentation/components/molecules/m-strong-panel';
import type { VerseSelection } from '@/src/presentation/hooks/use-verse-selection';
import type { ReaderMode } from '@/src/presentation/lib/reader-helpers';
import { useStrongsForVerses } from './use-strongs-for-verses';

/** Concordance d'un token Strong ouverte par-dessus le panneau, ou null. */
export interface Concordance {
  code: string;
  title: string;
  lang?: string;
}

interface UseStrongDataArgs {
  strongsOpen: boolean;
  setStrongsOpen: Dispatch<SetStateAction<boolean>>;
  selection: VerseSelection;
  /** Cartes du mode refs (résolution des ids de sélection en versets). */
  cards: BiblicalVerse[];
  mode: ReaderMode;
  version: string;
}

/**
 * Données du panneau Strong des versets sélectionnés : chargement à la demande (CQRS via
 * `useStrongsForVerses`), vue prête à afficher (triée par numéro de verset en lecture continue)
 * et concordance d'un token.
 *
 * En mode `read`, les ids de sélection sont de la forme `bookId:chapter:verse` (issus de
 * `verseId`) → on résous directement. En mode `refs`, les ids sont ceux des cartes → on résous
 * via `cards` (une carte peut porter plusieurs versets).
 *
 * L'état d'ouverture du panneau (`strongsOpen`) est piloté par le parent (exclusivité avec les
 * autres panneaux) ; ce hook le referme automatiquement quand la sélection se vide.
 */
export function useStrongData({
  strongsOpen,
  setStrongsOpen,
  selection,
  cards,
  mode,
  version,
}: UseStrongDataArgs) {
  const [concordance, setConcordance] = useState<Concordance | null>(null);

  // Construit la liste des versets à résoudre en Strong depuis la sélection courante.
  const buildStrongsItems = useCallback((): StrongFetchItem[] => {
    const items: StrongFetchItem[] = [];
    if (mode === 'refs') {
      for (const id of selection.selectedIds) {
        const card = cards.find((c) => c.id === id);
        if (!card || !card.bookId || card.chapter == null) continue;
        for (const v of card.verses) {
          items.push({ id: `${id}:${v.number}`, bookId: card.bookId, chapter: card.chapter, verse: v.number });
        }
      }
    } else {
      for (const id of selection.selectedIds) {
        // id = "bookId:chapter:verse" (cf. `verseId`).
        const parts = id.split(':');
        const bookId = parts[0];
        const chapter = Number.parseInt(parts[1] ?? '', 10);
        const verse = Number.parseInt(parts[2] ?? '', 10);
        if (!bookId || !Number.isFinite(chapter) || !Number.isFinite(verse)) continue;
        items.push({ id, bookId, chapter, verse });
      }
    }
    return items;
  }, [mode, selection.selectedIds, cards]);

  const strongsItems = useMemo(() => buildStrongsItems(), [buildStrongsItems]);

  // On ne lance la requête Strong que si le panneau est ouvert et qu'il y a une sélection.
  const strongsQ = useStrongsForVerses(
    version,
    strongsOpen && selection.count > 0 ? strongsItems : [],
  );

  // Referme le panneau quand la sélection se vide.
  useEffect(() => {
    if (strongsOpen && selection.count === 0) setStrongsOpen(false);
  }, [strongsOpen, selection.count, setStrongsOpen]);

  // Vue Strong prête à afficher (triée par numéro de verset en lecture continue).
  const strongsView = useMemo<StrongVerseView[]>(() => {
    if (!strongsOpen) return [];
    const data = strongsQ.data;
    if (!data) return [];
    const out: StrongVerseView[] = [];
    if (mode === 'refs') {
      for (const id of selection.selectedIds) {
        const card = cards.find((c) => c.id === id);
        if (!card || !card.bookId || card.chapter == null) continue;
        const bookName = getBookById(card.bookId)?.name ?? card.bookId;
        for (const v of card.verses) {
          const tokens = data[`${id}:${v.number}`];
          if (!tokens) continue;
          out.push({
            id: `${id}:${v.number}`,
            reference: `${bookName} ${card.chapter}:${v.number}`,
            tokens,
          });
        }
      }
    } else {
      for (const it of strongsItems) {
        const tokens = data[it.id];
        if (!tokens) continue;
        const bookName = getBookById(it.bookId)?.name ?? it.bookId;
        out.push({ id: it.id, reference: `${bookName} ${it.chapter}:${it.verse}`, tokens });
      }
      out.sort((a, b) => {
        const va = strongsItems.find((i) => i.id === a.id)?.verse ?? 0;
        const vb = strongsItems.find((i) => i.id === b.id)?.verse ?? 0;
        return va - vb;
      });
    }
    return out;
  }, [strongsOpen, mode, selection.selectedIds, cards, strongsItems, strongsQ.data]);

  // Ouvre la concordance d'un token Strong (depuis le panneau Strong).
  const openConcordance = useCallback((token: StrongToken) => {
    if (!token.strong) return;
    setConcordance({ code: token.strong, title: token.lemma || token.translit || token.strong, lang: token.lang });
  }, []);

  const closeConcordance = useCallback(() => setConcordance(null), []);

  // Nombre de versets que le panneau va afficher (= taille de la sélection de versets, pas des
  // rangées de cartes : une carte `refs` peut porter plusieurs versets). Servi au skeleton pour
  // que son nombre de rangées colle au nombre de versets sélectionnés (skeleton fidèle).
  const strongsCount = strongsItems.length;

  return {
    strongsLoading: strongsQ.isPending,
    strongsView,
    strongsCount,
    concordance,
    openConcordance,
    closeConcordance,
  };
}