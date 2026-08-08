'use client';

import { useMemo, type CSSProperties } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import type { ChapterVerse } from '@/src/domain/entities';
import type { BibleVersion } from '@/src/shared/constants/bible-versions';
import { useChapter } from '@/src/presentation/hooks/use-chapter';
import { VersionCredits } from '@/src/presentation/components/molecules/m-version-credits';
import { Skeleton } from '@/src/presentation/components/atoms/a-skeleton';

export interface OParallelReaderProps {
  bookId: string;
  chapter: number;
  /** Titre affiché en en-tête (nom du livre). */
  title: string;
  primary: BibleVersion;
  secondary: BibleVersion;
  /** Versets de la version primaire (déjà chargés par le lecteur — évite un re-fetch). */
  primaryVerses: ChapterVerse[];
  /** Taille du texte (px) et interligne résolu, partagés avec le mode mono. */
  fontSize: number;
  lineHeight: number;
}

/** Ligne de la vue parallèle : titre de section (pleine largeur) ou paire de versets alignés. */
type Row =
  | { kind: 'title'; key: string; text: string }
  | { kind: 'pair'; key: string; number: number; left?: ChapterVerse; right?: ChapterVerse };

/** Construit les lignes par union triée des numéros de verset des deux versions. */
function buildRows(left: ChapterVerse[], right: ChapterVerse[]): Row[] {
  const leftByNum = new Map(left.map((v) => [v.number, v]));
  const rightByNum = new Map(right.map((v) => [v.number, v]));
  const numbers = Array.from(new Set([...left.map((v) => v.number), ...right.map((v) => v.number)])).sort(
    (a, b) => a - b,
  );

  const rows: Row[] = [];
  for (const n of numbers) {
    const l = leftByNum.get(n);
    const r = rightByNum.get(n);
    // Titre de section : issu de la version primaire, sinon de la secondaire.
    const titre = l?.titre ?? r?.titre;
    if (titre) rows.push({ kind: 'title', key: `t-${n}`, text: titre });
    rows.push({ kind: 'pair', key: `p-${n}`, number: n, left: l, right: r });
  }
  return rows;
}

/**
 * Vue parallèle : deux versions d'un chapitre côte à côte, alignées par numéro de verset.
 * Le défilement est synchronisé **structurellement** — un conteneur de défilement unique (celui du
 * lecteur) contient une grille 2 colonnes, chaque ligne = une paire de versets ; la hauteur de ligne
 * suit la cellule la plus haute, garantissant l'alignement sans synchro JS. Lecture seule.
 *
 * Porté de l'ancien `components/organisms/o-parallel-reader.tsx` — la version secondaire est chargée
 * via le hook CQRS `useChapter` (cache React Query 1h, partagé avec le lecteur mono).
 */
export function OParallelReader({
  bookId,
  chapter,
  title,
  primary,
  secondary,
  primaryVerses,
  fontSize,
  lineHeight,
}: OParallelReaderProps) {
  const q = useChapter(secondary.id, bookId, chapter);
  const secondaryVerses = q.data ?? [];
  const loading = q.isLoading;
  const error = q.isError;

  const rows = useMemo(() => buildRows(primaryVerses, secondaryVerses), [primaryVerses, secondaryVerses]);

  const textStyle: CSSProperties = { fontSize: `${fontSize}px`, lineHeight };

  return (
    <article className="mt-24 px-4 pb-28 pt-6">
      <div className="mx-auto max-w-5xl">
        <header className="pb-10">
          <h2 className="animate-fade-in-up font-book text-3xl font-bold tracking-tight text-bold dark:text-white">
            {title}
          </h2>
          <p className="mt-0.5 text-lg text-muted-foreground">Chapitre {chapter}</p>
        </header>

        {/* En-têtes de colonnes (desktop) — libellés de version. */}
        <div className="hidden grid-cols-2 gap-x-8 border-b border-border pb-2 md:grid">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {primary.label}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {secondary.label}
          </span>
        </div>

        {error && secondaryVerses.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Icon icon="hugeicons:alert-02" className="mx-auto mb-3 h-7 w-7 opacity-50" />
            <p>Impossible de charger la version « {secondary.label} ».</p>
          </div>
        ) : loading && secondaryVerses.length === 0 ? (
          <ParallelSkeleton />
        ) : (
          <div className="mt-2">
            {rows.map((row) =>
              row.kind === 'title' ? (
                <h3
                  key={row.key}
                  className="mb-3 mt-8 break-after-avoid text-[12px] font-semibold uppercase tracking-widest text-black/50 dark:text-white/50"
                >
                  {row.text}
                </h3>
              ) : (
                <div
                  key={row.key}
                  className="group grid grid-cols-1 gap-x-8 rounded-md px-2 py-1 transition-colors hover:bg-primary/[0.06] md:grid-cols-2"
                >
                  <Cell verse={row.left} number={row.number} tag={primary.shortLabel} textStyle={textStyle} />
                  <Cell
                    verse={row.right}
                    number={row.number}
                    tag={secondary.shortLabel}
                    textStyle={textStyle}
                    stackedBorder
                  />
                </div>
              ),
            )}
          </div>
        )}

        <VersionCredits versions={[primary, secondary]} />
      </div>
    </article>
  );
}

/** Une cellule (un verset d'une version). `stackedBorder` sépare la 2ᵉ version sur mobile (empilé). */
function Cell({
  verse,
  number,
  tag,
  textStyle,
  stackedBorder,
}: {
  verse?: ChapterVerse;
  number: number;
  tag: string;
  textStyle: CSSProperties;
  stackedBorder?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex gap-3',
        stackedBorder && 'mt-2 border-t border-border/50 pt-2 md:mt-0 md:border-t-0 md:pt-0',
      )}
    >
      <span className="mt-[5px] min-w-[18px] shrink-0 select-none text-right font-reader text-[12px] font-bold text-muted-foreground/55">
        {number}
      </span>
      <div className="flex-1">
        {/* Tag de version visible seulement sur mobile (les en-têtes de colonnes prennent le relais
            sur desktop). */}
        <span className="mb-0.5 inline-block rounded bg-muted px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:hidden">
          {tag}
        </span>
        <p
          style={textStyle}
          className={cn(
            'select-text font-reader antialiased',
            verse ? 'text-foreground' : 'italic text-muted-foreground/50',
          )}
        >
          {verse ? verse.text : 'Verset absent dans cette version.'}
        </p>
      </div>
    </div>
  );
}

function ParallelSkeleton() {
  return (
    <div className="mt-4 space-y-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-4/5 rounded" />
          </div>
          <div className="mt-2 space-y-2 md:mt-0">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-3/4 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default OParallelReader;