'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { BOOKMARK_COLORS } from '@/src/domain/entities';
import type { BookmarkGroup, BookmarkVerse } from '@/src/domain/entities';
import { useAccountAvailability } from '@/src/presentation/components/organisms/o-account-provider';

interface BookmarkPanelProps {
  open: boolean;
  groups: BookmarkGroup[];
  bookmarks: BookmarkVerse[];
  /** Signet actif (affiché dans le volet de définition). */
  activeId: string | null;
  onSelect: (id: string) => void;
  onRemoveBookmark: (id: string) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onSetGroupColor: (groupId: string, color: string) => void;
  onRemoveGroup: (groupId: string) => void;
  onClose: () => void;
}

/**
 * Les signets et « la définition ». La liste des signets flotte dans l'espace libre à gauche de
 * la définition (sans cadre, opacité 40 %) ; cliquer un signet affiche sa définition Strong dans
 * le panneau de droite.
 */
export function BookmarkPanel({
  open,
  groups,
  bookmarks,
  activeId,
  onSelect,
  onRemoveBookmark,
  onRenameGroup,
  onSetGroupColor,
  onRemoveGroup,
  onClose,
}: BookmarkPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [colorEditId, setColorEditId] = useState<string | null>(null);
  const { authEnabled } = useAccountAvailability();

  if (!open) return null;

  const groupsWithItems = groups
    .map((g) => ({ group: g, items: bookmarks.filter((b) => b.groupId === g.id) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      {/* Voile — mobile uniquement : ferme au clic et empêche le tiroir de recouvrir le texte. */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />
    {/* Liste des signets. Mobile : prend tout l'écran (pleine largeur) au-dessus du texte. Desktop :
        flotte dans l'espace libre à gauche de la lecture (sans cadre). Un clic fait basculer la
        lecture centrale sur le verset (cf. onSelect). */}
    <div className="fixed bottom-0 left-0 top-0 z-50 w-full overflow-y-auto bg-background px-5 py-5 shadow-2xl md:bottom-24 md:top-24 md:z-30 md:w-[210px] md:max-w-[46vw] md:bg-transparent md:px-6 md:py-0 md:shadow-none">
      {/* En-tête : titre + fermeture (seule croix du panneau). */}
      <div className="mb-12 flex items-center justify-between pr-1">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Icon icon="hugeicons:books-02" className="h-3.5 w-3.5 text-primary" />
          Signets
        </span>
        <button
          type="button"
          onClick={onClose}
          title="Fermer (B)"
          className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Icon icon="hugeicons:cancel-01" className="h-3.5 w-3.5" />
        </button>
      </div>

      {groupsWithItems.length === 0 ? (
        <div className="space-y-2 pr-2">
          <p className="text-[12px] leading-snug text-muted-foreground/70">
            Aucun signet. Sélectionnez des versets puis touchez l'icône signet.
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
        <div className="space-y-5">
            {groupsWithItems.map(({ group, items }) => (
              <div key={group.id}>
                {/* Entête de groupe : pastille couleur (éditable) + nom (éditable) + suppression. */}
                <div className="group/header mb-2 mt-7 flex items-center gap-1.5">
                  <button
                    type="button"
                    title="Couleur du groupe"
                    onClick={() => setColorEditId((id) => (id === group.id ? null : group.id))}
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  {editingId === group.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => {
                        onRenameGroup(group.id, editName);
                        setEditingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onRenameGroup(group.id, editName);
                          setEditingId(null);
                        } else if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="min-w-0 flex-1 rounded border border-input bg-background px-1 text-[11px] font-semibold uppercase tracking-wide outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onDoubleClick={() => {
                        setEditName(group.name);
                        setEditingId(group.id);
                      }}
                      title="Double-clic pour renommer"
                      className="flex-1 truncate text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
                    >
                      {group.name}
                    </button>
                  )}
                  <button
                    type="button"
                    title="Supprimer le groupe"
                    onClick={() => onRemoveGroup(group.id)}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover/header:opacity-100"
                  >
                    <Icon icon="ph:trash" className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Palette de couleur (inline). */}
                {colorEditId === group.id && (
                  <div className="mb-1.5 flex items-center gap-1">
                    {BOOKMARK_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          onSetGroupColor(group.id, c);
                          setColorEditId(null);
                        }}
                        className="h-4 w-4 rounded-full transition-transform hover:scale-110"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}

                {/* Entrées (opacité 40 %, pleine au survol / si actif). */}
                <ul className="space-y-0.5">
                  {items.map((b) => {
                    const isActive = activeId === b.id;
                    return (
                      <li key={b.id} className="group/item flex items-center">
                        <button
                          type="button"
                          onClick={() => onSelect(b.id)}
                          className={cn(
                            'flex-1 truncate rounded px-1 py-0.5 text-left text-[13px] transition-opacity',
                            isActive
                              ? 'text-primary opacity-100'
                              : 'text-foreground/90 opacity-40 hover:opacity-100',
                          )}
                        >
                          {b.reference}
                        </button>
                        <button
                          type="button"
                          title="Retirer le signet"
                          onClick={() => onRemoveBookmark(b.id)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover/item:opacity-100"
                        >
                          <Icon icon="hugeicons:cancel-01" className="h-3 w-3" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
    </div>
    </>
  );
}

export default BookmarkPanel;