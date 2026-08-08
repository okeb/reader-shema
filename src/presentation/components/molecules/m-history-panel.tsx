'use client';

import { Icon } from '@iconify/react';
import type { NavHistoryEntry } from '@/src/domain/entities';
import { groupByDay } from '@/src/presentation/lib/date-grouping';

interface HistoryPanelProps {
  open: boolean;
  history: NavHistoryEntry[];
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}

/**
 * Historique de navigation : la liste des derniers chapitres consultés. Même coque que les signets
 * (tiroir gauche opaque sur mobile, flottant à gauche sur desktop). Les entrées sont regroupées par
 * jour ; cliquer une entrée fait basculer la lecture centrale sur la référence (cf. onSelect).
 *
 * Porté de l'ancien `components/molecules/m-history-panel.tsx`.
 */
export function HistoryPanel({ open, history, onSelect, onRemove, onClear, onClose }: HistoryPanelProps) {
  if (!open) return null;

  const groups = groupByDay(history);

  return (
    <>
      {/* Voile — mobile uniquement : ferme au clic et empêche le tiroir de recouvrir le texte. */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden" onClick={onClose} />
      {/* Mobile : prend tout l'écran (pleine largeur) au-dessus du texte. Desktop : flotte dans
          l'espace libre à gauche de la lecture (sans cadre). Même positionnement que les signets. */}
      <div className="fixed bottom-0 left-0 top-0 z-50 w-full overflow-y-auto bg-background px-5 py-5 shadow-2xl md:bottom-24 md:top-24 md:z-30 md:w-[210px] md:max-w-[46vw] md:bg-transparent md:px-6 md:py-0 md:shadow-none">
        {/* En-tête : titre + effacement global (toujours visible) + fermeture. */}
        <div className="mb-12 flex items-center justify-between gap-2 pr-1">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Icon icon="hugeicons:clock-01" className="h-3.5 w-3.5 text-primary" />
            Historique
          </span>
          <div className="flex items-center gap-2.5">
            {history.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                title="Effacer l'historique"
                className="text-[11px] text-muted-foreground/50 transition-colors hover:text-destructive"
              >
                Effacer
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Fermer (H)"
              className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <Icon icon="hugeicons:cancel-01" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <p className="pr-2 text-[12px] leading-snug text-muted-foreground/70">
            Aucune navigation récente. Les chapitres consultés apparaîtront ici.
          </p>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.label}>
                {/* Entête de jour. */}
                <div className="mb-2 mt-7 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </div>

                {/* Entrées (opacité 40 %, pleine au survol). */}
                <ul className="space-y-0.5">
                  {group.items.map((entry) => (
                    <li key={entry.id} className="group/item flex items-center">
                      <button
                        type="button"
                        onClick={() => onSelect(entry.id)}
                        className="flex-1 truncate rounded px-1 py-0.5 text-left text-[13px] text-foreground/90 opacity-40 transition-opacity hover:opacity-100"
                      >
                        {entry.reference}
                      </button>
                      <button
                        type="button"
                        title="Retirer de l'historique"
                        onClick={() => onRemove(entry.id)}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover/item:opacity-100"
                      >
                        <Icon icon="hugeicons:cancel-01" className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default HistoryPanel;