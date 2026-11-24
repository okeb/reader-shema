'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { jsonStorage } from './multi-key-storage';

const STORAGE_KEY = 'bym:account';

/**
 * Préférences de compte/sync (spec 22, spec 39) — persistées côté client.
 *
 * `syncPaused` : l'utilisateur a mis la synchronisation en pause (bascule de `/account`). Par
 * défaut `false` : dès qu'une session existe, la sync est active (spec 39 §4.1).
 * `settingsSyncOptIn` : opt-in explicite pour synchroniser les réglages de lecture + l'accent
 * (par défaut non — l'utilisateur garde ses réglages par appareil sauf choix contraire).
 *
 * L'état de session lui-même n'est PAS ici : il vient du cookie Better Auth via
 * `authClient.useSession()` (non persisté côté app).
 */
interface AccountState {
  syncPaused: boolean;
  settingsSyncOptIn: boolean;
  hydrated: boolean;
  setSyncPaused: (v: boolean) => void;
  setSettingsSyncOptIn: (v: boolean) => void;
  reset: () => void;
}

export const useAccount = create<AccountState>()(
  persist(
    (set) => ({
      syncPaused: false,
      settingsSyncOptIn: false,
      hydrated: false,
      setSyncPaused: (v) => set({ syncPaused: v }),
      setSettingsSyncOptIn: (v) => set({ settingsSyncOptIn: v }),
      reset: () => set({ syncPaused: false, settingsSyncOptIn: false }),
    }),
    {
      name: STORAGE_KEY,
      // v1 (spec 39) : `syncEnabled` (v0) est abandonné. Il valait `false` sur tout appareil jamais
      // déverrouillé ; on repart donc de `syncPaused: false` (connecté = synchronisé).
      version: 1,
      migrate: (persisted) => {
        const old = (persisted ?? {}) as { settingsSyncOptIn?: boolean };
        return { syncPaused: false, settingsSyncOptIn: old.settingsSyncOptIn ?? false } as AccountState;
      },
      storage: createJSONStorage(() => jsonStorage),
      partialize: (s) => ({
        syncPaused: s.syncPaused,
        settingsSyncOptIn: s.settingsSyncOptIn,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export const getAccount = () => useAccount.getState();
