'use client';

import { useEffect, useState } from 'react';
import { resolveDoodle, type Doodle } from '@/src/shared/constants/doodles';

/**
 * Résout l'occasion de doodle active « aujourd'hui » (spec 18).
 *
 * Calcul **côté client après montage** (jamais pendant le SSR) : l'état initial est `null` pour éviter
 * tout mismatch d'hydratation et tout flash server-side. Re-évalué au passage minuit (un `setTimeout`
 * jusqu'au prochain 00h00 local) et au retour d'onglet (`visibilitychange` — au cas où minuit soit
 * passé pendant que l'onglet était caché).
 *
 * Retourne `{ doodle: Doodle | null }`. La résolution est déterministe pour une date donnée
 * (`resolveDoodle`), donc ce hook ne fait que choisir « quand » recalculer.
 *
 * Porté de l'ancien `lib/use-doodle.ts`.
 */
export function useDoodle(): { doodle: Doodle | null } {
  const [doodle, setDoodle] = useState<Doodle | null>(null);

  useEffect(() => {
    const compute = () => setDoodle(resolveDoodle(new Date()));

    compute(); // première résolution après montage

    // Re-éval au retour d'onglet (minuit a pu passer pendant l'occlusion).
    const onVis = () => {
      if (document.visibilityState === 'visible') compute();
    };
    document.addEventListener('visibilitychange', onVis);

    // Re-éval au prochain passage minuit local, puis reprogramme pour le lendemain.
    let midnightTimer: ReturnType<typeof setTimeout>;
    const scheduleMidnight = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      midnightTimer = setTimeout(() => {
        compute();
        scheduleMidnight();
      }, next.getTime() - now.getTime());
    };
    scheduleMidnight();

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      clearTimeout(midnightTimer);
    };
  }, []);

  return { doodle };
}