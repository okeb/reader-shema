/** Élément de texte d'une carte de référence. */
export interface VerseText {
  number: number;
  text: string;
  /** URL relative d'un fichier audio narré, présent uniquement si le fichier existe (spec 37). */
  audio?: string;
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