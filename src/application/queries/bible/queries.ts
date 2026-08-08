import type {
  GetChapterQuery as IGetChapterQuery,
  GetReferencesQuery as IGetReferencesQuery,
  GetVersesTextQuery as IGetVersesTextQuery,
  GetStrongsForVersesQuery as IGetStrongsForVersesQuery,
  GetStrongOccurrencesQuery as IGetStrongOccurrencesQuery,
  GetBookInfoQuery as IGetBookInfoQuery,
} from '@/src/domain/use-cases/bible';
import type { StrongFetchItem } from '@/src/domain/entities';

/** Requête : chapitre complet en lecture continue. */
export class GetChapterQuery implements IGetChapterQuery {
  readonly queryType = 'GetChapter';
  constructor(
    readonly version: string,
    readonly bookId: string,
    readonly chapter: number,
  ) {}
}

/** Requête : cartes de référence (mode "références"). */
export class GetReferencesQuery implements IGetReferencesQuery {
  readonly queryType = 'GetReferences';
  constructor(readonly version: string, readonly refs: string[]) {}
}

/** Requête : texte nu d'une sélection de versets. */
export class GetVersesTextQuery implements IGetVersesTextQuery {
  readonly queryType = 'GetVersesText';
  constructor(readonly version: string, readonly items: StrongFetchItem[]) {}
}

/** Requête : tokens Strong d'une sélection de versets. */
export class GetStrongsForVersesQuery implements IGetStrongsForVersesQuery {
  readonly queryType = 'GetStrongsForVerses';
  constructor(readonly version: string, readonly items: StrongFetchItem[]) {}
}

/** Requête : concordance paginée d'un code Strong. */
export class GetStrongOccurrencesQuery implements IGetStrongOccurrencesQuery {
  readonly queryType = 'GetStrongOccurrences';
  constructor(readonly code: string, readonly page: number, readonly size: number) {}
}

/** Requête : métadonnées d'un livre. */
export class GetBookInfoQuery implements IGetBookInfoQuery {
  readonly queryType = 'GetBookInfo';
  constructor(readonly version: string, readonly bookId: string) {}
}