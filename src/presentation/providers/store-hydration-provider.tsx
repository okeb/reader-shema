'use client';

import { useEffect, type ReactNode } from 'react';
import { useActiveVersion } from '@/src/presentation/stores/active-version.store';

/**
 * Déclenche l'hydratation manuelle des stores qui n'utilisent pas le middleware `persist`
 * (actuellement `active-version`, à cause du format chaîne-brute + opt-out `persist: false`).
 * Les autres stores s'auto-hydratent via `persist.onRehydrateStorage`.
 *
 * Placé dans le layout (côté client), après QueryProvider.
 */
export function StoreHydrationProvider({ children }: { children: ReactNode }) {
  const hydrate = useActiveVersion((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return <>{children}</>;
}