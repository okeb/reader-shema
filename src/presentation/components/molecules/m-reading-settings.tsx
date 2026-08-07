'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { FloatingMenu } from '@/src/presentation/components/molecules/m-floating-menu';
import { useReaderPreferences } from '@/src/presentation/stores/reader-preferences.store';
import {
  FONT_OPTIONS,
  BOOK_FONT_OPTIONS,
  READING_TINT_OPTIONS,
  LAYOUT_OPTIONS,
  COLUMN_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  MEASURE_OPTIONS,
  CROSS_REFS_OPTIONS,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  clampFontSize,
  type ReadingLayout,
  type ColumnCount,
} from '@/src/shared/constants/reader-preferences';

/** Libellé court de chaque disposition de texte. */
const LAYOUT_LABEL: Record<ReadingLayout, string> = {
  flowing: 'Paragraphe',
  verses: 'Versets',
  plain: 'Texte seul',
};

/** Bloc « étiquette + contrôle » du panneau. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="px-2 py-1.5">
      <div className="mb-1 text-[11px] font-medium text-foreground">{label}</div>
      {children}
    </div>
  );
}

/** Contrôle segmenté générique (un choix parmi N). */
function Seg<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-lg bg-input p-0.5">
      {options.map((o) => (
        <button
          key={String(o.key)}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            'flex-1 rounded-md px-1.5 py-1 text-[10.5px] font-medium leading-tight transition-colors',
            o.key === value ? 'bg-background text-foreground shadow-sm' : 'text-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Panneau « Réglages de lecture » : police, police du livre, taille, interligne, largeur, fond de
 * lecture, disposition, colonnes, renvois et mode focus. Lit/écrit directement dans le store
 * `useReaderPreferences` (persistance localStorage + application des vars CSS). Self-contained.
 *
 * Rendu via `FloatingMenu` (portail `createPortal` au-dessus du bouton, icône `hugeicons:text-font`
 * « Aa ») : indispensable car le dock applique `overflow-x-auto` qui rognerait un popover `absolute`.
 *
 * Présentation portée verbatim de l'ancien `components/molecules/m-reading-settings.tsx`.
 */
export function ReadingSettings({ showLayout = true }: { showLayout?: boolean }) {
  const prefs = useReaderPreferences();

  // Brouillon local du champ taille (validé au blur / Entrée), comme l'ancien FontSwitcher.
  const [draft, setDraft] = useState(String(prefs.fontSize));
  useEffect(() => setDraft(String(prefs.fontSize)), [prefs.fontSize]);
  const commitDraft = () => {
    const n = Number(draft);
    prefs.setFontSize(Number.isNaN(n) ? prefs.fontSize : clampFontSize(n));
  };

  return (
    <FloatingMenu
      title="Réglages de lecture"
      panelClassName="w-[18rem]"
      icon={<Icon icon="hugeicons:text-font" className="h-[18px] w-[18px]" />}
    >
      {() => (
        <div className="max-h-[70vh] overflow-y-auto py-1">
          <Row label="Police">
            <div className="flex justify-between">
              {FONT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => prefs.setFont(opt.key)}
                  title={opt.label}
                  aria-label={opt.label}
                  aria-pressed={opt.key === prefs.font}
                  style={{ fontFamily: opt.cssValue }}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border text-[15px] leading-none transition-colors',
                    opt.key === prefs.font
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input text-foreground hover:bg-accent',
                  )}
                >
                  Aa
                </button>
              ))}
            </div>
          </Row>

          <Row label="Police du livre">
            <div className="grid grid-cols-2 gap-1">
              {BOOK_FONT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => prefs.setBookFont(opt.key)}
                  style={{ fontFamily: opt.cssValue }}
                  className={cn(
                    'flex items-center justify-between gap-1 rounded-md border px-2 py-1.5 text-left text-[12px] transition-colors',
                    opt.key === prefs.bookFont ? 'border-primary/40 bg-accent' : 'border-input hover:bg-accent',
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.key === prefs.bookFont && (
                    <Icon icon="hugeicons:tick-02" className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </Row>

          <Row label="Taille du texte">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => prefs.setFontSize(prefs.fontSize - 1)}
                disabled={prefs.fontSize <= MIN_FONT_SIZE}
                title="Réduire"
                className="shrink-0 font-serif text-xs leading-none text-foreground transition-colors hover:text-foreground disabled:opacity-30"
              >
                A
              </button>
              <input
                type="range"
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                value={prefs.fontSize}
                onChange={(e) => prefs.setFontSize(Number(e.target.value))}
                aria-label="Taille du texte"
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-input accent-primary"
              />
              <button
                type="button"
                onClick={() => prefs.setFontSize(prefs.fontSize + 1)}
                disabled={prefs.fontSize >= MAX_FONT_SIZE}
                title="Augmenter"
                className="shrink-0 font-serif text-lg leading-none text-foreground transition-colors hover:text-foreground disabled:opacity-30"
              >
                A
              </button>
              <input
                type="number"
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitDraft}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    commitDraft();
                    e.currentTarget.blur();
                  }
                }}
                aria-label="Taille du texte en pixels"
                className="w-11 rounded-md border border-input bg-transparent px-1.5 py-0.5 text-right text-xs tabular-nums outline-none focus:border-primary/50"
              />
            </div>
          </Row>

          <Row label="Interligne">
            <Seg
              value={prefs.lineHeight}
              options={LINE_HEIGHT_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              onChange={prefs.setLineHeight}
            />
          </Row>

          <Row label="Largeur">
            <Seg value={prefs.measure} options={MEASURE_OPTIONS} onChange={prefs.setMeasure} />
          </Row>

          <Row label="Fond de lecture">
            <Seg value={prefs.readingTint} options={READING_TINT_OPTIONS} onChange={prefs.setReadingTint} />
          </Row>

          {showLayout && (
            <Row label="Disposition">
              <Seg
                value={prefs.layout}
                options={LAYOUT_OPTIONS.map((l) => ({ key: l, label: LAYOUT_LABEL[l] }))}
                onChange={prefs.setLayout}
              />
            </Row>
          )}

          <div className="hidden sm:block">
            <Row label="Colonnes">
              <Seg
                value={prefs.columns}
                options={COLUMN_OPTIONS.map((c) => ({ key: c, label: String(c) }))}
                onChange={(c) => prefs.setColumns(c as ColumnCount)}
              />
            </Row>
          </div>

          <Row label="Renvois">
            <Seg value={prefs.crossRefsMode} options={CROSS_REFS_OPTIONS} onChange={prefs.setCrossRefsMode} />
          </Row>

          <div className="mx-2 my-1 h-px bg-border" />
          <button
            type="button"
            onClick={prefs.toggleFocus}
            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-[12px] transition-colors hover:bg-accent"
          >
            <span className="flex items-center gap-2">
              <Icon icon="hugeicons:camera-02" className="h-4 w-4 text-foreground" />
              Mode focus
            </span>
            <span
              className={cn('relative h-4 w-7 rounded-full transition-colors', prefs.focusMode ? 'bg-primary' : 'bg-input')}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all',
                  prefs.focusMode ? 'left-[14px]' : 'left-0.5',
                )}
              />
            </span>
          </button>
        </div>
      )}
    </FloatingMenu>
  );
}

export default ReadingSettings;