'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

import { BIBLE_BOOKS, getBookById } from '@/src/shared/constants/bible-books';
import { isSelectableId } from '@/src/shared/constants/bible-versions';
import { getQuizzes } from '@/src/shared/constants/quiz';
import {
  clampFontSize,
  lineHeightValue,
} from '@/src/shared/constants/reader-preferences';

import { useReaderPreferences } from '@/src/presentation/stores/reader-preferences.store';
import { useActiveVersion } from '@/src/presentation/stores/active-version.store';
import { useReadingPosition } from '@/src/presentation/stores/reading-position.store';
import { useStrongResume } from '@/src/presentation/stores/strong-resume.store';
import { useNavigationHistory } from '@/src/presentation/stores/navigation-history.store';
import { useFavorites } from '@/src/presentation/stores/favorites.store';
import { useBookmarks } from '@/src/presentation/stores/bookmarks.store';
import { useAnnotations } from '@/src/presentation/stores/annotations.store';
import { useQuizSeen } from '@/src/presentation/stores/quiz-seen.store';

import { useReaderData } from '@/src/presentation/hooks/use-reader-data';
import { useReaderShortcuts } from '@/src/presentation/hooks/use-reader-shortcuts';
import { useVerseSelection } from '@/src/presentation/hooks/use-verse-selection';
import { useCoarsePointer } from '@/src/presentation/hooks/use-coarse-pointer';
import { useThemeCycle } from '@/src/presentation/hooks/use-theme-cycle';
import { useBookCrossRefs } from '@/src/presentation/hooks/use-book-cross-refs';
import { useStrongData } from '@/src/presentation/hooks/use-strong-data';
import { useVerseActions } from '@/src/presentation/hooks/use-verse-actions';
import { useHoverCluster } from '@/src/presentation/hooks/use-hover-cluster';
import { useScrollLock } from '@/src/presentation/hooks/use-scroll-lock';
import type { ReaderMode } from '@/src/presentation/lib/reader-helpers';
import { COLUMN_WRAP, contentMaxClass } from '@/src/presentation/lib/reader-layout';
import type { CrossRef } from '@/src/presentation/lib/cross-refs-format';
import type { Note, VerseRef, BookmarkVerse, StrongOccurrence } from '@/src/domain/entities';
import type { VerseActionsBundle } from '@/src/presentation/components/molecules/m-verse-actions';

import { ReaderTopbar } from '@/src/presentation/components/organisms/o-reader-topbar';
import { OParallelReader } from '@/src/presentation/components/organisms/o-parallel-reader';
import { ReaderContent } from '@/src/presentation/components/organisms/o-reader-content';
import { OBibleReaderSkeleton } from '@/src/presentation/components/organisms/o-bible-reader-skeleton';
import { VerseCard } from '@/src/presentation/components/molecules/m-verse-card';
import { ReaderDock } from '@/src/presentation/components/molecules/m-reader-dock';
import { FocusControl } from '@/src/presentation/components/molecules/m-focus-control';
import { ShortcutsHelp } from '@/src/presentation/components/molecules/m-shortcuts-help';
import { StrongPanel } from '@/src/presentation/components/molecules/m-strong-panel';
import { StrongConcordance } from '@/src/presentation/components/molecules/m-strong-concordance';
import { CrossRefs } from '@/src/presentation/components/molecules/m-cross-refs';
import { BookmarkPanel } from '@/src/presentation/components/molecules/m-bookmark-panel';
import { HistoryPanel } from '@/src/presentation/components/molecules/m-history-panel';
import { NotesPanel } from '@/src/presentation/components/molecules/m-notes-panel';
import { NoteViewer } from '@/src/presentation/components/molecules/m-note-viewer';
import { NoteEditor } from '@/src/presentation/components/molecules/m-note-editor';

export interface TReaderProps {
  mode: ReaderMode;
  bookId: string;
  chapter: number;
  /** Slugs "livre/chap/selection" (mode refs). */
  refs: string[];
  /** Sélection issue de l'URL `?v=` (mode read), ex. "16" ou "16-18". */
  highlight?: string;
  /** Vrai si l'URL contenait une cible explicite (livre/chap/refs/v) — désactive l'auto-reprise. */
  explicitTarget: boolean;
  /** Version imposée par l'URL `?version=` (appliquée une fois, non persistée). */
  initialVersionId?: string;
  /** `?signets=1` — ouvre le panneau signets au montage. */
  openBookmarksOnMount?: boolean;
}

