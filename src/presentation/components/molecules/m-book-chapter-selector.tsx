'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { BIBLE_BOOKS, getBookById, searchBooks } from '@/src/shared/constants/bible-books';

interface BookChapterSelectorProps {
  bookId: string;
  chapter: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (bookId: string, chapter: number) => void;
}

const ARROW_BTN =
  'group flex h-8 shrink-0 items-center overflow-hidden rounded-full text-primary transition-all duration-300 hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-30';

/**
 * Barre de sélection style racine : [‹  Livre Chap  ›] + popover (recherche livre + grille chapitres).
 * Porté de l'ancien `components/molecules/m-book-chapter-selector.tsx`.
 */
export function BookChapterSelector({
  bookId,
  chapter,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onSelect,
}: BookChapterSelectorProps) {
  const [open, setOpen] = useState(false);
  const [popBookId, setPopBookId] = useState(bookId);
  const [search, setSearch] = useState('');

  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const activeBookRef = useRef<HTMLButtonElement | null>(null);

  const book = getBookById(bookId) ?? BIBLE_BOOKS[0];
  const popBook = getBookById(popBookId) ?? book;

  useEffect(() => {
    if (open) {
      setPopBookId(bookId);
      setSearch('');
    }
  }, [open, bookId]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (open && activeBookRef.current && listRef.current) {
      const el = activeBookRef.current;
      const list = listRef.current;
      list.scrollTo({ top: el.offsetTop - list.clientHeight / 2 });
    }
  }, [open, popBookId]);

  const q = search.trim();
  const results = q ? searchBooks(q) : BIBLE_BOOKS.map((b) => ({ book: b, score: 3 }));
  const ot = results.filter((r) => r.book.testament === 'ancien').map((r) => r.book);
  const nt = results.filter((r) => r.book.testament === 'nouveau').map((r) => r.book);

  const renderGroup = (label: string, books: typeof BIBLE_BOOKS) =>
    books.length > 0 && (
      <div>
        {!q && (
          <div className="sticky top-0 select-none bg-popover px-3 py-2 text-[8px] font-medium uppercase tracking-wider text-muted-foreground/70">
            {label}
          </div>
        )}
        {books.map((b) => {
          const active = b.id === popBookId;
          return (
            <button
              key={b.id}
              ref={active ? activeBookRef : null}
              onClick={() => {
                setPopBookId(b.id);
                setSearch('');
              }}
              className={cn(
                'w-full px-3 py-1.5 text-left text-xs transition-colors',
                active
                  ? 'bg-primary/10 font-semibold text-primary'
                  : 'text-foreground/80 hover:bg-foreground/5 hover:text-foreground',
              )}
            >
              {b.name}
            </button>
          );
        })}
      </div>
    );

  return (
    <div ref={ref} className="relative flex items-center justify-center gap-1">
      {/* Chapitre précédent */}
      <button disabled={!canPrev} onClick={onPrev} className={cn(ARROW_BTN, 'pl-1.5 pr-3')}>
        <Icon icon="hugeicons:arrow-left-01" className="h-4 w-4 shrink-0" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-[11px] font-medium opacity-0 transition-all duration-300 group-hover:ml-1 group-hover:max-w-[64px] group-hover:opacity-100">
          Chap. {chapter - 1}
        </span>
      </button>

      {/* Déclencheur central */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="group flex max-w-[260px] items-center justify-center gap-1.5 rounded-lg px-4 py-1.5 transition-colors hover:bg-primary/5"
      >
        <span className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
          {book.name} {chapter}
        </span>
        <Icon
          icon="hugeicons:arrow-down-01"
          className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform', open && 'rotate-180')}
        />
      </button>

      {/* Chapitre suivant */}
      <button disabled={!canNext} onClick={onNext} className={cn(ARROW_BTN, 'pl-3 pr-1.5')}>
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-[11px] font-medium opacity-0 transition-all duration-300 group-hover:mr-1 group-hover:max-w-[64px] group-hover:opacity-100">
          Chap. {chapter + 1}
        </span>
        <Icon icon="hugeicons:arrow-right-01" className="h-4 w-4 shrink-0" />
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute left-1/2 top-full z-30 mt-2 w-[370px] max-w-[92vw] -translate-x-1/2 overflow-hidden rounded-xl border border-input bg-popover shadow-2xl">
          <div className="flex h-72">
            {/* Liste des livres */}
            <div className="flex w-[132px] shrink-0 flex-col border-r border-foreground/10">
              <div className="h-12 shrink-0 border-b border-foreground/10 px-2 py-1.5">
                <div className="flex h-full items-center gap-1.5 rounded-md bg-foreground/5 px-2 py-1">
                  <Icon icon="hugeicons:search-01" className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Chercher..."
                    className="w-full bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/40"
                  />
                </div>
              </div>
              <div ref={listRef} className="flex-1 overflow-y-auto pb-1">
                {renderGroup('Ancien Testament', ot)}
                {renderGroup('Nouveau Testament', nt)}
                {ot.length === 0 && nt.length === 0 && (
                  <p className="px-2 py-4 text-center text-[10px] text-muted-foreground/50">Aucun résultat</p>
                )}
              </div>
            </div>

            {/* Grille de chapitres */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="h-12 shrink-0 border-b border-foreground/10 px-3 py-2">
                <p className="truncate text-[13px] font-semibold">{popBook.name}</p>
                <p className="text-[10px] text-muted-foreground">{popBook.chapters} chapitres</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <div className="grid grid-cols-5 gap-1">
                  {Array.from({ length: popBook.chapters }, (_, i) => i + 1).map((n) => {
                    const current = popBook.id === bookId && n === chapter;
                    return (
                      <button
                        key={n}
                        onClick={() => {
                          onSelect(popBook.id, n);
                          setOpen(false);
                        }}
                        className={cn(
                          'h-8 rounded-md text-xs font-medium transition-all',
                          current
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground/80 hover:bg-primary/10 hover:text-primary',
                        )}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookChapterSelector;