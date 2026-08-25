/**
 * Constantes & types des préférences de lecture (police, accent, layout, interligne…).
 * Source unique de vérité — le store Zustand (`src/presentation/stores/reader-preferences.store.ts`)
 * et le script d'init pré-paint consomment ces valeurs. Aucune logique React/DOM ici :
 * le module reste importable côté serveur.
 * Cf. spec 03 — réglages de lecture, spec 20 — couleur d'accent.
 */

export type ReaderFont =
  | 'noto-serif'
  | 'inter'
  | 'lora'
  | 'atkinson'
  | 'dm-sans'
  | 'merriweather';
export type ColumnCount = 1 | 2 | 3;
/** "flowing" = texte continu avec numéros ; "verses" = un verset par ligne ; "plain" = continu sans numéros. */
export type ReadingLayout = 'flowing' | 'verses' | 'plain';

export interface FontOption {
  key: ReaderFont;
  label: string;
  /** Valeur de font-family appliquée à --font-reader. */
  cssValue: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { key: 'noto-serif', label: 'Noto Serif', cssValue: 'var(--font-noto-serif), serif' },
  { key: 'inter', label: 'Inter', cssValue: 'var(--font-inter), sans-serif' },
  { key: 'lora', label: 'Lora', cssValue: 'var(--font-lora), serif' },
  { key: 'atkinson', label: 'Atkinson Hyperlegible', cssValue: 'var(--font-atkinson), sans-serif' },
  { key: 'dm-sans', label: 'DM Sans', cssValue: 'var(--font-dm-sans), sans-serif' },
  { key: 'merriweather', label: 'Merriweather', cssValue: 'var(--font-merriweather), serif' },
];

export type BookFont = 'match' | 'germania-one' | 'bebas-neue' | 'lilita-one';
export interface BookFontOption {
  key: BookFont;
  label: string;
  cssValue: string;
}
export const BOOK_FONT_OPTIONS: BookFontOption[] = [
  { key: 'match', label: 'Comme le texte', cssValue: 'var(--font-reader)' },
  { key: 'germania-one', label: 'Germania One', cssValue: 'var(--font-germania-one), serif' },
  { key: 'bebas-neue', label: 'Bebas Neue', cssValue: 'var(--font-bebas-neue), sans-serif' },
  { key: 'lilita-one', label: 'Lilita One', cssValue: 'var(--font-lilita-one), sans-serif' },
];

export const COLUMN_OPTIONS: ColumnCount[] = [1, 2, 3];
export const LAYOUT_OPTIONS: ReadingLayout[] = ['flowing', 'verses', 'plain'];

/**
 * Couleur d'accent (primary). Chaque accent définit la teinte `--primary` en clair et en sombre
 * (HSL) via les vars CSS `--accent-light` / `--accent-dark` (cf. globals.scss).
 */
export type AccentKey = 'orange' | 'red' | 'rose' | 'violet' | 'blue' | 'green' | 'teal';
export interface AccentOption {
  key: AccentKey;
  label: string;
  light: string;
  dark: string;
}
export const ACCENT_OPTIONS: AccentOption[] = [
  { key: 'orange', label: 'Orange', light: '24 94% 50%', dark: '24 94% 53%' },
  { key: 'red', label: 'Rouge', light: '0 84% 58%', dark: '0 78% 62%' },
  { key: 'rose', label: 'Rose', light: '330 80% 56%', dark: '330 78% 64%' },
  { key: 'violet', label: 'Violet', light: '265 84% 65%', dark: '265 84% 70%' },
  { key: 'blue', label: 'Bleu', light: '217 91% 60%', dark: '214 90% 66%' },
  { key: 'green', label: 'Vert', light: '142 71% 43%', dark: '142 64% 50%' },
  { key: 'teal', label: 'Turquoise', light: '188 84% 42%', dark: '186 80% 50%' },
];
export const DEFAULT_ACCENT: AccentKey = 'orange';

export function accentVars(key: AccentKey): { light: string; dark: string } {
  const opt = ACCENT_OPTIONS.find((o) => o.key === key) ?? ACCENT_OPTIONS[0];
  return { light: opt.light, dark: opt.dark };
}

