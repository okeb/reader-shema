'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useRouter } from '@/i18n/routing';
import { parsePartialReference } from '@/src/presentation/lib/parse-reference';
import { useNavigationHistory } from '@/src/presentation/stores/navigation-history.store';
import { useActiveVersion } from '@/src/presentation/stores/active-version.store';
import { cn } from '@/lib/utils';

/**
 * Page de recherche par référence libre (spec 38). Variante « pleine page » de la palette ⌘K
 * (`o-command-palette.tsx`), allégée : pas de modal, pas de raccourci clavier, pas d'historique
 * affiché — mais même logique de résolution (`parsePartialReference`) et même navigation vers
 * `/read`. Reçoit une requête initiale (`p=`) pré-remplie depuis la page serveur `app/[locale]/search`.
 *
 * Format accepté : `<livre> <chapitre>[:<verset(s)>]` — ex. « Mc 1:7 », « 1co 3 23 », « genese 3:12-20 ».
 */
export function SearchPage({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pushHistory = useNavigationHistory((s) => s.push);
  const primaryId = useActiveVersion((s) => s.primaryId);
  const [value, setValue] = useState(initialQuery);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const partial = useMemo(() => parsePartialReference(value), [value]);
  const { resolvedBook, chapter, selection, bookResults } = partial;

  const hasInput = value.trim().length > 0;

  const suggestionBooks = useMemo(() => {
    if (!hasInput) return [];
    if (resolvedBook) return bookResults.filter((r) => r.book.id !== resolvedBook.id);
    return bookResults;
  }, [hasInput, resolvedBook, bookResults]);

  const primaryLabel = useMemo(() => {
    if (!resolvedBook) return null;
    const chap = chapter ?? 1;
    const sel = selection ? `:${selection}` : '';
    return `${resolvedBook.name} ${chap}${sel}`;
  }, [resolvedBook, chapter, selection]);

  const totalItems = (primaryLabel ? 1 : 0) + suggestionBooks.length;
  const itemCount = Math.min(totalItems, 8);

  const goToBook = useCallback(
    (bookId: string, chap: number, sel?: string) => {
      const book = bookResults.find((r) => r.book.id === bookId)?.book;
      if (!book) return;
      const query: Record<string, string> = { livre: bookId, chap: String(chap) };
      if (sel) query.v = sel;
      const reference = `${book.name} ${chap}${sel ? `:${sel}` : ''}`;
      const url = `/read?livre=${bookId}&chap=${chap}${sel ? `&v=${encodeURIComponent(sel)}` : ''}`;
      pushHistory({ version: primaryId, bookId, chapter: chap, selection: sel, reference, url });
      router.push({ pathname: '/read', query });
    },
    [bookResults, primaryId, pushHistory, router],
  );

  const handleActivate = useCallback(
    (index: number) => {
      if (!hasInput) return;
      const primaryOffset = primaryLabel ? 1 : 0;
      if (index === 0 && primaryLabel && resolvedBook) {
        const chap = chapter ?? 1;
        goToBook(resolvedBook.id, chap, selection ?? undefined);
      } else {
        const bookIdx = index - primaryOffset;
        if (bookIdx >= 0 && bookIdx < suggestionBooks.length) {
          const book = suggestionBooks[bookIdx].book;
          setValue(`${book.id} `);
          inputRef.current?.focus();
        }
      }
    },
    [hasInput, primaryLabel, resolvedBook, chapter, selection, suggestionBooks, goToBook],
  );

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setFocusedIndex(0);
  }, [value]);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col px-4 pt-[12vh]">
      <div className="overflow-hidden rounded-2xl border border-input/60 bg-popover shadow-xl">
        <div className="flex items-center gap-3 px-4">
          <Icon icon="hugeicons:search-01" className="h-5 w-5 shrink-0 text-muted-foreground/60" />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleActivate(focusedIndex);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex((i) => (i < itemCount - 1 ? i + 1 : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIndex((i) => (i > 0 ? i - 1 : itemCount - 1));
              }
            }}
            role="combobox"
            aria-expanded
            aria-controls="search-listbox"
            aria-activedescendant={focusedIndex >= 0 ? `search-item-${focusedIndex}` : undefined}
            placeholder="Aller à…  ex. « Mc 1:7 » ou « genese 3:12-20 »"
            className="w-full bg-transparent py-4 text-base outline-none placeholder:text-muted-foreground/40"
          />
        </div>

        {hasInput && (
          <div className="border-t border-input/60 p-2">
            <div
              id="search-listbox"
              role="listbox"
              className="max-h-[55vh] overflow-y-auto"
              aria-live="polite"
            >
              {primaryLabel && resolvedBook && (
                <button
                  id="search-item-0"
                  role="option"
                  aria-selected={focusedIndex === 0}
                  onClick={() => handleActivate(0)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors',
                    focusedIndex === 0 ? 'bg-accent' : 'hover:bg-accent',
                  )}
                >
                  <span className="flex items-center gap-2.5 text-sm">
                    <Icon icon="hugeicons:book-open-01" className="h-4 w-4 text-primary" />
                    <span className="font-medium">Aller à {primaryLabel}</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground/50">↵</span>
                </button>
              )}
              {suggestionBooks.slice(0, primaryLabel ? 7 : 8).map((result, i) => {
                const idx = primaryLabel ? i + 1 : i;
                return (
                  <button
                    key={result.book.id}
                    id={`search-item-${idx}`}
                    role="option"
                    aria-selected={focusedIndex === idx}
                    onClick={() => handleActivate(idx)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      focusedIndex === idx ? 'bg-accent' : 'hover:bg-accent',
                    )}
                  >
                    <Icon icon="hugeicons:book-open-01" className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                    <span className="truncate font-medium">{result.book.name}</span>
                  </button>
                );
              })}
              {totalItems === 0 && (
                <p className="px-3 py-2.5 text-sm text-muted-foreground/60">
                  Référence introuvable. Essayez « Mc 1:7 » ou « jean 3 16 ».
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 border-t border-input/60 bg-foreground/[0.02] px-4 py-2 text-[11px] text-muted-foreground/50">
          <span>livre&nbsp;chapitre[:verset(s)]</span>
          {hasInput && bookResults.length > 0 && (
            <span className="ml-auto">{bookResults.length} résultat{bookResults.length > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchPage;