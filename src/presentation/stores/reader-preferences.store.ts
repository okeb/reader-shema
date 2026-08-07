'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  type ReaderPreferences,
  READER_PREFS_DEFAULTS,
  READER_PREFS_STORAGE_KEY,
  FONT_OPTIONS,
  BOOK_FONT_OPTIONS,
  ACCENT_OPTIONS,
  accentVars,
  clampFontSize,
  type ReaderFont,
  type BookFont,
  type ColumnCount,
  type ReadingLayout,
  type LineHeightKey,
  type MeasureKey,
  type CrossRefsMode,
  type LogoStyle,
  type AccentKey,
  type ReadingTint,
} from '@/src/shared/constants/reader-preferences';
import { jsonStorage } from './multi-key-storage';

// --- Application des vars CSS (côté client uniquement) -------------------------

function applyFontVar(font: ReaderFont) {
  if (typeof document === 'undefined') return;
  const opt = FONT_OPTIONS.find((o) => o.key === font) ?? FONT_OPTIONS[0];
  document.documentElement.style.setProperty('--font-reader', opt.cssValue);
}

function applyBookFontVar(bookFont: BookFont) {
  if (typeof document === 'undefined') return;
  const opt = BOOK_FONT_OPTIONS.find((o) => o.key === bookFont) ?? BOOK_FONT_OPTIONS[0];
  document.documentElement.style.setProperty('--font-book', opt.cssValue);
}

function applyAccentVar(accent: AccentKey) {
  if (typeof document === 'undefined') return;
  const { light, dark } = accentVars(accent);
  const d = document.documentElement.style;
  d.setProperty('--accent-light', light);
  d.setProperty('--accent-dark', dark);
}

function applyReadingTint(tint: ReadingTint) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('reading-sepia', tint === 'sepia');
}

function applyReduceMotion(on: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('reduce-motion', on);
}

/** Applique toutes les vars CSS dérivées des préférences (au rehydrate + sur changement). */
function applyAllVars(p: ReaderPreferences) {
  applyFontVar(p.font);
  applyBookFontVar(p.bookFont);
  applyAccentVar(p.accent);
  applyReadingTint(p.readingTint);
  applyReduceMotion(p.reduceMotion);
}

// --- Store ---------------------------------------------------------------------

interface ReaderPrefsState extends ReaderPreferences {
  hydrated: boolean;
  update: (patch: Partial<ReaderPreferences>) => void;
  setFont: (font: ReaderFont) => void;
  setBookFont: (bookFont: BookFont) => void;
  setFontSize: (size: number) => void;
  setColumns: (columns: ColumnCount) => void;
  setLayout: (layout: ReadingLayout) => void;
  setLineHeight: (lineHeight: LineHeightKey) => void;
  setMeasure: (measure: MeasureKey) => void;
  setCrossRefsMode: (mode: CrossRefsMode) => void;
  setLogoStyle: (style: LogoStyle) => void;
  setAccent: (accent: AccentKey) => void;
  setReadingTint: (tint: ReadingTint) => void;
  setReduceMotion: (on: boolean) => void;
  setFocusMode: (on: boolean) => void;
  toggleFocus: () => void;
  toggleQuiz: () => void;
}

/** Extrait l'objet `ReaderPreferences` plat depuis l'état du store (format verbatim persisté). */
function pickPrefs(s: ReaderPreferences): ReaderPreferences {
  return {
    font: s.font,
    bookFont: s.bookFont,
    fontSize: s.fontSize,
    columns: s.columns,
    layout: s.layout,
    lineHeight: s.lineHeight,
    measure: s.measure,
    focusMode: s.focusMode,
    crossRefsMode: s.crossRefsMode,
    logoStyle: s.logoStyle,
    accent: s.accent,
    readingTint: s.readingTint,
    reduceMotion: s.reduceMotion,
    quizEnabled: s.quizEnabled,
  };
}

export const useReaderPreferences = create<ReaderPrefsState>()(
  persist(
    immer((set) => ({
      ...READER_PREFS_DEFAULTS,
      hydrated: false,

      update: (patch) => set((s) => { Object.assign(s, patch); }),

      setFont: (font) => { applyFontVar(font); set((s) => { s.font = font; }); },
      setBookFont: (bookFont) => { applyBookFontVar(bookFont); set((s) => { s.bookFont = bookFont; }); },
      setFontSize: (size) => set((s) => { s.fontSize = clampFontSize(size); }),
      setColumns: (columns) => set((s) => { s.columns = columns; }),
      setLayout: (layout) => set((s) => { s.layout = layout; }),
      setLineHeight: (lineHeight) => set((s) => { s.lineHeight = lineHeight; }),
      setMeasure: (measure) => set((s) => { s.measure = measure; }),
      setCrossRefsMode: (crossRefsMode) => set((s) => { s.crossRefsMode = crossRefsMode; }),
      setLogoStyle: (logoStyle) => set((s) => { s.logoStyle = logoStyle; }),
      setAccent: (accent) => { applyAccentVar(accent); set((s) => { s.accent = accent; }); },
      setReadingTint: (readingTint) => { applyReadingTint(readingTint); set((s) => { s.readingTint = readingTint; }); },
      setReduceMotion: (reduceMotion) => { applyReduceMotion(reduceMotion); set((s) => { s.reduceMotion = reduceMotion; }); },
      setFocusMode: (focusMode) => set((s) => { s.focusMode = focusMode; }),
      toggleFocus: () => set((s) => { s.focusMode = !s.focusMode; }),
      toggleQuiz: () => set((s) => { s.quizEnabled = !s.quizEnabled; }),
    })),
    {
      name: READER_PREFS_STORAGE_KEY,
      storage: createJSONStorage(() => jsonStorage),
      // On persiste uniquement les champs de préférences (pas hydrated ni les actions).
      partialize: pickPrefs,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
          applyAllVars(state);
        }
      },
    },
  ),
);

/** Accès hors React (ex. data-transfer, OG). */
export const getReaderPrefs = () => pickPrefs(useReaderPreferences.getState());

export { ACCENT_OPTIONS };