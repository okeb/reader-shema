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

/** Clé localStorage de l'historique de navigation (récupérable en cas de quota dépassé). */
const NAV_HISTORY_KEY = 'bym:nav-history';
/** Nombre d'entrées d'historique conservées lors d'une récupération de quota. */
const NAV_HISTORY_PRUNE_TO = 50;

/**
 * Tente de libérer de l'espace localStorage en taillant l'historique de navigation (donnée la
 * plus volumineuse et la moins critique : garder les entrées les plus récentes suffit).
 * Retourne `true` si quelque chose a pu être supprimé (→ l'appelant peut réessayer l'écriture).
 */
function pruneNavHistoryForQuota(): boolean {
  try {
    const raw = localStorage.getItem(NAV_HISTORY_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { history?: unknown[] };
    const history = Array.isArray(parsed?.history) ? parsed.history : [];
    if (history.length <= NAV_HISTORY_PRUNE_TO) return false;
    parsed.history = history.slice(0, NAV_HISTORY_PRUNE_TO);
    localStorage.setItem(NAV_HISTORY_KEY, JSON.stringify(parsed));
    return true;
  } catch {
    return false;
  }
}

/** Storage localStorage mono-clé (helper mince, préserve le format verbatim). En cas de quota
 *  dépassé (QuotaExceededError), tente une récupération en taillant l'historique puis réessaie. */
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
      // Quota plein (ou stockage indisponible) : on tente de libérer de l'espace en taillant
      // l'historique (entrées les plus anciennes), puis on réessaie une fois. Sans cette
      // récupération, la mise à jour réussirait en mémoire mais serait perdue au rechargement.
      if (pruneNavHistoryForQuota()) {
        try {
          localStorage.setItem(name, value);
          return;
        } catch {
          /* toujours plein — on abandonne */
        }
      }
      console.warn('localStorage: écriture impossible (quota ?) —', name);
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