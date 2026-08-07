/**
 * Favori (verset mis en favori). Clé localStorage : `bymFavorites`.
 * Cf. spec 11.
 */
export interface FavoriteVerse {
  /** Clé stable : `${version}:${bookId}:${chapter}:${number}` (lecture) ou `${version}:${cardId}` (refs). */
  id: string;
  /** Id de la version, ex. "bym". */
  version: string;
  /** Référence affichée, ex. "Jean 3:16". */
  reference: string;
  /** Texte du/des verset(s). */
  text: string;
  bookId?: string;
  chapter?: number;
  verse?: number;
  createdAt: number;
  /**
   * Dernière modification — spec 22 §4.2 (phase 2). Préparatoire au LWW « par entité »
   * (raffinement futur) ; la sync actuelle est per-kind-blob. Migré depuis `createdAt`
   * pour les favoris antérieurs à la spec 22.
   */
  updatedAt: number;
}

/** Données d'un favori sans `createdAt`/`updatedAt` (remplis à l'ajout). */
export type FavoriteInput = Omit<FavoriteVerse, 'createdAt' | 'updatedAt'>;