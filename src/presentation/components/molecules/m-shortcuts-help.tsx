'use client';

import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { useScrollLock } from '@/src/presentation/hooks/use-scroll-lock';

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: '⌘K', label: 'Rechercher / aller à une référence' },
  { keys: '← / →', label: 'Chapitre précédent / suivant' },
  { keys: 'd', label: 'Changer la disposition (continu / versets / plein)' },
  { keys: '+ / −', label: 'Agrandir / réduire le texte' },
  { keys: '1 / 2 / 3', label: 'Nombre de colonnes' },
  { keys: 's', label: 'Mode focus (lecture immersive)' },
  { keys: 't', label: 'Changer le thème (clair / sombre / système)' },
  { keys: 'f', label: 'Favoris' },
  { keys: 'b', label: 'Signets' },
  { keys: 'h', label: 'Historique' },
  { keys: 'n', label: 'Notes' },
  { keys: 'i', label: 'Informations du livre / chapitre' },
  { keys: '?', label: 'Cette aide' },
  { keys: 'Échap', label: 'Fermer / quitter' },
];

/**
 * Modale d'aide des raccourcis clavier du lecteur. Voile + carte centrée ; ferme au clic
 * extérieur ou à Échap. Verrouille le défilement tant qu'ouverte.
 */
export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  useScrollLock(open);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Raccourcis clavier</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          >
            <Icon icon="hugeicons:cancel-01" className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-2">
          <ul className="divide-y divide-border/60">
            {SHORTCUTS.map((s) => (
              <li key={s.keys} className="flex items-center justify-between gap-3 py-2">
                <span className="text-[13px] text-foreground/80">{s.label}</span>
                <kbd
                  className={cn(
                    'shrink-0 rounded-md border border-input bg-foreground/5 px-2 py-0.5 font-mono text-[11px] font-medium text-foreground/80',
                  )}
                >
                  {s.keys}
                </kbd>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ShortcutsHelp;