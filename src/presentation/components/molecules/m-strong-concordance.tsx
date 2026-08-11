'use client';

import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { ConcordanceSkeleton } from '@/src/presentation/components/molecules/m-strong-skeleton';
import { StrongLexiconCard } from '@/src/presentation/components/molecules/m-strong-lexicon';
import { StrongOccurrenceList } from '@/src/presentation/components/molecules/m-strong-occurrence-list';
import { useConcordancePages } from '@/src/presentation/hooks/use-concordance-pages';
import type { StrongOccurrence } from '@/src/domain/entities';

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

/**
 * Panneau concordance : toutes les occurrences d'un numéro Strong, groupées par livre, paginées.
 * Réutilise la coque du panneau Strong (slide-in droit, voile mobile), affiché par-dessus (z-40).
 *
 * Le chargement (pages + lexique + tokens de coloration) est mutualisé dans `useConcordancePages` ;
 * le rendu de la liste dans `StrongOccurrenceList` ; la carte lexique dans `StrongLexiconCard`.
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
  const { items, total, lexicon, status, loadingMore, tokensById, hasMore, loadMore } =
    useConcordancePages(code, version, PAGE_SIZE, open);

  if (!open) return null;

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
              {/* Lexique du code : lemme, phonétique, type, définition, origine —
                  tout issu du même fetch que les occurrences (page détail auto-suffisante). */}
              {lexicon && <StrongLexiconCard lexicon={lexicon} code={code} accent={accent} />}

              {items.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Aucune occurrence trouvée.</p>
              ) : (
                <StrongOccurrenceList
                  items={items}
                  code={code}
                  lang={detailLang}
                  tokensById={tokensById}
                  hasMore={hasMore}
                  loadingMore={loadingMore}
                  onLoadMore={loadMore}
                  onSelect={onNavigate}
                />
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