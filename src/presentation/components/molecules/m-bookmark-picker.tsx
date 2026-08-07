'use client';

import { useState, type RefObject } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { BOOKMARK_COLORS } from '@/src/domain/entities';
import type { BookmarkGroup } from '@/src/domain/entities';
import { PortalPopover } from '@/src/presentation/components/atoms/a-portal-popover';

export interface BookmarkPickerProps {
  /** Ancre du popover (bouton ⋯ du cluster) — portailé pour échapper au backdrop-root du dock. */
  anchorRef: RefObject<HTMLElement | null>;
  groups: BookmarkGroup[];
  /** Groupe courant de la sélection (si déjà rangée dans un seul groupe), sinon null. */
  currentGroupId?: string | null;
  /** Vrai si au moins un verset sélectionné est déjà un signet. */
  isBookmarked: boolean;
  /** Range la sélection dans le groupe indiqué. */
  onPick: (groupId: string) => void;
  /** Crée un groupe (nom + couleur) puis y range la sélection. */
  onCreate: (name: string, color: string) => void;
  /** Retire la sélection des signets. */
  onRemove: () => void;
  /** Ferme le popover. */
  onClose: () => void;
}

/**
 * Petit popover (ouvert depuis le bouton signet de `VerseActions`) : choisir un groupe pour
 * la sélection, en créer un nouveau (nom + couleur), ou retirer le signet.
 */
export function BookmarkPicker({
  anchorRef,
  groups,
  currentGroupId,
  isBookmarked,
  onPick,
  onCreate,
  onRemove,
  onClose,
}: BookmarkPickerProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(BOOKMARK_COLORS[0]);

  const submitCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), color);
    setCreating(false);
    setName('');
    onClose();
  };

  return (
    <PortalPopover
      open
      anchorRef={anchorRef}
      align="right"
      width={224}
      onClose={onClose}
      className="w-56 overflow-hidden rounded-xl p-1"
    >
      {!creating ? (
        <>
          <ul className="max-h-56 overflow-y-auto">
            {groups.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(g.id);
                    onClose();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: g.color }}
                  />
                  <span className="flex-1 truncate text-foreground/90">{g.name}</span>
                  {currentGroupId === g.id && (
                    <Icon icon="ph:check" className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="my-1 h-px bg-border" />

          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Icon icon="ph:plus" className="h-4 w-4 shrink-0" />
            Nouveau groupe
          </button>

          {isBookmarked && (
            <button
              type="button"
              onClick={() => {
                onRemove();
                onClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <Icon icon="ph:trash" className="h-4 w-4 shrink-0" />
              Retirer le signet
            </button>
          )}
        </>
      ) : (
        <div className="p-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitCreate();
              else if (e.key === 'Escape') setCreating(false);
            }}
            placeholder="Nom du groupe"
            className="mb-2.5 w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary"
          />
          <div className="mb-3 flex items-center gap-1.5">
            {BOOKMARK_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                title="Couleur du groupe"
                className={cn(
                  'h-6 w-6 rounded-full transition-transform',
                  color === c ? 'ring-2 ring-offset-2 ring-offset-popover' : 'hover:scale-110',
                )}
                style={{ backgroundColor: c, ...(color === c ? { boxShadow: `0 0 0 2px ${c}` } : {}) }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={submitCreate}
              disabled={!name.trim()}
              className="flex-1 rounded-lg bg-primary px-2.5 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Créer
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </PortalPopover>
  );
}

export default BookmarkPicker;