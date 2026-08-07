'use client';

import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { FloatingMenu } from '@/src/presentation/components/molecules/m-floating-menu';

interface DockOverflowProps {
  /** Vrai si le panneau Signets est ouvert (item marqué « ouvert », bouton actif). */
  bookmarkPanelOpen: boolean;
  toggleBookmarkPanel: () => void;
  /** Vrai si le panneau « Mes notes » est ouvert (item marqué « ouvert », bouton actif). */
  notesPanelOpen: boolean;
  toggleNotesPanel: () => void;
  /** Navigue vers la page dédiée Favoris. */
  onOpenFavorites: () => void;
}

/**
 * Bouton de dock groupant les outils personnels (Signets, Notes, Favoris) derrière un seul
 * déclencheur, sur le modèle du menu « Plus d'actions » du cluster de verset (`m-verse-actions`).
 * Le panneau s'ouvre au-dessus du bouton via le portail de `FloatingMenu` (échappe le
 * `overflow-x-auto` du dock). Les raccourcis clavier B / N / F restent gérés par `useReaderShortcuts`.
 *
 * Porté verbatim de l'ancien `components/molecules/m-dock-overflow.tsx`.
 */
export function DockOverflow({
  bookmarkPanelOpen,
  toggleBookmarkPanel,
  notesPanelOpen,
  toggleNotesPanel,
  onOpenFavorites,
}: DockOverflowProps) {
  // Le bouton groupé reste « actif » tant qu'un des panneaux qu'il contient est ouvert —
  // repère visuel de l'origine du panneau, même menu fermé.
  const anyPanelOpen = bookmarkPanelOpen || notesPanelOpen;

  const items = [
    {
      key: 'bookmarks',
      label: 'Signets',
      hint: 'B',
      icon: 'hugeicons:all-bookmark',
      active: bookmarkPanelOpen,
      run: toggleBookmarkPanel,
    },
    {
      key: 'notes',
      label: 'Mes notes',
      hint: 'N',
      icon: 'hugeicons:note-01',
      active: notesPanelOpen,
      run: toggleNotesPanel,
    },
    {
      key: 'favorites',
      label: 'Favoris',
      hint: 'F',
      icon: 'hugeicons:heart-check',
      active: false,
      run: onOpenFavorites,
    },
  ];

  return (
    <FloatingMenu
      title="Notes, signets & favoris"
      panelClassName="w-56"
      active={anyPanelOpen}
      icon={<Icon icon="hugeicons:more-vertical-circle-01" className="h-[18px] w-[18px] rotate-90" />}
    >
      {(close) => (
        <div className="flex flex-col gap-0.5">
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              title={it.label}
              onClick={() => {
                it.run();
                close();
              }}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-accent',
                it.active ? 'text-primary' : 'text-foreground',
              )}
            >
              <Icon icon={it.icon} className="h-[18px] w-[18px]" />
              <span className="flex-1 text-left">{it.label}</span>
              {it.active ? (
                <span className="text-[10px] font-medium uppercase tracking-wide text-primary">ouvert</span>
              ) : (
                <kbd className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:inline-flex">
                  {it.hint}
                </kbd>
              )}
            </button>
          ))}
        </div>
      )}
    </FloatingMenu>
  );
}

export default DockOverflow;