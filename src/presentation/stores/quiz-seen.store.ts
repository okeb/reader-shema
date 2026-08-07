'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { jsonStorage } from './multi-key-storage';

const STORAGE_KEY = 'bym:quiz-seen';

interface QuizSeenState {
  /** Map `quizId → true` des questions déjà répondues. */
  seen: Record<string, boolean>;
  hydrated: boolean;
  /** Marque une question comme répondue (persistant). */
  markSeen: (quizId: string) => void;
  /** Vrai si la question a déjà été répondue. */
  hasSeen: (quizId: string) => boolean;
}

/**
 * Mémorise les questions quiz déjà répondues (clé localStorage historique `bym:quiz-seen`).
 * Suit le pattern des autres stores (Zustand + persist + immer + `hydrated`), remplaçant l'ancien
 * hook maison `useQuizSeen` de `lib/quiz.ts`.
 */
export const useQuizSeen = create<QuizSeenState>()(
  persist(
    immer((set, get) => ({
      seen: {},
      hydrated: false,

      markSeen: (quizId) =>
        set((s) => {
          s.seen[quizId] = true;
        }),

      hasSeen: (quizId) => Boolean(get().seen[quizId]),
    })),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => jsonStorage),
      partialize: (s) => s.seen,
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Nettoie les entrées invalides (valeur non booléenne vraie).
          if (state.seen && typeof state.seen === 'object') {
            state.seen = Object.fromEntries(
              Object.entries(state.seen).filter(([, v]) => v === true),
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

export const getQuizSeen = () => useQuizSeen.getState().seen;