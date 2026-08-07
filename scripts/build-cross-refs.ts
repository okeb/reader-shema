/**
 * Pipeline build-time des renvois (cross-references) — spec 11.
 *
 * Lit le dataset libre openbible.info (Cross References, dérivé du TSK, licence CC-BY) et génère
 * un fichier JSON compact par livre dans `public/data/cross-refs/{bookId}.json`, chargé ensuite
 * par livre à la demande au runtime (lib/cross-refs.ts).
 *
 * Source brute (non versionnée, à télécharger une fois) :
 *   curl -sSL -o scripts/data/cross-references.zip https://a.openbible.info/data/cross-references.zip
 *   (cd scripts/data && unzip -o cross-references.zip)
 * → produit `scripts/data/cross_references.txt` (TSV : "From Verse \t To Verse \t Votes").
 *
 * Exécution :
 *   npx -y tsx scripts/build-cross-refs.ts
 *
 * ⚠️ Mapping livre : le dataset utilise les codes OSIS de l'ordre canonique STANDARD, qui diffère
 * de l'ordre de `BIBLE_BOOKS` (Ésaïe y est placé après 2 Rois, le NT est réordonné). Le mapping se
 * fait donc via la table explicite OSIS_TO_BOOKID ci-dessous — JAMAIS par index.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BIBLE_BOOKS } from "../lib/bible-books";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(__dirname, "data", "cross_references.txt");
const OUT_DIR = join(__dirname, "..", "public", "data", "cross-refs");

/** Nombre maximum de renvois conservés par verset (tri par votes décroissant). */
const MAX_PER_VERSE = 12;

/** Code OSIS standard → `id` de BIBLE_BOOKS (ordre canonique standard, ≠ ordre BIBLE_BOOKS). */
const OSIS_TO_BOOKID: Record<string, string> = {
  Gen: "genese", Exod: "exode", Lev: "levitique", Num: "nombres", Deut: "deuteronome",
  Josh: "josue", Judg: "juges", Ruth: "ruth", "1Sam": "1samuel", "2Sam": "2samuel",
  "1Kgs": "1rois", "2Kgs": "2rois", "1Chr": "1chroniques", "2Chr": "2chroniques", Ezra: "esdras",
  Neh: "nehemie", Esth: "esther", Job: "job", Ps: "psaumes", Prov: "proverbes",
  Eccl: "ecclesiaste", Song: "cantique", Isa: "esaie", Jer: "jeremie", Lam: "lamentations",
  Ezek: "ezechiel", Dan: "daniel", Hos: "osee", Joel: "joel", Amos: "amos",
  Obad: "abdias", Jonah: "jonas", Mic: "michee", Nah: "nahum", Hab: "habacuc",
  Zeph: "sophonie", Hag: "aggee", Zech: "zacharie", Mal: "malachie",
  Matt: "matthieu", Mark: "marc", Luke: "luc", John: "jean", Acts: "actes",
  Rom: "romains", "1Cor": "1corinthiens", "2Cor": "2corinthiens", Gal: "galates", Eph: "ephesiens",
  Phil: "philippiens", Col: "colossiens", "1Thess": "1thessaloniciens", "2Thess": "2thessaloniciens",
  "1Tim": "1timothee", "2Tim": "2timothee", Titus: "tite", Phlm: "philemon", Heb: "hebreux",
  Jas: "jacques", "1Pet": "1pierre", "2Pet": "2pierre", "1John": "1jean", "2John": "2jean",
  "3John": "3jean", Jude: "jude", Rev: "apocalypse",
};

/** Vérifie que la table OSIS couvre exactement les 66 livres de BIBLE_BOOKS. */
function assertMappingComplete(): void {
  const mapped = new Set(Object.values(OSIS_TO_BOOKID));
  const expected = new Set(BIBLE_BOOKS.map((b) => b.id));
  if (mapped.size !== expected.size) {
    throw new Error(`OSIS_TO_BOOKID couvre ${mapped.size} livres, attendu ${expected.size}.`);
  }
  for (const id of expected) {
    if (!mapped.has(id)) throw new Error(`Livre non couvert par OSIS_TO_BOOKID : ${id}`);
  }
}

/** Index canonique d'un bookId (ordre BIBLE_BOOKS), pour le tri d'affichage stable. */
const BOOK_INDEX = new Map(BIBLE_BOOKS.map((b, i) => [b.id, i]));

interface Ref {
  bookId: string;
  chap: number;
  vStart: number;
  vEnd?: number;
}

/**
 * Parse une référence OSIS pointée : "Gen.1.1" ou plage "Rom.5.8-Rom.5.10".
 * Retourne la liste des références (plage = 1 Ref avec vEnd). Code inconnu → null.
 */
