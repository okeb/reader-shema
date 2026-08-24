import apiClient from '@/lib/axios';
import { getBookById, resolveBookId } from '@/src/shared/constants/bible-books';
import type {
  ChapterVerse,
  BiblicalVerse,
  StrongToken,
  StrongFetchItem,
  StrongOccurrence,
  StrongConcordance,
  StrongLexicon,
  BookInfo,
} from '@/src/domain/entities';
import { compressVerses } from '@/src/domain/value-objects/verse-selection.vo';

/**
 * Client HTTP bas niveau pour l'API Bible (shema/index.js), port de
 * `services/bible/bibleApi.ts` (ancien projet) vers axios.
 *
 * Source unique des données Bible. Les fonctions manipulent des identifiants
 * bruts (chaînes) ; la validation Value-Object se fait dans l'impl du repository.
 */

/** Forme brute d'un verset renvoyé par l'API. */
export interface ApiVerse {
  livre: string;
  chapitre: number;
  verset: number;
  ecrit: string;
  version: string;
  titre?: string;
  paragraphe?: 'start' | 'end';
  /** URL relative d'un fichier audio narré (présent uniquement si le fichier existe). Spec 37. */
  audio?: string;
  /** Tokens Strong (présents uniquement avec ?strongs=1). */
  strongs?: StrongToken[];
}

/** Garde la frontière HTTP tolérante aux champs Strong incomplets ou mal typés. */
function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text || undefined;
}

function normalizeStrongCode(value: unknown, lang?: string): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const raw = String(value).trim().toUpperCase();
  const prefixed = raw.match(/^([HG])0*(\d{1,5})$/);
  if (prefixed) return `${prefixed[1]}${Number(prefixed[2])}`;
  const digits = raw.match(/^0*(\d{1,5})$/);
  if (!digits) return null;
  const prefix = lang === 'hebrew' ? 'H' : lang === 'greek' ? 'G' : null;
  return prefix ? `${prefix}${Number(digits[1])}` : null;
}

function normalizeStrongToken(value: unknown): StrongToken | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const lang = optionalText(raw.lang);
  const text = typeof raw.text === 'string' ? raw.text : '';
  const strong = normalizeStrongCode(raw.strong, lang);
  if (!text && !strong) return null;
  return {
    text,
    strong,
    lemma: optionalText(raw.lemma),
    translit: optionalText(raw.translit),
    definition: optionalText(raw.definition),
    lang,
    phonetique: optionalText(raw.phonetique),
    origine: optionalText(raw.origine),
    type: optionalText(raw.type),
  };
}

function normalizeStrongLexicon(value: unknown): StrongLexicon {
  if (!value || typeof value !== 'object') return {};
  const raw = value as Record<string, unknown>;
  return {
    lemma: optionalText(raw.lemma),
    lang: optionalText(raw.lang),
    translit: optionalText(raw.translit),
    phonetique: optionalText(raw.phonetique),
    origine: optionalText(raw.origine),
    type: optionalText(raw.type),
    definition: optionalText(raw.definition),
  };
}

/** Transforme l'objet { "Jn. 3:1": ApiVerse, ... } en tableau trié par numéro de verset. */
function parseVerseMap(data: Record<string, ApiVerse>): ApiVerse[] {
  return Object.values(data).sort((a, b) => a.verset - b.verset);
}

/** Récupère une map de versets ; null si 404. */
async function fetchVerseMap(path: string): Promise<Record<string, ApiVerse> | null> {
  try {
    const res = await apiClient.get<Record<string, ApiVerse>>(path);
    return res.data;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw new Error(`Erreur API sur ${path}`);
  }
}

/** Récupère tous les versets d'un chapitre (lecture continue) dans la version indiquée. */
export async function getChapter(
  version: string,
  bookId: string,
  chapter: number,
): Promise<ChapterVerse[]> {
  const data = await fetchVerseMap(`/${version}/${bookId}/${chapter}`);
  if (!data) return [];
  return parseVerseMap(data).map((v) => ({
    number: v.verset,
    text: v.ecrit,
    titre: v.titre,
    paragraphe: v.paragraphe,
    audio: v.audio,
  }));
}

/**
 * Récupère une liste de références (mode "références").
 * Chaque ref est un slug "livre/chap/selection" (ex. "jean/3/16" ou "jean/3/1-5,8").
 * Retourne une carte par référence (les refs introuvables sont ignorées).
 */
