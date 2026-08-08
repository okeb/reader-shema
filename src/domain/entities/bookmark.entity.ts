/**
 * Signets rangés dans des groupes nommés colorés. Clés localStorage :
 * `bymBookmarkGroups` (groupes) + `bymBookmarks` (signets). Cf. spec 11.
 */

/** Palette fixe de couleurs proposées à la création d'un groupe. */
export const BOOKMARK_COLORS = ['#f97316', '#8b5cf6', '#10b981', '#ef4444', '#3b82f6', '#ec4899'];

export interface BookmarkGroup {
  id: string;
  /** Nom affiché, ex. « Promesses ». */
  name: string;
  /** Couleur du groupe (hex) — reprise par le soulignement ondulé. */
  color: string;
  createdAt: number;
  /**
   * Dernière modification (renommage, changement de couleur) — spec 22 §4.2 (phase 2).
   * Préparatoire au LWW « par entité » ; migré depuis `createdAt` pour les groupes antérieurs.
   */
  updatedAt: number;
}

export interface BookmarkVerse {
  /** Clé stable : `${version}:${bookId}:${chapter}:${verse}`. */
  id: string;
  /** Groupe auquel appartient ce signet. */
  groupId: string;
  version: string;
  /** Référence affichée, ex. « Jean 3:16 ». */
  reference: string;
  /** Texte du verset. */
  text: string;
  bookId: string;
  chapter: number;
  verse: number;
  createdAt: number;
  /** Dernière modification (déplacement entre groupes) — spec 22 §4.2 (phase 2). */
  updatedAt: number;
}

/** Données d'un signet sans `groupId`/`createdAt`/`updatedAt` (remplis à l'ajout). */
export type BookmarkInput = Omit<BookmarkVerse, 'groupId' | 'createdAt' | 'updatedAt'>;