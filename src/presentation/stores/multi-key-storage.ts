import type { StateStorage } from 'zustand/middleware';

/**
 * Storage Zustand multi-clés : un store peut persister son état sur **plusieurs** clés
 * localStorage (ex. `bymBookmarkGroups` + `bymBookmarks`), en préservant le format verbatim
 * de l'ancien projet.
 *
 * `keys` mappe `champ du state → clé localStorage`. La lecture agrège les clés en un objet ;
 * l'écriture découpe l'état persisté selon `partialize` du store et répartit chaque champ.
 */

interface MultiKeyDescriptor {
  /** Clé localStorage. */
  key: string;
  /** Chemin dans l'état persisté (partialize) à lire/écrire. */
  field: string;
  /** Sérialiseur JSON optionnel (défaut : JSON). */
}

export function createMultiKeyStorage(descriptors: MultiKeyDescriptor[]): StateStorage {
  return {
    getItem: (_name: string): string | null => {
      const aggregated: Record<string, unknown> = {};
      for (const d of descriptors) {
        try {
          const raw = localStorage.getItem(d.key);
          if (raw != null) aggregated[d.field] = JSON.parse(raw);
          else aggregated[d.field] = null;
        } catch {
          aggregated[d.field] = null;
        }
      }
      return JSON.stringify(aggregated);
    },
    setItem: (_name: string, value: string): void => {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      for (const d of descriptors) {
        try {
          localStorage.setItem(d.key, JSON.stringify(parsed[d.field] ?? null));
        } catch {
          /* stockage indisponible — on ignore */
        }
      }
    },
    removeItem: (_name: string): void => {
      for (const d of descriptors) {
        try {
          localStorage.removeItem(d.key);
        } catch {
          /* ignore */
        }
      }
    },
  };
}

/** Storage localStorage mono-clé (helper mince, préserve le format verbatim). */
export const jsonStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* ignore */
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};