/**
 * Verset normalisé pour la lecture continue d'un chapitre.
 * Cf. spec — lecteur (mode "read").
 */
export interface ChapterVerse {
  number: number;
  text: string;
  /** Titre de section (présent sur le 1er verset de la section). */
  titre?: string;
  paragraphe?: 'start' | 'end';
}