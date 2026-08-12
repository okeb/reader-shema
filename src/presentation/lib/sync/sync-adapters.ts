'use client';

import type { SyncKind } from '@/src/domain/entities/sync.entity';
import type {
  BookmarkGroup,
  BookmarkVerse,
  HighlightMap,
  NoteMap,
  FavoriteVerse,
  ReadingPosition,
  NavHistoryEntry,
} from '@/src/domain/entities';
import { HISTORY_MAX } from '@/src/domain/entities';
import type { ReaderPreferences } from '@/src/shared/constants/reader-preferences';
import { useFavorites } from '@/src/presentation/stores/favorites.store';
import { useReadingPosition } from '@/src/presentation/stores/reading-position.store';
import { useBookmarks } from '@/src/presentation/stores/bookmarks.store';
import { useAnnotations } from '@/src/presentation/stores/annotations.store';
import { useNavigationHistory } from '@/src/presentation/stores/navigation-history.store';
import { applyReaderPrefs, getReaderPrefs } from '@/src/presentation/stores/reader-preferences.store';

/**
 * Adaptateurs de sync — spec 22 §4.
 *
 * Pont entre un store zustand local et le blob chiffré du kind correspondant.
 * Chaque adaptateur sait :
 *  - `serialize()` : sérialiser la slice locale en JSON string (payload à chiffrer) ;
 *  - `hydrate(parsed)` : recharger la slice depuis un payload JSON déchiffré ;
 *  - `hasLocal()` : dire s'il existe une donnée locale à pousser (migration 1er login).
 *
 * `optIn` : kind synchronisé uniquement si l'utilisateur a activé « synchroniser mes
 * réglages » (readerPrefs). Les kinds non opt-in sync toujours (quand syncEnabled).
 *
 * Phase 2 : signets (groupes + versets), notes, surlignages + réglages opt-in.
 * `themeAccent` (thème clair/sombre géré par next-themes) reste non adapté pour
 * l'instant (le contexte next-themes n'est pas pilotable hors React) — l'accent,
 * lui, vit dans `readerPrefs` et sync donc déjà.
 */
export interface SyncAdapter {
  readonly kind: SyncKind;
  /** `true` si le kind n'est sync qu'avec l'opt-in réglages. */
  optIn?: boolean;
  serialize(): string;
  hydrate(parsed: unknown): void;
  hasLocal(): boolean;
}

// --- favoris -------------------------------------------------------------------

const favoritesAdapter: SyncAdapter = {
  kind: 'favorites',
  serialize() {
    return JSON.stringify(useFavorites.getState().favorites);
  },
  hydrate(parsed) {
    const list = Array.isArray(parsed) ? (parsed as FavoriteVerse[]) : [];
    useFavorites.setState({ favorites: list });
  },
  hasLocal() {
    return useFavorites.getState().favorites.length > 0;
  },
};

// --- position de lecture -------------------------------------------------------

const readingPositionAdapter: SyncAdapter = {
  kind: 'readingPosition',
  serialize() {
    return JSON.stringify(useReadingPosition.getState().position);
  },
  hydrate(parsed) {
    const pos = (parsed ?? null) as ReadingPosition | null;
    useReadingPosition.setState({ position: pos });
  },
  hasLocal() {
    return useReadingPosition.getState().position !== null;
  },
};

// --- signets : groupes ---------------------------------------------------------

const bookmarkGroupsAdapter: SyncAdapter = {
  kind: 'bookmarkGroups',
  serialize() {
    return JSON.stringify(useBookmarks.getState().groups);
  },
  hydrate(parsed) {
    const groups = Array.isArray(parsed) ? (parsed as BookmarkGroup[]) : [];
    useBookmarks.setState({ groups });
  },
  hasLocal() {
    return useBookmarks.getState().groups.length > 0;
  },
};

// --- signets : versets ---------------------------------------------------------

