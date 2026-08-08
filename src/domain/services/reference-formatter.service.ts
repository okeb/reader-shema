import { getBookById } from '@/src/shared/constants/bible-books';
import { DEFAULT_BIBLE_VERSION, isSelectableId } from '@/src/shared/constants/bible-versions';
import { parseSelection, compressVerses } from '@/src/domain/value-objects/verse-selection.vo';

/**
 * Logique partagée de la vignette Open Graph (spec 14). Calcule la **référence** (titre) à partir des
 * `searchParams` de `/read` — en reproduisant la validation de `app/[locale]/read/page.tsx` — de
 * façon pure (aucun réseau). La récupération du **texte** (corps) vit dans l'infrastructure
 * (`infrastructure/api/og-api.ts`), séparée car réseau.
 *
 * Porté de l'ancien `lib/og-passage.ts` (partie pure). `generateMetadata` (titre, rapide) et la route
 * `app/api/og` (titre + texte) consomment tous deux `resolveRead`.
 */

/** Sous-ensemble des `searchParams` de `/read` pertinents pour l'OG. */
export interface ReadSearchParams {
  livre?: string;
  chap?: string;
  refs?: string;
  v?: string;
  /** Version de Bible souhaitée (ex. "lsg"). Inconnue → repli sur la version par défaut. */
  version?: string;
}

export interface ResolvedRead {
  mode: 'read' | 'refs';
  /** Slugs de référence (mode "refs"), ex. ["jean/3/16", "romains/5/8"]. */
  refs: string[];
  bookId: string;
  chapter: number;
  /** Sélection de versets à surligner en lecture continue (param `v`). */
  highlight: string;
  /** Référence lisible servant de titre OG. Toujours non vide. */
  title: string;
  /** Id de version résolu (toujours connu / valide). */
  version: string;
}

/** Carte de repli (params absents/invalides ou échec API) — cf. spec §5.6. */
export const OG_FALLBACK = {
  title: 'La Bible de Yéhoshoua ha Mashiah',
  subtitle: 'Lecteur en ligne',
} as const;

/**
 * Longueur cible de troncature du corps (caractères), coupée à la frontière de mot. Calibrée pour
 * tenir en ~3-4 lignes à 40px sur la carte 1200×630 (cf. spec §5.2 / §8).
 */
export const OG_BODY_MAX = 145;

/**
 * Reproduit la validation de `app/[locale]/read/page.tsx` et produit la **référence** (titre OG).
 * Purement synchrone (aucun appel réseau) → utilisable tel quel dans `generateMetadata`.
 */
export function resolveRead(sp: ReadSearchParams): ResolvedRead {
  const refsParam = sp.refs?.trim();
  const refs = refsParam
    ? refsParam.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const mode: ResolvedRead['mode'] = refs.length > 0 ? 'refs' : 'read';

  const bookId = sp.livre && getBookById(sp.livre) ? sp.livre : 'jean';
  const book = getBookById(bookId)!;
  const chapRaw = Number(sp.chap);
  const chapter =
    Number.isInteger(chapRaw) && chapRaw >= 1 && chapRaw <= book.chapters ? chapRaw : 1;
  const highlight = sp.v?.trim() ?? '';
  // Version : on n'accepte que les ids sélectionnables (exclut les `comingSoon`), sinon défaut (BYM).
  // Évite qu'un param arbitraire provoque un 404 API ou une fuite de version inexistante dans la vignette.
  const version =
    sp.version && isSelectableId(sp.version) ? sp.version : DEFAULT_BIBLE_VERSION.id;

  const title = mode === 'refs' ? refsTitle(refs) : readTitle(book.name, chapter, highlight);
  return { mode, refs, bookId, chapter, highlight, title, version };
}

/** Titre lecture continue : `Jean 3` (chapitre) ou `Jean 3:16` / `Psaumes 23:1-4,6` (sélection). */
function readTitle(bookName: string, chapter: number, highlight: string): string {
  if (!highlight) return `${bookName} ${chapter}`;
  const sel = compressVerses(parseSelection(highlight));
  return sel ? `${bookName} ${chapter}:${sel}` : `${bookName} ${chapter}`;
}

/** Référence lisible d'un slug "livre/chap/selection" (ex. "jean/3/16" → "Jean 3:16"). */
function refLabel(slug: string): string | null {
  const [bookId, chap, selection] = slug.split('/');
  if (!bookId || !chap) return null;
  const name = getBookById(bookId)?.name ?? bookId;
  return selection ? `${name} ${chap}:${selection}` : `${name} ${chap}`;
}

/** Titre mode références : 1ʳᵉ référence + ` (+N)` s'il y en a plusieurs (ex. `Jean 3:16 (+1)`). */
function refsTitle(refs: string[]): string {
  const first = refLabel(refs[0]) ?? OG_FALLBACK.title;
  const extra = refs.length - 1;
  return extra > 0 ? `${first} (+${extra})` : first;
}

/** Coupe à ~OG_BODY_MAX caractères à la frontière de mot, suffixe `…`. Pure. */
export function truncateBody(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= OG_BODY_MAX) return clean;
  const slice = clean.slice(0, OG_BODY_MAX);
  const cut = slice.lastIndexOf(' ');
  const base = cut > 0 ? slice.slice(0, cut) : slice;
  return `${base.replace(/[\s.,;:—-]+$/, '')}…`;
}