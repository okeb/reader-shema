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

/** Résultat paginé de la concordance d'un numéro Strong (endpoint /bym/strong/:code). */
export interface StrongConcordance {
  code: string;
  /** Nombre total d'occurrences (toutes pages confondues). */
  total: number;
  page: number;
  size: number;
  lexicon: { translit?: string; definition?: string };
  items: StrongOccurrence[];
}