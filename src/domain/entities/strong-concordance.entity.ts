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

/** Entrée LSJ détaillée (STEPBible TFLSJ, CC BY 4.0) — grec uniquement. */
export interface StrongLsj {
  /** Gloss anglais de l'entrée. */
  gloss?: string;
  /** Forme grecque (ex. "ἀγαπάω"). */
  greek?: string;
  /** Translittération (ex. "agapaō"). */
  translit?: string;
  /** Intégralité du sens LSJ (texte anglais, multi-niveaux — rendu en texte brut). */
  meaning?: string;
}

/** Définition française du Wiktionnaire (CC BY-SA 3.0) — repli vers le LSJ si absente. */
export interface StrongWikt {
  /** Définitions numérotées (ex. "1. Accueillir avec amitié… 2. Aimer, chérir."). */
  meaning?: string;
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
  /** Détail LSJ (dictionnaire grec complet, anglais) — présent pour les codes G*, absent pour H*. */
  lsj?: StrongLsj;
  /** Définition française du Wiktionnaire — préférée au LSJ quand présente (~89 % des codes). */
  wikt?: StrongWikt;
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
