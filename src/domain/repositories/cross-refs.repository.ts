import type { CrossRef, CrossRefMap } from '@/src/domain/entities';

/**
 * Source des renvois bibliques (cross-references). Les données sont des fichiers JSON statiques
 * (un par livre) servis depuis `public/data/cross-refs/`. Lecture seule, pas d'auth.
 */
export interface ICrossRefsRepository {
  /** Renvoie tous les renvois d'un livre (`chap:verse → CrossRef[]`). Objet vide si introuvable. */
  getForBook(bookId: string): Promise<CrossRefMap>;
}