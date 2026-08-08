import { getBookById } from '@/src/shared/constants/bible-books';
import type { CrossRef } from '@/src/domain/entities';

export type { CrossRef };

/**
 * Formate un renvoi en référence lisible : "Jean 3:15" ou "Jean 11:25-26" (plage de versets).
 * Le nom du livre est résolu depuis `BIBLE_BOOKS` (fallback sur l'id brut).
 */
export function formatCrossRef(r: CrossRef): string {
  const book = getBookById(r.bookId);
  const name = book?.name ?? r.bookId;
  if (r.verseEnd != null && r.verseEnd !== r.verseStart) {
    return `${name} ${r.chapter}:${r.verseStart}-${r.verseEnd}`;
  }
  return `${name} ${r.chapter}:${r.verseStart}`;
}

/**
 * Slug de référence pour `getReferences` : "bookId/chap/verseStart" ou "bookId/chap/verseStart-verseEnd"
 * (plage intra-chapitre). Utilisé par `m-cross-refs` pour charger les extraits des renvois.
 */
export function crossRefSlug(r: CrossRef): string {
  const sel = r.verseEnd ? `${r.verseStart}-${r.verseEnd}` : `${r.verseStart}`;
  return `${r.bookId}/${r.chapter}/${sel}`;
}