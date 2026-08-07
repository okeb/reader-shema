import { compressVerses } from '@/src/domain/value-objects/verse-selection.vo';
import { DEFAULT_BIBLE_VERSION } from '@/src/shared/constants/bible-versions';

/** Un verset (ou carte) à inclure dans une copie de passage. */
export interface PassageItem {
  reference: string;
  text: string;
  verse?: number;
}

/** Mention de version apposée en fin de copie (ex. « BYM »). */
const VERSION_TAG = DEFAULT_BIBLE_VERSION.id.toUpperCase();

/**
 * Met en forme un passage prêt à coller, typographie française (guillemets « », tiret cadratin),
 * avec la référence compressée et la mention de version :
 *
 *   « Car Dieu a tant aimé le monde… »
 *   — Jean 3:16 (BYM)
 *
 * En lecture continue, les numéros de versets ne sont insérés que pour un passage multi-versets
 * (pour distinguer les versets) ; un verset isolé est cité sans numéro. Les `items` sont supposés
 * déjà triés par numéro de verset.
 */
export function formatPassage(
  items: PassageItem[],
  opts: { mode: 'read' | 'refs'; bookName: string; chapter: number; versionTag?: string },
): string {
  if (items.length === 0) return '';

  const tag = opts.versionTag ?? VERSION_TAG;

  // Mode références : chaque carte porte sa propre référence (passages potentiellement disjoints).
  if (opts.mode === 'refs') {
    return items
      .map((it) => `« ${it.text.trim()} »\n— ${it.reference} (${tag})`)
      .join('\n\n');
  }

  const multi = items.length > 1;
  const body = items
    .map((it) => (multi ? `${it.verse} ${it.text.trim()}` : it.text.trim()))
    .join(' ');
  const range = compressVerses(items.map((it) => it.verse ?? 0));
  return `« ${body} »\n— ${opts.bookName} ${opts.chapter}:${range} (${tag})`;
}

/**
 * Met en forme un passage pour la **copie** du verset :
 *
 *   Hébreux 8
 *   1 Le contenu du verset
 *   2 Le contenu du verset
 *   Bible de Yéhoshoua ha Mashiah
 *
 * En-tête « Livre Chapitre » en première ligne, puis un verset par ligne numéroté (le numéro est
 * toujours inséré, même pour un verset isolé), et la version en toutes lettres sur la dernière
 * ligne. En mode références (cartes disjointes), chaque carte porte sa propre référence au-dessus
 * de son texte. Les `items` sont supposés déjà triés par numéro de verset.
 */
export function formatPassageForCopy(
  items: PassageItem[],
  opts: { mode: 'read' | 'refs'; bookName: string; chapter: number; versionLabel: string },
): string {
  if (items.length === 0) return '';

  if (opts.mode === 'refs') {
    const body = items
      .map((it) => `${it.reference}\n${it.text.trim()}`)
      .join('\n\n');
    return `${body}\n${opts.versionLabel}`;
  }

  const header = `${opts.bookName} ${opts.chapter}`;
  const body = items
    .map((it) => `${it.verse ?? ''} ${it.text.trim()}`.trim())
    .join('\n');
  return `${header}\n${body}\n${opts.versionLabel}`;
}