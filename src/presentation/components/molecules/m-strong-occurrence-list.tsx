'use client';

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import type { StrongOccurrence, StrongToken } from '@/src/domain/entities';
import { occId } from '@/src/presentation/hooks/use-concordance-pages';

export interface StrongOccurrenceListProps {
  /** Occurrences paginées (texte déjà réaffiché dans la version active par le parent). */
  items: StrongOccurrence[];
  /** Numéro Strong à colorer dans le texte des versets. */
  code: string;
  /** Langue d'origine (couleur d'accent + repli pour la coloration). */
  lang?: string;
  /** Tokens Strong par occurrence (coloration du mot) — best-effort, gérés par le parent. */
  tokensById?: Map<string, StrongToken[]>;
  /** Vrai s'il reste des pages à charger. */
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  /** Sélectionne une occurrence (navigation lecture). */
  onSelect?: (occ: StrongOccurrence) => void;
}

/**
 * Liste d'occurrences d'un numéro Strong, groupées par livre (en-têtes collantes), avec coloration
 * du token correspondant et pagination « Charger plus ». Molécule présentationnelle partagée entre
 * le tiroir concordance (`m-strong-concordance`) et la page détail (`t-strong-detail`).
 *
 * Cf. spec 29 — détail Strong (extraction de la liste depuis le tiroir).
 */
export function StrongOccurrenceList({
  items,
  code,
  lang,
  tokensById,
  hasMore,
  loadingMore,
  onLoadMore,
  onSelect,
}: StrongOccurrenceListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Réinitialise la ligne active quand le code change.
  useEffect(() => {
    setActiveId(null);
  }, [code]);

  // Groupe les occurrences par livre, dans l'ordre d'arrivée (l'API trie par livre/chap/verset).
  const groups = useMemo(() => {
    const out: { bookId: string; bookName: string; items: StrongOccurrence[] }[] = [];
    for (const it of items) {
      const last = out[out.length - 1];
      if (last && last.bookId === it.bookId) last.items.push(it);
      else out.push({ bookId: it.bookId, bookName: it.reference.replace(/\s\d+:\d+$/, ''), items: [it] });
    }
    return out;
  }, [items]);

  // Rend le texte du verset en colorant les tokens du même numéro Strong (si tokens dispo).
  const renderText = (occ: StrongOccurrence) => {
    const toks = tokensById?.get(occId(occ));
    if (!toks) return occ.text;
    return toks.map((tok, i) => {
      if (tok.strong !== code) return <span key={i}>{tok.text}</span>;
      const hebrew = (tok.lang ?? lang) === 'hebrew';
      return (
        <span
          key={i}
          className={cn('font-semibold', hebrew ? 'text-primary' : 'text-purple-600 dark:text-purple-300')}
        >
          {tok.text}
        </span>
      );
    });
  };

  if (items.length === 0) return null;

  return (
    <div role="list" className="space-y-5">
      {groups.map((g) => (
        <div key={g.bookId}>
          <div className="sticky top-0 z-10 bg-background/95 px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary backdrop-blur-sm">
            {g.bookName}
          </div>
          <div className="mt-1 space-y-0.5">
            {g.items.map((occ) => {
              const id = occId(occ);
              const Row = onSelect ? 'button' : 'div';
              return (
                <Row
                  key={id}
                  {...(onSelect
                    ? {
                        type: 'button' as const,
                        role: 'listitem',
                        onClick: () => {
                          setActiveId(id);
                          onSelect(occ);
                        },
                      }
                    : { role: 'listitem' })}
                  className={cn(
                    'flex w-full gap-2.5 rounded-lg px-2 py-2 text-left transition-colors',
                    onSelect && 'hover:bg-accent',
                    activeId === id && 'bg-accent',
                  )}
                >
                  <span className="mt-0.5 shrink-0 text-[12px] font-bold text-primary">
                    {occ.chapter}:{occ.verse}
                  </span>
                  <span className="line-clamp-2 flex-1 font-reader text-[13px] leading-snug text-foreground/85">
                    {renderText(occ)}
                  </span>
                </Row>
              );
            })}
          </div>
        </div>
      ))}

      {hasMore && onLoadMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          className="mx-auto my-2 flex items-center gap-2 rounded-full border border-input px-4 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-60"
        >
          {loadingMore ? (
            <Icon icon="hugeicons:loading-03" className="h-4 w-4 animate-spin" />
          ) : (
            <Icon icon="hugeicons:arrow-down-01" className="h-4 w-4" />
          )}
          Charger plus
        </button>
      )}
    </div>
  );
}

export default StrongOccurrenceList;