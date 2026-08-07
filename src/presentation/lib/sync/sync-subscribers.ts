'use client';

import { useFavorites } from '@/src/presentation/stores/favorites.store';
import { useReadingPosition } from '@/src/presentation/stores/reading-position.store';
import { notifyLocalChange } from './sync-engine';

/**
 * Abonnés de sync — spec 22 §4.5.
 *
 * Centralise la détection des mutations locales : on écoute chaque store syncé et
 * on enfile le kind correspondant via `notifyLocalChange`. Cela évite d'instrumenter
 * chaque action de store — un seul point de branchement par store.
 *
 * `subscribe(listener)` fournit `(state, prevState)` (pas de `subscribeWithSelector`) ;
 * on compare la slice concernée pour ne se déclencher que sur mutation réelle.
 *
 * `attachSyncSubscribers()` est idempotent et renvoie un détacheur (tests / démontage).
 */

let attached = false;

export function attachSyncSubscribers(): () => void {
  if (attached || typeof window === 'undefined') {
    return () => void 0;
  }
  attached = true;

  // On ignore l'événement d'hydratation initiale (`prev.hydrated === false`) pour
  // ne pas déclencher un push redondant à chaque chargement de page.
  const unsubFavorites = useFavorites.subscribe((s, prev) => {
    if (prev.hydrated && s.favorites !== prev.favorites) {
      notifyLocalChange('favorites');
    }
  });

  const unsubPosition = useReadingPosition.subscribe((s, prev) => {
    if (prev.hydrated && s.position !== prev.position) {
      notifyLocalChange('readingPosition');
    }
  });

  return () => {
    unsubFavorites();
    unsubPosition();
    attached = false;
  };
}