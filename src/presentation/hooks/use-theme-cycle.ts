'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { type Theme, THEMES } from '@/src/shared/constants/theme';

/**
 * Adaptateur au-dessus de `next-themes` : expose le thème courant (auquel on a accès seulement
 * après montage côté client), `setTheme`, et `cycleTheme` (clair → sombre → système → clair).
 * Cf. ancien `lib/theme.ts` / `useTheme` du god-component.
 */
export function useThemeCycle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cycleTheme = useCallback(() => {
    const current = (theme as Theme) ?? 'system';
    const idx = THEMES.indexOf(current);
    const next = THEMES[(idx + 1) % THEMES.length];
    setTheme(next);
  }, [theme, setTheme]);

  return {
    mounted,
    theme: (theme as Theme) ?? 'system',
    setTheme: setTheme as (t: Theme) => void,
    cycleTheme,
  };
}