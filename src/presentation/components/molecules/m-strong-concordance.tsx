'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { ConcordanceSkeleton } from '@/src/presentation/components/molecules/m-strong-skeleton';
import { runQuery } from '@/src/presentation/hooks/use-cqrs';
import {
  createGetStrongOccurrencesQuery,
  createGetVersesTextQuery,
  createGetStrongsForVersesQuery,
} from '@/src/application/factories/bible';
import type {
  GetStrongOccurrencesResult,
  GetVersesTextResult,
  GetStrongsForVersesResult,
} from '@/src/domain/use-cases/bible';
import type { StrongLexicon, StrongOccurrence, StrongToken } from '@/src/domain/entities';

const PAGE_SIZE = 20;

/** Masque du fondu de bas de panneau (le texte s'estompe sous le blur). */
const FADE_MASK = 'linear-gradient(to top, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 100%)';

export interface StrongConcordanceProps {
  open: boolean;
  /** Version active : le texte des occurrences y est réaffiché (l'index Strong reste `bym`). */
  version: string;
  /** Numéro Strong (ex. "G2316"). */
  code: string;
  /** Mot affiché en en-tête (lemme ou translittération). */
  title: string;
  /** Langue d'origine (couleur d'accent). */
  lang?: string;
  /** Navigation vers une occurrence (lecture centrale). */
  onNavigate: (occ: StrongOccurrence) => void;
  /** Retour au panneau Strong (définition). */
  onBack: () => void;
  onClose: () => void;
}

type Status = 'loading' | 'loaded' | 'error';

/**
 * Carte lexique d'un code Strong : lemme (script d'origine), translittération, phonétique,
 * langue, type grammatical, origine et définition. Rendue en tête de la concordance, tout provient
 * du fetch `/bym/strong/:code` (page détail auto-suffisante : un seul appel par code).
 */
function LexiconDetail({
  lexicon,
  code,
  accent,
}: {
  lexicon: StrongLexicon;
  code: string;
  accent: string;
}) {
  const hebrew = lexicon.lang === 'hebrew';
  return (
    <section className="mb-5 rounded-[12px] bg-foreground/[2%] p-3 text-[13px] leading-relaxed">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {lexicon.lemma && (
          <span className={cn('font-serif text-[22px] font-semibold leading-none', accent)}>{lexicon.lemma}</span>
        )}
        {lexicon.translit && (
          <span className="text-[14px] font-semibold text-foreground/80">{lexicon.translit}</span>
        )}
        {lexicon.phonetique && (
          <span className="text-[12px] italic text-muted-foreground">{lexicon.phonetique}</span>
        )}
        <span
          className={cn(
            'rounded px-1 py-0 text-[10px] font-bold',
            hebrew ? 'bg-primary/15 text-primary' : 'bg-purple-500/15 text-purple-500',
          )}
        >
          {code.replace('H', '').replace('G', '')}
        </span>
      </div>

      {(lexicon.type || lexicon.origine) && (
        <div className="mb-2 flex flex-col gap-0.5 text-[12px] text-muted-foreground">
          {lexicon.type && (
            <span>
              <span className="font-semibold text-foreground/70">Type : </span>
              {lexicon.type}
            </span>
          )}
          {lexicon.origine && (
            <span>
              <span className="font-semibold text-foreground/70">Origine : </span>
              {lexicon.origine}
            </span>
          )}
        </div>
      )}

      {lexicon.definition && (
        <p className="whitespace-pre-line text-foreground/85">{lexicon.definition}</p>
      )}
    </section>
  );
}

/** Id stable d'une occurrence (pour le surlignage de la ligne active). */
const occId = (o: StrongOccurrence) => `${o.bookId}:${o.chapter}:${o.verse}`;

/**
 * Panneau concordance : toutes les occurrences d'un numéro Strong, groupées par livre, paginées.
 * Réutilise la coque du panneau Strong (slide-in droit, voile mobile), affiché par-dessus (z-40).
 *
 * Porté de l'ancien `components/molecules/m-strong-concordance.tsx`. Les appels API passent par
 * CQRS (`runQuery` + fabriques) ; les résultats `Record<string, T>` remplacent les anciennes Maps.
 */
