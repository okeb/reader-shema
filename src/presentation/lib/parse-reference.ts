import { getBookById, resolveBookId } from '@/src/shared/constants/bible-books';

export interface ParsedReference {
  bookId: string;
  bookName: string;
  chapter: number;
  selection?: string;
}

/**
 * Analyse une saisie type "1co 3 23" ou "genese 3 12-20".
 * Format : <livre> <chapitre> [<verset(s)>] (verset(s) = "12", "12-20", "1,3,5-8").
 * Renvoie null si la référence ne résout pas à un livre/chapitre valides.
 */
export function parseReference(input: string): ParsedReference | null {
  const m = input
    .trim()
    .match(/^(.+?)\s+(\d+)(?:\s+(\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*))?\s*$/);
  if (!m) return null;

  const bookId = resolveBookId(m[1]);
  if (!bookId) return null;

  const book = getBookById(bookId)!;
  const chapter = parseInt(m[2], 10);
  if (!chapter || chapter < 1 || chapter > book.chapters) return null;

  const selection = m[3]?.replace(/\s+/g, '');
  return { bookId, bookName: book.name, chapter, selection };
}