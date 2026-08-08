'use client';

import { useCallback, useMemo, useState } from 'react';

export interface VerseSelection {
  /** Vrai si l'id est dans la sélection. */
  isSelected: (id: string) => boolean;
  /** Ajoute l'id s'il est absent, le retire sinon ; met à jour l'ancre. */
  toggle: (id: string) => void;
  /** Remplace toute la sélection par la liste d'ids fournie ; l'ancre devient le dernier. */
  set: (ids: string[]) => void;
  /** Vide la sélection. */
  clear: () => void;
  /** Ids sélectionnés dans l'ordre d'insertion. */
  selectedIds: string[];
  /** Nombre d'éléments sélectionnés. */
  count: number;
  /** Dernier id basculé (héberge le cluster d'actions), ou null. */
  anchorId: string | null;
}

interface SelectionState {
  ids: string[];
  anchorId: string | null;
}

const EMPTY: SelectionState = { ids: [], anchorId: null };

/**
 * Hook éphémère (non persisté) de sélection de versets.
 * Conserve l'ordre d'insertion + l'ancre (dernier élément basculé). Lorsqu'on dé-sélectionne
 * l'ancre, celle-ci repasse au dernier élément restant.
 */
export function useVerseSelection(): VerseSelection {
  const [state, setState] = useState<SelectionState>(EMPTY);

  const toggle = useCallback((id: string) => {
    setState((prev) => {
      const exists = prev.ids.includes(id);
      const ids = exists ? prev.ids.filter((x) => x !== id) : [...prev.ids, id];
      const anchorId = exists ? (ids.length > 0 ? ids[ids.length - 1] : null) : id;
      return { ids, anchorId };
    });
  }, []);

  const set = useCallback((ids: string[]) => {
    setState({ ids: [...ids], anchorId: ids.length > 0 ? ids[ids.length - 1] : null });
  }, []);

  const clear = useCallback(() => setState(EMPTY), []);

  const isSelected = useCallback((id: string) => state.ids.includes(id), [state.ids]);

  return useMemo(
    () => ({
      isSelected,
      toggle,
      set,
      clear,
      selectedIds: state.ids,
      count: state.ids.length,
      anchorId: state.anchorId,
    }),
    [isSelected, toggle, set, clear, state.ids, state.anchorId],
  );
}