export async function getReferences(version: string, refs: string[]): Promise<BiblicalVerse[]> {
  const results = await Promise.all(
    refs.map(async (rawRef): Promise<BiblicalVerse | null> => {
      const ref = rawRef.trim();
      if (!ref) return null;

      const [bookId, chap, selection] = ref.split('/');
      if (!bookId || !chap) return null;

      const path = selection
        ? `/${version}/${bookId}/${chap}/${selection}`
        : `/${version}/${bookId}/${chap}`;
      const data = await fetchVerseMap(path);
      if (!data) return null;

      const verses = parseVerseMap(data);
      if (verses.length === 0) return null;

      const book = getBookById(bookId);
      const bookName = book?.name ?? verses[0].livre.trim();
      const reference = `${bookName} ${chap}:${selection ?? ''}`.trim().replace(/:$/, '');

      return {
        id: `${verses[0].livre}${chap}:${verses[0].verset}`,
        reference,
        verses: verses.map((v) => ({ number: v.verset, text: v.ecrit, audio: v.audio })),
        bookId: book?.id ?? bookId,
        chapter: Number(chap),
      };
    }),
  );

  return results.filter((r): r is BiblicalVerse => r !== null);
}

/**
 * Récupère le **texte** d'une liste de versets dans la version indiquée (regroupés par livre/chapitre).
 * Retourne `id → texte`. Les requêtes échouées laissent l'id absent du résultat.
 */
