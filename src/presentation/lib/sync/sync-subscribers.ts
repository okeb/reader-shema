'use client';

import { useFavorites } from '@/src/presentation/stores/favorites.store';
import { useReadingPosition } from '@/src/presentation/stores/reading-position.store';
import { useBookmarks } from '@/src/presentation/stores/bookmarks.store';
import { useAnnotations } from '@/src/presentation/stores/annotations.store';
import { useReaderPreferences } from '@/src/presentation/stores/reader-preferences.store';
import { notifyLocalChange } from './sync-engine';

/**
 * Abonnés de sync — spec 22 §4.5.
 *
 * Centralise la détection des mutations locales : on écoute chaque store syncé et
 * on enfile le kind correspondant via `notifyLocalChange`. Cela évite d'instrumenter
 * chaque action de store — un seul point de branchement par store.
 *
 * `subscribe(listener)` fournit `(state, prevState)` (pas de `subscribeWithSelector`) ;
 * on compare la slice concernée pour ne se déclencher que sur mutation réelle, et on
 * ignore l'événement d'hydratation initiale (`prev.hydrated === false`) pour ne pas
 * déclencher un push redondant à chaque chargement.
 *
 * Les kinds opt-in (readerPrefs) sont enfilés sans condition ici : `notifyLocalChange`
 * les ignore tant que l'opt-in réglages n'est pas activé.
 *
 * `attachSyncSubscribers()` est idempotent et renvoie un détacheur (tests / démontage).
 */

let attached = false;

export function attachSyncSubscribers(): () => void {
  if (attached || typeof window === 'undefined') {
    return () => void 0;
  }
  attached = true;

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

  const unsubBookmarks = useBookmarks.subscribe((s, prev) => {
    if (!prev.hydrated) return;
    if (s.groups !== prev.groups) notifyLocalChange('bookmarkGroups');
    if (s.bookmarks !== prev.bookmarks) notifyLocalChange('bookmarks');
  });

  const unsubAnnotations = useAnnotations.subscribe((s, prev) => {
    if (!prev.hydrated) return;
    if (s.notes !== prev.notes) notifyLocalChange('notes');
    if (s.highlights !== prev.highlights) notifyLocalChange('highlights');
  });

  const unsubReaderPrefs = useReaderPreferences.subscribe((s, prev) => {
    if (prev.hydrated && s !== prev) {
      notifyLocalChange('readerPrefs');
    }
  });

  return () => {
    unsubFavorites();
    unsubPosition();
    unsubBookmarks();
    unsubAnnotations();
    unsubReaderPrefs();
    attached = false;
  };
}