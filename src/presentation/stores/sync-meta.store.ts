'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SyncKind } from '@/src/domain/entities/sync.entity';
import { jsonStorage } from './multi-key-storage';

const STORAGE_KEY = 'bym:sync-meta';

/**
 * Horloge LWW par kind — spec 22 §4.2.
 *
 * `meta[kind]` = horodatage (ms) du dernier blob local connu (poussé ou tiré).
 * Au pull, on ne remplace le blob local que si `remote.updatedAt > meta[kind]`.
 * Au push, `bump(kind)` fixe l'horodatage du blob que l'on vient d'écrire, ce qui
 * protège les éditions locales non encore poussées contre un remote plus ancien.
 */
interface SyncMetaState {
  meta: Partial<Record<SyncKind, number>>;
  hydrated: boolean;
  get: (kind: SyncKind) => number;
  bump: (kind: SyncKind) => void;
  set: (kind: SyncKind, ts: number) => void;
  clear: () => void;
}

function now(): number {
  return typeof Date !== 'undefined' ? Date.now() : 0;
}

export const useSyncMeta = create<SyncMetaState>()(
  persist(
    (set, get) => ({
      meta: {},
      hydrated: false,

      get: (kind) => get().meta[kind] ?? 0,

      // Horodatage « maintenant » pour un blob fraîchement écrit/tiré.
      bump: (kind) =>
        set((s) => ({
          meta: { ...s.meta, [kind]: Math.max(s.meta[kind] ?? 0, now()) },
        })),

      // Fixe un horodatage explicite (ex. remote.updatedAt après un pull réussi).
      set: (kind, ts) =>
        set((s) => ({
          meta: { ...s.meta, [kind]: Math.max(s.meta[kind] ?? 0, ts) },
        })),

      clear: () => set({ meta: {} }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => jsonStorage),
      partialize: (s) => s.meta,
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export const getSyncMeta = () => useSyncMeta.getState();