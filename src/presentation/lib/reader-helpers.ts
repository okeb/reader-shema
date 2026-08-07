/** Mode du lecteur : lecture continue ("read") ou cartes de référence ("refs"). */
export type ReaderMode = 'read' | 'refs';

/**
 * Clé stable d'un verset : `${bookId}:${chapter}:${verse}` (préfixée par la version côté stores).
 * Utilisé pour la sélection, les surlignages, les favoris/signets (qui préfixent par la version).
 */
export function verseId(bookId: string, chapter: number, verse: number): string {
  return `${bookId}:${chapter}:${verse}`;
}

/** Construit l'URL de navigation du lecteur pour un passage. */
export function readerUrl(
  params: { livre: string; chap: number; v?: string; refs?: string[]; version?: string },
): string {
  const usp = new URLSearchParams();
  usp.set('livre', params.livre);
  usp.set('chap', String(params.chap));
  if (params.v) usp.set('v', params.v);
  if (params.refs && params.refs.length > 0) usp.set('refs', params.refs.join(','));
  if (params.version) usp.set('version', params.version);
  return `/read?${usp.toString()}`;
}