function parseOsis(raw: string): Ref | null {
  const [start, end] = raw.split("-");
  const s = start.split(".");
  if (s.length !== 3) return null;
  const bookId = OSIS_TO_BOOKID[s[0]];
  if (!bookId) return null;
  const chap = Number(s[1]);
  const vStart = Number(s[2]);
  if (!Number.isFinite(chap) || !Number.isFinite(vStart)) return null;

  let vEnd: number | undefined;
  if (end) {
    const e = end.split(".");
    // Plage intra-chapitre uniquement (les plages inter-chapitres sont rares et tronquées au début).
    if (e.length === 3 && OSIS_TO_BOOKID[e[0]] === bookId && Number(e[1]) === chap) {
      const ve = Number(e[2]);
      if (Number.isFinite(ve) && ve > vStart) vEnd = ve;
    }
  }
  return { bookId, chap, vStart, vEnd };
}

type Target = [string, number, number] | [string, number, number, number];

function main(): void {
  assertMappingComplete();

  if (!existsSync(SOURCE)) {
    throw new Error(
      `Source introuvable : ${SOURCE}\n` +
        "Téléchargez-la : curl -sSL -o scripts/data/cross-references.zip " +
        "https://a.openbible.info/data/cross-references.zip && (cd scripts/data && unzip -o cross-references.zip)",
    );
  }

  const lines = readFileSync(SOURCE, "utf8").split("\n");
  // Accumulateur : bookId source → "chap:verse" → liste { target, votes }.
  const byBook = new Map<string, Map<string, { target: Target; votes: number }[]>>();

  let read = 0;
  let skippedVotes = 0;
  let unknownOsis = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split("\t");
    if (cols.length < 3) continue;
    read++;

    const votes = Number(cols[2]);
    if (!Number.isFinite(votes) || votes <= 0) {
      skippedVotes++;
      continue;
    }

    const from = parseOsis(cols[0]);
    const to = parseOsis(cols[1]);
    if (!from || !to) {
      unknownOsis++;
      continue;
    }

    const target: Target =
      to.vEnd != null ? [to.bookId, to.chap, to.vStart, to.vEnd] : [to.bookId, to.chap, to.vStart];

    // Source en plage → dupliquer sur chaque verset source (en pratique la source est mono-verset).
    const fromEnd = from.vEnd ?? from.vStart;
    for (let v = from.vStart; v <= fromEnd; v++) {
      let bookMap = byBook.get(from.bookId);
      if (!bookMap) {
        bookMap = new Map();
        byBook.set(from.bookId, bookMap);
      }
      const key = `${from.chap}:${v}`;
      const arr = bookMap.get(key) ?? [];
      arr.push({ target, votes });
      bookMap.set(key, arr);
    }
  }

  // Réinitialise le dossier de sortie.
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  let totalRefs = 0;
  const sizes: { bookId: string; bytes: number }[] = [];

  for (const [bookId, bookMap] of byBook) {
    const out: Record<string, Target[]> = {};
    for (const [key, list] of bookMap) {
      // Tri par votes décroissant, plafond N, puis tri d'affichage canonique (livre/chap/verset).
      const top = list
        .sort((a, b) => b.votes - a.votes)
        .slice(0, MAX_PER_VERSE)
        .map((x) => x.target)
        .sort((a, b) => {
          const bi = (BOOK_INDEX.get(a[0]) ?? 0) - (BOOK_INDEX.get(b[0]) ?? 0);
          if (bi !== 0) return bi;
          if (a[1] !== b[1]) return a[1] - b[1];
          return a[2] - b[2];
        });
      out[key] = top;
      totalRefs += top.length;
    }
    const json = JSON.stringify(out);
    writeFileSync(join(OUT_DIR, `${bookId}.json`), json);
    sizes.push({ bookId, bytes: Buffer.byteLength(json) });
  }

  // Rapport.
  const totalBytes = sizes.reduce((s, x) => s + x.bytes, 0);
  sizes.sort((a, b) => b.bytes - a.bytes);
  console.log(`Lignes lues          : ${read}`);
  console.log(`Ignorées (votes ≤ 0) : ${skippedVotes}`);
  console.log(`Ignorées (OSIS inc.) : ${unknownOsis}`);
  console.log(`Fichiers générés     : ${byBook.size} / 66`);
  console.log(`Renvois conservés    : ${totalRefs}`);
  console.log(`Poids total          : ${(totalBytes / 1024).toFixed(1)} Kio`);
  console.log("Plus gros fichiers   :");
  for (const s of sizes.slice(0, 5)) {
    console.log(`  ${s.bookId.padEnd(16)} ${(s.bytes / 1024).toFixed(1)} Kio`);
  }
}

main();
