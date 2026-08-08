'use client';

import { useEffect, useState } from 'react';

/**
 * Détecte un pointeur grossier (tactile). `true` quand `(pointer: coarse)` correspond —
 * used pour masquer les clusters au survol (remplacés par le dock) et adapter le logo en focus.
 * Retourne `false` pendant le SSR (le premier rendu est toujours desktop-safe).
 */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return coarse;
}