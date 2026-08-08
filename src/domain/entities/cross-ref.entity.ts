/**
 * Renvois bibliques (cross-references) dérivés du Treasury of Scripture Knowledge
 * (openbible.info, CC-BY). Données statiques servies depuis `public/data/cross-refs/*.json`
 * (un fichier par livre, 66 au total).
 *
 * Forme brute du JSON : `{ "chap:verse": [[bookId, chapter, verseStart, verseEnd?], ...] }`.
 * Cf. `src/infrastructure/repositories/cross-refs.repository.impl.ts`.
 */
export interface CrossRef {
  bookId: string;
  chapter: number;
  verseStart: number;
  /** Fin de plage (inclusive) si le renvoi couvre plusieurs versets. */
  verseEnd?: number;
}

/** Table brute `chap:verse → [bookId, chapter, verseStart, verseEnd?]` telle que lue du JSON. */
export type CrossRefJson = Record<string, [string, number, number, number?][]>;

/** Mappe `chap:verse → CrossRef[]` déjà parsée. */
export type CrossRefMap = Record<string, CrossRef[]>;