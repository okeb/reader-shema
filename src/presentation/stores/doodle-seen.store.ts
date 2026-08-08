'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { jsonStorage } from './multi-key-storage';
import { doodleDayKey } from '@/src/shared/constants/doodles';

const STORAGE_KEY = 'bym:doodle-seen';

interface DoodleSeenState {
  /** Map `doodleId → "YYYY-MM-DD"` (dernier jour où l'entrée a joué avec succès). */
  seen: Record<string, string>;
  hydrated: boolean;
  /** Marque l'entrée d'un doodle comme jouée aujourd'hui (persistant). Appeler au succès du `.riv`. */
  markSeen: (doodleId: string) => void;
  /** Vrai si l'entrée du doodle a déjà joué aujourd'hui (réservé au câblage futur 1×/jour, spec §6.2). */
  isSeenToday: (doodleId: string) => boolean;
}

/**
 * Mémorise les doodles dont l'animation d'entrée a **joué avec succès** (clé historique
 * `bym:doodle-seen`), pour ne pas rejouer l'entrée à chaque navigation dans la même journée.
 *
 * Subtilité (spec 18 §6.2) : `markSeen` n'est appelé que si le `.riv` a chargé et l'entrée a joué
 * (cf. `m-doodle-renderer`). En cas d'échec d'asset, on ne marque pas — un deploy correctif plus
 * tard dans la journée rejouera l'entrée. Suit le pattern des autres stores (Zustand + persist +
 * immer + `hydrated`), remplaçant l'ancien hook maison `useDoodleSeen` de `lib/doodle-seen.ts`.
 */
export const useDoodleSeen = create<DoodleSeenState>()(
  persist(
    immer((set, get) => ({
      seen: {},
      hydrated: false,

      markSeen: (doodleId) =>
        set((s) => {
          s.seen[doodleId] = doodleDayKey(new Date());
        }),

      isSeenToday: (doodleId) => get().seen[doodleId] === doodleDayKey(new Date()),
    })),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => jsonStorage),
      partialize: (s) => s.seen,
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.seen && typeof state.seen === 'object') {
            state.seen = Object.fromEntries(
              Object.entries(state.seen).filter(([, v]) => typeof v === 'string'),
            );
          } else {
            state.seen = {};
          }
          state.hydrated = true;
        }
      },
    },
  ),
);

export const getDoodleSeen = () => useDoodleSeen.getState().seen;