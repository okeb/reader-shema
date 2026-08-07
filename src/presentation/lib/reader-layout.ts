import type { ColumnCount, MeasureKey } from '@/src/shared/constants/reader-preferences';

/**
 * Classes de colonnes (littérales pour le JIT Tailwind). 1 colonne en mobile dans tous les cas.
 * Partagé entre le lecteur et son skeleton pour reproduire la même mise en page.
 */
export const COLUMN_WRAP: Record<ColumnCount, string> = {
  1: 'columns-1 md:columns-1',
  2: 'columns-1 md:columns-2',
  3: 'columns-1 md:columns-3',
};

/** Largeur max du contenu selon le nombre de colonnes. */
export const CONTENT_MAX: Record<ColumnCount, string> = {
  1: 'max-w-[68ch]',
  2: 'max-w-4xl',
  3: 'max-w-6xl',
};

/** Largeur de la colonne de lecture (1 colonne) selon le réglage « largeur ». */
export const MEASURE_MAX: Record<MeasureKey, string> = {
  narrow: 'max-w-[52ch]',
  normal: 'max-w-[68ch]',
  wide: 'max-w-[88ch]',
  full: 'max-w-none',
};

/**
 * Largeur effective du contenu : en 1 colonne, suit le réglage « largeur » ; en multi-colonnes,
 * largeur dérivée du nombre de colonnes.
 */
export function contentMaxClass(columns: ColumnCount, measure: MeasureKey): string {
  return columns === 1 ? MEASURE_MAX[measure] : CONTENT_MAX[columns];
}