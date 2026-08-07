'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccountDialog } from '@/src/presentation/components/molecules/m-account-dialog';
import { authClient } from '@/lib/auth/client';
import { useAccount } from '@/src/presentation/stores/account.store';
import { attachSyncListeners } from '@/src/presentation/lib/sync/sync-engine';
import { attachSyncSubscribers } from '@/src/presentation/lib/sync/sync-subscribers';

/**
 * Fournit la disponibilité du compte (auth+DB configurées) au reste de l'arbre —
 * spec 22 §7. Les entrées « Retrouver sur tous vos appareils » (panneaux notes/signets,
 * page favoris) et l'indicateur de session s'affichent uniquement si `authEnabled`.
 *
 * Monte la modale de compte (via l'event `bym:open-account`, miroir de `bym:open-search`)
 * et branche les écouteurs de sync (online / visibility + abonnés aux stores) quand la
 * sync est activée. Le moteur reste inerte tant que la master key n'est pas déverrouillée.
 */

const AccountAvailabilityContext = createContext<{ authEnabled: boolean }>({ authEnabled: false });

/** Hook consommé par les entrées « Retrouver sur tous vos appareils » + indicateur de session. */
export function useAccountAvailability(): { authEnabled: boolean } {
  return useContext(AccountAvailabilityContext);
}

interface AccountProviderProps {
  /** Auth Neon + DB configurées côté serveur ? (calculé par le layout serveur). */
  authEnabled: boolean;
  children: ReactNode;
}

export function AccountProvider({ authEnabled, children }: AccountProviderProps) {
  const [open, setOpen] = useState(false);
  const syncEnabled = useAccount((s) => s.syncEnabled);

  // Ouverture cross-panels via event (miroir de `bym:open-search`).
  useEffect(() => {
    if (!authEnabled) return;
    const onOpen = () => setOpen(true);
    window.addEventListener('bym:open-account', onOpen);
    return () => window.removeEventListener('bym:open-account', onOpen);
  }, [authEnabled]);

  // Sync : branche abonnés (mutations locales) + écouteurs (online / visibility) uniquement
  // quand la sync est activée. Détache (sans perte) si l'utilisateur désactive le toggle.
  useEffect(() => {
    if (!authEnabled || !syncEnabled) return;
    const detachListeners = attachSyncListeners();
    const detachSubscribers = attachSyncSubscribers();
    return () => {
      detachListeners();
      detachSubscribers();
    };
  }, [authEnabled, syncEnabled]);

  return (
    <AccountAvailabilityContext.Provider value={{ authEnabled }}>
      {children}
      {authEnabled && <AccountDialog open={open} onClose={() => setOpen(false)} />}
    </AccountAvailabilityContext.Provider>
  );
}

/**
 * Indicateur de session discret pour le menu apparence — spec 22 §7.
 * `active === null` → compte non configuré ou session en cours de chargement (on n'affiche rien) ;
 * `false` → compte configuré mais déconnecté ; `true` → connecté (`email` renseigné).
 */
export function useSessionIndicator(): { active: boolean | null; email: string | null } {
  const { authEnabled } = useContext(AccountAvailabilityContext);
  const session = authClient.useSession();
  if (!authEnabled || session.isPending) return { active: null, email: null };
  return { active: Boolean(session.data?.user), email: session.data?.user.email ?? null };
}