'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Durée de l'animation de sortie (cf. .animate-fade-out-down dans globals.scss). */
const EXIT_MS = 180;

export interface HoverClusterProps {
  /** Ouvert = visible (entrée). Passe à false → animation de sortie puis démontage après EXIT_MS. */
  open: boolean;
  className?: string;
  /** Classe d'animation d'entrée (défaut `animate-fade-in-up`). */
  enterClass?: string;
  /** Classe d'animation de sortie (défaut `animate-fade-out-down`). */
  exitClass?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  children: ReactNode;
}

/**
 * Enveloppe animée du cluster d'actions au survol : entrée `fade-in-up`, sortie `fade-out-down`.
 * Garde l'élément monté le temps de l'animation de sortie (sinon React le retirerait immédiatement
 * et l'animation de sortie ne jouerait pas).
 */
export function HoverCluster({
  open,
  className,
  enterClass = 'animate-fade-in-up',
  exitClass = 'animate-fade-out-down',
  onMouseEnter,
  onMouseLeave,
  onClick,
  children,
}: HoverClusterProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (open) {
      setClosing(false);
      setMounted(true);
    } else if (mounted) {
      // Lance l'animation de sortie, puis démonte.
      setClosing(true);
      timer.current = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, EXIT_MS);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // `mounted` volontairement hors deps : ne réagir qu'au changement de `open`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted) return null;

  return (
    <span
      className={cn(className, closing ? exitClass : enterClass)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {children}
    </span>
  );
}

export default HoverCluster;