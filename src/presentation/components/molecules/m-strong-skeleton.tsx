'use client';

import { Skeleton } from '@/src/presentation/components/atoms/a-skeleton';
import { cn } from '@/lib/utils';

/** Largeurs des bulles d'un verset (varient pour un rendu naturel). */
const BUBBLE_WIDTHS = ['w-8', 'w-12', 'w-10', 'w-14', 'w-7', 'w-11', 'w-12', 'w-10', 'w-7', 'w-8', 'w-12', 'w-10', 'w-14', 'w-7', 'w-11', 'w-12', 'w-10', 'w-7'] as const;

/**
 * Skeleton du panneau Strong : mime un `<StrongVerse />` (micro-label de référence + verset
 * tokenisé en bulles `rounded-2xl`). Rendu dans le corps du panneau pendant `getStrongsForVerses`.
 */
function StrongVerseSkeleton() {
  return (
    <section className="border-t border-input/50 px-4 py-7">
      {/* Micro-label de référence (façon m-strong-verse). */}
      <div className="mb-4">
        <Skeleton className="h-3 w-16 rounded-md bg-primary/25" />
      </div>
      {/* Verset tokenisé : bulles cliquables reproduites en `rounded-2xl`. */}
      <div className="font-reader text-[15px] leading-loose">
        <div className="flex flex-wrap items-start gap-y-1">
          {BUBBLE_WIDTHS.map((w, i) => (
            <Skeleton
              key={i}
              className={cn('mx-0.5 my-0.5 inline-block h-5 rounded-2xl bg-muted', w)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Skeleton du panneau Strong : empile N versets-skeleton. */
export function StrongPanelSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: rows }).map((_, i) => (
        <StrongVerseSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton de la concordance : mime une rangée d'occurrence (numéro `chap:verset` + extrait
 * `font-reader`) et un en-tête de groupe livre. Rendu pendant `getStrongOccurrences`.
 */
export function ConcordanceSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="list" className="space-y-5">
      {/* En-tête de groupe livre (sticky dans le vrai contenu). */}
      <div className="px-2 py-1">
        <Skeleton className="h-3 w-24 rounded-md bg-primary/25" />
      </div>
      <div className="space-y-0.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} role="listitem" className="flex gap-2.5 rounded-lg px-2 py-2">
            {/* Numéro chap:verset (teinte primary du vrai contenu). */}
            <Skeleton className="mt-0.5 h-3.5 w-8 shrink-0 rounded-md bg-primary/25" />
            {/* Extrait du verset (font-reader, 2 lignes). */}
            <div className="flex-1 font-reader text-[13px] leading-snug">
              <Skeleton className="mb-1 block h-3 w-full rounded-md" />
              <Skeleton className="block h-3 w-2/3 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StrongPanelSkeleton;