export async function getVersesText(
  version: string,
  items: StrongFetchItem[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  if (items.length === 0) return result;

  const groups = new Map<
    string,
    { bookId: string; chapter: number; verses: number[]; idByVerse: Map<number, string> }
  >();
  for (const it of items) {
    const key = `${it.bookId}/${it.chapter}`;
    let g = groups.get(key);
    if (!g) {
      g = { bookId: it.bookId, chapter: it.chapter, verses: [], idByVerse: new Map() };
      groups.set(key, g);
    }
    if (!g.verses.includes(it.verse)) g.verses.push(it.verse);
    g.idByVerse.set(it.verse, it.id);
  }

  await Promise.all(
    Array.from(groups.values()).map(async (g) => {
      const selection = compressVerses(g.verses);
      if (!selection) return;
      try {
        const data = await fetchVerseMap(`/${version}/${g.bookId}/${g.chapter}/${selection}`);
        if (!data) return;
        for (const v of Object.values(data)) {
          const id = g.idByVerse.get(v.verset);
          if (id) result[id] = v.ecrit;
        }
      } catch {
        // Une requête échouée laisse simplement le texte d'origine en place.
      }
    }),
  );

  return result;
}

/**
 * Récupère les tokens Strong d'une liste de versets (regroupés par livre/chapitre).
 * Utilise `/{version}/:livre/:chap/:selection?strongs=1`. Retourne `id → StrongToken[]`.
 */
export async function getStrongsForVerses(
  version: string,
  items: StrongFetchItem[],
): Promise<Record<string, StrongToken[]>> {
  const result: Record<string, StrongToken[]> = {};
  if (items.length === 0) return result;

  const groups = new Map<
    string,
    { bookId: string; chapter: number; verses: number[]; idByVerse: Map<number, string> }
  >();
  for (const it of items) {
    const key = `${it.bookId}/${it.chapter}`;
    let g = groups.get(key);
    if (!g) {
      g = { bookId: it.bookId, chapter: it.chapter, verses: [], idByVerse: new Map() };
      groups.set(key, g);
    }
    if (!g.verses.includes(it.verse)) g.verses.push(it.verse);
    g.idByVerse.set(it.verse, it.id);
  }

  await Promise.all(
    Array.from(groups.values()).map(async (g) => {
      const selection = compressVerses(g.verses);
      if (!selection) return;
      const query = version === 'orig' ? 'mode=interlinear&translit=1' : 'strongs=1';
      const path = `/${version}/${g.bookId}/${g.chapter}/${selection}?${query}`;
      try {
        const res = await apiClient.get<Record<string, ApiVerse & { strongs?: unknown[] }>>(path);
        for (const v of Object.values(res.data)) {
          const id = g.idByVerse.get(v.verset);
          if (id && Array.isArray(v.strongs)) {
            result[id] = v.strongs
              .map(normalizeStrongToken)
              .filter((token): token is StrongToken => token !== null);
          }
        }
      } catch {
        // Une requête échouée ne doit pas casser les autres groupes.
      }
    }),
  );

  return result;
}

/** Forme brute d'une page de concordance renvoyée par l'API. */
interface ApiConcordance {
  code?: unknown;
  total?: unknown;
  page?: unknown;
  size?: unknown;
  lexicon?: unknown;
  items?: unknown;
}

/** Cache mémoire des pages de concordance déjà récupérées (clé `code:page:size`). */
const concordanceCache = new Map<string, StrongConcordance>();

/**
 * Récupère les occurrences d'un numéro Strong via `/bym/strong/:code?page=&size=`.
 * Pagination 1-based. Retourne null si le code est introuvable (404).
 *
 * Note : l'index de concordance n'existe que sous `bym`. La concordance affiche donc le texte BYM
 * par défaut, puis le remplace par la version active lorsque nécessaire.
 */
export async function getStrongOccurrences(
  code: string,
  opts: { page?: number; size?: number } = {},
): Promise<StrongConcordance | null> {
  const page = opts.page ?? 1;
  const size = opts.size ?? 20;
  const cacheKey = `${code}:${page}:${size}`;
  const cached = concordanceCache.get(cacheKey);
  if (cached) return cached;

  try {
    const res = await apiClient.get<ApiConcordance>(
      `/bym/strong/${encodeURIComponent(code)}?page=${page}&size=${size}`,
    );
    const data = res.data;
    const rawItems = Array.isArray(data.items) ? data.items : [];
    const items: StrongOccurrence[] = rawItems.flatMap((value) => {
      if (!value || typeof value !== 'object') return [];
      const it = value as Record<string, unknown>;
      if (
        typeof it.livre !== 'string' ||
        typeof it.chapitre !== 'number' ||
        typeof it.verset !== 'number' ||
        typeof it.ecrit !== 'string'
      ) return [];
      const bookId = resolveBookId(it.livre) ?? it.livre.toLowerCase();
      const bookName = getBookById(bookId)?.name ?? it.livre;
      return [{
        bookId,
        livre: it.livre,
        chapter: it.chapitre,
        verse: it.verset,
        reference: `${bookName} ${it.chapitre}:${it.verset}`,
        text: it.ecrit,
      }];
    });

    const result: StrongConcordance = {
      code: normalizeStrongCode(data.code) ?? code,
      total: typeof data.total === 'number' && data.total >= 0 ? data.total : items.length,
      page: typeof data.page === 'number' && data.page > 0 ? data.page : page,
      size: typeof data.size === 'number' && data.size > 0 ? data.size : size,
      lexicon: normalizeStrongLexicon(data.lexicon),
      items,
    };
    concordanceCache.set(cacheKey, result);
    return result;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw new Error(`Erreur API concordance ${code}`);
  }
}

/** Récupère les informations d'un livre (signification, auteur, thème, date, introduction). */
export async function getBookInfo(version: string, bookId: string): Promise<BookInfo | null> {
  try {
    const res = await apiClient.get<BookInfo>(`/${version}/${bookId}/info`);
    return res.data;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    return null;
  }
}

// === Manifest audio (spec 37) =================================================
//
// L'audio est agnostique de la version : un fichier par verset, convention
// `{osis}.{chap}.{verset}.mp3`, plus un éventuel `{osis}.{chap}.title.mp3`.
// Le manifest décrit la couverture. Ces endpoints n'existent que sur l'API
// « modifiée » ; en production standard ils 404 → on renvoie null (best-effort),
// la feature audio reste invisible.

/** Manifest d'un chapitre : numéros de versets audio + présence d'un titre narré. */
export interface AudioManifestChapter {
  verses: number[];
  title: boolean;
}

/** Manifest global : map `osis → { chapitre (string) → numéros de versets }`. */
export type AudioManifestGlobal = Record<string, Record<string, number[]>>;

/**
 * Manifest d'un chapitre (`/audio/manifest/{osis}/{chap}`).
 * Best-effort : null si 404 ou erreur (le titre est simplement zappé).
 */
export async function getAudioManifestChapter(osis: string, chapter: number): Promise<AudioManifestChapter | null> {
  try {
    const res = await apiClient.get<AudioManifestChapter>(`/audio/manifest/${osis}/${chapter}`);
    const d = res.data;
    return {
      verses: Array.isArray(d?.verses) ? d.verses : [],
      title: Boolean(d?.title),
    };
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    return null;
  }
}

/**
 * Manifest global (`/audio/manifest`) : couverture audio par livre/chapitre.
 * Best-effort : null si 404 ou erreur (le badge du sélecteur ne s'affiche pas).
 */
export async function getAudioManifest(): Promise<AudioManifestGlobal | null> {
  try {
    const res = await apiClient.get<AudioManifestGlobal>(`/audio/manifest`);
    return res.data ?? null;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    return null;
  }
}
