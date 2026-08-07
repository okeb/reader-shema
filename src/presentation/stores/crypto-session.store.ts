import { create } from 'zustand';

/**
 * État de session cryptographique (E2EE) — spec 22 §4.4.
 *
 * Tient la master key `CryptoKey` **en mémoire seule** (zustand SANS persist) :
 * elle est effacée au rechargement/fermeture de l'onglet. La recovery key n'est
 * jamais stockée par l'app — uniquement saisie par l'utilisateur pour dériver la
 * master key sur l'appareil courant.
 */
interface CryptoSessionState {
  masterKey: CryptoKey | null;
  unlocked: boolean;
  setMasterKey: (key: CryptoKey) => void;
  lock: () => void;
}

export const useCryptoSession = create<CryptoSessionState>((set) => ({
  masterKey: null,
  unlocked: false,
  setMasterKey: (key) => set({ masterKey: key, unlocked: true }),
  lock: () => set({ masterKey: null, unlocked: false }),
}));

export const getCryptoSession = () => useCryptoSession.getState();