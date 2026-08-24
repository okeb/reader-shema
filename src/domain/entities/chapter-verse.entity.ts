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
  /** URL relative d'un fichier audio narré (ex. "/audios/Gen.1.3.mp3"), présent uniquement
   *  si le fichier existe côté API. Résolue en absolu côté client (spec 37). */
  audio?: string;
}