/** Élément de texte d'une carte de référence. */
export interface VerseText {
  number: number;
  text: string;
}

/**
 * Carte de référence (mode "références"), compatible avec le modèle racine.
 * Représente une sélection de versets identifiée par une référence lisible.
 */
export interface BiblicalVerse {
  id: string;
  reference: string;
  verses: VerseText[];
  /** Pour ouvrir la référence en lecture continue. */
  bookId?: string;
  chapter?: number;
}