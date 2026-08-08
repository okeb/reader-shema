'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { Icon } from '@iconify/react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { type Theme, THEMES } from '@/src/shared/constants/theme';

const THEME_ICON: Record<Theme, string> = {
  light: 'hugeicons:sun-03',
  dark: 'hugeicons:moon-02',
  system: 'hugeicons:computer',
};

/**
 * Menu déroulant de thème (Clair / Sombre / Système) propulsé par next-themes.
 * Le déclencheur affiche l'icône du thème courant ; le clic ouvre un popover avec les trois
 * choix, le choix actif coché. Ferme au clic dehors et à Échap.
 *
 * Version simplifiée pour le scaffold Phase 1 (la variante glass complète avec `GLASS_PILL`
 * sera reconciliée quand `a-floating-button` sera porté en Phase 3).
 */
export function ThemeMenu({ className }: { className?: string }) {
  const t = useTranslations('theme');
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

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

  const current = (theme as Theme) ?? 'system';

  return (
    <div ref={ref} className={cn('relative inline-flex items-center', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={t('label')}
        aria-label={`${t('label')} (${t(current)})`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
      >
        {mounted && <Icon icon={THEME_ICON[current]} className="h-[18px] w-[18px]" />}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('label')}
          className="absolute right-0 top-full mt-2 w-44 origin-top-right animate-fade-in-up overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
        >
          <p className="px-3 pb-1 pt-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
            {t('appearance')}
          </p>
          {THEMES.map((tmode) => {
            const active = tmode === current;
            return (
              <button
                key={tmode}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setTheme(tmode);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                  active
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-foreground/85 hover:bg-foreground/5 hover:text-foreground',
                )}
              >
                <Icon icon={THEME_ICON[tmode]} className="h-4 w-4 shrink-0" />
                {t(tmode)}
                {active && <Icon icon="hugeicons:tick-01" className="ml-auto h-4 w-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ThemeMenu;