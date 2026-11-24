import { create } from 'zustand';

/**
 * État de la synchronisation pour l'affichage (spec 39 §5.3) — mémoire seule.
 *
 * `lastSyncAt` : horodatage (ms) du dernier échange réussi avec le serveur (pull ou push).
 * `syncing` : un échange est en cours.
 */
interface SyncStatusState {
  lastSyncAt: number | null;
  syncing: boolean;
  markSynced: () => void;
  setSyncing: (v: boolean) => void;
  reset: () => void;
}

export const useSyncStatus = create<SyncStatusState>((set) => ({
  lastSyncAt: null,
  syncing: false,
  markSynced: () => set({ lastSyncAt: Date.now() }),
  setSyncing: (v) => set({ syncing: v }),
  reset: () => set({ lastSyncAt: null, syncing: false }),
}));
