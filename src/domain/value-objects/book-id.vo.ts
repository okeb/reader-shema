import { getBookById } from '@/src/shared/constants/bible-books';

/**
 * Value-object identifiant un livre de la Bible (slug, ex. "jean").
 * Valide à la construction contre le registre canonique `BIBLE_BOOKS`.
 */
export class BookId {
  static isValid(value: string): boolean {
    return !!getBookById(value);
  }

  private constructor(readonly value: string) {}

  static create(value: string): BookId {
    if (!BookId.isValid(value)) {
      throw new Error(`BookId invalide : "${value}"`);
    }
    return new BookId(value);
  }

  /** Comme `create` mais ne lève pas — renvoie null si invalide. */
  static safe(value: string): BookId | null {
    return BookId.isValid(value) ? new BookId(value) : null;
  }

  equals(other: BookId): boolean {
    return this.value === other.value;
  }
}