const bookmarksAdapter: SyncAdapter = {
  kind: 'bookmarks',
  serialize() {
    return JSON.stringify(useBookmarks.getState().bookmarks);
  },
  hydrate(parsed) {
    const bookmarks = Array.isArray(parsed) ? (parsed as BookmarkVerse[]) : [];
    useBookmarks.setState({ bookmarks });
  },
  hasLocal() {
    return useBookmarks.getState().bookmarks.length > 0;
  },
};

// --- notes ---------------------------------------------------------------------

const notesAdapter: SyncAdapter = {
  kind: 'notes',
  serialize() {
    return JSON.stringify(useAnnotations.getState().notes);
  },
  hydrate(parsed) {
    const notes = (parsed && typeof parsed === 'object' ? parsed : {}) as NoteMap;
    useAnnotations.setState({ notes });
  },
  hasLocal() {
    return Object.keys(useAnnotations.getState().notes).length > 0;
  },
};

// --- surlignages ---------------------------------------------------------------

const highlightsAdapter: SyncAdapter = {
  kind: 'highlights',
  serialize() {
    return JSON.stringify(useAnnotations.getState().highlights);
  },
  hydrate(parsed) {
    const highlights = (parsed && typeof parsed === 'object' ? parsed : {}) as HighlightMap;
    useAnnotations.setState({ highlights });
  },
  hasLocal() {
    return Object.keys(useAnnotations.getState().highlights).length > 0;
  },
};

// --- historique de navigation ---------------------------------------------------
//
// Kind « ensemble » : au pull, on FUSIONNE le blob distant avec l'historique local
// (union par `id`, doublon → on garde l'entrée au `at` le plus récent, tri desc, cap
// HISTORY_MAX) au lieu de remplacer. Sinon, en écriture concurrente multi-appareil, le
// LWW par kind écarterait les entrées de l'autre appareil. La fusion converge : chaque
// appareil republie ensuite l'ensemble complet.

const historyAdapter: SyncAdapter = {
  kind: 'history',
  serialize() {
    return JSON.stringify(useNavigationHistory.getState().history);
  },
  hydrate(parsed) {
    const remote = Array.isArray(parsed) ? (parsed as NavHistoryEntry[]) : [];
    const local = useNavigationHistory.getState().history;
    const byId = new Map<string, NavHistoryEntry>();
    for (const e of local) byId.set(e.id, e);
    for (const e of remote) {
      if (!e || typeof e.id !== 'string') continue; // entrée malformée → ignorée
      const ex = byId.get(e.id);
      if (!ex || (typeof e.at === 'number' && e.at > (ex.at ?? -1))) byId.set(e.id, e);
    }
    const merged = [...byId.values()]
      .sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
      .slice(0, HISTORY_MAX);
    useNavigationHistory.setState({ history: merged });
  },
  hasLocal() {
    return useNavigationHistory.getState().history.length > 0;
  },
};

// --- réglages de lecture (opt-in) ----------------------------------------------

const readerPrefsAdapter: SyncAdapter = {
  kind: 'readerPrefs',
  optIn: true,
  serialize() {
    return JSON.stringify(getReaderPrefs());
  },
  hydrate(parsed) {
    if (!parsed || typeof parsed !== 'object') return;
    applyReaderPrefs(parsed as Partial<ReaderPreferences>);
  },
  hasLocal() {
    return true; // des réglages existent toujours (défauts au moins)
  },
};

/**
 * Registre kind → adaptateur. Les kinds non gérés (themeAccent pour l'instant)
 * sont absents : le moteur les ignore. Le moteur itère sur ce registre.
 */
export const syncAdapters: Partial<Record<SyncKind, SyncAdapter>> = {
  favorites: favoritesAdapter,
  readingPosition: readingPositionAdapter,
  bookmarkGroups: bookmarkGroupsAdapter,
  bookmarks: bookmarksAdapter,
  notes: notesAdapter,
  highlights: highlightsAdapter,
  history: historyAdapter,
  readerPrefs: readerPrefsAdapter,
};