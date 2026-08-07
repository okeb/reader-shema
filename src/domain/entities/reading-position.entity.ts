/**
 * Dernière position de lecture continue (livre + chapitre), pour la reprise.
 * Clé localStorage : `bym:last-position`. Cf. spec 09.
 */
export interface ReadingPosition {
  bookId: string;
  chapter: number;
  /** Référence affichable, ex. « Jean 3 ». */
  reference: string;
  /** Horodatage de la dernière mise à jour. */
  at: number;
}