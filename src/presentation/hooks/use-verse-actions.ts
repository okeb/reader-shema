'use client';

import { useCallback, useMemo, useState } from 'react';
import { formatPassage, formatPassageForCopy } from '@/src/domain/services/passage-formatter.service';
import { copyText, shareOrCopy } from '@/src/presentation/lib/clipboard';
import { compressVerses } from '@/src/domain/value-objects/verse-selection.vo';
import { getVersion } from '@/src/shared/constants/bible-versions';
import type { BiblicalVerse, ChapterVerse } from '@/src/domain/entities';
import type { ReaderMode } from '@/src/presentation/lib/reader-helpers';
import type { VerseSelection } from '@/src/presentation/hooks/use-verse-selection';
import type { useFavorites } from '@/src/presentation/stores/favorites.store';
import type { useBookmarks } from '@/src/presentation/stores/bookmarks.store';
import type { useAnnotations } from '@/src/presentation/stores/annotations.store';

/** Cible d'une note : identifiant verset + données pour amorcer l'éditeur. */
export interface NoteTarget {
  id: string;
  reference: string;
  text: string;
  bookId: string;
  chapter: number;
  verse: number;
}

/** Donnée indexée par id de sélection : texte + référence + localisation. */
export interface SelectionEntry {
  reference: string;
  text: string;
  bookId?: string;
  chapter?: number;
  verse?: number;
  sortKey: number;
}

interface UseVerseActionsArgs {
  mode: ReaderMode;
  cards: BiblicalVerse[];
  verses: ChapterVerse[];
  bookId: string;
  chapter: number;
  bookName: string;
  /** Version primaire active (namespace favoris/signets). */
  version: string;
  selection: VerseSelection;
  // Les stores Zustand sont surchargés (no-arg + selector) : `ReturnType<typeof useFavorites>`
  // résoudrait l'overload du sélecteur (`U` → unknown). `.getState` est non-surchargé → renvoie
  // l'état complet, d'où un type stable.
  favorites: ReturnType<typeof useFavorites.getState>;
  bookmarks: ReturnType<typeof useBookmarks.getState>;
  annotations: ReturnType<typeof useAnnotations.getState>;
}

/**
 * Centralise les actions s'appliquant à la sélection courante (copier, favori, signet, surlignage,
 * note) ainsi que les valeurs dérivées partagées par le rendu et le panneau Strong (`selectionData`,
 * `bmIdFor`, `groupColorById`). Construit `id stable → donnée du verset` selon le mode.
 *
 * Porté de l'ancien `lib/verse-actions.ts` : logique identique, imports remappés vers les services
 * domaines + stores Zustand + helpers clipboard du nouveau projet.
 */
