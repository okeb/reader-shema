'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Style « glass » thème-adaptatif pour un conteneur groupé, une pastille séparée ou un
 * dropdown/panneau flottant : sans bordure, teinte très légère (`--foreground` à 2 %) + flou
 * marqué (`backdrop-blur-2xl`). Porté de l'ancien `components/atoms/a-floating-button.tsx`.
 */
export const GLASS_PILL = 'glass bg-foreground/[0.02] backdrop-blur-2xl';

/**
 * Style de base d'un élément du dock : bouton-icône plat (sans ombre ni bordure). Le relief est
 * porté par le conteneur du dock, façon dock macOS.
 */
export const FLOATING_BTN =
  'flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-primary/10 hover:text-primary';

export interface FloatingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const FloatingButton = React.forwardRef<HTMLButtonElement, FloatingButtonProps>(
  ({ className, active, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(FLOATING_BTN, active && 'bg-primary/10 text-primary', className)}
      {...props}
    />
  ),
);
FloatingButton.displayName = 'FloatingButton';

export default FloatingButton;