export type ReadingTint = 'none' | 'sepia';
export const READING_TINT_OPTIONS: { key: ReadingTint; label: string }[] = [
  { key: 'none', label: 'Normal' },
  { key: 'sepia', label: 'Sépia' },
];

export type CrossRefsMode = 'always' | 'selection' | 'never';
export const CROSS_REFS_OPTIONS: { key: CrossRefsMode; label: string }[] = [
  { key: 'always', label: 'Toujours' },
  { key: 'selection', label: 'Sélection' },
  { key: 'never', label: 'Jamais' },
];

/**
 * Affichage du bouton audio par verset (spec 37 §5.1) : `always` = toujours visible,
 * `selection` = visible au survol du verset uniquement, `never` = masqué (la pilule
 * d'en-tête reste disponible). Le verset en cours de lecture garde son égaliseur quel
 * que soit le mode (repère de position).
 */
export type AudioVerseButtonMode = 'always' | 'selection' | 'never';
export const AUDIO_VERSE_BUTTON_OPTIONS: { key: AudioVerseButtonMode; label: string }[] = [
  { key: 'always', label: 'Toujours' },
  { key: 'selection', label: 'Sélection' },
  { key: 'never', label: 'Jamais' },
];

export type LineHeightKey = 'tight' | 'normal' | 'relaxed' | 'loose';
export const LINE_HEIGHT_OPTIONS: { key: LineHeightKey; label: string; value: number }[] = [
  { key: 'tight', label: 'Serré', value: 1.5 },
  { key: 'normal', label: 'Normal', value: 1.75 },
  { key: 'relaxed', label: 'Aéré', value: 2.0 },
  { key: 'loose', label: 'Très aéré', value: 2.3 },
];
export function lineHeightValue(key: LineHeightKey): number {
  return (LINE_HEIGHT_OPTIONS.find((o) => o.key === key) ?? LINE_HEIGHT_OPTIONS[2]).value;
}

export type MeasureKey = 'narrow' | 'normal' | 'wide' | 'full';
export const MEASURE_OPTIONS: { key: MeasureKey; label: string }[] = [
  { key: 'narrow', label: 'Étroite' },
  { key: 'normal', label: 'Normale' },
  { key: 'wide', label: 'Large' },
  { key: 'full', label: 'Pleine' },
];

export type LogoStyle = 'logotype' | 'icon';
export const LOGO_STYLE_OPTIONS: { key: LogoStyle; label: string }[] = [
  { key: 'logotype', label: 'Logo' },
  { key: 'icon', label: 'Icône' },
];

/**
 * Icône-app (spec 32 §5.5) : variante colorée du logo affichée sur le favicon, le bloc marque de
 * l'accueil et la topbar du reader. `'auto'` = tirage aléatoire à chaque visite (comportement
 * d'origine, surprise) ; les 5 autres clés fixent une variante. Les clés nommées correspondent
 * exactement aux `key` de `BRAND_ICONS` (`src/shared/constants/brand-logos.ts`). Préférence
 * cosmétique locale, persistée dans `bibleReaderPrefs` et synchronisée (kind `readerPrefs`).
 */
export type AppIconKey = 'auto' | 'or' | 'laine' | 'pelouse' | 'plume' | 'sable';
export const APP_ICON_OPTIONS: { key: AppIconKey; label: string }[] = [
  { key: 'auto', label: 'Aléatoire' },
  { key: 'or', label: 'Or' },
  { key: 'laine', label: 'Laine' },
  { key: 'pelouse', label: 'Pelouse' },
  { key: 'plume', label: 'Plume' },
  { key: 'sable', label: 'Sable' },
];

/**
 * Avatar utilisateur (spec 27, révisé) : générateur déterministe servi par l'app externe
 * `profil-generator-one` (Vercel). La seed (`user.id` Better Auth — opaque, stable, identique sur
 * tous les appareils) détermine l'image ; 6 variantes au choix. L'image est fetchée à la demande
 * (SVG, cache immutable 1 an côté CDN) — aucune génération côté appareil, aucun stockage. Le choix
 * de la variante est une préférence cosmétique locale (persistée dans `bibleReaderPrefs`,
 * synchronisée via le kind `readerPrefs` si opt-in).
 */
