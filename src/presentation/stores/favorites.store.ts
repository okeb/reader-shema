'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { FavoriteVerse, FavoriteInput } from '@/src/domain/entities';
import { jsonStorage } from './multi-key-storage';

const STORAGE_KEY = 'bymFavorites';

interface FavoritesState {
  favorites: FavoriteVerse[];
  hydrated: boolean;
  add: (item: FavoriteInput) => void;
  remove: (id: string) => void;
  toggle: (item: FavoriteInput) => void;
  clear: () => void;
  isFavorite: (id: string) => boolean;
}

function isValidFavorite(x: unknown): x is FavoriteVerse {
  if (!x || typeof x !== 'object') return false;
  const f = x as Record<string, unknown>;
  return (
    typeof f.id === 'string' &&
    typeof f.version === 'string' &&
    typeof f.reference === 'string' &&
    typeof f.text === 'string' &&
    typeof f.createdAt === 'number'
  );
}

/**
 * Migre un favori vers le format spec 22 §4.2 (phase 2) : ajoute `updatedAt` manquant
 * en reprenant `createdAt` (miroir de `migrateNotes`). Les favoris déjà migrés sont
 * laissés intacts. Idempotent.
 */
function migrateFavorite(f: FavoriteVerse): FavoriteVerse {
  return { ...f, updatedAt: f.updatedAt ?? f.createdAt };
}

/** Génère un horodatage stable côté client (Date.now après hydratation). */
function now(): number {
  return typeof Date !== 'undefined' ? Date.now() : 0;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    immer((set, get) => ({
      favorites: [],
      hydrated: false,

      add: (item) =>
        set((s) => {
          if (s.favorites.some((f) => f.id === item.id)) return;
          const ts = now();
          s.favorites.push({ ...item, createdAt: ts, updatedAt: ts });
        }),

      remove: (id) =>
        set((s) => {
          s.favorites = s.favorites.filter((f) => f.id !== id);
        }),

      toggle: (item) =>
        set((s) => {
          const idx = s.favorites.findIndex((f) => f.id === item.id);
          if (idx >= 0) s.favorites.splice(idx, 1);
          else {
            const ts = now();
            s.favorites.push({ ...item, createdAt: ts, updatedAt: ts });
          }
        }),

      clear: () =>
        set((s) => {
          s.favorites = [];
        }),

      isFavorite: (id) => get().favorites.some((f) => f.id === id),
    })),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => jsonStorage),
      partialize: (s) => s.favorites,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.favorites = state.favorites.filter(isValidFavorite).map(migrateFavorite);
          state.hydrated = true;
        }
      },
    },
  ),
);

export const getFavorites = () => useFavorites.getState().favorites;