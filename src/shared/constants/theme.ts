/**
 * Constantes de thème (clair / sombre / système). Le runtime est géré par next-themes
 * (`src/presentation/providers/theme-provider.tsx`, storageKey préservé = `bym:theme`).
 * Ce module expose juste le type et la clé pour référence.
 * Cf. lib/theme.ts (ancien app).
 */

export type Theme = 'light' | 'dark' | 'system';

/** Clé localStorage du thème (préservée de l'ancien app). */
export const THEME_KEY = 'bym:theme';

export const THEMES: Theme[] = ['light', 'dark', 'system'];