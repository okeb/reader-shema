'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useRouter } from '@/i18n/routing';
import { parseReference } from '@/src/presentation/lib/parse-reference';
import { useNavigationHistory } from '@/src/presentation/stores/navigation-history.store';
import { useActiveVersion } from '@/src/presentation/stores/active-version.store';
import { cn } from '@/lib/utils';

type ReadHref = { pathname: '/read'; query: Record<string, string> };

/** Convertit une URL de lecture stockée (`/read?livre=…&chap=…[&v=…]`) en href objet pour le routing. */
function toReadHref(url: string): ReadHref {
  const u = new URL(url, 'http://l');
  return { pathname: '/read', query: Object.fromEntries(u.searchParams) };
}

/**
 * Palette de recherche (⌘/Ctrl + K) : saute à une référence biblique, fond flouté. Montée en
 * permanence (jamais `return null`) — l'input doit exister dans le DOM pour qu'un focus synchrone
 * dans le geste tactile ouvre le clavier iOS. Fermée = invisible + inerte.
 *
 * Ouverture : ⌘/Ctrl+K, ou event `bym:open-search` (bouton loupe du dock mobile). Affiche
 * l'historique récent quand la saisie est vide, et la référence résolue (ou un message) sinon.
 *
 * Porté de l'ancien `components/organisms/o-command-palette.tsx`. `useRouter` vient de
 * `@/i18n/routing` (href objet `{pathname:'/read', query}` — la string `/read?…` n'est pas
 * acceptée par le routeur typé next-intl).
 */
export function CommandPalette() {
  const router = useRouter();
  const history = useNavigationHistory((s) => s.history);
  const clearHistory = useNavigationHistory((s) => s.clear);
  const pushHistory = useNavigationHistory((s) => s.push);
  const primaryId = useActiveVersion((s) => s.primaryId);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    // Ouverture déclenchée par le dock (loupe mobile) — cf. m-reader-dock. Focus SYNCHRONE dans
    // le geste : sinon iOS n'ouvre pas le clavier (focus hors gesture ignoré). L'input est monté en
    // permanence (cf. rendu), donc focusable immédiatement.
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
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  const parsed = value.trim() ? parseReference(value) : null;

  /** Navigue vers un href de lecture et ferme la palette. */
  const navigate = (href: ReadHref) => {
    router.push(href);
    setOpen(false);
  };

  const go = () => {
    if (!parsed) return;
    const query: Record<string, string> = { livre: parsed.bookId, chap: String(parsed.chapter) };
    if (parsed.selection) query.v = parsed.selection;
    const reference = `${parsed.bookName} ${parsed.chapter}${parsed.selection ? `:${parsed.selection}` : ''}`;
    const url = `/read?livre=${parsed.bookId}&chap=${parsed.chapter}${parsed.selection ? `&v=${encodeURIComponent(parsed.selection)}` : ''}`;
    pushHistory({
      version: primaryId,
      bookId: parsed.bookId,
      chapter: parsed.chapter,
      selection: parsed.selection,
      reference,
      url,
    });
    navigate({ pathname: '/read', query });
  };

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
              if (e.key === 'Enter') go();
            }}
            placeholder="Aller à…  ex. « 1co 3 23 » ou « genese 3 12-20 »"
            className="w-full bg-transparent py-4 text-base outline-none placeholder:text-muted-foreground/40"
          />
          <kbd className="hidden h-5 shrink-0 items-center rounded-full border border-input bg-foreground/15 px-1.5 font-mono text-[10px] font-medium text-foreground sm:inline-flex">
            Esc
          </kbd>
        </div>

        {open && !value.trim() && history.length > 0 && (
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
            {history.slice(0, 8).map((h) => (
              <button
                key={h.id}
                onClick={() => navigate(toReadHref(h.url))}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
              >
                <Icon icon="hugeicons:clock-01" className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                <span className="flex-1 truncate font-medium">{h.reference}</span>
              </button>
            ))}
          </div>
        )}

        {open && value.trim() && (
          <div className="border-t border-input/60 p-2">
            {parsed ? (
              <button
                onClick={go}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
              >
                <span className="flex items-center gap-2.5 text-sm">
                  <Icon icon="hugeicons:book-open-01" className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {parsed.bookName} {parsed.chapter}
                    {parsed.selection ? `:${parsed.selection}` : ''}
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground/50">↵</span>
              </button>
            ) : (
              <p className="px-3 py-2.5 text-sm text-muted-foreground/60">
                Référence introuvable. Essayez « jean 3 16 ».
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 border-t border-input/60 bg-foreground/[0.02] px-4 py-2 text-[11px] text-muted-foreground/50">
          <span>livre&nbsp;chapitre&nbsp;[verset(s)]</span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;