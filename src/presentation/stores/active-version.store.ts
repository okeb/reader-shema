'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  DEFAULT_BIBLE_VERSION,
  getVersion,
  isSelectableId,
  type BibleVersion,
} from '@/src/shared/constants/bible-versions';

const PRIMARY_KEY = 'bym:version';
const COMPARE_KEY = 'bym:compare-version';

/**
 * Stocke la version active en **chaînes brutes** (non JSON) dans localStorage, conformément
 * au format historique (`localStorage.setItem(key, id)`). Gestion manuelle (pas de middleware
 * `persist`) afin de supporter l'option `persist: false` (lien partagé `?version=` : le
 * destinataire voit la version de l'expéditeur sans écraser sa valeur par défaut, spec 14).
 */
function readPrimary(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_BIBLE_VERSION.id;
  try {
    const raw = localStorage.getItem(PRIMARY_KEY);
    if (raw && isSelectableId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_BIBLE_VERSION.id;
}

function readCompare(primary: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    if (raw && isSelectableId(raw) && raw !== primary) return raw;
  } catch {
    /* ignore */
  }
  return null;
}

function writePrimary(id: string) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PRIMARY_KEY, id);
  } catch {
    /* ignore */
  }
}

function writeCompare(id: string | null) {
  if (typeof localStorage === 'undefined') return;
  try {
    if (id == null) localStorage.removeItem(COMPARE_KEY);
    else localStorage.setItem(COMPARE_KEY, id);
  } catch {
    /* ignore */
  }
}

interface ActiveVersionState {
  primaryId: string;
  compareId: string | null;
  hydrated: boolean;
  /** Version primaire résolue (toujours définie — repli sur la version par défaut). */
  primary: BibleVersion;
  /** Version de comparaison résolue (null si fermée ou égale à la primaire). */
  compare: BibleVersion | null;
  /** Hydrate depuis localStorage (à appeler une fois côté client). */
  hydrate: () => void;
  setPrimary: (id: string, opts?: { persist?: boolean }) => void;
  setCompare: (id: string | null) => void;
  clearCompare: () => void;
}

const DEFAULT_PRIMARY = DEFAULT_BIBLE_VERSION.id;

export const useActiveVersion = create<ActiveVersionState>()(
  immer((set) => ({
    primaryId: DEFAULT_PRIMARY,
    compareId: null,
    hydrated: false,
    primary: DEFAULT_BIBLE_VERSION,
    compare: null,

    hydrate: () =>
      set((s) => {
        if (s.hydrated) return;
        const p = readPrimary();
        const c = readCompare(p);
        s.primaryId = p;
        s.compareId = c;
        s.primary = getVersion(p);
        s.compare = c ? getVersion(c) : null;
        s.hydrated = true;
      }),

    setPrimary: (id, opts = {}) =>
      set((s) => {
        if (!isSelectableId(id)) return;
        const shouldPersist = opts.persist !== false;
        s.primaryId = id;
        s.primary = getVersion(id);
        // La comparaison ne peut pas valoir la nouvelle primaire.
        if (s.compareId === id) {
          s.compareId = null;
          s.compare = null;
        }
        if (shouldPersist) {
          writePrimary(id);
          writeCompare(s.compareId);
        }
      }),

    setCompare: (id) =>
      set((s) => {
        if (id === null || !isSelectableId(id)) {
          s.compareId = null;
          s.compare = null;
          writeCompare(null);
          return;
        }
        s.compareId = id;
        s.compare = id !== s.primaryId ? getVersion(id) : null;
        writeCompare(s.compare ? id : null);
      }),

    clearCompare: () =>
      set((s) => {
        s.compareId = null;
        s.compare = null;
        writeCompare(null);
      }),
  })),
);

export const getActiveVersion = () => {
  const s = useActiveVersion.getState();
  return { primary: s.primary, compare: s.compare };
};