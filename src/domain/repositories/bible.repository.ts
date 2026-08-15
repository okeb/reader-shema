import type {
  ChapterVerse,
  BiblicalVerse,
  StrongToken,
  StrongFetchItem,
  StrongConcordance,
  BookInfo,
} from '@/src/domain/entities';
import type { BookId, VersionId } from '@/src/domain/value-objects';

/**
 * Port de sortie : accès aux données de la Bible (read-only).
 * Interface pure, implémentée par la couche infrastructure (`BibleRepositoryImpl`).
 *
 * Cf. spec 01/02 — la source unique est l'API REST `shemaproject.org`.
 */
export interface IBibleRepository {
  /** Chapitre complet en lecture continue (mode "read"). */
  getChapter(version: VersionId, book: BookId, chapter: number): Promise<ChapterVerse[]>;

  /**
   * Cartes de référence pour une liste de refs (mode "références").
   * Chaque ref est un slug "livre/chap/selection" (ex. "jean/3/16" ou "jean/3/1-5,8").
   * Les refs introuvables sont ignorées.
   */
  getReferences(version: VersionId, refs: string[]): Promise<BiblicalVerse[]>;

  /**
   * Texte nu d'une liste de versets (regroupés par livre/chapitre), pour réafficher
   * des occurrences Strong dans la version active. Retourne `id → texte`.
   */
  getVersesText(version: VersionId, items: StrongFetchItem[]): Promise<Record<string, string>>;

  /**
   * Tokens Strong d'une liste de versets (regroupés par livre/chapitre), via
   * `/{version}/:livre/:chap/:selection?strongs=1`. Retourne `id → StrongToken[]`.
   */
  getStrongsForVerses(
    version: VersionId,
    items: StrongFetchItem[],
  ): Promise<Record<string, StrongToken[]>>;

  /** Concordance paginée d'un code Strong (endpoint /bym/strong/:code). null si 404. */
  getStrongOccurrences(code: string, page: number, size: number): Promise<StrongConcordance | null>;

  /** Métadonnées d'un livre (endpoint /:version/:livre/info). null si introuvable. */
  getBookInfo(version: VersionId, book: BookId): Promise<BookInfo | null>;
}
