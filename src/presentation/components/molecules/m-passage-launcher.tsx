'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { GLASS_PILL } from '@/src/presentation/components/atoms/a-floating-button';
import { BIBLE_BOOKS, BOOK_SECTIONS, getBookById, searchBooks } from '@/src/shared/constants/bible-books';

interface PassageLauncherProps {
  /** Livre présélectionné à l'ouverture du panneau (défaut : « jean », point d'entrée du lecteur). */
  defaultBookId?: string;
  /** Sélection d'un passage — l'appelant navigue vers `/read?livre=&chap=`. */
  onSelect: (bookId: string, chapter: number) => void;
}

/**
 * Lanceur de passage pour l'écran d'accueil : déclencheur « Choisir un passage ▾ » révélant un panneau
 * inline deux colonnes (liste des livres groupée par section + recherche, grille 5 col de chapitres).
 * Reprise du visuel du popover de `m-book-chapter-selector`, **sans** les flèches prev/next ni la
 * notion de position courante — c'est un point d'entrée, pas un sélecteur de navigation.
 *
 * Porté de l'ancien `components/molecules/m-passage-launcher.tsx`.
 */
export function PassageLauncher({ defaultBookId = 'jean', onSelect }: PassageLauncherProps) {
  const [open, setOpen] = useState(false);
  const [popBookId, setPopBookId] = useState(defaultBookId);
  const [search, setSearch] = useState('');

  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const activeBookRef = useRef<HTMLButtonElement | null>(null);

  const popBook = getBookById(popBookId) ?? BIBLE_BOOKS[0];

  // Réinitialise la recherche et le livre présélectionné à chaque ouverture.
  useEffect(() => {
    if (open) {
      setPopBookId(defaultBookId);
      setSearch('');
    }
  }, [open, defaultBookId]);

  // Ferme au clic dehors.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Ferme à Échap.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Centre le livre actif dans la liste.
  useEffect(() => {
    if (open && activeBookRef.current && listRef.current) {
      const el = activeBookRef.current;
      const list = listRef.current;
      list.scrollTo({ top: el.offsetTop - list.clientHeight / 2 });
    }
  }, [open, popBookId]);

  const q = search.trim();
  const results = q ? searchBooks(q) : BIBLE_BOOKS.map((b) => ({ book: b, score: 3 }));
  const groups = BOOK_SECTIONS.map((section) => ({
    ...section,
    books: results.filter((r) => r.book.section === section.id).map((r) => r.book),
  }));

  const renderGroup = (label: string, books: typeof BIBLE_BOOKS) =>
    books.length > 0 && (
      <div>
        {!q && (
          <div className="sticky top-0 select-none bg-input/10 px-3 py-2 text-[8px] font-medium uppercase tracking-wider text-muted-foreground/70 backdrop-blur-md">
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
                'w-full truncate px-3 py-1.5 text-left text-xs transition-colors',
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
    <div ref={ref} className="relative w-full">
      {/* Déclencheur — centré au-dessus du panneau (le panneau s'étale sur toute la largeur du bloc). */}
      <div className="flex justify-center">
        <button
          onClick={() => setOpen((o) => !o)}
          className="group flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/5"
        >
          <Icon icon="hugeicons:book-open-02" className="h-4 w-4 text-primary" />
          <span className="transition-colors group-hover:text-primary">Choisir un passage</span>
          <Icon
            icon="hugeicons:arrow-down-01"
            className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform', open && 'rotate-180')}
          />
        </button>
      </div>

      {/* Panneau inline deux colonnes — pleine largeur du conteneur (max-w-2xl côté accueil). */}
      {open && (
        <div className={cn('mt-2 w-full overflow-hidden rounded-xl shadow-2xl', GLASS_PILL)}>
          <div className="flex h-72">
            {/* Liste des livres */}
            <div className="flex w-[150px] shrink-0 flex-col border-r border-foreground/10">
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
                {groups.map((g) => renderGroup(g.label, g.books))}
                {groups.every((g) => g.books.length === 0) && (
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
                  {Array.from({ length: popBook.chapters }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => onSelect(popBook.id, n)}
                      className="h-8 rounded-md text-xs font-medium text-foreground/80 transition-all hover:bg-primary/10 hover:text-primary"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PassageLauncher;