import { cn } from '@/lib/utils';

interface HighlightDotsProps {
  /** Couleurs à afficher, triées par importance. */
  colors: string[];
  /** Nombre maximal de points ; au-delà, un « + » discret. */
  max?: number;
  /** Liseré autour des points (lisibilité sur fond coloré, ex. chapitre actif). */
  ringed?: boolean;
  className?: string;
}

/**
 * Petits points de couleur résumant des surlignages (un point par couleur, pas par verset).
 * Décoratif : le sens est porté par l'`aria-label` du parent.
 */
export function HighlightDots({ colors, max = 3, ringed = false, className }: HighlightDotsProps) {
  if (colors.length === 0) return null;
  const shown = colors.slice(0, max);
  const more = colors.length > max;
  return (
    <span className={cn('flex items-center gap-[3px]', className)} aria-hidden="true">
      {shown.map((c) => (
        <span
          key={c}
          className={cn('h-[5px] w-[5px] shrink-0 rounded-full', ringed && 'ring-1 ring-primary-foreground')}
          style={{ backgroundColor: c }}
        />
      ))}
      {more && <span className="text-[8px] font-bold leading-none opacity-60">+</span>}
    </span>
  );
}

export default HighlightDots;
