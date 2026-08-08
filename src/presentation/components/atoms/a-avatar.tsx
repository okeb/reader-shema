'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { minidenticon } from 'minidenticons';
import { cn } from '@/lib/utils';
import {
  type AvatarStyle,
  type PlayfulVariant,
  AVATAR_PALETTE_LIGHT,
  AVATAR_PALETTE_DARK,
} from '@/src/shared/constants/reader-preferences';

export interface AvatarProps {
  /** Seed déterministe (user.id Better Auth — opaque, stable, identique sur tous les appareils). */
  seed: string;
  style: AvatarStyle;
  variant?: PlayfulVariant;
  /** Sizing du conteneur (ex. `h-full w-full`). Le fond thématique + ring sont portés ici. */
  className?: string;
}

/**
 * Avatar utilisateur (spec 27) — déterministe depuis la seed, rendu côté client.
 *
 * Deux générateurs au choix :
 *  - `minidenticons` : identicon pixelisé (string SVG → data URI dans un `<img>`). SSR-safe : la
 *    lib ne touche à `customElements` qu'avec `globalThis.customElements?.` (optional chaining).
 *  - `playful` : web component `<playful-avatar>` (playful-avatars). La lib appelle
 *    `customElements.define` au top-level **sans garde** → on l'importe dynamiquement côté client
 *    (dans un effet) pour éviter un `ReferenceError` au SSR.
 *
 * Le fond suit le thème : conteneur `ring-1 ring-border` + teinte `--foreground` (theme-aware via
 * les variants `dark:`). `minidenticons` ajuste sa `lightness` au thème ; `playful` reçoit une
 * palette claire/sombre. Le générateur ne s'affiche qu'après montage (repli sur disque thématique
 * vide) pour éviter un flash clair/sombre et un mismatch d'hydration.
 */
export function Avatar({ seed, style, variant = 'beam', className }: AvatarProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [playfulReady, setPlayfulReady] = useState(false);

  useEffect(() => setMounted(true), []);

  // Enregistre <playful-avatar> côté client uniquement (cf. commentaire de module).
  useEffect(() => {
    if (style !== 'playful' || playfulReady) return;
    let cancelled = false;
    void import('playful-avatars').then(() => {
      if (!cancelled) setPlayfulReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [style, playfulReady]);

  const isDark = mounted && resolvedTheme === 'dark';

  // minidenticon : string SVG → data URI. Mémoïsé par (seed, thème).
  const miniDataUri = useMemo(() => {
    if (style !== 'minidenticons' || !mounted) return null;
    const lightness = isDark ? 60 : 45;
    return `data:image/svg+xml;utf8,${encodeURIComponent(minidenticon(seed, 80, lightness))}`;
  }, [style, seed, isDark, mounted]);

  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex items-center justify-center overflow-hidden rounded-full ring-1 ring-border',
        'bg-foreground/5 dark:bg-foreground/10',
        className,
      )}
    >
      {style === 'minidenticons' && miniDataUri && (
        <img src={miniDataUri} alt="" className="h-full w-full" />
      )}
      {style === 'playful' && playfulReady && (
        <playful-avatar
          name={seed}
          variant={variant}
          colors={isDark ? AVATAR_PALETTE_DARK : AVATAR_PALETTE_LIGHT}
          className="h-full w-full rounded-full"
        />
      )}
    </span>
  );
}

export default Avatar;