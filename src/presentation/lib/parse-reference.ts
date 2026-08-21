import { getBookById, resolveBookId, searchBooks, type BibleBook, type BookSearchResult } from '@/src/shared/constants/bible-books';

export interface ParsedReference {
  bookId: string;
  bookName: string;
  chapter: number;
  selection?: string;
}

export interface PartialReference {
  bookResults: BookSearchResult[];
  resolvedBook: BibleBook | null;
  chapter: number | null;
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

/**
 * Parsing incrémental pour l'auto-complétion.
 * Retourne toujours des suggestions de livres, et si possible un livre résolu + chapitre.
 */
export function parsePartialReference(input: string): PartialReference {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      bookResults: searchBooks(''),
      resolvedBook: null,
      chapter: null,
      selection: undefined,
    };
  }

  if (!trimmed.includes(' ')) {
    const results = searchBooks(trimmed);
    const resolvedBook = results.length === 1 && results[0].score <= 1 ? results[0].book : null;
    return { bookResults: results, resolvedBook, chapter: null, selection: undefined };
  }

  const parsed = parseReference(trimmed);
  if (parsed) {
    const book = getBookById(parsed.bookId)!;
    return {
      bookResults: [{ book, score: 0 }],
      resolvedBook: book,
      chapter: parsed.chapter,
      selection: parsed.selection,
    };
  }

  const spaceIdx = trimmed.indexOf(' ');
  const bookPart = trimmed.slice(0, spaceIdx);
  const rest = trimmed.slice(spaceIdx + 1).trim();

  const results = searchBooks(bookPart);
  const resolvedBook = results.length === 1 && results[0].score <= 1 ? results[0].book : null;

  let chapter: number | null = null;
  let selection: string | undefined;

  if (resolvedBook && rest) {
    const restParts = rest.split(/\s+/);
    const chapNum = parseInt(restParts[0], 10);
    if (!isNaN(chapNum) && chapNum >= 1 && chapNum <= resolvedBook.chapters) {
      chapter = chapNum;
      if (restParts[1]) {
        selection = restParts.slice(1).join('').replace(/\s+/g, '');
      }
    }
  }

  return { bookResults: results, resolvedBook, chapter, selection };
}