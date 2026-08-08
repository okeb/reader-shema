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
}

export function NoteViewer({
  open,
  anchorVerse,
  notes,
  activeNoteId,
  onEdit,
  onClose,
}: NoteViewerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(activeNoteId);

  if (!open || notes.length === 0) return null;

  const active = notes.find((n) => n.id === selectedId) ?? notes[0];
  const multiple = notes.length > 1;
  const title = anchorVerse?.reference ?? 'Note';

  const handleEdit = () => {
    if (active) onEdit(active.id);
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background" role="dialog" aria-label={`Note — ${title}`}>
      <div className="flex items-center gap-2.5 border-b border-input/60 px-4 py-3.5">
        <Icon icon="hugeicons:sticky-note-01" className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">
            {multiple ? `Notes sur ${title}` : title}
          </h2>
          {active && (
            <p className="text-[11px] text-muted-foreground">
              {active.verses.map((v) => v.reference).join(' · ')}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Fermer (Échap)"
          aria-label="Fermer la note"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent"
        >
          <Icon icon="ph:x" className="h-4 w-4" />
        </button>
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
                        {n.text || <span className="italic text-muted-foreground/50">Note vide</span>}
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
          onClick={handleEdit}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Modifier
        </button>
      </div>
    </div>
  );
}

export default NoteViewer;