'use client';

import { useEffect } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/routing';
import { GLASS_PILL } from '@/src/presentation/components/atoms/a-floating-button';
import { getBookById } from '@/src/shared/constants/bible-books';
import type { Doodle, DoodleVerseRef } from '@/src/shared/constants/doodles';

export interface DoodleCardProps {
  doodle: Doodle;
  /** Tactile : libellé « Accueil » toujours visible (pas de survol). */
  coarse?: boolean;
  onClose: () => void;
}

/** Référence affichable d'un verset lié (ex. « Exode 12:1-14 »). */
function formatRef(ref: DoodleVerseRef): string {
  const name = getBookById(ref.bookId)?.name ?? ref.bookId;
  return `${name} ${ref.chapter}${ref.v ? `:${ref.v}` : ''}`;
}

/**
 * Dropdown d'explication d'un doodle (spec 18 §4.6 — remplace la carte v1). Ancré **sous** l'icône
 * d'info (`top-full left-0` + `max-w` clampé — garde anti-débordement). Contenu piloté par les
 * données : bouton « Accueil » (libellé déployé au survol, pattern prev/next du sélecteur de
 * chapitre), titre, description, versets liés (`verses`, repli `verseRef`), lien externe (`source`).
 * Fermeture par ✕ et Échap (interne) ; le clic extérieur est géré par le parent.
 */
export function DoodleCard({ doodle, coarse = false, onClose }: DoodleCardProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const verses = doodle.verses?.length
    ? doodle.verses
    : doodle.verseRef
      ? [{ ref: doodle.verseRef }]
      : [];

  return (
    <div
      role="dialog"
      aria-label={doodle.label}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'absolute top-full left-0 z-50 mt-2 flex w-72 max-w-[calc(100vw-1rem)] flex-col gap-1.5 rounded-xl p-3 text-left shadow-lg',
        GLASS_PILL,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/accueil"
          onClick={onClose}
          className="group -ml-1 flex h-7 items-center overflow-hidden rounded-full px-1.5 text-primary transition-all duration-300 hover:bg-primary/10"
        >
          <Icon icon="hugeicons:home-01" className="h-4 w-4 shrink-0" />
          <span
            className={cn(
              'overflow-hidden whitespace-nowrap text-[11px] font-medium transition-all duration-300',
              coarse
                ? 'ml-1 max-w-[64px] opacity-100'
                : 'max-w-0 opacity-0 group-hover:ml-1 group-hover:max-w-[64px] group-hover:opacity-100',
            )}
          >
            Accueil
          </span>
        </Link>
        <button
          type="button"
          title="Fermer"
          onClick={onClose}
          className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Icon icon="hugeicons:cancel-01" className="h-4 w-4" />
        </button>
      </div>

      <p className="text-sm font-semibold text-foreground">{doodle.label}</p>

      {doodle.description && (
        <p className="text-[13px] leading-relaxed text-muted-foreground">{doodle.description}</p>
      )}

      {verses.length > 0 && (
        <div className="mt-1 flex flex-col gap-0.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
            Versets liés
          </p>
          {verses.map(({ ref, label }) => (
            <Link
              key={`${ref.bookId}-${ref.chapter}-${ref.v ?? ''}`}
              href={{
                pathname: '/read',
                query: { livre: ref.bookId, chap: ref.chapter, ...(ref.v ? { v: ref.v } : {}) },
              }}
              onClick={onClose}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-primary transition-colors hover:opacity-80"
            >
              {label ?? formatRef(ref)}
              <Icon icon="hugeicons:arrow-right-01" className="h-4 w-4" />
            </Link>
          ))}
        </div>
      )}

      {doodle.source && (
        <a
          href={doodle.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-[12px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
        >
          {doodle.source.label || 'En savoir plus'}
          <Icon icon="hugeicons:arrow-up-right-01" className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

export default DoodleCard;
