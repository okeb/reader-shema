'use client';

import { useEffect } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/routing';
import { GLASS_PILL } from '@/src/presentation/components/atoms/a-floating-button';
import type { Doodle } from '@/src/shared/constants/doodles';

export interface DoodleCardProps {
  doodle: Doodle;
  onClose: () => void;
}

/**
 * Carte d'explication d'un doodle (spec 18 §5.2). Popover ancré **sous** le logo-doodle (`top-full
 * left-0` + `max-w` clampé — garde anti-débordement). Fermeture par Échap (interne) ; le clic
 * extérieur est géré par le parent (topbar).
 *
 * « Lire en contexte → » mène à la route `/read` localisée avec les paramètres du verset lié.
 *
 * Porté de l'ancien `components/molecules/m-doodle-card.tsx`.
 */
export function DoodleCard({ doodle, onClose }: DoodleCardProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ref = doodle.verseRef;
  const contextQuery: Record<string, string | number> | null = ref
    ? { livre: ref.bookId, chap: ref.chapter, ...(ref.v ? { v: ref.v } : {}) }
    : null;

  return (
    <div
      role="dialog"
      aria-label={doodle.label}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'absolute top-full left-0 z-50 mt-2 flex w-72 max-w-[calc(100vw-1rem)] flex-col gap-1.5 rounded-xl p-3 shadow-lg',
        GLASS_PILL,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{doodle.label}</p>
        <button
          type="button"
          title="Fermer"
          onClick={onClose}
          className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Icon icon="hugeicons:cancel-01" className="h-4 w-4" />
        </button>
      </div>

      {doodle.description && (
        <p className="text-[13px] leading-relaxed text-muted-foreground">{doodle.description}</p>
      )}

      {contextQuery && (
        <Link
          href={{ pathname: '/read', query: contextQuery }}
          className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-primary transition-colors hover:opacity-80"
        >
          Lire en contexte
          <Icon icon="hugeicons:arrow-right-01" className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export default DoodleCard;