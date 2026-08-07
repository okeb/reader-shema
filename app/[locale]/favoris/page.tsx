'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useRouter } from '@/i18n/routing';
import { useFavorites } from '@/src/presentation/stores/favorites.store';
import { getVersion } from '@/src/shared/constants/bible-versions';
import { ShortcutsHelp } from '@/src/presentation/components/molecules/m-shortcuts-help';
import { DataTransfer } from '@/src/presentation/components/molecules/m-data-transfer';
import { SiteFooter } from '@/src/presentation/components/molecules/m-footer';
import type { FavoriteVerse } from '@/src/domain/entities';

/** Lien localisé vers la lecture au bon verset, ou null si la référence n'est pas localisable. */
function favoriteHref(f: FavoriteVerse): { pathname: '/read'; query: Record<string, string> } | null {
  if (!f.bookId || !f.chapter) return null;
  const query: Record<string, string> = { livre: f.bookId, chap: String(f.chapter) };
  if (f.verse) query.v = String(f.verse);
  return { pathname: '/read', query };
}

/**
 * Page des favoris (route localisée `/favoris` / `/favorites`). Liste les versets favoris
 * regroupés par version, triés du plus récent au plus ancien. Raccourci « F » revient au lecteur
 * (réciproque du raccourci lecteur → favoris). Inclut le bloc de transfert de données.
 *
 * Porté de l'ancien `app/favoris/page.tsx`.
 */
export default function FavorisPage() {
  const favorites = useFavorites((s) => s.favorites);
  const remove = useFavorites((s) => s.remove);
  const hydrated = useFavorites((s) => s.hydrated);
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  // Raccourcis : « F » revient à la lecture (réciproque du lecteur), « ? » affiche l'aide.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        router.push('/read');
      } else if (e.key === '?') {
        e.preventDefault();
        setHelpOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setHelpOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  // Tri récent → ancien, puis regroupement par version (préparation multi-version).
  const sorted = [...favorites].sort((a, b) => b.createdAt - a.createdAt);
  const versionIds = Array.from(new Set(sorted.map((f) => f.version)));
  const plural = favorites.length > 1 ? 's' : '';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[68ch] px-4 py-16">
        <header className="mb-10 flex items-center justify-between gap-4 pb-16 pt-24">
          <div>
            <h1 className="animate-fade-in-up font-serif text-3xl font-bold tracking-tight text-bold dark:text-white">
              Favoris
            </h1>
            <p className="mt-0.5 text-lg text-muted-foreground">
              {hydrated ? `${favorites.length} verset${plural} enregistré${plural}` : '…'}
            </p>
          </div>
          <Link
            href="/read"
            className="inline-flex animate-slide-in-right items-center gap-1.5 rounded-full bg-background/70 px-3 py-1.5 text-sm text-primary transition-all duration-700 hover:bg-primary/15"
          >
            <Icon icon="hugeicons:book-open-02" className="h-4 w-4" />
            Lecture
          </Link>
        </header>

        {!hydrated ? null : favorites.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Icon icon="ph:heart" className="h-7 w-7" />
            </div>
            <p className="text-muted-foreground">Aucun favori pour l’instant.</p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Sélectionnez des versets dans le lecteur, puis touchez le cœur.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {versionIds.map((vid) => {
              const version = getVersion(vid);
              const items = sorted.filter((f) => f.version === vid);
              return (
                <section key={vid}>
                  <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    {version.label}
                  </h2>
                  <ul className="space-y-3">
                    {items.map((f) => {
                      const href = favoriteHref(f);
                      const inner = (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-[12px] font-semibold uppercase tracking-wide text-foreground/80">
                              {f.reference}
                            </span>
                            <button
                              type="button"
                              title="Retirer des favoris"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                remove(f.id);
                              }}
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-destructive/10"
                            >
                              <Icon icon="ph:heart-fill" className="h-4 w-4 text-primary" />
                            </button>
                          </div>
                          <p className="mt-2 font-reader leading-relaxed text-foreground/90">{f.text}</p>
                        </>
                      );
                      return (
                        <li key={f.id}>
                          {href ? (
                            <Link
                              href={href}
                              className="block rounded-xl bg-foreground/[2%] p-4 transition-all duration-500 hover:bg-primary/5"
                            >
                              {inner}
                            </Link>
                          ) : (
                            <div className="rounded-xl border border-input/60 bg-card/40 p-4">{inner}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        {hydrated && <DataTransfer />}
      </div>
      <SiteFooter className="mx-auto max-w-[68ch]" />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}