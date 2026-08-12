'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccountDialog } from '@/src/presentation/components/molecules/m-account-dialog';
import { authClient } from '@/lib/auth/client';
import { useAccount } from '@/src/presentation/stores/account.store';
import { useCryptoSession } from '@/src/presentation/stores/crypto-session.store';
import { attachSyncListeners, pullAndMerge } from '@/src/presentation/lib/sync/sync-engine';
import { attachSyncSubscribers } from '@/src/presentation/lib/sync/sync-subscribers';
import { loadDeviceDek } from '@/src/presentation/lib/sync/device-key-store';

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
  // spec 28 : hint d'ouverture « recovery » pour atterrir directement sur `unlock-recovery` (lien
  // « utiliser ma clé de récupération » de la page /account). `null` = comportement par défaut.
  const [openHint, setOpenHint] = useState<'recovery' | null>(null);
  const syncEnabled = useAccount((s) => s.syncEnabled);
  const session = authClient.useSession();

  // Ouverture cross-panels via event (miroir de `bym:open-search`). `detail.recovery=true` force
  // l'étape `unlock-recovery` (lien secondaire page /account).
  useEffect(() => {
    if (!authEnabled) return;
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { recovery?: boolean } | undefined;
      setOpenHint(detail?.recovery ? 'recovery' : null);
      setOpen(true);
    };
    window.addEventListener('bym:open-account', onOpen);
    return () => window.removeEventListener('bym:open-account', onOpen);
  }, [authEnabled]);

  // Hydratation « se souvenir de cet appareil » (spec 28) : au chargement, si une session est
  // présente, la master key absente et qu'un DEK persisté valide existe pour cet utilisateur, on le
  // restaure silencieusement (setMasterKey + pullAndMerge) — déverrouillage transparent sans
  // redemander le mot de passe. DEK absent/expiré → l'étape `unlock-password` à l'ouverture de la
  // modale. Best-effort : tout échec est silencieux (le dialog reste le filet).
  useEffect(() => {
    if (!authEnabled) return;
    const userId = session.data?.user?.id;
    if (!userId || session.isPending) return;
    if (useCryptoSession.getState().unlocked) return;
    let cancelled = false;
    void (async () => {
      const dek = await loadDeviceDek(userId);
      if (cancelled || !dek) return;
      if (useCryptoSession.getState().unlocked) return; // déverrouillé entre-temps (dialog)
      useCryptoSession.getState().setMasterKey(dek);
      try {
        await pullAndMerge();
      } catch {
        console.warn('sync: hydratation DEK device — pullAndMerge échoué');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authEnabled, session.data?.user?.id, session.isPending]);

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
      {authEnabled && (
        <AccountDialog
          open={open}
          openHint={openHint}
          onClose={() => {
            setOpen(false);
            setOpenHint(null);
          }}
        />
      )}
    </AccountAvailabilityContext.Provider>
  );
}

/**
 * Indicateur de session discret pour le menu apparence — spec 22 §7, spec 27 (seed avatar).
 * `active === null` → compte non configuré ou session en cours de chargement (on n'affiche rien) ;
 * `false` → compte configuré mais déconnecté ; `true` → connecté (`email` + `userId` renseignés).
 * `userId` sert de seed à l'avatar (opaque, stable, identique sur tous les appareils — pas l'e-mail).
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