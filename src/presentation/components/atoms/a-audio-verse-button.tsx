'use client';

import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';

interface AAudioVerseButtonProps {
  /** Numéro du verset (pour l'aria-label). */
  verseNumber: number;
  /** Vrai si ce verset est la piste en cours (idle = false). */
  isCurrent: boolean;
  /** Vrai si la lecture est active (anime l'égaliseur ; figé si false et isCurrent). */
  isPlaying: boolean;
  onToggle: () => void;
  /** Visibilité du bouton au repos (le verset courant garde toujours son égaliseur). */
  visibility?: 'always' | 'selection';
  /** Vrai si le verset (ou sa carte parente) est sélectionné — utilisé en mode `visibility="selection"`. */
  isSelected?: boolean;
  className?: string;
}

/**
 * Bouton audio d'un verset (spec 37 §5.1). Au repos → icône haut-parleur discrète
 * (gris muted, devient primaire au survol du verset via `group-hover`). Verset
 * courant → égaliseur 3 barres animé (`animate-eq`) ; en pause l'égaliseur se fige
 * (cf. `.reduce-motion` et l'absence d'animation quand `isPlaying` est faux).
 * `visibility="selection"` masque le bouton au repos (n'apparaît que quand le verset
 * est sélectionné) ; le verset courant reste toujours visible (repère de lecture).
 * Le mode `never` est géré par l'appelant (pas de rendu du tout).
 * Réutilisé en mode « read » et sur les `VerseCard` du mode « références ».
 */
export function AAudioVerseButton({
  verseNumber,
  isCurrent,
  isPlaying,
  onToggle,
  visibility = 'always',
  isSelected = false,
  className,
}: AAudioVerseButtonProps) {
  const label = isCurrent
    ? isPlaying
      ? `Mettre en pause le verset ${verseNumber}`
      : `Reprendre le verset ${verseNumber}`
    : `Écouter le verset ${verseNumber}`;

  // Le verset courant (égaliseur) reste toujours visible — c'est le repère de lecture.
  // En mode « selection », le bouton est replié (largeur + hauteur nulles) au repos afin
  // de ne réserver aucun espace après le verset ; il se déploie quand le verset est sélectionné.
  const hiddenUnlessSelected = visibility === 'selection' && !isCurrent && !isSelected;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md transition-all duration-200',
        isCurrent
          ? 'h-5 w-auto px-0.5 text-primary'
          : hiddenUnlessSelected
            ? 'hidden h-0 w-0 overflow-hidden text-muted-foreground/60 opacity-0'
            : 'h-5 w-auto px-0.5 text-muted-foreground/60 group-hover:text-primary',
        className,
      )}
    >
      {isCurrent ? (
        // Égaliseur 3 barres : animé pendant la lecture, figé en pause.
        <span className="flex h-3.5 items-end gap-[2px]" aria-hidden>
          <span
            className={cn('w-[2px] rounded-full bg-primary', isPlaying && 'animate-eq')}
            style={{ height: '60%', animationDelay: '0ms' }}
          />
          <span
            className={cn('w-[2px] rounded-full bg-primary', isPlaying && 'animate-eq')}
            style={{ height: '100%', animationDelay: '180ms' }}
          />
          <span
            className={cn('w-[2px] rounded-full bg-primary', isPlaying && 'animate-eq')}
            style={{ height: '60%', animationDelay: '360ms' }}
          />
        </span>
      ) : (
        <Icon icon="hugeicons:volume-high" className="h-3 w-3" aria-hidden />
      )}
    </button>
  );
}

export default AAudioVerseButton;