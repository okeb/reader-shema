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
}

/** Données d'un favori sans `createdAt` (rempli à l'ajout). */
export type FavoriteInput = Omit<FavoriteVerse, 'createdAt'>;