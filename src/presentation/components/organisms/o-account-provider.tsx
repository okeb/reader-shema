'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccountDialog } from '@/src/presentation/components/molecules/m-account-dialog';
import { authClient } from '@/lib/auth/client';
import { useAccount } from '@/src/presentation/stores/account.store';
import {
  attachSyncListeners,
  convertLegacy,
  migrate,
  setSyncUser,
} from '@/src/presentation/lib/sync/sync-engine';
import { attachSyncSubscribers } from '@/src/presentation/lib/sync/sync-subscribers';
import { clearDeviceDek, loadDeviceDek } from '@/src/presentation/lib/sync/device-key-store';

/**
 * Fournit la disponibilité du compte (auth+DB configurées) au reste de l'arbre —
 * spec 22 §7. Les entrées « Retrouver sur tous vos appareils » (panneaux notes/signets,
 * page favoris) et l'indicateur de session s'affichent uniquement si `authEnabled`.
 *
 * Monte la modale de compte (via l'event `bym:open-account`, miroir de `bym:open-search`) et
 * pilote la sync (spec 39) : connecté = synchronisé. Dès qu'une session existe, on déclare
 * l'utilisateur au moteur, on branche les abonnés (mutations locales) et les écouteurs (online /
 * visibility), puis on rapproche le local du cloud (`migrate`). Si l'appareil a encore la clé de
 * l'ancienne sync chiffrée, l'archive est convertie au passage, sans rien demander.
 */

const AccountAvailabilityContext = createContext<{ authEnabled: boolean }>({ authEnabled: false });

/** Hook consommé par les entrées « Retrouver sur tous vos appareils » + indicateur de session. */
export function useAccountAvailability(): { authEnabled: boolean } {
  return useContext(AccountAvailabilityContext);
}

interface AccountProviderProps {
  /** Auth + DB configurées côté serveur ? (calculé par le layout serveur). */
  authEnabled: boolean;
  children: ReactNode;
}

export function AccountProvider({ authEnabled, children }: AccountProviderProps) {
  const [open, setOpen] = useState(false);
  const session = authClient.useSession();
  const userId = session.data?.user?.id ?? null;
  const syncPaused = useAccount((s) => s.syncPaused);

  // Ouverture cross-panels via event (miroir de `bym:open-search`).
  useEffect(() => {
    if (!authEnabled) return;
    const onOpen = () => setOpen(true);
    window.addEventListener('bym:open-account', onOpen);
    return () => window.removeEventListener('bym:open-account', onOpen);
  }, [authEnabled]);

  // Utilisateur de la sync : suit la session (déconnexion → `null`, file + horloges vidées).
  useEffect(() => {
    if (!authEnabled || session.isPending) return;
    setSyncUser(userId);
  }, [authEnabled, session.isPending, userId]);

  // Abonnés + écouteurs tant qu'une session existe. En pause, les modifications sont mises en
  // file (et partent à la reprise) ; seuls les échanges réseau sont suspendus.
  useEffect(() => {
    if (!authEnabled || !userId) return;
    const detachListeners = attachSyncListeners();
    const detachSubscribers = attachSyncSubscribers();
    return () => {
      detachListeners();
      detachSubscribers();
    };
  }, [authEnabled, userId]);

  // Au chargement / à la connexion / à la reprise : conversion de l'archive chiffrée si l'appareil
  // en a encore la clé (spec 39 §4.3), puis rapprochement local ↔ cloud. Best-effort, silencieux.
  useEffect(() => {
    if (!authEnabled || !userId || syncPaused) return;
    let cancelled = false;
    void (async () => {
      setSyncUser(userId); // l'effet ci-dessus peut ne pas avoir encore tourné
      try {
        const dek = await loadDeviceDek(userId);
        if (cancelled) return;
        if (dek) {
          const r = await convertLegacy({ dek });
          // Clé inutile désormais (archive convertie, absente ou illisible avec elle).
          if (r !== 'partial') await clearDeviceDek(userId);
        }
        if (!cancelled) await migrate();
      } catch (err) {
        console.warn('sync: rapprochement au chargement échoué', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authEnabled, userId, syncPaused]);

  return (
    <AccountAvailabilityContext.Provider value={{ authEnabled }}>
      {children}
      {authEnabled && <AccountDialog open={open} onClose={() => setOpen(false)} />}
    </AccountAvailabilityContext.Provider>
  );
}

/**
 * Indicateur de session discret pour le menu apparence — spec 22 §7, spec 27 (seed avatar).
 * `active === null` → compte non configuré ou session en cours de chargement (on n'affiche rien) ;
 * `false` → compte configuré mais déconnecté ; `true` → connecté (`email` + `userId` renseignés).
 * `email` est affiché dans le menu (individu connecté) ; `userId` sert de seed à l'avatar (jamais l'e-mail).
 */
export function useSessionIndicator(): {
  active: boolean | null;
  email: string | null;
  userId: string | null;
} {
  const { authEnabled } = useContext(AccountAvailabilityContext);
  const session = authClient.useSession();
  if (!authEnabled || session.isPending) return { active: null, email: null, userId: null };
  return {
    active: Boolean(session.data?.user),
    email: session.data?.user.email ?? null,
    userId: session.data?.user.id ?? null,
  };
}