/**
 * Liste canonique des 66 livres de la Bible de Yéhoshoua Ha Mashiah.
 * L'ordre suit ABBR_LIST de l'API (shema/index.js).
 *
 * - id        : alias accepté par l'API dans l'URL (ex. /bym/{id}/{chap})
 * - abbr      : abréviation canonique telle qu'utilisée dans thebym.json
 * - name      : nom d'affichage (français)
 * - chapters  : nombre de chapitres
 * - testament : "ancien" | "nouveau" (pour le regroupement dans le sélecteur)
 */
export interface BibleBook {
  id: string;
  abbr: string;
  name: string;
  chapters: number;
  testament: "ancien" | "nouveau";
}

export const BIBLE_BOOKS: BibleBook[] = [
  { id: "genese", abbr: "Ge. ", name: "Genèse", chapters: 50, testament: "ancien" },
  { id: "exode", abbr: "Ex. ", name: "Exode", chapters: 40, testament: "ancien" },
  { id: "levitique", abbr: "Lé. ", name: "Lévitique", chapters: 27, testament: "ancien" },
  { id: "nombres", abbr: "No. ", name: "Nombres", chapters: 36, testament: "ancien" },
  { id: "deuteronome", abbr: "De. ", name: "Deutéronome", chapters: 34, testament: "ancien" },
  { id: "josue", abbr: "Jos. ", name: "Josué", chapters: 24, testament: "ancien" },
  { id: "juges", abbr: "Jg. ", name: "Juges", chapters: 21, testament: "ancien" },
  { id: "1samuel", abbr: "1 S. ", name: "1 Samuel", chapters: 31, testament: "ancien" },
  { id: "2samuel", abbr: "2 S. ", name: "2 Samuel", chapters: 24, testament: "ancien" },
  { id: "1rois", abbr: "1 R. ", name: "1 Rois", chapters: 22, testament: "ancien" },
  { id: "2rois", abbr: "2 R. ", name: "2 Rois", chapters: 25, testament: "ancien" },
  { id: "esaie", abbr: "Es. ", name: "Ésaïe", chapters: 66, testament: "ancien" },
  { id: "jeremie", abbr: "Jé. ", name: "Jérémie", chapters: 52, testament: "ancien" },
  { id: "ezechiel", abbr: "Ez. ", name: "Ézéchiel", chapters: 48, testament: "ancien" },
  { id: "osee", abbr: "Os. ", name: "Osée", chapters: 14, testament: "ancien" },
  { id: "joel", abbr: "Joë. ", name: "Joël", chapters: 3, testament: "ancien" },
  { id: "amos", abbr: "Am. ", name: "Amos", chapters: 9, testament: "ancien" },
  { id: "abdias", abbr: "Ab. ", name: "Abdias", chapters: 1, testament: "ancien" },
  { id: "jonas", abbr: "Jon. ", name: "Jonas", chapters: 4, testament: "ancien" },
  { id: "michee", abbr: "Mi. ", name: "Michée", chapters: 7, testament: "ancien" },
  { id: "nahum", abbr: "Na. ", name: "Nahum", chapters: 3, testament: "ancien" },
  { id: "habacuc", abbr: "Ha. ", name: "Habacuc", chapters: 3, testament: "ancien" },
  { id: "sophonie", abbr: "So. ", name: "Sophonie", chapters: 3, testament: "ancien" },
  { id: "aggee", abbr: "Ag. ", name: "Aggée", chapters: 2, testament: "ancien" },
  { id: "zacharie", abbr: "Za. ", name: "Zacharie", chapters: 14, testament: "ancien" },
  { id: "malachie", abbr: "Mal. ", name: "Malachie", chapters: 4, testament: "ancien" },
  { id: "psaumes", abbr: "Ps. ", name: "Psaumes", chapters: 150, testament: "ancien" },
  { id: "proverbes", abbr: "Pr. ", name: "Proverbes", chapters: 31, testament: "ancien" },
  { id: "job", abbr: "Job ", name: "Job", chapters: 42, testament: "ancien" },
  { id: "cantique", abbr: "Ca. ", name: "Cantique des cantiques", chapters: 8, testament: "ancien" },
  { id: "ruth", abbr: "Ru. ", name: "Ruth", chapters: 4, testament: "ancien" },
  { id: "lamentations", abbr: "La. ", name: "Lamentations", chapters: 5, testament: "ancien" },
  { id: "ecclesiaste", abbr: "Ec. ", name: "Ecclésiaste", chapters: 12, testament: "ancien" },
  { id: "esther", abbr: "Est. ", name: "Esther", chapters: 10, testament: "ancien" },
  { id: "daniel", abbr: "Da. ", name: "Daniel", chapters: 12, testament: "ancien" },
  { id: "esdras", abbr: "Esd. ", name: "Esdras", chapters: 10, testament: "ancien" },
  { id: "nehemie", abbr: "Né. ", name: "Néhémie", chapters: 13, testament: "ancien" },
  { id: "1chroniques", abbr: "1 Ch. ", name: "1 Chroniques", chapters: 29, testament: "ancien" },
  { id: "2chroniques", abbr: "2 Ch. ", name: "2 Chroniques", chapters: 36, testament: "ancien" },
  { id: "matthieu", abbr: "Mt. ", name: "Matthieu", chapters: 28, testament: "nouveau" },
  { id: "marc", abbr: "Mc. ", name: "Marc", chapters: 16, testament: "nouveau" },
  { id: "luc", abbr: "Lu. ", name: "Luc", chapters: 24, testament: "nouveau" },
  { id: "jean", abbr: "Jn. ", name: "Jean", chapters: 21, testament: "nouveau" },
  { id: "actes", abbr: "Ac. ", name: "Actes", chapters: 28, testament: "nouveau" },
  { id: "jacques", abbr: "Ja. ", name: "Jacques", chapters: 5, testament: "nouveau" },
  { id: "galates", abbr: "Ga. ", name: "Galates", chapters: 6, testament: "nouveau" },
  { id: "1thessaloniciens", abbr: "1 Th. ", name: "1 Thessaloniciens", chapters: 5, testament: "nouveau" },
  { id: "2thessaloniciens", abbr: "2 Th. ", name: "2 Thessaloniciens", chapters: 3, testament: "nouveau" },
  { id: "1corinthiens", abbr: "1 Co. ", name: "1 Corinthiens", chapters: 16, testament: "nouveau" },
  { id: "2corinthiens", abbr: "2 Co. ", name: "2 Corinthiens", chapters: 13, testament: "nouveau" },
  { id: "romains", abbr: "Ro. ", name: "Romains", chapters: 16, testament: "nouveau" },
  { id: "ephesiens", abbr: "Ep. ", name: "Éphésiens", chapters: 6, testament: "nouveau" },
  { id: "philippiens", abbr: "Ph. ", name: "Philippiens", chapters: 4, testament: "nouveau" },
  { id: "colossiens", abbr: "Col. ", name: "Colossiens", chapters: 4, testament: "nouveau" },
  { id: "philemon", abbr: "Phm. ", name: "Philémon", chapters: 1, testament: "nouveau" },
  { id: "1timothee", abbr: "1 Ti. ", name: "1 Timothée", chapters: 6, testament: "nouveau" },
  { id: "tite", abbr: "Tit. ", name: "Tite", chapters: 3, testament: "nouveau" },
  { id: "1pierre", abbr: "1 Pi. ", name: "1 Pierre", chapters: 5, testament: "nouveau" },
  { id: "2pierre", abbr: "2 Pi. ", name: "2 Pierre", chapters: 3, testament: "nouveau" },
  { id: "2timothee", abbr: "2 Ti. ", name: "2 Timothée", chapters: 4, testament: "nouveau" },
  { id: "jude", abbr: "Jud. ", name: "Jude", chapters: 1, testament: "nouveau" },
  { id: "hebreux", abbr: "Hé. ", name: "Hébreux", chapters: 13, testament: "nouveau" },
  { id: "1jean", abbr: "1 Jn. ", name: "1 Jean", chapters: 5, testament: "nouveau" },
  { id: "2jean", abbr: "2 Jn. ", name: "2 Jean", chapters: 1, testament: "nouveau" },
  { id: "3jean", abbr: "3 Jn. ", name: "3 Jean", chapters: 1, testament: "nouveau" },
  { id: "apocalypse", abbr: "Ap. ", name: "Apocalypse", chapters: 22, testament: "nouveau" },
];

