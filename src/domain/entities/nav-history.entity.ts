/**
 * Une entrée d'historique de navigation = un chapitre consulté. Source unique alimentant à la fois
 * le panneau « Historique » et la section « Récemment consulté » de la palette ⌘K.
 * Clé localStorage : `bym:nav-history`. Cf. spec 09.
 */
export interface NavHistoryEntry {
  /** Clé de dédoublonnage : `${version}:${bookId}:${chapter}` (ignore le verset). */
  id: string;
  version: string;
  bookId: string;
  chapter: number;
  /** Dernier verset (ou plage) surligné, ex. « 16 », « 12-20 ». Absent = chapitre entier. */
  selection?: string;
  /** Référence affichable, ex. « Jean 3 » / « Jean 3:16 ». */
  reference: string;
  /** URL de navigation, ex. `/read?livre=jean&chap=3&v=16`. */
  url: string;
  /** Dernière visite (ms). */
  at: number;
}

/** Données fournies à `push` ; `id` et `at` sont dérivés à l'enregistrement. */
export type NavHistoryInput = Omit<NavHistoryEntry, 'id' | 'at'>;

/** Construit la clé de dédoublonnage d'une entrée (chapitre, indépendamment du verset). */
export function navHistoryId(version: string, bookId: string, chapter: number): string {
  return `${version}:${bookId}:${chapter}`;
}

/** Nombre maximal d'entrées conservées (les plus anciennes sont évincées). */
export const HISTORY_MAX = 25;