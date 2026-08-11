/** Une occurrence d'un numéro Strong (concordance), normalisée pour la navigation. */
export interface StrongOccurrence {
  /** Slug de livre résolu (ex. "genese"), pour la navigation lecture. */
  bookId: string;
  /** Nom de livre brut renvoyé par l'API (ex. "Genese"). */
  livre: string;
  chapter: number;
  verse: number;
  /** Référence lisible (ex. "Genèse 3:1"). */
  reference: string;
  /** Texte du verset. */
  text: string;
}

/** Lexique Strong d'un code, porté par l'endpoint de concordance (/bym/strong/:code).
 *  La page détail d'un code tire toutes ses métadonnées de ce seul fetch — pas d'appel séparé
 *  à /strong/:code. Tous les champs sont optionnels (l'entrée peut être absente du lexique). */
export interface StrongLexicon {
  lemma?: string;
  /** Langue d'origine : "hebrew" | "greek". */
  lang?: string;
  translit?: string;
  /** Phonétique (ex. "(theh'-os)"). */
  phonetique?: string;
  /** Origine étymologique. */
  origine?: string;
  /** Catégorie grammaticale (ex. "Nom masculin"). */
  type?: string;
  definition?: string;
}

/** Résultat paginé de la concordance d'un numéro Strong (endpoint /bym/strong/:code). */
export interface StrongConcordance {
  code: string;
  /** Nombre total d'occurrences (toutes pages confondues). */
  total: number;
  page: number;
  size: number;
  lexicon: StrongLexicon;
  items: StrongOccurrence[];
}