'use client';

import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { HighlightDots } from '@/src/presentation/components/atoms/a-highlight-dots';
import { useChapterMarkers } from '@/src/presentation/hooks/use-chapter-markers';

interface ChapterGridProps {
  bookId: string;
  chapters: number;
  /** Chapitre en cours de lecture (surligné), s'il appartient à ce livre. */
  currentChapter?: number;
  onSelect: (chapter: number) => void;
}

/**
 * Grille des chapitres d'un livre, lisible d'un coup d'œil :
 *  - chiffre en couleur d'accent = audio disponible ;
 *  - points de couleur sous le chiffre = couleurs des versets surlignés (version active) ;
 *  - légende d'une ligne en bas, limitée à ce que le livre contient.
 * Partagée par le sélecteur du lecteur et le lanceur de l'accueil.
 */
export function ChapterGrid({ bookId, chapters, currentChapter, onSelect }: ChapterGridProps) {
  const { audioChaptersOf, chapterHighlights, bookHighlights } = useChapterMarkers();
  const audio = audioChaptersOf(bookId);
  const bookHl = bookHighlights(bookId);
  const hasAnyAudio = (audio?.size ?? 0) > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-5 gap-1">
          {Array.from({ length: chapters }, (_, i) => i + 1).map((n) => {
            const current = n === currentChapter;
            const hasAudio = audio?.has(n) ?? false;
            const hl = chapterHighlights(bookId, n);
            const label = [
              `Chapitre ${n}`,
              hasAudio && 'audio',
              hl && `${hl.count} verset${hl.count > 1 ? 's' : ''} surligné${hl.count > 1 ? 's' : ''}`,
            ]
              .filter(Boolean)
              .join(', ');
            return (
              <button
                key={n}
                aria-label={label}
                aria-current={current ? 'true' : undefined}
                onClick={() => onSelect(n)}
                className={cn(
                  'relative h-9 rounded-md text-xs font-medium transition-colors',
                  current
                    ? 'bg-primary text-primary-foreground'
                    : cn('hover:bg-primary/10', hasAudio ? 'text-primary' : 'text-foreground/80'),
                )}
              >
                {n}
                {/* Le chiffre du chapitre actif est sur fond d'accent : l'audio y est signalé par l'icône. */}
                {current && hasAudio && (
                  <Icon
                    icon="hugeicons:volume-high"
                    className="pointer-events-none absolute right-1 top-1 h-2.5 w-2.5 opacity-70"
                    aria-hidden="true"
                  />
                )}
                {hl && (
                  <HighlightDots
                    colors={hl.colors}
                    ringed={current}
                    className="pointer-events-none absolute inset-x-0 bottom-1 justify-center"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {(hasAnyAudio || bookHl) && (
        <div className="flex shrink-0 items-center gap-3 border-t border-foreground/10 px-3 py-1.5 text-[10px] text-muted-foreground">
          {hasAnyAudio && (
            <span className="flex items-center gap-1">
              <span className="font-medium text-primary">12</span> audio
            </span>
          )}
          {bookHl && (
            <span className="flex items-center gap-1">
              <HighlightDots colors={bookHl.colors} max={2} /> surlignés
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default ChapterGrid;
