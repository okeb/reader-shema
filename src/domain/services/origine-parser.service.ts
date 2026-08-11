/**
 * Parser pur du champ `origine` (étymologie Strong). Extrait les références Strong embarquées dans
 * la prose (ex. « Vient du même mot que 07218 ») et les normalise en codes canoniques (« H7218 »),
 * pour rendre l'origine cliquable vers une fiche Strong (spec 29).
 *
 * Références reconnues (regex `ORIGINE_REF`) :
 *  - forme préfixée  : `H7223`, `G2316`, `H1` (1 à 5 chiffres) ;
 *  - forme hébraïque zero-padded 5 chiffres : `07218` (convention de l'API).
 * Les nombres nus sans préfixe ni zero-padding sont ignorés (évite les faux positifs sur numéros de
 * verset, années, etc. dans la prose). Plusieurs références par `origine` sont possibles.
 */

export interface OrigineSegment {
  /** Segment de prose ou référence Strong. */
  kind: 'text' | 'strong';
  /** Texte brut du segment (à rendre tel quel pour `text`, libellé du lien pour `strong`). */
  text: string;
  /** Code Strong canonique (ex. « H7218 ») — uniquement pour `kind === 'strong'`. */
  code?: string;
  /** Token brut matché (ex. « 07218 », « G2316 ») — uniquement pour `kind === 'strong'`. */
  raw?: string;
}

/** Reconnaît une référence Strong : préfixe H/G + 1-5 chiffres, OU 5 chiffres zero-padded. */
const ORIGINE_REF = /\b([HG]\d{1,5}|0\d{4})\b/g;

/**
 * Normalise un token de référence Strong en code canonique `H`/`G` + chiffres sans zéros de tête.
 * - « G2316 » → « G2316 » (préfixe explicite conservé) ;
 * - « 07218 » + lang « hebrew » → « H7218 » (préfixe inféré depuis la langue, zéros retirés) ;
 * - « 01234 » + lang « greek » → « G1234 ».
 * La langue par défaut est l'hébreu (la forme zero-padded est la convention hébraïque de l'API).
 */
export function normalizeStrongCode(raw: string, lang?: string): string {
  const head = raw[0];
  if (head === 'H' || head === 'G') {
    const digits = raw.slice(1).replace(/^0+(?=\d)/, '');
    return `${head}${digits}`;
  }
  const prefix = lang === 'greek' ? 'G' : 'H';
  const digits = raw.replace(/^0+(?=\d)/, '');
  return `${prefix}${digits}`;
}

/**
 * Découpe une chaîne `origine` en segments texte / référence Strong.
 * Retourne `[]` si `origine` est vide. Les segments de texte vides (entre deux refs adjacentes) sont
 * ignorés.
 */
export function parseOrigine(origine: string | undefined | null, lang?: string): OrigineSegment[] {
  if (!origine) return [];
  const segments: OrigineSegment[] = [];
  let lastIndex = 0;
  ORIGINE_REF.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ORIGINE_REF.exec(origine)) !== null) {
    const before = origine.slice(lastIndex, match.index);
    if (before) segments.push({ kind: 'text', text: before });
    const raw = match[0];
    segments.push({ kind: 'strong', text: raw, raw, code: normalizeStrongCode(raw, lang) });
    lastIndex = match.index + raw.length;
  }
  const tail = origine.slice(lastIndex);
  if (tail) segments.push({ kind: 'text', text: tail });
  return segments;
}