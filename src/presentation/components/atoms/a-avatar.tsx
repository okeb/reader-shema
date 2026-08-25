'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { type AvatarVariant, buildAvatarUrl } from '@/src/shared/constants/reader-preferences';

export interface AvatarProps {
  /** Seed déterministe : e-mail du compte connecté (repli sur user.id si absent). */
  seed: string;
  variant: AvatarVariant;
  /** Sizing du conteneur (ex. `h-full w-full`). Le fond thématique + ring sont portés ici. */
  className?: string;
}

/**
 * Avatar utilisateur (spec 27, révisé) — déterministe depuis la seed, servi par l'app externe
 * `profil-generator-one` (SVG fetché à la demande, cache immutable 1 an côté CDN).
 *
 * L'image est rendue dans un `<img>` classique (pas `next/image`) : l'URL est déterministe et
 * déjà optimisée côté CDN, et cela évite de déclarer un `remotePattern`. En cas d'échec réseau
 * (service indisponible), l'`<img>` est masqué et le conteneur reste un disque thématique neutre
 * (ring + fond) — pas d'icône « image cassée ».
 *
 * Le conteneur `rounded-full ring-1 ring-border` clippe l'image ; le fond `--foreground` ne se
 * voit qu'avant le chargement ou en repli d'erreur.
 */
export function Avatar({ seed, variant, className }: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const url = buildAvatarUrl(seed, variant);

  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex items-center justify-center overflow-hidden rounded-full ring-1 ring-border',
        'bg-foreground/5 dark:bg-foreground/10',
        className,
      )}
    >
      {!errored && (
        <img
          src={url}
          alt=""
          draggable={false}
          onError={() => setErrored(true)}
          className="h-full w-full"
        />
      )}
    </span>
  );
}

export default Avatar;