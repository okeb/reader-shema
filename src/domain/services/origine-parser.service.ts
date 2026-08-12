/**
 * Parser pur des champs `origine` et `type` (étymologie / catégorie grammaticale Strong).
 * Extrait les références Strong embarquées dans la prose (ex. « Vient du même mot que 07218 ») ou
 * dans du HTML (ex. `Nom féminin (voir <a href="Strong-Hebreu-4139.htm">04139</a>)`), les normalise
 * en codes canoniques (« H4139 ») et les rend cliquables vers une fiche Strong (spec 29).
 *
 * Références reconnues (regex combinée `ORIGINE_TOKEN`, en un seul passage pour éviter de matcher
 * deux fois un nombre présent à la fois dans un attribut et dans le texte du lien) :
 *  - lien HTML `<a href="Strong-(Hebreu|Grec)-NNNN.htm" …>libellé</a>` — l'API shemaproject encode la
 *    langue de la référence dans le href (`Hebreu`→H, `Grec`→G), ce qui est la source de vérité
 *    (une ref hébraïque peut apparaître dans la fiche d'un mot grec, ex. G4061 → H4139) ;
 *  - forme préfixée en texte brut : `H7223`, `G2316`, `H1` (1 à 5 chiffres) ;
 *  - forme hébraïque zero-padded : `0` + 1 à 5 chiffres (`0433`, `07218`, `010`) — l'API préfixe
 *    systématiquement les numéros hébraïques d'un `0` (largeur variable).
 * Les autres tags HTML sont strippés, les entités décodées. Les nombres nus sans préfixe ni
 * zero-padding sont ignorés (évite les faux positifs sur numéros de verset, années, etc.).
 * Plusieurs références par champ sont possibles.
 */

export interface OrigineSegment {
  /** Segment de prose ou référence Strong. */
  kind: 'text' | 'strong';
  /** Texte brut du segment (à rendre tel quel pour `text`, libellé du lien pour `strong`). */
  text: string;
  /** Code Strong canonique (ex. « H7218 ») — uniquement pour `kind === 'strong'`. */
  code?: string;
  /** Token brut matché (ex. « 07218 », « 04139 ») — uniquement pour `kind === 'strong'`. */
  raw?: string;
}

/**
 * Passage unique combinant :
 *  1. un lien HTML Strong (`Strong-Hebreu-4139.htm` / `Strong-Grec-2316.htm`) — groupes 1-3 ;
 *  2. une référence Strong en texte brut (`H7223`/`G2316`/`07218`) — groupe 4 ;
 *  3. tout autre tag HTML à stripper — sans groupe de capture.
 */
const ORIGINE_TOKEN = new RegExp(
  [
    '<a\\s[^>]*?href="Strong-(Hebreu|Grec)-(\\d{1,5})\\.htm"[^>]*>([^<]*)<\\/a>',
    '\\b([HG]\\d{1,5}|0\\d{1,5})\\b',
    '<[^>]+>',
  ].join('|'),
  'gi',
);

/** Décode les entités HTML courantes (numériques + nommées). `&amp;` d'abord pour ne pas casser les autres. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/gi, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

/**
 * Normalise un token de référence Strong en code canonique `H`/`G` + chiffres sans zéros de tête.
 * - « G2316 » → « G2316 » (préfixe explicite conservé) ;
 * - « 07218 » + lang « hebrew » → « H7218 » (préfixe inféré depuis la langue, zéros retirés) ;
 * - « 01234 » + lang « greek » → « G1234 ».
 * La langue par défaut est l'hébreu (la forme zero-padded est la convention hébraïque de l'API).
 * NB : pour les refs extraites d'un lien HTML, la langue est lue dans le href — on n'utilise pas
 * cette fonction (le code est construit directement depuis `Hebreu`/`Grec`).
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
 * Construit le code canonique depuis un lien HTML de l'API. `Hebreu`→`H`, `Grec`→`G`, zéros de
 * tête retirés. Ex. (« Hebreu », « 4139 ») → « H4139 », (« Grec », « 02316 ») → « G2316 ».
 */
function codeFromHref(langLabel: string, digits: string): string {
  const prefix = langLabel.toLowerCase().startsWith('h') ? 'H' : 'G';
  return `${prefix}${digits.replace(/^0+(?=\d)/, '')}`;
}

/**
 * Découpe une chaîne `origine`/`type` en segments texte / référence Strong.
 * Retourne `[]` si la chaîne est vide. Les segments de texte vides (entre deux refs adjacentes,
 * ou après strip de tags) sont ignorés. Les entités HTML sont décodées dans les segments texte.
 */
export function parseOrigine(origine: string | undefined | null, lang?: string): OrigineSegment[] {
  if (!origine) return [];
  const segments: OrigineSegment[] = [];
  let lastIndex = 0;
  ORIGINE_TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ORIGINE_TOKEN.exec(origine)) !== null) {
    const before = origine.slice(lastIndex, match.index);
    if (before) segments.push({ kind: 'text', text: decodeEntities(before) });

    if (match[1]) {
      // Lien HTML Strong — langue et numéro lus depuis le href.
      const linkText = decodeEntities(match[3] ?? '');
      segments.push({
        kind: 'strong',
        text: linkText || match[2],
        raw: match[3],
        code: codeFromHref(match[1], match[2]),
      });
    } else if (match[4]) {
      // Référence Strong en texte brut.
      const raw = match[4];
      segments.push({ kind: 'strong', text: raw, raw, code: normalizeStrongCode(raw, lang) });
    }
    // Sinon : tag HTML à stripper (groupes 1 et 4 absents) — on ne pousse rien, le tag est consommé.

    lastIndex = ORIGINE_TOKEN.lastIndex;
  }
  const tail = origine.slice(lastIndex);
  if (tail) segments.push({ kind: 'text', text: decodeEntities(tail) });
  return segments;
}