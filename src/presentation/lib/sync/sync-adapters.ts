'use client';

import type { SyncKind } from '@/src/domain/entities/sync.entity';
import { useFavorites } from '@/src/presentation/stores/favorites.store';
import { useReadingPosition } from '@/src/presentation/stores/reading-position.store';
import type { FavoriteVerse } from '@/src/domain/entities';
import type { ReadingPosition } from '@/src/domain/entities';

/**
 * Adaptateurs de sync — spec 22 §4.
 *
 * Pont entre un store zustand local et le blob chiffré du kind correspondant.
 * Chaque adaptateur sait :
 *  - `serialize()` : sérialiser la slice locale en JSON string (payload à chiffrer) ;
 *  - `hydrate(parsed)` : recharger la slice depuis un payload JSON déchiffré ;
 *  - `hasLocal()` : dire s'il existe une donnée locale à pousser (migration 1er login).
 *
 * Phase 1 : favoris + position. Phase 2 étendra la map (signets, notes, surlignages,
 * réglages, accent) — kinds non gérés valent `null` et sont ignorés par le moteur.
 */
export interface SyncAdapter {
  readonly kind: SyncKind;
  serialize(): string;
  hydrate(parsed: unknown): void;
  hasLocal(): boolean;
}

// --- favoris -------------------------------------------------------------------

const favoritesAdapter: SyncAdapter = {
  kind: 'favorites',
  serialize() {
    return JSON.stringify(useFavorites.getState().favorites);
  },
  hydrate(parsed) {
    const list = Array.isArray(parsed) ? (parsed as FavoriteVerse[]) : [];
    useFavorites.setState({ favorites: list });
  },
  hasLocal() {
    return useFavorites.getState().favorites.length > 0;
  },
};

// --- position de lecture -------------------------------------------------------

const readingPositionAdapter: SyncAdapter = {
  kind: 'readingPosition',
  serialize() {
    return JSON.stringify(useReadingPosition.getState().position);
  },
  hydrate(parsed) {
    const pos = (parsed ?? null) as ReadingPosition | null;
    useReadingPosition.setState({ position: pos });
  },
  hasLocal() {
    return useReadingPosition.getState().position !== null;
  },
};

/**
 * Registre kind → adaptateur. Les kinds `null` ne sont pas encore gérés
 * (Phase 2). Le moteur itère sur ce registre pour savoir quoi synchroniser.
 */
export const syncAdapters: Partial<Record<SyncKind, SyncAdapter>> = {
  favorites: favoritesAdapter,
  readingPosition: readingPositionAdapter,
};