/**
 * Template orchestrateur du lecteur — décomposition du god-component `o-bible-reader.tsx`.
 *
 * Source de vérité : l'URL (`app/[locale]/read/page.tsx` parse `livre`/`chap`/`refs`/`v`/`version`
 * et passe le résultat en props). La navigation réécrit l'URL via `router.replace` ; la page
 * serveur re-rend alors avec les nouvelles props, et les hooks CQRS se rafraîchissent.
 *
 * Phase 5 : favoris / signets / notes / surlignage branchés. Le cluster d'actions de verset
 * (desktop hover via `useHoverCluster` + tactile via le dock en mode cluster), les panneaux
 * Signets et Notes (coin gauche), l'éditeur/lecteur de note plein écran, et le verrouillage du
 * défilement sous un overlay (tactile) sont câblés.
 */
export function TReader({
  mode,
  bookId,
  chapter,
  refs,
  highlight,
  explicitTarget,
  initialVersionId,
  openBookmarksOnMount,
}: TReaderProps) {
  const router = useRouter();
  const locale = useLocale();

  const prefs = useReaderPreferences();
  const { primary, primaryId, compare, hydrated: versionHydrated, setPrimary } = useActiveVersion();
  const { position, hydrated: posHydrated, save } = useReadingPosition();
  const { history, push, remove: removeHistoryEntry, clear: clearHistory } = useNavigationHistory();
  const favorites = useFavorites();
  const bookmarks = useBookmarks();
  const annotations = useAnnotations();
  const selection = useVerseSelection();
  const coarse = useCoarsePointer();
  const { cycleTheme } = useThemeCycle();

  const [infoOpen, setInfoOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [strongsOpen, setStrongsOpen] = useState(false);
  // Token Strong à réactiver au montage (reprise après retour d'une fiche /strong/[code]). Spec 29.
  const [resumeActiveToken, setResumeActiveToken] = useState<{ verseId: string; strongCode: string } | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  // Renvois d'un verset source ouverts en pop (mode read). Null = pop fermé.
  const [refsTarget, setRefsTarget] = useState<{ verse: number; refs: CrossRef[] } | null>(null);

  // --- Panneaux Signets / Notes + éditeur & lecteur de note (Phase 5) ------------
  const [bookmarkPanelOpen, setBookmarkPanelOpen] = useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [activeBookmarkId, setActiveBookmarkId] = useState<string | null>(null);
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  // Éditeur de note plein écran : verset ancre + versets à associer + note éditée (ou nouvelle).
  const [noteEditor, setNoteEditor] = useState<{
    anchorVerse: VerseRef;
    initialVerses: VerseRef[];
    initialNoteId: string | null;
  } | null>(null);
  // Lecteur de note (lecture seule) : verset ancre + notes à afficher.
  const [noteViewer, setNoteViewer] = useState<{
    anchorVerse: VerseRef;
    notes: Note[];
    activeNoteId: string | null;
  } | null>(null);

  const highlightRef = useRef<HTMLElement | null>(null);
  const appliedVersionRef = useRef(false);
  const resumedRef = useRef(false);
  const strongResumeRef = useRef(false);
  const bookmarksOpenedRef = useRef(false);

  // --- Navigation ------------------------------------------------------------- @nolint

  const navigate = useCallback(
    (nextBookId: string, nextChapter: number) => {
      router.replace(`/${locale}/read?livre=${nextBookId}&chap=${nextChapter}`);
    },
    [router, locale],
  );

  const bookIndex = BIBLE_BOOKS.findIndex((b) => b.id === bookId);
  const book = getBookById(bookId);
  const canPrev = bookIndex > 0 || chapter > 1;
  const canNext = bookIndex < BIBLE_BOOKS.length - 1 || (book ? chapter < book.chapters : false);

  const goPrev = useCallback(() => {
    if (chapter > 1) {
      navigate(bookId, chapter - 1);
    } else if (bookIndex > 0) {
      const prev = BIBLE_BOOKS[bookIndex - 1];
      navigate(prev.id, prev.chapters);
    }
  }, [chapter, bookId, bookIndex, navigate]);

  const goNext = useCallback(() => {
    if (book && chapter < book.chapters) {
      navigate(bookId, chapter + 1);
    } else if (bookIndex < BIBLE_BOOKS.length - 1) {
      const next = BIBLE_BOOKS[bookIndex + 1];
      navigate(next.id, 1);
    }
  }, [book, chapter, bookId, bookIndex, navigate]);

  const cycleLayout = useCallback(() => {
    const order = ['flowing', 'verses', 'plain'] as const;
    const idx = order.indexOf(prefs.layout);
    prefs.setLayout(order[(idx + 1) % order.length]);
  }, [prefs]);

  const biggerText = useCallback(() => prefs.setFontSize(clampFontSize(prefs.fontSize + 1)), [prefs]);
  const smallerText = useCallback(() => prefs.setFontSize(clampFontSize(prefs.fontSize - 1)), [prefs]);

  // --- Données ---------------------------------------------------------------- @nolint

  const { verses, cards, loading, error, bookInfo } = useReaderData({
    mode,
    version: primaryId,
    bookId,
    chapter,
    refs,
  });

  // Renvois bibliques du livre courant (mode read seulement — chargement à la demande, cache 1h).
  const crossRefs = useBookCrossRefs(bookId, chapter, mode === 'read');

  // Données Strong des versets sélectionnés + concordance d'un token (Phase 4).
  const { strongsLoading, strongsView, strongsCount, concordance, openConcordance, closeConcordance } =
    useStrongData({
      strongsOpen,
      setStrongsOpen,
      selection,
      cards: cards ?? [],
      mode,
      version: primaryId,
    });

  // Actions sur la sélection (copier/favori/signet/surlignage/note) + valeurs dérivées partagées
  // par le rendu (`selectionData`, `bmIdFor`, `groupColorById`) et le panneau Strong.
  const bookName = book?.name ?? bookId;
  const verseActions = useVerseActions({
    mode,
    cards: cards ?? [],
    verses: verses ?? [],
    bookId,
    chapter,
    bookName,
    version: primaryId,
    selection,
    favorites,
    bookmarks,
    annotations,
  });
  const { selectionData, groupColorById, bmIdFor } = verseActions;

  // Cluster d'actions au survol prolongé (vue paragraphe / ligne, desktop).
  const hover = useHoverCluster(selection.isSelected);

  // --- Surlignage `?v=` -------------------------------------------------------- @nolint

  const { highlightSet, highlightFirst } = useMemo(() => {
    const set = new Set<number>();
    let first: number | null = null;
    if (mode === 'read' && highlight) {
      for (const part of highlight.split(',')) {
        const range = part.match(/^(\d+)(?:-(\d+))?$/);
        if (!range) continue;
        const a = Number.parseInt(range[1], 10);
        const b = range[2] ? Number.parseInt(range[2], 10) : a;
        for (let n = a; n <= b; n++) {
          set.add(n);
          if (first === null || n < first) first = n;
        }
      }
    }
    return { highlightSet: set, highlightFirst: first };
  }, [mode, highlight]);

  // --- Exclusivité des panneaux + verrouillage tactile -------------------------

  // Tactile : tant qu'un overlay plein écran est ouvert, on verrouille le défilement du document.
  // Sans ça, sur iOS le geste tactile « traverse » l'overlay et défile l'arrière-plan au lieu de la
  // liste interne (cf. useScrollLock). Sur desktop, les panneaux coexistent avec la lecture → pas
  // de verrou.
  const anyOverlayOpen =
    strongsOpen || bookmarkPanelOpen || notesPanelOpen || historyPanelOpen || noteEditor != null || refsTarget != null;
  useScrollLock(coarse && anyOverlayOpen);

  // Les panneaux droit (Strong) et gauche (Signets / Notes / Historique) s'excluent mutuellement.
  const toggleStrongs = useCallback(() => {
    setStrongsOpen((v) => {
      const next = !v;
      if (next) {
        setBookmarkPanelOpen(false);
        setNotesPanelOpen(false);
        setHistoryPanelOpen(false);
      }
      return next;
    });
  }, []);
  const toggleBookmarkPanel = useCallback(() => {
    setBookmarkPanelOpen((v) => {
      const next = !v;
      if (next) {
        setStrongsOpen(false);
        setNotesPanelOpen(false);
        setHistoryPanelOpen(false);
      }
      return next;
    });
  }, []);
  const toggleNotesPanel = useCallback(() => {
    setNotesPanelOpen((v) => {
      const next = !v;
      if (next) {
        setStrongsOpen(false);
        setBookmarkPanelOpen(false);
        setHistoryPanelOpen(false);
      }
      return next;
    });
  }, []);
  const toggleHistoryPanel = useCallback(() => {
    setHistoryPanelOpen((v) => {
      const next = !v;
      if (next) {
        setStrongsOpen(false);
        setBookmarkPanelOpen(false);
        setNotesPanelOpen(false);
      }
      return next;
    });
  }, []);

  // --- Effets ----------------------------------------------------------------- @nolint

  // `?version=` non persistée : appliquée une fois après hydratation (pour ne pas être écrasée
  // par la valeur localStorage lue par StoreHydrationProvider).
  useEffect(() => {
    if (appliedVersionRef.current || !initialVersionId || !isSelectableId(initialVersionId)) return;
    if (!versionHydrated) return;
    appliedVersionRef.current = true;
    setPrimary(initialVersionId, { persist: false });
  }, [initialVersionId, versionHydrated, setPrimary]);

  // Auto-reprise de la dernière position (uniquement si aucune cible explicite dans l'URL).
  useEffect(() => {
    if (mode !== 'read' || explicitTarget || resumedRef.current) return;
    if (!posHydrated || !position) return;
    const target = getBookById(position.bookId);
    if (!target) return;
    resumedRef.current = true;
    if (position.bookId !== bookId || position.chapter !== chapter) {
      navigate(position.bookId, position.chapter);
    }
  }, [mode, explicitTarget, posHydrated, position, bookId, chapter, navigate]);

  // Scroll vers le premier verset surligné (`?v=`).
  useEffect(() => {
    if (highlightFirst == null || loading) return;
    const id = window.requestAnimationFrame(() => {
      highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [highlightFirst, loading, verses]);

  // Persistance de la position + historique de navigation (mode read, chapitre chargé).
  useEffect(() => {
    if (mode !== 'read' || !verses || verses.length === 0) return;
    const b = getBookById(bookId);
    if (!b) return;
    const reference = `${b.name} ${chapter}`;
    save({ bookId, chapter, reference });
    push({
      version: primaryId,
      bookId,
      chapter,
      reference,
      // URL non localisée — l'écran d'accueil utilise `Link`/`useRouter` de `@/i18n/routing` qui
      // préfixe automatiquement la locale. Stocker `/read?…` (sans `/${locale}/`) garde la cohérence
      // avec les autres liens de la home et évite un double préfixe.
      url: `/read?livre=${bookId}&chap=${chapter}`,
    });
  }, [mode, verses, bookId, chapter, primaryId, locale, save, push]);

  // Vide la sélection quand on change de passage.
  useEffect(() => {
    selection.clear();
    setActiveCardId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, chapter, mode]);

  // En mode refs, active la première carte chargée.
  useEffect(() => {
    if (mode === 'refs' && cards && cards.length > 0 && activeCardId == null) {
      setActiveCardId(cards[0].id);
    }
  }, [mode, cards, activeCardId]);

  // `?signets=1` — ouvre le panneau signets au montage (respecte l'exclusivité du coin gauche).
  useEffect(() => {
    if (bookmarksOpenedRef.current || !openBookmarksOnMount) return;
    bookmarksOpenedRef.current = true;
    setStrongsOpen(false);
    setNotesPanelOpen(false);
    setBookmarkPanelOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openBookmarksOnMount]);

  // Reprise Strong : au retour d'une fiche /strong/[code] (bouton retour), restaure la sélection,
  // rouvre le panneau Strong et réactive le token mémorisé avant la navigation. One-shot, consomme
  // le contexte du store (sessionStorage). L'effet de vidage-sélection au changement de passage
  // tourne avant celui-ci (no-op au montage) → la sélection restaurée n'est pas écrasée. Spec 29.
  useEffect(() => {
    if (strongResumeRef.current) return;
    const resume = useStrongResume.getState().consume();
    if (!resume || resume.selectedIds.length === 0) {
      strongResumeRef.current = true;
      return;
    }
    strongResumeRef.current = true;
    selection.set(resume.selectedIds);
    setResumeActiveToken(resume.activeToken);
    setStrongsOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Raccourcis clavier ----------------------------------------------------- @nolint

  const openFavorites = useCallback(() => {
    router.push(`/${locale}/favoris`);
  }, [router, locale]);

  // Clic sur une entrée d'historique : bascule la lecture sur la référence (préserve la sélection
  // `?v=` éventuelle). Tactile : on referme le tiroir pour révéler le verset derrière.
  const goToHistoryEntry = useCallback(
    (id: string) => {
      const entry = history.find((e) => e.id === id);
      if (!entry) return;
      setInfoOpen(false);
      const v = entry.selection ? `&v=${entry.selection}` : '';
      router.replace(`/${locale}/read?livre=${entry.bookId}&chap=${entry.chapter}${v}`, { scroll: false });
      if (coarse) setHistoryPanelOpen(false);
    },
    [history, router, locale, coarse],
  );

  useReaderShortcuts({
    mode,
    goPrev,
    goNext,
    cycleLayout,
    biggerText,
    smallerText,
    setColumns: prefs.setColumns,
    toggleFocus: prefs.toggleFocus,
    cycleTheme,
    toggleBookmarkPanel,
    toggleHistoryPanel,
    toggleNotesPanel,
    toggleInfo: () => setInfoOpen((o) => !o),
    onFavorites: openFavorites,
    onToggleHelp: () => setHelpOpen((o) => !o),
    onEscape: () => setHelpOpen(false),
  });

  // --- Sélection -------------------------------------------------------------- @nolint

  const handleVerseClick = useCallback(
    (id: string) => {
      if (window.getSelection()?.toString()) return;
      const willSelect = !selection.isSelected(id);
      selection.toggle(id);
      // Desktop : démarre le minuteur d'apparition du cluster dès la sélection au clic (sans
      // devoir quitter puis re-survoler le verset) ; à la désélection, on referme.
      if (coarse) return;
      if (willSelect) hover.startHoverCluster(id);
      else hover.endHoverCluster();
    },
    [selection, coarse, hover],
  );

  // Effacer la sélection (action « ✕ » du cluster). La surbrillance `?v=` (URL) persiste jusqu'à
  // la prochaine navigation — elle ne dérive pas de la sélection.
  const clearSelection = useCallback(() => {
    selection.clear();
  }, [selection]);

  const onSelectChip = useCallback((id: string) => {
    setActiveCardId(id);
    if (typeof document !== 'undefined') {
      document.getElementById(`verse-card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Ouvre le pop des renvois d'un verset (mode read).
  const openRefsForVerse = useCallback(
    (verseNumber: number) => {
      const list = crossRefs.getForVerse(verseNumber);
      if (list.length === 0) return;
      setRefsTarget({ verse: verseNumber, refs: list });
    },
    [crossRefs],
  );

  // Clic sur un renvoi : bascule la lecture sur la cible (`?v=` surligne le verset/plage cible).
  const goToCrossRef = useCallback(
    (ref: CrossRef) => {
      const v = ref.verseEnd ? `${ref.verseStart}-${ref.verseEnd}` : String(ref.verseStart);
      setInfoOpen(false);
      router.replace(`/${locale}/read?livre=${ref.bookId}&chap=${ref.chapter}&v=${v}`, { scroll: false });
      // Tactile : on referme le pop pour révéler le verset cible derrière.
      if (coarse) setRefsTarget(null);
    },
    [router, locale, coarse],
  );

  // Clic sur une occurrence Strong : bascule la lecture sur ce verset (`?v=`).
  const goToOccurrence = useCallback(
    (occ: StrongOccurrence) => {
      setInfoOpen(false);
      router.replace(`/${locale}/read?livre=${occ.bookId}&chap=${occ.chapter}&v=${occ.verse}`, {
        scroll: false,
      });
      if (coarse) closeConcordance();
    },
    [router, locale, coarse, closeConcordance],
  );

  // Navigue vers la fiche détail d'un code Strong (depuis une référence d'`origine` dans le panneau
  // Strong). `push` (pas `replace`) pour que le bouton retour revienne au lecteur. Avant de quitter,
  // mémorise la sélection + le token actif dans le store de reprise (consommé au remontage). Spec 29.
  const navigateStrong = useCallback(
    (code: string, source?: { verseId: string; strongCode?: string }) => {
      useStrongResume.getState().setResume({
        selectedIds: [...selection.selectedIds],
        activeToken: source?.strongCode ? { verseId: source.verseId, strongCode: source.strongCode } : null,
      });
      router.push(`/${locale}/strong/${code}`);
    },
    [router, locale, selection.selectedIds],
  );

  // --- Quiz (Phase 6) --------------------------------------------------------- @nolint

  // Questions du chapitre courant (mode read, si l'option est active).
  const quizzes = mode === 'read' && prefs.quizEnabled ? getQuizzes(bookId, chapter) : [];

  // « Voir le verset » d'une question : bascule la lecture sur le verset cible (`?v=`).
  const onNavigateQuiz = useCallback(
    (b: string, c: number, v: string) => {
      setInfoOpen(false);
      router.replace(`/${locale}/read?livre=${b}&chap=${c}&v=${v}`, { scroll: false });
    },
    [router, locale],
  );

  // --- Signets & notes (Phase 5) ---------------------------------------------- @nolint

  // Clic sur un signet : la lecture bascule sur ce verset (surbrillance `?v=` + scroll).
  const goToBookmark = useCallback(
    (b: BookmarkVerse) => {
      setActiveBookmarkId(b.id);
      setInfoOpen(false);
      router.replace(`/${locale}/read?livre=${b.bookId}&chap=${b.chapter}&v=${b.verse}`, { scroll: false });
    },
    [router, locale],
  );

  // Construit un VerseRef depuis un id de sélection (via selectionData).
  const verseRefFromSelId = useCallback(
    (selId: string): VerseRef | null => {
      const d = selectionData.get(selId);
      if (!d || !d.bookId || d.chapter == null || d.verse == null) return null;
      return {
        verseId: bmIdFor(d.bookId, d.chapter, d.verse),
        bookId: d.bookId,
        chapter: d.chapter,
        verse: d.verse,
        reference: d.reference,
        text: d.text,
      };
    },
    [selectionData, bmIdFor],
  );

  // Ouvre l'éditeur de note sur la sélection (action « Noter » du cluster). Nouvelle note
  // associée à tous les versets sélectionnés (spec : multi-versets par note).
  const openNoteForSelection = useCallback(() => {
    const nt = verseActions.noteTarget;
    if (!nt) return;
    const anchorVerse: VerseRef = {
      verseId: nt.id,
      bookId: nt.bookId,
      chapter: nt.chapter,
      verse: nt.verse,
      reference: nt.reference,
      text: nt.text,
    };
    const selected = selection.selectedIds
      .map(verseRefFromSelId)
      .filter((v): v is VerseRef => v !== null);
    setNoteEditor({
      anchorVerse,
      initialVerses: selected.length > 0 ? selected : [anchorVerse],
      initialNoteId: null,
    });
  }, [verseActions.noteTarget, selection.selectedIds, verseRefFromSelId]);

  // Ouvre le lecteur de note (lecture seule) depuis l'indicateur en marge d'un verset.
  const openNoteForVerse = useCallback(
    (verseNumber: number) => {
      const v = (verses ?? []).find((x) => x.number === verseNumber);
      const verseId = bmIdFor(bookId, chapter, verseNumber);
      const anchorVerse: VerseRef = {
        verseId,
        bookId,
        chapter,
        verse: verseNumber,
        reference: `${book?.name ?? bookId} ${chapter}:${verseNumber}`,
        text: v?.text ?? '',
      };
      const notes = annotations.notesForVerse(verseId);
      if (notes.length === 0) return;
      setNoteViewer({
        anchorVerse,
        notes,
        activeNoteId: notes.length === 1 ? notes[0].id : null,
      });
    },
    [verses, bmIdFor, bookId, chapter, book, annotations],
  );

  // Bascule du viewer vers l'éditeur : ouvre l'éditeur pré-rempli avec la note active.
  const editNoteFromViewer = useCallback(
    (noteId: string) => {
      const note = annotations.getNote(noteId);
      if (!note) return;
      const anchor = noteViewer?.anchorVerse ?? note.verses[0];
      setNoteViewer(null);
      setNoteEditor({
        anchorVerse: anchor,
        initialVerses: note.verses,
        initialNoteId: note.id,
      });
    },
    [annotations, noteViewer],
  );

  // Clic sur une note (panneau) : bascule la lecture sur le verset ancre et ouvre le viewer.
  const goToNote = useCallback(
    (id: string) => {
      const n = annotations.getNote(id);
      if (!n) return;
      const anchor = n.verses[0];
      if (!anchor) return;
      setActiveNoteId(id);
      setInfoOpen(false);
      router.replace(`/${locale}/read?livre=${anchor.bookId}&chap=${anchor.chapter}&v=${anchor.verse}`, {
        scroll: false,
      });
      if (coarse) setNotesPanelOpen(false);
      // Ouvre le viewer pour cette note (et les autres notes du même verset).
      const allNotes = annotations.notesForVerse(anchor.verseId);
      setNoteViewer({
        anchorVerse: anchor,
        notes: allNotes.length > 0 ? allNotes : [n],
        activeNoteId: n.id,
      });
    },
    [annotations, router, locale, coarse],
  );

  // --- Faisceau de props du cluster d'actions --------------------------------- @nolint

  const strongsAvailable = primary.hasStrongs !== false;

  const verseActionsBundle: VerseActionsBundle = {
    count: selection.count,
    linkCopied: verseActions.linkCopied,
    onCopyLink: verseActions.copyLink,
    verseCopied: verseActions.verseCopied,
    onCopyVerse: verseActions.copyVerse,
    shared: verseActions.shared,
    onShare: verseActions.shareSelected,
    favorited: verseActions.favorited,
    onToggleFavorite: verseActions.favoriteSelected,
    onClear: clearSelection,
    onStrongs: strongsAvailable ? toggleStrongs : undefined,
    strongsOpen,
    groups: bookmarks.groups,
    bookmarkGroupId: verseActions.selectionBookmarkGroupId,
    isBookmarked: verseActions.selectionBookmarked,
    onBookmark: verseActions.bookmarkSelected,
    onCreateBookmarkGroup: verseActions.createBookmarkGroupForSelection,
    onRemoveBookmark: verseActions.removeBookmarkForSelection,
    // Surligner / retirer : on désélectionne ensuite pour révéler aussitôt le feutre (le feutre est
    // masqué tant que le verset est sélectionné, pour éviter le double fond avec la surbrillance).
    onHighlight: (color) => {
      verseActions.highlightSelected(color);
      clearSelection();
    },
    highlightColor: verseActions.selectionHighlightColor,
    highlighted: verseActions.selectionHighlighted,
    onRemoveHighlight: () => {
      verseActions.removeHighlightForSelection();
      clearSelection();
    },
    onNote: openNoteForSelection,
    hasNote: verseActions.selectionHasNote,
  };

  // --- Mise en page ----------------------------------------------------------- @nolint

  const focusActive = prefs.focusMode && selection.count > 0;
  const dimmed = useCallback(
    (isSel: boolean, isHl: boolean) => focusActive && !isSel && !isHl,
    [focusActive],
  );

  const wrapCls = COLUMN_WRAP[prefs.columns];
  const maxWCls = contentMaxClass(prefs.columns, prefs.measure);
  const textSizeStyle = {
    fontSize: `${prefs.fontSize}px`,
    lineHeight: lineHeightValue(prefs.lineHeight),
  } as React.CSSProperties;

  return (
    <>
      <ReaderTopbar
        mode={mode}
        cards={cards ?? []}
        activeId={activeCardId}
        onSelectChip={onSelectChip}
        bookId={bookId}
        chapter={chapter}
        canPrev={canPrev}
        canNext={canNext}
        goPrev={goPrev}
        goNext={goNext}
        navigate={navigate}
        focusMode={prefs.focusMode}
        coarse={coarse}
        logoStyle={prefs.logoStyle}
        onOpenHelp={() => setHelpOpen(true)}
      />

      <main className="reader-scroll min-h-screen bg-background">
        {error ? (
          <div className="mx-auto mt-32 max-w-md px-4 text-center text-sm text-muted-foreground">
            Impossible de charger ce passage. Vérifiez votre connexion puis réessayez.
          </div>
        ) : loading ? (
          <OBibleReaderSkeleton
            columns={prefs.columns}
            measure={prefs.measure}
            fontSize={prefs.fontSize}
            lineHeight={prefs.lineHeight}
            layout={prefs.layout}
          />
        ) : mode === 'read' ? (
          compare ? (
            <OParallelReader
              bookId={bookId}
              chapter={chapter}
              title={bookName}
              primary={primary}
              secondary={compare}
              primaryVerses={verses ?? []}
              fontSize={prefs.fontSize}
              lineHeight={lineHeightValue(prefs.lineHeight)}
            />
          ) : verses && verses.length > 0 ? (
            <ReaderContent
              verses={verses}
              layout={prefs.layout}
              maxWCls={maxWCls}
              wrapCls={wrapCls}
              textSizeStyle={textSizeStyle}
              bookId={bookId}
              chapter={chapter}
              bookName={bookName}
              bookInfo={bookInfo ?? null}
              infoOpen={infoOpen}
              onToggleInfo={() => setInfoOpen((o) => !o)}
              quizzes={quizzes}
              onNavigateQuiz={onNavigateQuiz}
              onQuizSeen={(id) => useQuizSeen.getState().markSeen(id)}
              primary={primary}
              highlightSet={highlightSet}
              highlightFirst={highlightFirst}
              highlightRef={highlightRef}
              selection={selection}
              coarse={coarse}
              focusMode={prefs.focusMode}
              focusActive={focusActive}
              dimmed={dimmed}
              handleVerseClick={handleVerseClick}
              bmIdFor={bmIdFor}
              groupColorById={groupColorById}
              bookmarkOf={bookmarks.bookmarkOf}
              highlightOf={annotations.highlightOf}
              hasNote={(id) => annotations.hasNote(id)}
              onOpenNote={openNoteForVerse}
              refsCountFor={(n) => crossRefs.countForVerse(n)}
              crossRefsMode={prefs.crossRefsMode}
              onOpenRefs={openRefsForVerse}
              hover={hover}
              verseActions={verseActionsBundle}
            />
          ) : (
            <div className="mx-auto mt-32 max-w-md px-4 text-center text-sm text-muted-foreground">
              Aucun verset trouvé pour ce passage.
            </div>
          )
        ) : (
          <div className="mt-24 px-4 pb-28 pt-6">
            <div className="mx-auto max-w-[60ch]">
              {cards && cards.length > 0 ? (
                cards.map((verse, i) => (
                  <VerseCard
                    key={verse.id}
                    verse={verse}
                    index={i}
                    isActive={activeCardId === verse.id}
                    selectable
                    isSelected={selection.isSelected(verse.id)}
                    onToggleSelect={() => selection.toggle(verse.id)}
                    fontSize={prefs.fontSize}
                  />
                ))
              ) : (
                <p className="py-20 text-center text-sm text-muted-foreground">Aucune référence à afficher.</p>
              )}
            </div>
          </div>
        )}
      </main>

      <ReaderDock
        mode={mode}
        coarse={coarse}
        selectionCount={selection.count}
        strongsOpen={strongsOpen}
        verseActions={verseActionsBundle}
        historyPanelOpen={historyPanelOpen}
        toggleHistoryPanel={toggleHistoryPanel}
        bookmarkPanelOpen={bookmarkPanelOpen}
        toggleBookmarkPanel={toggleBookmarkPanel}
        notesPanelOpen={notesPanelOpen}
        toggleNotesPanel={toggleNotesPanel}
        onOpenFavorites={openFavorites}
      />

      <FocusControl
        open={prefs.focusMode}
        coarse={coarse}
        selectionCount={selection.count}
        strongsAvailable={strongsAvailable}
        strongsOpen={strongsOpen}
        onToggleFocus={prefs.toggleFocus}
        onToggleStrongs={toggleStrongs}
      />

      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Panneau Strong des versets sélectionnés (Phase 4). */}
      <StrongPanel
        open={strongsOpen && strongsAvailable}
        loading={strongsLoading}
        verses={strongsView}
        skeletonRows={strongsCount}
        experimental={primary.strongsExperimental === true}
        version={primary}
        onVersion={(id) => setPrimary(id)}
        onSeeOccurrences={openConcordance}
        onNavigateStrong={navigateStrong}
        initialActiveStrong={resumeActiveToken ?? undefined}
        covered={concordance != null}
        onClose={() => setStrongsOpen(false)}
      />

      {/* Concordance d'un numéro Strong (par-dessus le panneau Strong). */}
      {concordance && (
        <StrongConcordance
          open
          version={primaryId}
          code={concordance.code}
          title={concordance.title}
          lang={concordance.lang}
          onNavigate={goToOccurrence}
          onBack={closeConcordance}
          onClose={closeConcordance}
        />
      )}

      {/* Panneau des signets (rail gauche). */}
      <BookmarkPanel
        open={bookmarkPanelOpen}
        groups={bookmarks.groups}
        bookmarks={bookmarks.bookmarks}
        activeId={activeBookmarkId}
        onSelect={(id) => {
          const b = bookmarks.bookmarks.find((x) => x.id === id);
          if (b) goToBookmark(b);
          // Tactile : on referme le tiroir pour révéler le verset derrière.
          if (coarse) setBookmarkPanelOpen(false);
        }}
        onRemoveBookmark={(id) => {
          bookmarks.remove(id);
          if (activeBookmarkId === id) setActiveBookmarkId(null);
        }}
        onRenameGroup={bookmarks.renameGroup}
        onSetGroupColor={bookmarks.setGroupColor}
        onRemoveGroup={bookmarks.removeGroup}
        onClose={() => setBookmarkPanelOpen(false)}
      />

      {/* Panneau de l'historique de navigation (rail gauche). */}
      <HistoryPanel
        open={historyPanelOpen}
        history={history}
        onSelect={goToHistoryEntry}
        onRemove={removeHistoryEntry}
        onClear={clearHistory}
        onClose={() => setHistoryPanelOpen(false)}
      />

      {/* Panneau « Mes notes » (rail gauche). */}
      <NotesPanel
        open={notesPanelOpen}
        notes={annotations.notesList()}
        activeId={activeNoteId}
        onSelect={goToNote}
        onRemoveNote={(id) => {
          annotations.removeNote(id);
          if (activeNoteId === id) setActiveNoteId(null);
        }}
        onClose={() => setNotesPanelOpen(false)}
      />

      {/* Lecteur de note (lecture seule). */}
      <NoteViewer
        open={noteViewer != null}
        anchorVerse={noteViewer?.anchorVerse ?? null}
        notes={noteViewer?.notes ?? []}
        activeNoteId={noteViewer?.activeNoteId ?? null}
        onEdit={editNoteFromViewer}
        onClose={() => setNoteViewer(null)}
      />

      {/* Éditeur de note plein écran (multi-versets). */}
      <NoteEditor
        open={noteEditor != null}
        anchorVerse={noteEditor?.anchorVerse ?? null}
        initialVerses={noteEditor?.initialVerses ?? []}
        initialText={noteEditor ? annotations.getNote(noteEditor.initialNoteId ?? '')?.text ?? '' : ''}
        initialNoteId={noteEditor?.initialNoteId ?? null}
        otherNotes={
          noteEditor
            ? annotations
                .notesForVerse(noteEditor.anchorVerse.verseId)
                .filter((n) => n.id !== noteEditor.initialNoteId)
            : []
        }
        version={primaryId}
        onSave={(noteId, vrs, text) => annotations.saveNote(noteId, vrs, text)}
        onDelete={(noteId) => {
          annotations.removeNote(noteId);
          if (activeNoteId === noteId) setActiveNoteId(null);
        }}
        onClose={() => setNoteEditor(null)}
      />

      {/* Renvois d'un verset (cross-references). */}
      <CrossRefs
        open={refsTarget != null}
        reference={`${book?.name ?? bookId} ${chapter}:${refsTarget?.verse ?? ''}`}
        refs={refsTarget?.refs ?? []}
        version={primaryId}
        onNavigate={goToCrossRef}
        onClose={() => setRefsTarget(null)}
      />
    </>
  );
}

export default TReader;