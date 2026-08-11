'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { ConcordanceSkeleton } from '@/src/presentation/components/molecules/m-strong-skeleton';
import { StrongLexiconCard } from '@/src/presentation/components/molecules/m-strong-lexicon';
import { StrongOccurrenceList } from '@/src/presentation/components/molecules/m-strong-occurrence-list';
import { SiteFooter } from '@/src/presentation/components/molecules/m-footer';
import { useConcordancePages } from '@/src/presentation/hooks/use-concordance-pages';
import type { StrongOccurrence } from '@/src/domain/entities';

const PAGE_SIZE = 20;

/**
 * Page détail d'un numéro Strong (`/[locale]/strong/[code]`) : carte lexique (lemme, phonétique,
 * type, définition, origine cliquable) + liste des occurrences (concordance). Tout provient d'un
 * seul fetch `/bym/strong/:code` via `useConcordancePages`. Les refs d'`origine` naviguent vers une
 * autre fiche ; les occurrences naviguent vers le lecteur (`push` → back revient à la fiche).
 *
 * Cf. spec 29 — détail Strong.
 */
export function TStrongDetail({ code }: { code: string }) {
  const router = useRouter();
  const locale = useLocale();
  const { items, total, lexicon, status, loadingMore, tokensById, hasMore, loadMore } =
    useConcordancePages(code, 'bym', PAGE_SIZE);

  // Langue résolue depuis le lexique (repli : hébreu si code H, grec si G).
  const detailLang = lexicon?.lang ?? (code.startsWith('G') ? 'greek' : 'hebrew');
  const accent = detailLang === 'hebrew' ? 'text-primary' : 'text-purple-500';
  const displayTitle = lexicon?.lemma || lexicon?.translit || code;

  const navigateStrong = (c: string) => router.push(`/${locale}/strong/${c}`);
  const goToOccurrence = (occ: StrongOccurrence) =>
    router.push(`/${locale}/read?livre=${occ.bookId}&chap=${occ.chapter}&v=${occ.verse}`);

  const hasLexicon = Boolean(lexicon && (lexicon.translit || lexicon.lemma || lexicon.definition));
  const isEmpty = status === 'loaded' && total === 0 && !hasLexicon;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-[68ch] px-4 pt-10">
        <Link
          href="/read"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
        >
          <Icon icon="hugeicons:arrow-left-01" className="h-4 w-4" />
          Retour à la lecture
        </Link>
      </header>

      <main className="mx-auto max-w-[68ch] px-4 py-10">
        <article className="space-y-6">
          {/* En-tête : code + mot + total occurrences. */}
          <header className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Strong {code}
            </p>
            <h1 className={cn('font-serif text-3xl font-bold tracking-tight', accent)}>{displayTitle}</h1>
            {status === 'loaded' && total > 0 && (
              <p className="text-[13px] text-muted-foreground">
                {total} occurrence{total > 1 ? 's' : ''}
              </p>
            )}
          </header>

          {status === 'loading' ? (
            <ConcordanceSkeleton />
          ) : status === 'error' ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Concordance indisponible pour le moment.
            </p>
          ) : isEmpty ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucune donnée Strong pour {code}.
            </p>
          ) : (
            <>
              {lexicon && <StrongLexiconCard lexicon={lexicon} code={code} accent={accent} onNavigate={navigateStrong} />}

              {items.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Occurrences
                  </h2>
                  <StrongOccurrenceList
                    items={items}
                    code={code}
                    lang={detailLang}
                    tokensById={tokensById}
                    hasMore={hasMore}
                    loadingMore={loadingMore}
                    onLoadMore={loadMore}
                    onSelect={goToOccurrence}
                  />
                </section>
              )}
            </>
          )}
        </article>
      </main>

      <SiteFooter className="mx-auto max-w-[68ch]" />
    </div>
  );
}

export default TStrongDetail;