/** Recherche un livre par son id (alias URL). */
export function getBookById(id: string): BibleBook | undefined {
  return BIBLE_BOOKS.find((b) => b.id === id);
}

/** Normalise une saisie : minuscules, sans accents, sans espaces/ponctuation. */
function normalizeQuery(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Résout une saisie libre vers un id de livre :
 * id ("genese"), nom ("Genèse"), abréviation ("Jn", "1Co", "Ps") ou préfixe du nom.
 */
export function resolveBookId(query: string): string | undefined {
  const q = normalizeQuery(query);
  if (!q) return undefined;

  // Correspondance exacte : id, nom, ou abréviation normalisée ("Jn. " -> "jn").
  const exact = BIBLE_BOOKS.find(
    (b) => normalizeQuery(b.id) === q || normalizeQuery(b.name) === q || normalizeQuery(b.abbr) === q,
  );
  if (exact) return exact.id;

  // Préfixe du nom (>= 3 caractères pour limiter l'ambiguïté).
  if (q.length >= 3) {
    const pref = BIBLE_BOOKS.find((b) => normalizeQuery(b.name).startsWith(q));
    if (pref) return pref.id;
  }
  return undefined;
}

/**
 * Résout un livre depuis une abréviation canonique (ex. "Jn. ") renvoyée par l'API,
 * en comparant sur la forme triée (sans espaces ni points).
 */
export function getBookByAbbr(abbr: string): BibleBook | undefined {
  const norm = abbr.trim().toLowerCase();
  return BIBLE_BOOKS.find((b) => b.abbr.trim().toLowerCase() === norm);
}

export interface BookSearchResult {
  book: BibleBook;
  score: number;
}

/**
 * Recherche incrémentale de livres.
 * Retourne les livres correspondants triés par score croissant puis par ordre canonique.
 *
 * Scores :
 *  0 — correspondance exacte (id ou nom normalisé)
 *  1 — préfixe du nom normalisé
 *  2 — préfixe de l'abbr normalisé
 *  3 — sous-chaîne dans le nom normalisé
 *
 * Si query vide, retourne tous les livres avec score 3.
 */
export function searchBooks(query: string): BookSearchResult[] {
  const q = normalizeQuery(query);

  if (!q) {
    return BIBLE_BOOKS.map((book) => ({ book, score: 3 }));
  }

  const results: BookSearchResult[] = [];

  for (let i = 0; i < BIBLE_BOOKS.length; i++) {
    const book = BIBLE_BOOKS[i];
    const normId = normalizeQuery(book.id);
    const normName = normalizeQuery(book.name);
    const normAbbr = normalizeQuery(book.abbr);

    let bestScore: number | null = null;

    if (normId === q || normName === q) {
      bestScore = 0;
    }

    if (bestScore === null && normName.startsWith(q)) {
      bestScore = 1;
    }

    if (bestScore === null && normAbbr.startsWith(q)) {
      bestScore = 2;
    }

    if (bestScore === null && normName.includes(q)) {
      bestScore = 3;
    }

    if (bestScore !== null) {
      results.push({ book, score: bestScore });
    }
  }

  results.sort((a, b) => a.score - b.score || BIBLE_BOOKS.indexOf(a.book) - BIBLE_BOOKS.indexOf(b.book));

  return results;
}
