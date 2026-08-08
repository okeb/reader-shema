/**
 * Token Strong : un mot (ou groupe de mots) d'un verset, avec sa référence Strong le cas échéant.
 * Cf. spec 02 — concordance Strong.
 */
export interface StrongToken {
  /** Texte du token tel qu'il apparaît dans le verset (peut inclure des espaces de tête). */
  text: string;
  /** Numéro Strong (ex. "G2316"), ou null si le token n'a pas de référence Strong. */
  strong: string | null;
  lemma?: string;
  translit?: string;
  definition?: string;
  /** Langue d'origine : "greek" | "hebrew". */
  lang?: string;
}

/** Item à résoudre en Strong : un verset identifié par livre/chapitre/numéro. */
export interface StrongFetchItem {
  /** Id logique sous lequel stocker le résultat (ex. "jean:3:16" ou "<cardId>:16"). */
  id: string;
  bookId: string;
  chapter: number;
  verse: number;
}