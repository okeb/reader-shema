'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { GLASS_PILL } from '@/src/presentation/components/atoms/a-floating-button';
import { useReaderPreferences } from '@/src/presentation/stores/reader-preferences.store';
import { useThemeCycle } from '@/src/presentation/hooks/use-theme-cycle';
import {
  ACCENT_OPTIONS,
  LOGO_STYLE_OPTIONS,
} from '@/src/shared/constants/reader-preferences';
import type { Theme } from '@/src/shared/constants/theme';

const THEME_OPTIONS: { key: Theme; label: string }[] = [
  { key: 'light', label: 'Clair' },
  { key: 'dark', label: 'Sombre' },
  { key: 'system', label: 'Système' },
];

interface AppearanceMenuProps {
  /** Ouvre l'aide des raccourcis clavier. */
  onOpenHelp?: () => void;
  /** Classes additionnelles sur la racine. */
  className?: string;
}

/**
 * Menu « Apparence » de la topbar (roue crantée, à droite) : regroupe la personnalisation
 * cosmétique globale de l'app — thème (clair/sombre/système), couleur d'accent (7 pastilles),
 * variante du logo (desktop), réduction des animations (accessibilité), activation des questions
 * (quiz) et aide des raccourcis clavier. La mise en page du texte (police, taille, interligne,
 * fond de lecture/sépia, mode focus…) vit dans le panneau Réglages de lecture ([Aa]) du dock.
 *
 * Self-contained : lit `useReaderPreferences` (accent, logoStyle, reduceMotion, quizEnabled) et
 * `useThemeCycle` (thème). Popover ancré à droite (sous le bouton, bord droit) car le bouton vit
 * à droite de la topbar. Ferme au clic dehors et à Échap.
 *
 * Porté de l'ancien `components/molecules/m-appearance-menu.tsx`.
 */
export function AppearanceMenu({ onOpenHelp, className }: AppearanceMenuProps) {
  const prefs = useReaderPreferences();
  const { theme, setTheme, mounted } = useThemeCycle();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const current: Theme = theme;

  return (
    <div ref={ref} className={cn('relative inline-flex items-center', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Apparence"
        aria-label="Apparence (couleur, logo, fond de lecture, animations)"
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          GLASS_PILL,
          'pointer-events-auto relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground',
          open && 'text-foreground',
        )}
      >
        <Icon icon="hugeicons:settings-02" className={cn('h-[18px] w-[18px]', open ? 'text-primary' : 'text-current')} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Apparence"
          className={cn(
            'pointer-events-auto absolute right-0 top-full mt-2 w-72 origin-top-right overflow-hidden rounded-xl shadow-2xl animate-fade-in-up',
            GLASS_PILL,
          )}
        >
          {/* Thème (clair / sombre / système) — on attend le montage (next-themes) pour cocher. */}
          <p className="px-3 pb-1 pt-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Thème
          </p>
          <div className="mx-3 mb-3 flex gap-0.5 rounded-lg bg-input p-0.5">
            {THEME_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                role="menuitemradio"
                aria-checked={mounted && o.key === current}
                onClick={() => {
                  setTheme(o.key);
                  setOpen(false);
                }}
                className={cn(
                  'flex-1 rounded-md px-1.5 py-1 text-[10.5px] font-medium leading-tight transition-colors',
                  mounted && o.key === current
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-foreground/70 hover:text-foreground',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* Couleur d'accent */}
          <div className="mx-3 h-px bg-border" />
          <p className="px-3 pb-1 pt-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Couleur d&apos;accent
          </p>
          <div className="flex justify-between px-3 pb-3 pt-0.5">
            {ACCENT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                role="menuitemradio"
                aria-checked={opt.key === prefs.accent}
                title={opt.label}
                aria-label={opt.label}
                onClick={() => {
                  prefs.setAccent(opt.key);
                  setOpen(false);
                }}
                style={{ backgroundColor: `hsl(${opt.light})` }}
                className={cn(
                  'h-7 w-7 rounded-full transition-transform hover:scale-110',
                  opt.key === prefs.accent
                    ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                    : 'ring-1 ring-black/10 dark:ring-white/15',
                )}
              />
            ))}
          </div>

          {/* Variante du logo — desktop uniquement (sur mobile l'icône carrée est toujours affichée). */}
          <div className="hidden md:block">
            <div className="mx-3 h-px bg-border" />
            <p className="px-3 pb-1 pt-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Logo
            </p>
            <div className="mx-3 mb-3 flex gap-0.5 rounded-lg bg-input p-0.5">
              {LOGO_STYLE_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={o.key === prefs.logoStyle}
                  onClick={() => {
                    prefs.setLogoStyle(o.key);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex-1 rounded-md px-1.5 py-1 text-[10.5px] font-medium leading-tight transition-colors',
                    o.key === prefs.logoStyle
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-foreground/70 hover:text-foreground',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Réduire les animations */}
          <div className="mx-3 h-px bg-border" />
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={prefs.reduceMotion}
            onClick={() => prefs.setReduceMotion(!prefs.reduceMotion)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-foreground/5"
          >
            <span className="flex items-center gap-2.5">
              <Icon icon="hugeicons:pause-01" className="h-4 w-4 shrink-0 text-muted-foreground" />
              Réduire les animations
            </span>
            <span className={cn('relative h-4 w-7 rounded-full transition-colors', prefs.reduceMotion ? 'bg-primary' : 'bg-input')}>
              <span
                className={cn(
                  'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all',
                  prefs.reduceMotion ? 'left-[14px]' : 'left-0.5',
                )}
              />
            </span>
          </button>

          {/* Questions (quiz) */}
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={prefs.quizEnabled}
            onClick={prefs.toggleQuiz}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-foreground/5"
          >
            <span className="flex items-center gap-2.5">
              <Icon icon="hugeicons:help-circle" className="h-4 w-4 shrink-0 text-muted-foreground" />
              Questions
            </span>
            <span className={cn('relative h-4 w-7 rounded-full transition-colors', prefs.quizEnabled ? 'bg-primary' : 'bg-input')}>
              <span
                className={cn(
                  'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all',
                  prefs.quizEnabled ? 'left-[14px]' : 'left-0.5',
                )}
              />
            </span>
          </button>

          {/* Raccourcis clavier — desktop only */}
          {onOpenHelp && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenHelp();
              }}
              className="hidden w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-foreground/5 sm:flex"
            >
              <Icon icon="hugeicons:keyboard" className="h-4 w-4 shrink-0 text-muted-foreground" />
              Raccourcis clavier
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default AppearanceMenu;