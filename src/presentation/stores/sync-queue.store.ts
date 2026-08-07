'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SyncKind } from '@/src/domain/entities/sync.entity';
import { jsonStorage } from './multi-key-storage';

const STORAGE_KEY = 'bym:sync-queue';

/**
 * File des kinds sales (modifiés localement, pas encore poussés) — spec 22 §4.5.
 *
 * Persistance volontaire : une édition faite hors-ligne survit au rechargement et
 * est poussée à la prochaine connexion. Dédoublonnage (un kind n'apparaît qu'une fois).
 * Le moteur de sync vide la file via `flush()` (debounce 2s + sur online/visibility).
 */
interface SyncQueueState {
  pending: SyncKind[];
  hydrated: boolean;
  enqueue: (kind: SyncKind) => void;
  markPushed: (kind: SyncKind) => void;
  clear: () => void;
}

export const useSyncQueue = create<SyncQueueState>()(
  persist(
    (set) => ({
      pending: [],
      hydrated: false,

      enqueue: (kind) =>
        set((s) =>
          s.pending.includes(kind)
            ? s
            : { pending: [...s.pending, kind] },
        ),

      markPushed: (kind) =>
        set((s) => ({ pending: s.pending.filter((k) => k !== kind) })),

      clear: () => set({ pending: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => jsonStorage),
      partialize: (s) => s.pending,
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export const getSyncQueue = () => useSyncQueue.getState();