export function StrongConcordance({
  open,
  version,
  code,
  title,
  lang,
  onNavigate,
  onBack,
  onClose,
}: StrongConcordanceProps) {
  const [items, setItems] = useState<StrongOccurrence[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<Status>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Lexique du code, issu du même fetch que les occurrences (page détail auto-suffisante : un seul
  // appel `/bym/strong/:code` porte le lemme, la langue, la phonétique, l'origine, le type et la
  // définition — pas de second fetch vers `/strong/:code`).
  const [lexicon, setLexicon] = useState<StrongLexicon | null>(null);
  // Tokens Strong par occurrence (pour colorer le mot) — best-effort, récupérés en arrière-plan.
  const [tokensById, setTokensById] = useState<Map<string, StrongToken[]>>(new Map());

  const loadPage = useCallback(
    async (next: number) => {
      try {
        const res = await runQuery<GetStrongOccurrencesResult>(
          createGetStrongOccurrencesQuery(code, next, PAGE_SIZE),
        );
        setTotal(res.total);
        if (next === 1) setLexicon(res.lexicon ?? null);

        // L'index de concordance n'existe que sous `bym` → `res.items` porte le texte BYM. En LSG (ou
        // toute version ≠ bym), on réaffiche le texte des mêmes versets dans la version active (la
        // numérotation est commune). Les emplacements (livre/chap/verset) restent ceux de l'index.
        const fetchItems = res.items.map((o) => ({
          id: occId(o),
          bookId: o.bookId,
          chapter: o.chapter,
          verse: o.verse,
        }));
        let pageItems = res.items;
        if (version !== 'bym') {
          const textMap = await runQuery<GetVersesTextResult>(
            createGetVersesTextQuery(version, fetchItems),
          );
          pageItems = res.items.map((o) => ({ ...o, text: textMap[occId(o)] ?? o.text }));
        }
        setItems((prev) => (next === 1 ? pageItems : [...prev, ...pageItems]));
        setPage(next);
        setStatus('loaded');

        // Récupère les tokens de la page pour colorer le mot Strong (sans bloquer l'affichage),
        // dans la version active pour rester cohérent avec le texte affiché.
        runQuery<GetStrongsForVersesResult>(createGetStrongsForVersesQuery(version, fetchItems))
          .then((map) => {
            if (Object.keys(map).length === 0) return;
            setTokensById((prev) => {
              const merged = new Map(prev);
              for (const [k, v] of Object.entries(map)) merged.set(k, v);
              return merged;
            });
          })
          .catch(() => {});
      } catch {
        setStatus('error');
      }
    },
    [code, version],
  );

  // (Re)charge la première page à l'ouverture / au changement de code.
  useEffect(() => {
    if (!open) return;
    setItems([]);
    setTotal(0);
    setPage(0);
    setActiveId(null);
    setTokensById(new Map());
    setLexicon(null);
    setStatus('loading');
    void loadPage(1);
  }, [open, code, loadPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    await loadPage(page + 1);
    setLoadingMore(false);
  };

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
    const toks = tokensById.get(occId(occ));
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

  if (!open) return null;

  const hasMore = items.length < total;
  // Langue et titre résolus depuis le lexique du fetch (auto-suffisant), avec repli sur les props
  // (token d'origine) le temps que la première page arrive.
  const detailLang = lexicon?.lang ?? lang;
  const accent = detailLang === 'hebrew' ? 'text-primary' : 'text-purple-500';
  const displayTitle = lexicon?.lemma || lexicon?.translit || title;

  return (
    <>
      {/* Voile mobile — au-dessus de la topbar (z-40) pour la griser. */}
      <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onClose} aria-hidden />

      <aside className="animate-slide-in-right fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col bg-background md:top-20 md:z-40 md:w-[440px] md:max-w-[440px]">
        {/* En-tête : retour + mot + total — padding haut renforcé sur mobile (plein écran). */}
        <div className="flex items-center justify-between gap-2 px-6 pt-6 pb-3 md:py-3">
          <button
            type="button"
            onClick={onBack}
            title="Retour à la définition"
            className="flex items-center gap-1 rounded-full py-1 pl-1 pr-2 text-[13px] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <Icon icon="hugeicons:arrow-left-01" className="h-4 w-4" />
            Retour
          </button>
          <div className="flex min-w-0 flex-1 items-baseline justify-end gap-2">
            <span className={cn('truncate font-serif text-[15px] font-semibold', accent)}>{displayTitle}</span>
            <span className="shrink-0 text-[11px] text-muted-foreground" aria-live="polite">
              {status === 'loaded' ? `${total} occurrence${total > 1 ? 's' : ''}` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Fermer"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <Icon icon="hugeicons:cancel-01" className="h-4 w-4" />
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-2">
          {status === 'loading' ? (
            <ConcordanceSkeleton />
          ) : status === 'error' ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Concordance indisponible pour le moment.
            </p>
          ) : (
            <div className="space-y-5">
              {/* Lexique du code : lemme, phonétique, origine, type, définition —
                  tout issu du même fetch que les occurrences (page détail auto-suffisante). */}
              {lexicon && <LexiconDetail lexicon={lexicon} code={code} accent={accent} />}

              {items.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Aucune occurrence trouvée.</p>
              ) : (
                <div role="list" className="space-y-5">
              {groups.map((g) => (
                <div key={g.bookId}>
                  <div className="sticky top-0 z-10 bg-background/95 px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary backdrop-blur-sm">
                    {g.bookName}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {g.items.map((occ) => {
                      const id = occId(occ);
                      return (
                        <button
                          key={id}
                          type="button"
                          role="listitem"
                          onClick={() => {
                            setActiveId(id);
                            onNavigate(occ);
                          }}
                          className={cn(
                            'flex w-full gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent',
                            activeId === id && 'bg-accent',
                          )}
                        >
                          <span className="mt-0.5 shrink-0 text-[12px] font-bold text-primary">
                            {occ.chapter}:{occ.verse}
                          </span>
                          <span className="line-clamp-2 flex-1 font-reader text-[13px] leading-snug text-foreground/85">
                            {renderText(occ)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {hasMore && (
                <button
                  type="button"
                  onClick={loadMore}
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
              )}
            </div>
          )}
        </div>

        {/* Fondu + blur de bas de panneau, au-dessus de la liste (le texte s'estompe en scrollant). */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-transparent" />
          <div
            className="absolute inset-0 backdrop-blur-[2px]"
            style={{ maskImage: FADE_MASK, WebkitMaskImage: FADE_MASK }}
          />
        </div>
      </aside>
    </>
  );
}

export default StrongConcordance;