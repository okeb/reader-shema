'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import type { Note } from '@/src/domain/entities';
import { useAccountAvailability } from '@/src/presentation/components/organisms/o-account-provider';

interface NotesPanelProps {
  open: boolean;
  notes: Note[];
  /** Note active (mise en évidence). */
  activeId: string | null;
  /** Clic sur une note → navigue vers le verset ancre de la note. */
  onSelect: (id: string) => void;
  /** Supprime la note. */
  onRemoveNote: (id: string) => void;
  onClose: () => void;
}

/**
 * Panneau « Mes notes » : liste de toutes les notes (références associées + extrait du verset
 * ancre + aperçu de la note), recherche locale en direct, clic → navigation vers le verset ancre.
 * Même coque latérale gauche que le panneau des signets. Une note peut référencer plusieurs versets
 * (les références sont jointes par « · »).
 */
export function NotesPanel({ open, notes, activeId, onSelect, onRemoveNote, onClose }: NotesPanelProps) {
  const [query, setQuery] = useState('');
  const { authEnabled } = useAccountAvailability();

  // Filtre en direct sur le texte de la note, les références et les extraits des versets associés.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.text.toLowerCase().includes(q) ||
        n.verses.some((v) => v.reference.toLowerCase().includes(q) || v.text.toLowerCase().includes(q)),
    );
  }, [notes, query]);

  if (!open) return null;

  return (
    <>
      {/* Voile — mobile uniquement : ferme au clic et empêche le tiroir de recouvrir le texte. */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />
      {/* Mobile : prend tout l'écran (pleine largeur). Desktop : flotte dans l'espace libre à gauche
          (sans cadre). */}
      <div className="fixed bottom-0 left-0 top-0 z-50 w-full overflow-y-auto bg-background px-5 py-5 shadow-2xl md:bottom-24 md:top-24 md:z-30 md:w-[230px] md:max-w-[46vw] md:bg-transparent md:px-6 md:py-0 md:shadow-none">
        {/* En-tête : titre + fermeture. */}
        <div className="mb-4 flex items-center justify-between pr-1">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Icon icon="hugeicons:note-01" className="h-3.5 w-3.5 text-primary" />
            Mes notes
          </span>
          <button
            type="button"
            onClick={onClose}
            title="Fermer (N)"
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <Icon icon="hugeicons:cancel-01" className="h-3.5 w-3.5" />
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="space-y-2 pr-2">
            <p className="text-[12px] leading-snug text-muted-foreground/70">
              Aucune note pour l'instant. Sélectionnez un verset puis touchez l'icône note.
            </p>
            {authEnabled && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('bym:open-account'))}
                className="flex items-center gap-1.5 text-[12px] text-primary/90 transition-colors hover:text-primary"
              >
                <Icon icon="hugeicons:cloud-sync" className="h-3.5 w-3.5" />
                Retrouver sur tous vos appareils
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Recherche locale. */}
            <div className="relative mb-3">
              <Icon
                icon="hugeicons:search-01"
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher…"
                className="w-full rounded-lg border border-input bg-background/80 py-1.5 pl-8 pr-2.5 text-[12px] outline-none focus:border-primary md:bg-background/40"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="pr-2 text-[12px] leading-snug text-muted-foreground/70">Aucun résultat.</p>
            ) : (
              <ul className="space-y-1.5">
                {filtered.map((n) => {
                  const isActive = activeId === n.id;
                  const references = n.verses.map((v) => v.reference).join(' · ');
                  const anchorText = n.verses[0]?.text;
                  return (
                    <li key={n.id} className="group/item flex items-start gap-1">
                      <button
                        type="button"
                        onClick={() => onSelect(n.id)}
                        className={cn(
                          'flex-1 overflow-hidden rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent/60',
                          isActive && 'bg-accent/60',
                        )}
                      >
                        <span
                          className={cn(
                            'block text-[12px] font-semibold',
                            isActive ? 'text-primary' : 'text-foreground/90',
                          )}
                        >
                          {references}
                        </span>
                        {anchorText && (
                          <span className="mt-0.5 block truncate text-[11px] italic text-muted-foreground/70">
                            {anchorText}
                          </span>
                        )}
                        <span className="mt-1 block line-clamp-2 text-[12px] leading-snug text-foreground/80">
                          {n.text}
                        </span>
                      </button>
                      <button
                        type="button"
                        title="Supprimer la note"
                        onClick={() => onRemoveNote(n.id)}
                        className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover/item:opacity-100"
                      >
                        <Icon icon="hugeicons:cancel-01" className="h-3 w-3" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default NotesPanel;