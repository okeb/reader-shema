'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { FloatingButton, GLASS_PILL } from '@/src/presentation/components/atoms/a-floating-button';

/**
 * Bouton-icône du dock qui ouvre un panneau (dropdown) au-dessus de lui.
 * `children` est une fonction recevant `close` pour fermer après sélection.
 *
 * Le panneau est rendu dans un portail (sur `document.body`) et positionné en `fixed` au-dessus
 * du bouton : indispensable car le dock applique `overflow-x-auto` (défilement horizontal mobile),
 * ce qui rognerait sinon tout dropdown débordant vers le haut.
 *
 * Porté verbatim de l'ancien `components/molecules/m-floating-menu.tsx`.
 */
export function FloatingMenu({
  icon,
  title,
  panelClassName,
  active: externalActive,
  children,
}: {
  icon: ReactNode;
  title: string;
  panelClassName?: string;
  /** État « actif » externe (ex. un panneau lié est ouvert) — combiné à l'ouverture du menu. */
  active?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; bottom: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Positionne le panneau au-dessus du bouton et suit redimensionnement / défilement.
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setCoords({ left: r.left + r.width / 2, bottom: window.innerHeight - r.top + 8 });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  // Fermeture au clic en dehors (bouton + panneau portailé).
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <>
      <FloatingButton ref={btnRef} active={open || externalActive} title={title} onClick={() => setOpen((o) => !o)}>
        {icon}
      </FloatingButton>
      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', left: coords.left, bottom: coords.bottom, transform: 'translateX(-50%)' }}
            className={cn(
              'z-50 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl p-1 shadow-lg',
              GLASS_PILL,
              panelClassName,
            )}
          >
            {children(() => setOpen(false))}
          </div>,
          document.body,
        )}
    </>
  );
}

export default FloatingMenu;