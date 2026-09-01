'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { NavHistoryEntry, NavHistoryInput } from '@/src/domain/entities';
import { navHistoryId, HISTORY_MAX } from '@/src/domain/entities';
import { jsonStorage } from './multi-key-storage';

const STORAGE_KEY = 'bym:nav-history';
/** Ancienne clé « Recherches récentes » de la palette ⌘K, migrée une fois puis supprimée. */
const LEGACY_KEY = 'bym:search-history';

function isValid(x: unknown): x is NavHistoryEntry {
  if (!x || typeof x !== 'object') return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.version === 'string' &&
    typeof e.bookId === 'string' &&
    typeof e.chapter === 'number' &&
    typeof e.reference === 'string' &&
    typeof e.url === 'string' &&
    typeof e.at === 'number' &&
    (e.selection === undefined || typeof e.selection === 'string') &&
    (e.selections === undefined ||
      (Array.isArray(e.selections) && e.selections.every((s) => typeof s === 'string')))
  );
}

/** Convertit une ancienne entrée {label,url} de bym:search-history en NavHistoryEntry. */
function migrateLegacyEntry(raw: unknown, at: number): NavHistoryEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const { label, url } = raw as Record<string, unknown>;
  if (typeof label !== 'string' || typeof url !== 'string') return null;
  const pathMatch = (url as string).match(/^\/([^/]+)\/read\?(.*)$/);
  if (!pathMatch) return null;
  const version = pathMatch[1];
  const params = new URLSearchParams(pathMatch[2]);
  const bookId = params.get('livre');
  const chapRaw = params.get('chap');
  const chapter = chapRaw ? Number.parseInt(chapRaw, 10) : NaN;
  if (!bookId || !Number.isFinite(chapter)) return null;
  return {
    id: navHistoryId(version, bookId, chapter),
    version,
    bookId,
    chapter,
    selection: params.get('v') || undefined,
    reference: label,
    url,
    at,
  };
}

/** Lit et migre une fois l'ancien historique de recherches, puis supprime sa clé. */
function migrateLegacy(): NavHistoryEntry[] {
  if (typeof localStorage === 'undefined') return [];
  let entries: NavHistoryEntry[] = [];
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const base = typeof Date !== 'undefined' ? Date.now() : 0;
        const seen = new Set<string>();
        parsed.forEach((item, i) => {
          const entry = migrateLegacyEntry(item, base - i);
          if (entry && !seen.has(entry.id)) {
            seen.add(entry.id);
            entries.push(entry);
          }
        });
      }
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* lecture impossible — pas de migration */
  }
  return entries;
}

interface NavigationHistoryState {
  history: NavHistoryEntry[];
  hydrated: boolean;
  push: (entry: NavHistoryInput) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useNavigationHistory = create<NavigationHistoryState>()(
  persist(
    immer((set) => ({
      history: [],
      hydrated: false,

      push: (entry) =>
        set((s) => {
          const id = navHistoryId(entry.version, entry.bookId, entry.chapter);
          const existing = s.history.find((e) => e.id === id);
          // Cumule les sélections par chapitre (sans doublon, la plus récente en dernier) ;
          // `selection` reste la valeur active pour la rétro-compat UI.
          const selections =
            entry.selection != null
              ? [...(existing?.selections ?? []), entry.selection].filter(
                  (v, i, arr) => arr.indexOf(v) === i,
                )
              : existing?.selections;
          const full: NavHistoryEntry = {
            ...entry,
            id,
            selections,
            at: typeof Date !== 'undefined' ? Date.now() : 0,
          };
          s.history = [full, ...s.history.filter((e) => e.id !== id)].slice(0, HISTORY_MAX);
        }),
      remove: (id) =>
        set((s) => {
          s.history = s.history.filter((e) => e.id !== id);
        }),
      clear: () =>
        set((s) => {
          s.history = [];
        }),
    })),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => jsonStorage),
      partialize: (s) => s.history,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        let next = (state.history ?? []).filter(isValid).map((e) =>
          // Migration : une entrée sans `selections` mais avec `selection` → `[selection]`.
          !e.selections && e.selection != null ? { ...e, selections: [e.selection] } : e,
        );
        // Migration one-shot de l'ancien historique de recherches si la nouvelle clé est vide.
        if (next.length === 0) {
          const migrated = migrateLegacy();
          if (migrated.length > 0) next = migrated.slice(0, HISTORY_MAX);
        }
        state.history = next;
        state.hydrated = true;
      },
    },
  ),
);

export const getNavigationHistory = () => useNavigationHistory.getState().history;