export function useVerseActions({
  mode,
  cards,
  verses,
  bookId,
  chapter,
  bookName,
  version,
  selection,
  favorites,
  bookmarks,
  annotations,
}: UseVerseActionsArgs) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [verseCopied, setVerseCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const favIdFor = useCallback((selId: string) => `${version}:${selId}`, [version]);
  // Id stable d'un signet : `${version}:${bookId}:${chapter}:${verse}` (indépendant du mode).
  const bmIdFor = useCallback(
    (b: string, c: number, n: number) => `${version}:${b}:${c}:${n}`,
    [version],
  );

  // Données indexées par id de sélection (texte + référence + localisation), selon le mode.
  const selectionData = useMemo(() => {
    const map = new Map<string, SelectionEntry>();
    if (mode === 'refs') {
      for (const c of cards) {
        map.set(c.id, {
          reference: c.reference,
          text: c.verses.map((v) => `${v.number} ${v.text}`).join(' '),
          bookId: c.bookId,
          chapter: c.chapter,
          verse: c.verses[0]?.number,
          sortKey: c.verses[0]?.number ?? 0,
        });
      }
    } else {
      for (const v of verses) {
        map.set(`${bookId}:${chapter}:${v.number}`, {
          reference: `${bookName} ${chapter}:${v.number}`,
          text: v.text,
          bookId,
          chapter,
          verse: v.number,
          sortKey: v.number,
        });
      }
    }
    return map;
  }, [mode, cards, verses, bookId, chapter, bookName]);

  // Tous les sélectionnés sont-ils déjà en favoris ?
  const favorited =
    selection.count > 0 && selection.selectedIds.every((id) => favorites.isFavorite(favIdFor(id)));

  // Copie le lien du passage courant, en y inscrivant le thème **appliqué** (classe `.dark` sur
  // <html> → gère « système ») et la version active.
  const copyLink = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('version', version);
    url.searchParams.set(
      'theme',
      document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    );
    void copyText(url.toString());
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [version]);

  // Texte formaté de la sélection pour la **copie** : en-tête « Livre Chapitre », un verset par
  // ligne numéroté, puis la version en toutes lettres sur la dernière ligne. Vide si vide.
  const selectionVerseCopyText = useCallback(() => {
    const items = selection.selectedIds
      .map((id) => selectionData.get(id))
      .filter((d): d is SelectionEntry => d != null)
      .sort((a, b) => a.sortKey - b.sortKey);
    if (items.length === 0) return '';
    return formatPassageForCopy(items, {
      mode,
      bookName,
      chapter,
      versionLabel: getVersion(version).label,
    });
  }, [selection.selectedIds, selectionData, mode, bookName, chapter, version]);

  // Copie le contenu de la sélection (versets + référence + version en toutes lettres) dans le
  // presse-papier, avec un feedback d'icône « copié » de 2 s.
  const copyVerse = useCallback(() => {
    const text = selectionVerseCopyText();
    if (!text) return;
    void copyText(text);
    setVerseCopied(true);
    setTimeout(() => setVerseCopied(false), 2000);
  }, [selectionVerseCopyText]);

  // Partage la sélection via la feuille native (`navigator.share`) : texte formaté + lien qui encode
  // la sélection (read → `v=` compressé, refs → URL `refs=` courante) + thème appliqué. Repli copie
  // `texte\nlien` sur desktop sans Web Share. Pas de feedback si la feuille est annulée.
  const shareSelected = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const items = selection.selectedIds
      .map((id) => selectionData.get(id))
      .filter((d): d is SelectionEntry => d != null)
      .sort((a, b) => a.sortKey - b.sortKey);
    if (items.length === 0) return;

    const text = formatPassage(items, {
      mode,
      bookName,
      chapter,
      versionTag: getVersion(version).shortLabel,
    });

    const url = new URL(window.location.href);
    url.searchParams.set('version', version);
    url.searchParams.set(
      'theme',
      document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    );
    let reference: string;
    if (mode === 'read') {
      const versesNos = items.map((it) => it.verse ?? 0).filter((n) => n > 0);
      const range = compressVerses(versesNos);
      reference = `${bookName} ${chapter}:${range}`;
      if (versesNos.length > 0) url.searchParams.set('v', range);
    } else {
      // refs mode: l'URL porte déjà `refs=` ; pas de schéma pour une sous-sélection de cartes.
      reference = items[0].reference;
    }

    const outcome = await shareOrCopy({ title: reference, text, url: url.toString() });
    if (outcome === 'cancelled') return; // feuille fermée → pas de feedback de succès
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }, [selection.selectedIds, selectionData, mode, bookName, chapter, version]);

  const favoriteSelected = useCallback(() => {
    if (selection.count === 0) return;
    if (favorited) {
      for (const id of selection.selectedIds) favorites.remove(favIdFor(id));
      return;
    }
    for (const id of selection.selectedIds) {
      const favId = favIdFor(id);
      if (favorites.isFavorite(favId)) continue;
      const d = selectionData.get(id);
      if (!d) continue;
      favorites.add({
        id: favId,
        version,
        reference: d.reference,
        text: d.text,
        bookId: d.bookId,
        chapter: d.chapter,
        verse: d.verse,
      });
    }
  }, [selection.count, selection.selectedIds, favorited, favorites, favIdFor, selectionData, version]);

  // --- Signets (bookmarks) ---

  // Ids signet des versets sélectionnés (ceux qui ont une localisation complète).
  const selectedBookmarkIds = useMemo(() => {
    const ids: string[] = [];
    for (const id of selection.selectedIds) {
      const d = selectionData.get(id);
      if (d && d.bookId && d.chapter != null && d.verse != null) {
        ids.push(bmIdFor(d.bookId, d.chapter, d.verse));
      }
    }
    return ids;
  }, [selection.selectedIds, selectionData, bmIdFor]);

  // La sélection est-elle déjà rangée en signet, et dans quel groupe (si unique) ?
  const selectionBookmarked =
    selectedBookmarkIds.length > 0 && selectedBookmarkIds.some((id) => bookmarks.isBookmarked(id));
  const selectionBookmarkGroupId = useMemo(() => {
    const gids = new Set<string>();
    for (const id of selectedBookmarkIds) {
      const b = bookmarks.bookmarkOf(id);
      if (b) gids.add(b.groupId);
    }
    return gids.size === 1 ? Array.from(gids)[0] : null;
  }, [selectedBookmarkIds, bookmarks]);

  // Couleur d'un groupe par id (pour le soulignement ondulé des versets bookmarqués).
  const groupColorById = useMemo(
    () => new Map(bookmarks.groups.map((g) => [g.id, g.color])),
    [bookmarks.groups],
  );

  // Range la sélection courante dans le groupe indiqué.
  const bookmarkSelected = useCallback(
    (groupId: string) => {
      for (const id of selection.selectedIds) {
        const d = selectionData.get(id);
        if (!d || !d.bookId || d.chapter == null || d.verse == null) continue;
        bookmarks.addToGroup(
          {
            id: bmIdFor(d.bookId, d.chapter, d.verse),
            version,
            reference: d.reference,
            text: d.text,
            bookId: d.bookId,
            chapter: d.chapter,
            verse: d.verse,
          },
          groupId,
        );
      }
    },
    [selection.selectedIds, selectionData, bookmarks, bmIdFor, version],
  );

  // Crée un groupe (nom + couleur) puis y range la sélection.
  const createBookmarkGroupForSelection = useCallback(
    (name: string, color: string) => {
      const gid = bookmarks.addGroup(name, color);
      bookmarkSelected(gid);
    },
    [bookmarks, bookmarkSelected],
  );

  // Retire la sélection des signets.
  const removeBookmarkForSelection = useCallback(() => {
    for (const id of selectedBookmarkIds) bookmarks.remove(id);
  }, [selectedBookmarkIds, bookmarks]);

  // --- Surlignages & notes (annotations) ---

  // Couleur partagée par toute la sélection (si unique), sinon null — pour cocher le feutre actif.
  const selectionHighlightColor = useMemo(() => {
    const colors = new Set<string>();
    for (const id of selectedBookmarkIds) {
      const c = annotations.highlightOf(id);
      if (c) colors.add(c);
    }
    return colors.size === 1 ? Array.from(colors)[0] : null;
  }, [selectedBookmarkIds, annotations]);

  // Au moins un verset sélectionné est-il surligné ?
  const selectionHighlighted = useMemo(
    () => selectedBookmarkIds.some((id) => annotations.highlightOf(id) != null),
    [selectedBookmarkIds, annotations],
  );

  // Applique (ou bascule) une couleur de feutre sur toute la sélection.
  const highlightSelected = useCallback(
    (color: string) => {
      // Toggle : si tous les sélectionnés portent déjà cette couleur, on retire.
      const allSame =
        selectedBookmarkIds.length > 0 &&
        selectedBookmarkIds.every((id) => annotations.highlightOf(id) === color);
      for (const id of selectedBookmarkIds) {
        if (allSame) annotations.removeHighlight(id);
        else annotations.setHighlight(id, color);
      }
    },
    [selectedBookmarkIds, annotations],
  );

  // Retire le surlignage de toute la sélection.
  const removeHighlightForSelection = useCallback(() => {
    for (const id of selectedBookmarkIds) annotations.removeHighlight(id);
  }, [selectedBookmarkIds, annotations]);

  // Cible de note = verset ancre de la sélection (une note par verset).
  const noteTarget = useMemo<NoteTarget | null>(() => {
    const selId = selection.anchorId;
    if (!selId) return null;
    const d = selectionData.get(selId);
    if (!d || !d.bookId || d.chapter == null || d.verse == null) return null;
    return {
      id: bmIdFor(d.bookId, d.chapter, d.verse),
      reference: d.reference,
      text: d.text,
      bookId: d.bookId,
      chapter: d.chapter,
      verse: d.verse,
    };
  }, [selection.anchorId, selectionData, bmIdFor]);

  // Le verset ancre porte-t-il déjà une note ?
  const selectionHasNote = noteTarget != null && annotations.hasNote(noteTarget.id);

  return {
    selectionData,
    linkCopied,
    copyLink,
    verseCopied,
    copyVerse,
    shared,
    shareSelected,
    favorited,
    favoriteSelected,
    selectedBookmarkIds,
    selectionBookmarked,
    selectionBookmarkGroupId,
    groupColorById,
    bmIdFor,
    bookmarkSelected,
    createBookmarkGroupForSelection,
    removeBookmarkForSelection,
    selectionHighlightColor,
    selectionHighlighted,
    highlightSelected,
    removeHighlightForSelection,
    noteTarget,
    selectionHasNote,
  };
}