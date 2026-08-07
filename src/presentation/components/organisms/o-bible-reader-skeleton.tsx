'use client';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/src/presentation/components/atoms/a-skeleton';
import {
  lineHeightValue,
  type ColumnCount,
  type LineHeightKey,
  type MeasureKey,
  type ReadingLayout,
} from '@/src/shared/constants/reader-preferences';
import { COLUMN_WRAP, contentMaxClass } from '@/src/presentation/lib/reader-layout';

interface OBibleReaderSkeletonProps {
  columns: ColumnCount;
  measure: MeasureKey;
  fontSize: number;
  lineHeight: LineHeightKey;
  layout?: ReadingLayout;
}

/** Largeurs de lignes pour un bloc de verset (varient pour un rendu naturel). */
const LINE_WIDTHS = ['w-full', 'w-11/12', 'w-10/12', 'w-2/3'] as const;

/**
 * Skeleton de chargement du lecteur. Reproduit la mise en page réelle du contenu
 * (`o-reader-content.tsx`) : même conteneur, même taille/interligne, police reader, et stubs de
 * numéro de verset alignés à droite. Porté de l'ancien `components/organisms/o-bible-reader-skeleton.tsx`.
 */
export function OBibleReaderSkeleton({
  columns,
  measure,
  fontSize,
  lineHeight,
  layout = 'verses',
}: OBibleReaderSkeletonProps) {
  const wrapCls = COLUMN_WRAP[columns];
  const maxWCls = contentMaxClass(columns, measure);
  const textSizeStyle = { fontSize: `${fontSize}px`, lineHeight: lineHeightValue(lineHeight) };
  const showNumbers = layout !== 'plain';

  return (
    <article className="mt-24 px-4 pb-28 pt-6">
      <div className={cn('mx-auto', maxWCls)}>
        {/* Titre de section (micro-label façon o-reader-content). */}
        <div className="mb-20 mt-0 animate-fade-in-up">
          <div className="flex items-center justify-start gap-x-2">
            <Skeleton className="h-6 w-32 rounded-md bg-muted" />
            <Skeleton className="h-6 w-4 rounded-md bg-muted" />
            <Skeleton className="h-6 w-12 rounded-md bg-muted" />
            <Skeleton className="h-6 w-4 rounded-md bg-muted" />
          </div>
          <div className="mt-4 flex items-center justify-start gap-x-1">
            <Skeleton className="h-3 w-20 rounded-md bg-muted" />
            <Skeleton className="h-3 w-6 rounded-md bg-muted" />
          </div>
        </div>
        <div className="mb-7 mt-0 flex animate-fade-in-up items-center justify-start gap-x-2">
          <Skeleton className="h-3 w-16 rounded-md bg-muted" />
          <Skeleton className="h-3 w-4 rounded-md bg-muted" />
        </div>

        <div className={cn('gap-10', wrapCls)}>
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="mb-3 animate-fade-in-up break-inside-avoid"
              style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'backwards' }}
            >
              {layout === 'flowing' ? (
                <div className="font-reader antialiased" style={textSizeStyle}>
                  {LINE_WIDTHS.map((w, i) => (
                    <Skeleton key={i} className={cn('mb-5 block h-3.5 rounded-md', w)} />
                  ))}
                </div>
              ) : (
                <div className="flex gap-3 py-0.5">
                  {showNumbers && (
                    <Skeleton className="mt-[6px] h-3.5 w-[18px] shrink-0 self-start rounded-md bg-muted" />
                  )}
                  <div className="flex-1 font-reader antialiased" style={textSizeStyle}>
                    {LINE_WIDTHS.map((w, i) => (
                      <Skeleton key={i} className={cn('mb-1.5 block h-3.5 rounded-md', w)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export default OBibleReaderSkeleton;