'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import type { Note, VerseRef } from '@/src/domain/entities';

export interface NoteViewerProps {
  open: boolean;
  anchorVerse: VerseRef | null;
  notes: Note[];
  activeNoteId: string | null;
  onEdit: (noteId: string) => void;
  onClose: () => void;
  /** Affiché pour ouvrir un éditeur vierge (nouvelle note). Quand fourni, active le
   *  bouton « Créer… » et l'état vide (sinon 0 note → return null, comportement spec 24). */
  onCreate?: () => void;
  /** Nb de versets de la sélection — pilotage singulier/pluriel de l'état vide. */
  selectionCount?: number;
  /** Force l'affichage de l'index (liste) même pour 1 note (flux sélection). Défaut false
   *  (flux marge spec 24 : 1 note → détail direct, 2+ → liste+détail inline). */
  forceIndex?: boolean;
  /** Versets de la sélection — pour le titre du header (références jointes par « · »).
   *  Si absent, retombe sur la référence de l'ancre (flux marge spec 24). */
  selectionVerses?: VerseRef[];
}

export function NoteViewer({
  open,
  anchorVerse,
  notes,
  activeNoteId,
  onEdit,
  onClose,
  onCreate,
  selectionCount = 1,
  forceIndex = false,
  selectionVerses,
}: NoteViewerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(activeNoteId);
  const [view, setView] = useState<'index' | 'detail'>(
    forceIndex || notes.length > 1 ? 'index' : 'detail',
  );

  if (!open) return null;
  // 0 note + pas de création → rien (comportement spec 24, flux marge).
  if (notes.length === 0 && !onCreate) return null;

  // Titre du header : références de la sélection jointes par « · », sinon l'ancre.
  const headerTitle =
    selectionVerses && selectionVerses.length > 0
      ? selectionVerses.map((v) => v.reference).join(' · ')
      : anchorVerse?.reference ?? 'Note';

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      title="Fermer (Échap)"
      aria-label="Fermer la note"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent"
    >
      <Icon icon="ph:x" className="h-4 w-4" />
    </button>
  );

  // --- État vide (0 note liée, flux sélection) -------------------------------
  if (notes.length === 0) {
    const plural = selectionCount >= 2;
    return (
      <div
        className="fixed inset-0 z-[60] flex flex-col bg-background"
        role="dialog"
        aria-label={`Notes de la sélection — ${anchorVerse?.reference ?? ''}`}
      >
        <div className="flex items-center gap-2.5 border-b border-input/60 px-4 py-3.5">
          <Icon icon="hugeicons:sticky-note-01" className="h-5 w-5 shrink-0 text-primary" />
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{headerTitle}</h2>
          {closeButton}
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <p className="text-sm text-muted-foreground">
            {plural
              ? 'Aucune note n’est associée à ces versets.'
              : 'Aucune note n’est associée à ce verset.'}
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Icon icon="ph:plus" className="h-4 w-4" />
            Créer une note
          </button>
        </div>
      </div>
    );
  }

  const active = notes.find((n) => n.id === selectedId) ?? notes[0];

  // --- Flux marge (spec 24) : liste + détail inline, inchangé ----------------
  if (!forceIndex) {
    const multiple = notes.length > 1;
    return (
      <div
        className="fixed inset-0 z-[60] flex flex-col bg-background"
        role="dialog"
        aria-label={`Note — ${headerTitle}`}
      >
        <div className="flex items-center gap-2.5 border-b border-input/60 px-4 py-3.5">
          <Icon icon="hugeicons:sticky-note-01" className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">
              {multiple ? `Notes sur ${headerTitle}` : headerTitle}
            </h2>
            {active && (
              <p className="text-[11px] text-muted-foreground">
                {active.verses.map((v) => v.reference).join(' · ')}
              </p>
            )}
          </div>
          {closeButton}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {multiple && (
            <div className="mb-4">
              <ul className="space-y-1.5">
                {notes.map((n) => {
                  const isActive = n.id === (selectedId ?? activeNoteId);
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(n.id)}
                        className={cn(
                          'flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent/60',
                          isActive && 'bg-accent/60',
                        )}
                      >
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {n.verses.map((v) => v.reference).join(' · ')}
                        </span>
                        <span className="line-clamp-2 text-[13px] leading-snug text-foreground/85">
                          {n.text || (
                            <span className="italic text-muted-foreground/50">Note vide</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {active && (
            <div>
              {active.verses[0]?.text && (
                <p className="mb-3 text-[13px] italic leading-relaxed text-muted-foreground/70">
                  {active.verses[0].text}
                </p>
              )}
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {active.text || <span className="italic text-muted-foreground/50">Note vide</span>}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-input/60 px-4 py-3">
          <button
            type="button"
            onClick={() => onEdit(active.id)}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Modifier
          </button>
        </div>
      </div>
    );
  }

  // --- Flux sélection (forceIndex) : index / détail basculable ----------------
  const showIndex = view === 'index';

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-background"
      role="dialog"
      aria-label={`Notes de la sélection — ${anchorVerse?.reference ?? ''}`}
    >
      <div className="flex items-center gap-2.5 border-b border-input/60 px-4 py-3.5">
        {showIndex ? (
          <Icon icon="hugeicons:sticky-note-01" className="h-5 w-5 shrink-0 text-primary" />
        ) : (
          <button
            type="button"
            onClick={() => setView('index')}
            title="Retour à la liste"
            aria-label="Retour à la liste"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent"
          >
            <Icon icon="ph:arrow-left" className="h-4 w-4" />
          </button>
        )}
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{headerTitle}</h2>
        {closeButton}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {showIndex ? (
          <div>
            {onCreate && (
              <button
                type="button"
                onClick={onCreate}
                className="mb-4 flex min-h-[44px] w-full items-center gap-2 rounded-lg border border-input/60 px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent/60"
              >
                <Icon icon="ph:plus" className="h-4 w-4 text-primary" />
                Créer une nouvelle note
              </button>
            )}
            <ul className="space-y-1.5">
              {notes.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(n.id);
                      setView('detail');
                    }}
                    className="flex min-h-[44px] w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent/60"
                  >
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {n.verses.map((v) => v.reference).join(' · ')}
                    </span>
                    <span className="line-clamp-2 text-[13px] leading-snug text-foreground/85">
                      {n.text || (
                        <span className="italic text-muted-foreground/50">Note vide</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            {active.verses[0]?.text && (
              <p className="mb-3 text-[13px] italic leading-relaxed text-muted-foreground/70">
                {active.verses[0].text}
              </p>
            )}
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {active.text || <span className="italic text-muted-foreground/50">Note vide</span>}
            </p>
          </div>
        )}
      </div>

      {!showIndex && (
        <div className="flex items-center justify-end gap-2 border-t border-input/60 px-4 py-3">
          <button
            type="button"
            onClick={() => onEdit(active.id)}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Modifier
          </button>
        </div>
      )}
    </div>
  );
}

export default NoteViewer;