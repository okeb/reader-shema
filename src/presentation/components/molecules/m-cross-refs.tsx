'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/src/presentation/components/atoms/a-skeleton';
import { crossRefSlug, formatCrossRef, type CrossRef } from '@/src/presentation/lib/cross-refs-format';
import { runQuery } from '@/src/presentation/hooks/use-cqrs';
import { createGetReferencesQuery } from '@/src/application/factories/bible';
import type { GetReferencesResult } from '@/src/domain/use-cases/bible';

export interface CrossRefsProps {
  open: boolean;
  /** Référence du verset source, ex. « Jean 3:16 ». */
  reference: string;
  /** Renvois à afficher (déjà ordonnés). */
  refs: CrossRef[];
  /** Version active (extraits affichés dans cette version). */
  version: string;
  /** Navigue vers un renvoi (le pop reste ouvert pour enchaîner sur desktop). */
  onNavigate: (ref: CrossRef) => void;
  onClose: () => void;
}

type State = 'loading' | 'loaded' | 'error';

/**
 * Renvois d'un verset (cross-references) : bottom sheet sur mobile, popover centré sur desktop.
 * Charge les extraits à la demande (`getReferences` via CQRS, version active), liste navigable.
 *
 * Porté de l'ancien `components/molecules/m-cross-refs.tsx`. Adapté au `CrossRef` du domaine
 * (`verseStart`/`verseEnd` au lieu de `vStart`/`vEnd`) + `getReferences` routé par CQRS.
 */
export function CrossRefs({ open, reference, refs, version, onNavigate, onClose }: CrossRefsProps) {
  const [state, setState] = useState<State>('loading');
  // Extrait par slug "bookId/chap/vStart[-vEnd]".
  const [excerpts, setExcerpts] = useState<Map<string, string>>(new Map());

  // Charge les extraits à chaque ouverture / changement de verset source.
  useEffect(() => {
    if (!open || refs.length === 0) return;
    let cancelled = false;
    setState('loading');
    setExcerpts(new Map());
    void (async () => {
      try {
        const cards = await runQuery<GetReferencesResult>(
          createGetReferencesQuery(version, refs.map(crossRefSlug)),
        );
        if (cancelled) return;
        const map = new Map<string, string>();
        for (const c of cards) {
          if (!c.bookId || c.chapter == null || c.verses.length === 0) continue;
          const v0 = c.verses[0].number;
          const key = `${c.bookId}/${c.chapter}/${v0}`;
          map.set(key, c.verses.map((v) => v.text).join(' '));
        }
        setExcerpts(map);
        setState('loaded');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, reference, version, refs]);

  // Échap = ferme.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 px-0 backdrop-blur-sm sm:items-center sm:px-4"
      onMouseDown={onClose}
    >
      <div
        className={cn(
          'flex max-h-[75vh] w-full max-w-md flex-col overflow-hidden bg-popover shadow-2xl',
          'rounded-t-2xl sm:rounded-2xl',
          'animate-fade-in-up',
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-input/60 px-4 py-3.5">
          <Icon icon="hugeicons:link-02" className="h-5 w-5 shrink-0 text-primary" />
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">Renvois · {reference}</h2>
          <button
            type="button"
            onClick={onClose}
            title="Fermer"
            aria-label="Fermer les renvois"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent"
          >
            <Icon icon="ph:x" className="h-4 w-4" />
          </button>
        </div>

        {state === 'error' ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Renvois indisponibles.</p>
        ) : (
          <ul className="overflow-y-auto py-1">
            {refs.map((ref) => {
              const slug = crossRefSlug(ref);
              const key = `${ref.bookId}/${ref.chapter}/${ref.verseStart}`;
              const excerpt = excerpts.get(key);
              return (
                <li key={slug}>
                  <button
                    type="button"
                    onClick={() => onNavigate(ref)}
                    className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-accent focus:bg-accent focus:outline-none"
                  >
                    <span className="text-[12px] font-semibold uppercase tracking-wide text-primary">
                      {formatCrossRef(ref)}
                    </span>
                    {state === 'loading' ? (
                      <Skeleton className="h-3 w-2/3 rounded" />
                    ) : excerpt ? (
                      <span className="line-clamp-2 text-[13px] leading-snug text-foreground/80">
                        {excerpt}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default CrossRefs;