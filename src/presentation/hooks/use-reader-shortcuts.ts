'use client';

import { useEffect } from 'react';
import type { ColumnCount } from '@/src/shared/constants/reader-preferences';
import type { ReaderMode } from '@/src/presentation/lib/reader-helpers';

interface UseReaderShortcutsArgs {
  mode: ReaderMode;
  goPrev: () => void;
  goNext: () => void;
  cycleLayout: () => void;
  /** Touche `+`/`=` : agrandit la taille du texte ; `-`/`_` : la réduit. */
  biggerText: () => void;
  smallerText: () => void;
  /** Touche `1`/`2`/`3` : règle directement le nombre de colonnes. */
  setColumns: (c: ColumnCount) => void;
  toggleFocus: () => void;
  /** Touche `t` : change le thème (clair → sombre → système). */
  cycleTheme: () => void;
  toggleBookmarkPanel: () => void;
  toggleHistoryPanel: () => void;
  toggleNotesPanel: () => void;
  /** Touche `i` : déploie/masque le panneau d'informations du livre. */
  toggleInfo: () => void;
  /** Touche `f` : ouvre les favoris. */
  onFavorites: () => void;
  /** Touche `?` : bascule l'aide des raccourcis. */
  onToggleHelp: () => void;
  /** Touche `Échap` : ferme l'aide. */
  onEscape: () => void;
}

/**
 * Raccourcis clavier du lecteur. Ignorés pendant la saisie dans un champ ou avec ⌘/Ctrl/Alt
 * (pour ne pas court-circuiter ⌘K de la palette).
 */
export function useReaderShortcuts({
  mode,
  goPrev,
  goNext,
  cycleLayout,
  biggerText,
  smallerText,
  setColumns,
  toggleFocus,
  cycleTheme,
  toggleBookmarkPanel,
  toggleHistoryPanel,
  toggleNotesPanel,
  toggleInfo,
  onFavorites,
  onToggleHelp,
  onEscape,
}: UseReaderShortcutsArgs) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case 'ArrowLeft':
          if (mode === 'read') {
            e.preventDefault();
            goPrev();
          }
          break;
        case 'ArrowRight':
          if (mode === 'read') {
            e.preventDefault();
            goNext();
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          onFavorites();
          break;
        case 'd':
        case 'D':
          if (mode === 'read') {
            e.preventDefault();
            cycleLayout();
          }
          break;
        case '+':
        case '=':
          e.preventDefault();
          biggerText();
          break;
        case '-':
        case '_':
          e.preventDefault();
          smallerText();
          break;
        case '1':
          e.preventDefault();
          setColumns(1);
          break;
        case '2':
          e.preventDefault();
          setColumns(2);
          break;
        case '3':
          e.preventDefault();
          setColumns(3);
          break;
        case 's':
        case 'S':
          e.preventDefault();
          toggleFocus();
          break;
        case 't':
        case 'T':
          e.preventDefault();
          cycleTheme();
          break;
        case 'b':
        case 'B':
          e.preventDefault();
          toggleBookmarkPanel();
          break;
        case 'h':
        case 'H':
          e.preventDefault();
          toggleHistoryPanel();
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          toggleNotesPanel();
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          toggleInfo();
          break;
        case '?':
          e.preventDefault();
          onToggleHelp();
          break;
        case 'Escape':
          onEscape();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    mode,
    goPrev,
    goNext,
    cycleLayout,
    biggerText,
    smallerText,
    setColumns,
    toggleFocus,
    cycleTheme,
    toggleBookmarkPanel,
    toggleHistoryPanel,
    toggleNotesPanel,
    toggleInfo,
    onFavorites,
    onToggleHelp,
    onEscape,
  ]);
}