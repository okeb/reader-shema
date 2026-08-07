import { BOOKMARK_COLORS } from './bookmark.entity';

/**
 * Annotations personnelles : surlignages + notes. Clés localStorage :
 * `bymHighlights` (surlignages) + `bymNotes` (notes). Cf. spec 11.
 */

/** Palette des feutres de surlignage — reprend les couleurs des signets (cohérence visuelle). */
export const HIGHLIGHT_COLORS = BOOKMARK_COLORS;

/** Surlignages : `verseId → couleur`. Clé verset = `${version}:${bookId}:${chapter}:${verse}`. */
export type HighlightMap = Record<string, string>;

/** Référence à un verset associé à une note. `verseId` préfixé par la version (namespace). */
export interface VerseRef {
  /** Id stable préfixé par la version : `${version}:${bookId}:${chapter}:${verse}`. */
  verseId: string;
  bookId: string;
  chapter: number;
  verse: number;
  /** Référence affichée, ex. « Jean 3:16 ». */
  reference: string;
  /** Extrait du verset (aperçu dans la liste + recherche). */
  text: string;
}

/** Note autonome, pouvant référencer plusieurs versets (relation plusieurs-à-plusieurs). */
export interface Note {
  /** Id autonome (indépendant des versets). */
  id: string;
  text: string;
  updatedAt: number;
  /** Versets associés (au moins 1). Le premier = verset ancre (titre + tri par défaut). */
  verses: VerseRef[];
}

/** Notes : `noteId → Note`. */
export type NoteMap = Record<string, Note>;

/** Ancien format (1 verset ↔ 1 note), à migrer. La clé du `Record` = verseId. */
export interface OldNote {
  text: string;
  updatedAt: number;
  reference: string;
  verseText: string;
  bookId: string;
  chapter: number;
  verse: number;
}