export type AvatarVariant = 'gradient_pixel' | 'geometric' | 'random' | 'icon_center' | 'wave' | 'dev';
export const AVATAR_VARIANT_OPTIONS: { key: AvatarVariant; label: string }[] = [
  { key: 'gradient_pixel', label: 'Dégradé' },
  { key: 'geometric', label: 'Géométrique' },
  { key: 'random', label: 'Aléatoire' },
  { key: 'icon_center', label: 'Icône' },
  { key: 'wave', label: 'Vague' },
  { key: 'dev', label: 'Dev' },
];

/** Base de l'app d'avatars (profil-generator-one, déployée sur Vercel). */
export const AVATAR_API_BASE = 'https://profil-generator-one.vercel.app';

/**
 * Construit l'URL d'avatar déterministe pour un couple (seed, variante).
 * Format SVG (scalaire, crisp à toute taille) ; la réponse est `cache-control: immutable, max-age=1an`.
 */
export function buildAvatarUrl(seed: string, variant: AvatarVariant): string {
  const params = new URLSearchParams({ variant, seed, format: 'svg' });
  return `${AVATAR_API_BASE}/avatar?${params.toString()}`;
}

export const MIN_FONT_SIZE = 12;
export const MAX_FONT_SIZE = 32;
export const DEFAULT_FONT_SIZE = 16;

export function clampFontSize(size: number): number {
  if (Number.isNaN(size)) return DEFAULT_FONT_SIZE;
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(size)));
}

/** Clé localStorage des préférences de lecture (préservée de l'ancien app). */
export const READER_PREFS_STORAGE_KEY = 'bibleReaderPrefs';

/**
 * Script bloquant injecté dans <head> : applique les préférences d'apparence avant le premier
 * paint (accent, sépia, reduce-motion) pour éviter tout flash. Autonome (pas d'import).
 */
export const ACCENT_INIT_SCRIPT = (function () {
  const map = ACCENT_OPTIONS.map((o) => `'${o.key}':['${o.light}','${o.dark}']`).join(',');
  return `(function(){try{var raw=localStorage.getItem('${READER_PREFS_STORAGE_KEY}');if(!raw)return;var p=JSON.parse(raw);var d=document.documentElement;var s=d.style;var a=p&&p.accent;var m={${map}};var v=m[a]||m['${DEFAULT_ACCENT}'];s.setProperty('--accent-light',v[0]);s.setProperty('--accent-dark',v[1]);d.classList.toggle('reading-sepia',p&&p.readingTint==='sepia');d.classList.toggle('reduce-motion',!!(p&&p.reduceMotion));}catch(e){}})();`;
})();

export interface ReaderPreferences {
  font: ReaderFont;
  bookFont: BookFont;
  fontSize: number;
  columns: ColumnCount;
  layout: ReadingLayout;
  lineHeight: LineHeightKey;
  measure: MeasureKey;
  focusMode: boolean;
  crossRefsMode: CrossRefsMode;
  logoStyle: LogoStyle;
  appIcon: AppIconKey;
  accent: AccentKey;
  readingTint: ReadingTint;
  reduceMotion: boolean;
  quizEnabled: boolean;
  /** Affiche le lemme/translittération au-dessus des tokens dans le panneau Strong. */
  strongOriginalText: boolean;
  avatarVariant: AvatarVariant;
  /** Auto-scroll doux vers le verset en cours de lecture audio (spec 37, phase 2). */
  followAudio: boolean;
  /** Affichage du bouton audio par verset : toujours / au survol / jamais (spec 37). */
  audioVerseButton: AudioVerseButtonMode;
}

export const READER_PREFS_DEFAULTS: ReaderPreferences = {
  font: 'noto-serif',
  bookFont: 'match',
  fontSize: DEFAULT_FONT_SIZE,
  columns: 1,
  layout: 'flowing',
  lineHeight: 'relaxed',
  measure: 'normal',
  focusMode: false,
  crossRefsMode: 'selection',
  logoStyle: 'logotype',
  appIcon: 'auto',
  accent: DEFAULT_ACCENT,
  readingTint: 'none',
  reduceMotion: false,
  quizEnabled: true,
  strongOriginalText: false,
  avatarVariant: 'gradient_pixel',
  followAudio: true,
  audioVerseButton: 'always',
};
