'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

/**
 * Provider de thème (next-themes). Préserve la clé localStorage de l'ancien app (`bym:theme`)
 * et pilote la classe `.dark` sur <html>. `enableSystem` + `defaultTheme="system"` réplique le
 * comportement historique (light / dark / system). next-themes injecte son propre script bloquant
 * pour éviter le flash pré-paint.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="bym:theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}