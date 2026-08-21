'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useRouter } from '@/i18n/routing';
import { parsePartialReference } from '@/src/presentation/lib/parse-reference';
import { useNavigationHistory } from '@/src/presentation/stores/navigation-history.store';
import { useActiveVersion } from '@/src/presentation/stores/active-version.store';
import { cn } from '@/lib/utils';

type ReadHref = { pathname: '/read'; query: Record<string, string> };

function toReadHref(url: string): ReadHref {
  const u = new URL(url, 'http://l');
  return { pathname: '/read', query: Object.fromEntries(u.searchParams) };
}

export function CommandPalette() {
  const router = useRouter();
  const history = useNavigationHistory((s) => s.history);
  const clearHistory = useNavigationHistory((s) => s.clear);
  const pushHistory = useNavigationHistory((s) => s.push);
  const primaryId = useActiveVersion((s) => s.primaryId);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const partial = useMemo(() => parsePartialReference(value), [value]);

  const { resolvedBook, chapter, selection, bookResults } = partial;

  const hasInput = value.trim().length > 0;

  const suggestionBooks = useMemo(() => {
    if (!hasInput) return [];
    if (resolvedBook && chapter != null) return bookResults.filter((r) => r.book.id !== resolvedBook.id);
    if (resolvedBook) return bookResults.filter((r) => r.book.id !== resolvedBook.id);
    return bookResults;
  }, [hasInput, resolvedBook, chapter, bookResults]);

  const primaryLabel = useMemo(() => {
    if (!resolvedBook) return null;
    const chap = chapter ?? 1;
    const sel = selection ? `:${selection}` : '';
    return `${resolvedBook.name} ${chap}${sel}`;
  }, [resolvedBook, chapter, selection]);

  const totalItems = (primaryLabel ? 1 : 0) + suggestionBooks.length;
  const itemCount = Math.min(totalItems, 5);

  const navigate = useCallback(
    (href: ReadHref) => {
      router.push(href);
      setOpen(false);
    },
    [router],
  );

  const goToBook = useCallback(
    (bookId: string, chap: number, sel?: string) => {
      const book = partial.bookResults.find((r) => r.book.id === bookId)?.book;
      if (!book) return;
      const query: Record<string, string> = { livre: bookId, chap: String(chap) };
      if (sel) query.v = sel;
      const reference = `${book.name} ${chap}${sel ? `:${sel}` : ''}`;
      const url = `/read?livre=${bookId}&chap=${chap}${sel ? `&v=${encodeURIComponent(sel)}` : ''}`;
      pushHistory({ version: primaryId, bookId, chapter: chap, selection: sel, reference, url });
      navigate({ pathname: '/read', query });
    },
    [partial.bookResults, primaryId, pushHistory, navigate],
  );

  const handleActivate = useCallback(
    (index: number) => {
      if (!hasInput) {
        if (index < history.length) {
          navigate(toReadHref(history[index].url));
        }
        return;
      }

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
    [hasInput, primaryLabel, resolvedBook, chapter, selection, suggestionBooks, goToBook, history, navigate],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    const onOpen = () => {
      inputRef.current?.focus();
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('bym:open-search', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('bym:open-search', onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setValue('');
      setFocusedIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    setFocusedIndex(0);
  }, [value]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-start justify-center px-4 pt-[18vh] transition-opacity duration-150',
        open ? 'bg-black/30 opacity-100 backdrop-blur-sm' : 'pointer-events-none opacity-0',
      )}
      onMouseDown={() => setOpen(false)}
      aria-hidden={!open}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-popover shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4">
          <Icon icon="hugeicons:search-01" className="h-5 w-5 shrink-0 text-muted-foreground/60" />
          <input
            ref={inputRef}
            value={value}
            tabIndex={open ? 0 : -1}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleActivate(focusedIndex);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex((i) => {
                  const max = hasInput ? Math.min(totalItems, 5) - 1 : Math.min(history.length, 8) - 1;
                  return i < max ? i + 1 : 0;
                });
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIndex((i) => {
                  const max = hasInput ? Math.min(totalItems, 5) - 1 : Math.min(history.length, 8) - 1;
                  return i > 0 ? i - 1 : max;
                });
              }
            }}
            role="combobox"
            aria-expanded={open}
            aria-controls="cmd-listbox"
            aria-activedescendant={focusedIndex >= 0 ? `cmd-item-${focusedIndex}` : undefined}
            placeholder="Aller à…  ex. « 1co 3 23 » ou « genese 3 12-20 »"
            className="w-full bg-transparent py-4 text-base outline-none placeholder:text-muted-foreground/40"
          />
          <kbd className="hidden h-5 shrink-0 items-center rounded-full border border-input bg-foreground/15 px-1.5 font-mono text-[10px] font-medium text-foreground sm:inline-flex">
            Esc
          </kbd>
        </div>

        {open && !hasInput && history.length > 0 && (
          <div className="border-t border-input/60 p-2">
            <div className="flex items-center justify-between px-3 pb-1 pt-1">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                Récemment consulté
              </span>
              <button
                onClick={clearHistory}
                className="text-[11px] text-muted-foreground/50 transition-colors hover:text-primary"
              >
                Effacer
              </button>
            </div>
            <div
              id="cmd-listbox"
              role="listbox"
              className="max-h-[40vh] overflow-y-auto"
            >
              {history.slice(0, 8).map((h, i) => (
                <button
                  key={h.id}
                  id={`cmd-item-${i}`}
                  role="option"
                  aria-selected={focusedIndex === i}
                  onClick={() => navigate(toReadHref(h.url))}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    focusedIndex === i ? 'bg-accent' : 'hover:bg-accent',
                  )}
                >
                  <Icon icon="hugeicons:clock-01" className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                  <span className="flex-1 truncate font-medium">{h.reference}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {open && hasInput && (
          <div className="border-t border-input/60 p-2">
            <div
              id="cmd-listbox"
              role="listbox"
              ref={listRef}
              className="max-h-[40vh] overflow-y-auto"
              aria-live="polite"
            >
              {primaryLabel && resolvedBook && (
                <button
                  id="cmd-item-0"
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
              {suggestionBooks.slice(0, primaryLabel ? 4 : 5).map((result, i) => {
                const idx = primaryLabel ? i + 1 : i;
                return (
                  <button
                    key={result.book.id}
                    id={`cmd-item-${idx}`}
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
                  Référence introuvable. Essayez « jean 3 16 ».
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 border-t border-input/60 bg-foreground/[0.02] px-4 py-2 text-[11px] text-muted-foreground/50">
          <span>livre&nbsp;chapitre&nbsp;[verset(s)]</span>
          {hasInput && bookResults.length > 0 && (
            <span className="ml-auto">{bookResults.length} résultat{bookResults.length > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;