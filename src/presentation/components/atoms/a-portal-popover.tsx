'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { GLASS_PILL } from '@/src/presentation/components/atoms/a-floating-button';

interface PortalPopoverProps {
  /** État d'ouverture (contrôlé par le parent). */
  open: boolean;
  /** Élément ancre (le bouton déclencheur) — le panneau s'ouvre au-dessus. */
  anchorRef: RefObject<HTMLElement | null>;
  /** Alignement horizontal : `left` = bord gauche aligné sur l'ancre, `right` = bord droit aligné. */
  align?: 'left' | 'right';
  /** Largeur approximative (px) pour le positionnement initial avant mesure réelle. Défaut 176 (w-44). */
  width?: number;
  /** Ferme au clic extérieur (bouton ancre + panneau exclus). */
  onClose: () => void;
  /** Classes du panneau (largeur, padding, rayon, disposition). Le glass + ombre sont ajoutés. */
  className?: string;
  children: ReactNode;
}

/**
 * Popover portailé sur `document.body` : échappe aux ancêtres qui sont des « frontières de
 * backdrop » (conteneurs en `backdrop-filter` comme le dock ou la pilule hover du cluster), afin
 * que son propre `backdrop-blur` compose enfin par-dessus la page (au lieu de flouter un contenu
 * parent quasi vide → apparence transparente). Échappe aussi l'éventuel `overflow` du parent.
 *
 * Positionnement `fixed` au-dessus de l'ancre, recalculé au scroll/resize ; clampé dans la fenêtre.
 * Porté de l'ancien `components/atoms/a-portal-popover.tsx`.
 */
export function PortalPopover({
  open,
  anchorRef,
  align = 'left',
  width = 176,
  onClose,
  className,
  children,
}: PortalPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);

  // Recalcule la position : ancre au-dessus du bouton, clampé dans la fenêtre. Utilise la largeur
  // réelle du panneau une fois monté, sinon la largeur approchée `width`.
  const recompute = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    const pw = panelRef.current?.offsetWidth || width;
    let left = align === 'left' ? r.left : r.right - pw;
    const maxLeft = window.innerWidth - pw - margin;
    if (left > maxLeft) left = Math.max(margin, maxLeft);
    if (left < margin) left = margin;
    setPos({ left, bottom: window.innerHeight - r.top + 8 });
  }, [anchorRef, align, width]);

  // Position initiale (largeur approchée) + recalcul au scroll/resize ; seconde passe après montage
  // pour mesurer la largeur réelle (panneaux à largeur variable).
  useEffect(() => {
    if (!open) return;
    recompute();
    const id = requestAnimationFrame(recompute);
    window.addEventListener('resize', recompute);
    window.addEventListener('scroll', recompute, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', recompute);
      window.removeEventListener('scroll', recompute, true);
    };
  }, [open, recompute]);

  // Ferme au clic extérieur (bouton ancre + panneau exclus).
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, anchorRef, onClose]);

  if (!open || !pos) return null;
  return createPortal(
    <div
      ref={panelRef}
      onClick={(e) => e.stopPropagation()}
      style={{ position: 'fixed', left: pos.left, bottom: pos.bottom }}
      className={cn(GLASS_PILL, 'z-50 max-w-[calc(100vw-1rem)] shadow-lg', className)}
    >
      {children}
    </div>,
    document.body,
  );
}

export default PortalPopover;