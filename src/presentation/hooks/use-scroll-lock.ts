'use client';

import { useEffect } from 'react';

/**
 * Verrouille le défilement de <body> quand `lock` est vrai (panneaux/modales par-dessus le
 * lecteur). Restaure l'état précédent au démontage. Sans effet côté serveur.
 */
export function useScrollLock(lock: boolean): void {
  useEffect(() => {
    if (!lock) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [lock]);
}