'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { jsonStorage } from './multi-key-storage';

const STORAGE_KEY = 'bym:account';

/**
 * Préférences de compte/sync (spec 22) — persistées côté client.
 *
 * `syncEnabled` : toggle maître « Synchroniser sur mes appareils » (n'active la sync
 * que si une session + une master key sont présentes). `settingsSyncOptIn` : opt-in
 * explicite pour synchroniser les réglages de lecture + l'accent (phase 2 ; par
 * défaut non — l'utilisateur garde ses réglages par appareil sauf choix contraire).
 *
 * L'état de session lui-même n'est PAS ici : il vient du cookie Neon via
 * `authClient.useSession()` (non persisté côté app).
 */
interface AccountState {
  syncEnabled: boolean;
  settingsSyncOptIn: boolean;
  hydrated: boolean;
  setSyncEnabled: (v: boolean) => void;
  setSettingsSyncOptIn: (v: boolean) => void;
  reset: () => void;
}

export const useAccount = create<AccountState>()(
  persist(
    (set) => ({
      syncEnabled: false,
      settingsSyncOptIn: false,
      hydrated: false,
      setSyncEnabled: (v) => set({ syncEnabled: v }),
      setSettingsSyncOptIn: (v) => set({ settingsSyncOptIn: v }),
      reset: () => set({ syncEnabled: false, settingsSyncOptIn: false }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => jsonStorage),
      partialize: (s) => ({
        syncEnabled: s.syncEnabled,
        settingsSyncOptIn: s.settingsSyncOptIn,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export const getAccount = () => useAccount.getState();