'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Contexte de reprise du lecteur après une navigation vers une fiche Strong (`/strong/[code]`) :
 * on y enregistre la sélection de versets + le token Strong actif juste avant le `router.push`,
 * afin que le bouton retour restaure le lecteur dans l'état où l'utilisateur l'avait laissé
 * (verset sélectionné, panneau Strong ouvert, mot actif surligné). Cf. spec 29.
 *
 * Persisté en `sessionStorage` (et non localStorage) : transitoire, par onglet, non synchronisé
 * entre appareils — survit à un reload de la fiche Strong mais pas à la fermeture de l'onglet.
 */
export interface StrongResume {
  /** Ids des versets sélectionnés (`bookId:chapter:verse` en mode read, id de carte en mode refs). */
  selectedIds: string[];
  /** Token actif à restaurer (verset + code Strong du mot), ou null si aucun token n'était actif. */
  activeToken: { verseId: string; strongCode: string } | null;
}

interface StrongResumeState {
  resume: StrongResume | null;
  /** Enregistre le contexte de reprise avant de quitter le lecteur vers une fiche Strong. */
  setResume: (r: StrongResume) => void;
  /** Efface le contexte (navigation vers une occurrence depuis la fiche, etc.). */
  clear: () => void;
  /** Renvoie le contexte en attente et le consomme (one-shot). */
  consume: () => StrongResume | null;
}

export const useStrongResume = create<StrongResumeState>()(
  persist(
    (set, get) => ({
      resume: null,
      setResume: (r) => set({ resume: r }),
      clear: () => set({ resume: null }),
      consume: () => {
        const r = get().resume;
        if (r) set({ resume: null });
        return r;
      },
    }),
    {
      name: 'bym:strong-resume',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ resume: s.resume }),
    },
  ),
);