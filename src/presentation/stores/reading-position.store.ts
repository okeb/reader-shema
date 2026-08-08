'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { ReadingPosition } from '@/src/domain/entities';
import { jsonStorage } from './multi-key-storage';

const STORAGE_KEY = 'bym:last-position';

function isValid(x: unknown): x is ReadingPosition {
  if (!x || typeof x !== 'object') return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.bookId === 'string' &&
    typeof p.chapter === 'number' &&
    typeof p.reference === 'string' &&
    typeof p.at === 'number'
  );
}

interface ReadingPositionState {
  position: ReadingPosition | null;
  hydrated: boolean;
  save: (pos: Omit<ReadingPosition, 'at'>) => void;
  clear: () => void;
}

export const useReadingPosition = create<ReadingPositionState>()(
  persist(
    immer((set) => ({
      position: null,
      hydrated: false,

      save: (pos) =>
        set((s) => {
          s.position = { ...pos, at: typeof Date !== 'undefined' ? Date.now() : 0 };
        }),
      clear: () =>
        set((s) => {
          s.position = null;
        }),
    })),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => jsonStorage),
      partialize: (s) => s.position,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.position = isValid(state.position) ? state.position : null;
          state.hydrated = true;
        }
      },
    },
  ),
);

export const getReadingPosition = () => useReadingPosition.getState().position;