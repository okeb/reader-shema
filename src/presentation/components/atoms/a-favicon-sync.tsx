'use client';

import { useEffect } from 'react';

import { useReaderPreferences } from '@/src/presentation/stores/reader-preferences.store';

/**
 * Synchronise le `<link rel="icon">` du document avec la préférence `appIcon` (spec 32 §5.5).
 *
 * Le favicon est émis statiquement par `metadata.icons.icon` (`/brand-icon`) dans le layout
 * localisé — lequel est rendu statiquement par locale, impossible d'y lire la préférence au build.
 * Ce composant client ajuste donc le href après hydratation : `/brand-icon?icon=<key>` quand
 * l'utilisateur a choisi une variante, `/brand-icon` (tirage aléatoire serveur) en mode `'auto'`.
 * Le navigateur met à jour l'icône d'onglet quand le href change.
 */
export function FaviconSync() {
  const appIcon = useReaderPreferences((s) => s.appIcon);

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;
    link.href = appIcon === 'auto' ? '/brand-icon' : `/brand-icon?icon=${appIcon}`;
  }, [appIcon]);

  return null;
}