'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { DoodleCard } from '@/src/presentation/components/molecules/m-doodle-card';
import type { Doodle } from '@/src/shared/constants/doodles';

// DoodleRenderer importé en `dynamic({ ssr:false })` : le runtime Rive (WASM) ne se monte que côté
// client — évite un flash/mismatch SSR, et un visiteur sans doodle actif ne le télécharge pas.
const DoodleRenderer = dynamic(
  () => import('@/src/presentation/components/molecules/m-doodle-renderer').then((m) => m.DoodleRenderer),
  { ssr: false },
);

export interface DoodleLogoProps {
  /** Occasion active (doit porter `animate`). */
  doodle: Doodle & { animate: NonNullable<Doodle['animate']> };
  /** Tactile : icône d'info toujours visible (pas de survol). */
  coarse?: boolean;
  /** Hauteur du doodle (ex. `h-[4.5rem] md:h-20`). */
  className?: string;
  /** Appelé si l'asset `.riv` ne charge pas — le parent repli sur le logo normal. */
  onError: () => void;
}

/**
 * Doodle interactif v2 (spec 18 §4.6), partagé par la topbar et l'accueil.
 *
 * - **Clic sur le doodle** : déclenche l'animation de clic du `.riv` (gérée par le renderer) — il
 *   n'ouvre plus rien et ne navigue plus.
 * - **Icône d'info** en surimpression (coin haut-droit) : apparaît au survol sur desktop, toujours
 *   visible au tactile. Son clic ouvre le dropdown d'explication (`DoodleCard`) ; ✕, Échap et clic
 *   extérieur le ferment.
 *
 * Le mode focus n'utilise pas ce composant (doodle discret, sans info ni animation de clic).
 */
export function DoodleLogo({ doodle, coarse = false, className, onError }: DoodleLogoProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  // Changement d'occasion (passage minuit) : on referme le dropdown.
  useEffect(() => {
    setOpen(false);
  }, [doodle.id]);

  // Clic extérieur → fermeture (le doodle, l'icône et le dropdown sont dans `wrapRef`).
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <span ref={wrapRef} className="group/doodle relative inline-block">
      <DoodleRenderer
        id={doodle.id}
        animate={doodle.animate}
        label={doodle.label}
        className={className}
        onError={() => {
          setOpen(false);
          onError();
        }}
      />
      <button
        type="button"
        title={`En savoir plus sur ${doodle.label}`}
        aria-label={`En savoir plus sur ${doodle.label}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition-opacity duration-200 hover:text-foreground focus-visible:opacity-100',
          coarse || open ? 'opacity-100' : 'opacity-0 group-hover/doodle:opacity-100',
        )}
      >
        <Icon icon="hugeicons:information-circle" className="h-4 w-4" />
      </button>
      {open && <DoodleCard doodle={doodle} coarse={coarse} onClose={() => setOpen(false)} />}
    </span>
  );
}

export default DoodleLogo;
