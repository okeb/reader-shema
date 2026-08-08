'use client';

import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { GLASS_PILL } from '@/src/presentation/components/atoms/a-floating-button';

interface FocusControlProps {
  /** Mode focus armé → le contrôle est visible (et le chrome du lecteur se retire). */
  open: boolean;
  /** Pointeur tactile : pas de survol → libellés masqués (icônes seules). */
  coarse: boolean;
  /** Nombre de versets sélectionnés : la pilule Strong n'apparaît que si > 0. */
  selectionCount: number;
  /** Vrai si la version active expose les Strong (sinon la pilule Strong se retire). */
  strongsAvailable?: boolean;
  /** Panneau Strong ouvert → pilule Strong mise en évidence (text-primary). */
  strongsOpen: boolean;
  onToggleFocus: () => void;
  onToggleStrongs: () => void;
}

/**
 * Contrôle unique du mode focus — cluster flottant bas-centre, là où était le dock. Pilule
 * « Strong » (le seul outil autorisé en focus) + bouton « Quitter » (sortie).
 * Porté de l'ancien `components/molecules/m-focus-control.tsx`.
 *
 * Phase 3 : la pilule Strong est affichée mais son panneau arrive en Phase 4 (toggle no-op).
 */
export function FocusControl({
  open,
  coarse,
  selectionCount,
  strongsAvailable = true,
  strongsOpen,
  onToggleFocus,
  onToggleStrongs,
}: FocusControlProps) {
  const labelCls =
    'max-w-0 overflow-hidden whitespace-nowrap text-[12px] font-medium opacity-0 transition-all duration-200 group-hover:ml-1.5 group-hover:max-w-[72px] group-hover:opacity-100';
  const pillCls = cn(
    GLASS_PILL,
    'group inline-flex items-center rounded-full px-2.5 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-primary',
  );

  return (
    <div
      className={cn(
        'fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 transition-[opacity,transform] duration-200 ease-out',
        open ? 'opacity-100' : 'pointer-events-none translate-y-2 opacity-0',
      )}
    >
      {strongsAvailable && selectionCount > 0 && (
        <button
          type="button"
          onClick={onToggleStrongs}
          title="Strong — ouvrir/fermer le panneau"
          aria-label="Strong — ouvrir/fermer le panneau"
          aria-pressed={strongsOpen}
          className={cn(pillCls, strongsOpen && 'text-primary')}
        >
          <Icon icon="hugeicons:book-open-01" className="h-4 w-4 shrink-0" />
          {!coarse && <span className={labelCls}>Strong</span>}
        </button>
      )}

      <button
        type="button"
        onClick={onToggleFocus}
        title="Désactiver le mode focus"
        aria-label="Désactiver le mode focus"
        aria-pressed={open}
        className={pillCls}
      >
        <Icon icon="hugeicons:logout-02" className="h-4 w-4 shrink-0" />
        {!coarse && <span className={labelCls}>Quitter</span>}
      </button>
    </div>
  );
}

export default FocusControl;