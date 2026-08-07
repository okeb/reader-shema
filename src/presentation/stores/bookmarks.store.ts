'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { BookmarkGroup, BookmarkVerse, BookmarkInput } from '@/src/domain/entities';
import { BOOKMARK_COLORS } from '@/src/domain/entities';
import { createMultiKeyStorage } from './multi-key-storage';

const GROUPS_KEY = 'bymBookmarkGroups';
const ITEMS_KEY = 'bymBookmarks';
const DEFAULT_GROUP_NAME = 'Mes versets';

/** Identifiant court et unique. */
function uid(): string {
  const t = typeof Date !== 'undefined' ? Date.now().toString(36) : '0';
  const r = typeof Math !== 'undefined' ? Math.random().toString(36).slice(2, 8) : 'xxxxxx';
  return `${t}-${r}`;
}
function now(): number {
  return typeof Date !== 'undefined' ? Date.now() : 0;
}

function isValidGroup(x: unknown): x is BookmarkGroup {
  if (!x || typeof x !== 'object') return false;
  const g = x as Record<string, unknown>;
  return (
    typeof g.id === 'string' &&
    typeof g.name === 'string' &&
    typeof g.color === 'string' &&
    typeof g.createdAt === 'number'
  );
}

function isValidBookmark(x: unknown): x is BookmarkVerse {
  if (!x || typeof x !== 'object') return false;
  const b = x as Record<string, unknown>;
  return (
    typeof b.id === 'string' &&
    typeof b.groupId === 'string' &&
    typeof b.version === 'string' &&
    typeof b.reference === 'string' &&
    typeof b.text === 'string' &&
    typeof b.bookId === 'string' &&
    typeof b.chapter === 'number' &&
    typeof b.verse === 'number' &&
    typeof b.createdAt === 'number'
  );
}

interface BookmarksState {
  groups: BookmarkGroup[];
  bookmarks: BookmarkVerse[];
  hydrated: boolean;
  addGroup: (name: string, color: string) => string;
  renameGroup: (id: string, name: string) => void;
  setGroupColor: (id: string, color: string) => void;
  removeGroup: (id: string) => void;
  addToGroup: (item: BookmarkInput, groupId: string) => void;
  remove: (id: string) => void;
  isBookmarked: (id: string) => boolean;
  bookmarkOf: (id: string) => BookmarkVerse | undefined;
}

const multiKeyStorage = createMultiKeyStorage([
  { key: GROUPS_KEY, field: 'groups' },
  { key: ITEMS_KEY, field: 'bookmarks' },
]);

export const useBookmarks = create<BookmarksState>()(
  persist(
    immer((set, get) => ({
      groups: [],
      bookmarks: [],
      hydrated: false,

      addGroup: (name, color) => {
        const id = uid();
        set((s) => {
          s.groups.push({ id, name: name.trim() || DEFAULT_GROUP_NAME, color, createdAt: now() });
        });
        return id;
      },

      renameGroup: (id, name) =>
        set((s) => {
          const g = s.groups.find((x) => x.id === id);
          if (g) g.name = name.trim() || g.name;
        }),

      setGroupColor: (id, color) =>
        set((s) => {
          const g = s.groups.find((x) => x.id === id);
          if (g) g.color = color;
        }),

      removeGroup: (id) =>
        set((s) => {
          s.groups = s.groups.filter((g) => g.id !== id);
          s.bookmarks = s.bookmarks.filter((b) => b.groupId !== id);
        }),

      addToGroup: (item, groupId) =>
        set((s) => {
          // Un verset n'appartient qu'à un groupe : on déplace s'il existe déjà.
          s.bookmarks = s.bookmarks.filter((b) => b.id !== item.id);
          s.bookmarks.push({ ...item, groupId, createdAt: now() });
        }),

      remove: (id) =>
        set((s) => {
          s.bookmarks = s.bookmarks.filter((b) => b.id !== id);
        }),

      isBookmarked: (id) => get().bookmarks.some((b) => b.id === id),
      bookmarkOf: (id) => get().bookmarks.find((b) => b.id === id),
    })),
    {
      name: 'bookmarks', // nom logique (le storage multi-clés gère les vraies clés)
      storage: createJSONStorage(() => multiKeyStorage),
      partialize: (s) => ({ groups: s.groups, bookmarks: s.bookmarks }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.groups = (state.groups ?? []).filter(isValidGroup);
        state.bookmarks = (state.bookmarks ?? []).filter(isValidBookmark);
        // Amorçage d'un groupe par défaut si aucun (comportement historique).
        if (state.groups.length === 0) {
          state.groups = [{ id: uid(), name: DEFAULT_GROUP_NAME, color: BOOKMARK_COLORS[0], createdAt: now() }];
        }
        state.hydrated = true;
      },
    },
  ),
);

export const getBookmarks = () => useBookmarks.getState();