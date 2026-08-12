'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { Link, useRouter } from '@/i18n/routing';
import { authClient } from '@/lib/auth/client';
import { useAccount } from '@/src/presentation/stores/account.store';
import { useCryptoSession } from '@/src/presentation/stores/crypto-session.store';
import { useAccountAvailability } from '@/src/presentation/components/organisms/o-account-provider';
import { deleteAccount } from '@/src/presentation/lib/sync/sync-engine';
import { clearDeviceDek } from '@/src/presentation/lib/sync/device-key-store';
import { downloadBackup } from '@/src/presentation/lib/data-transfer';
import { SiteFooter } from '@/src/presentation/components/molecules/m-footer';

/**
 * Page « Compte & données » — spec 25.
 *
 * Lieu unique de gestion d'un compte déjà authentifié : email, bascules de synchronisation,
 * export JSON, suppression du compte (deux temps) et déconnexion. La modal `m-account-dialog`
 * reste l'unique point d'entrée pour se connecter et déverrouiller (mot de passe routine, clé
 * de récupération en secours — spec 28) ; cette page suppose une session (gated par `proxy.ts`
 * → redirect vers `/` si non authentifié).
 *
 * États :
 *  - non authentifié (défensif, la proxy aurait dû rediriger) : CTA ouvrant la modal ;
 *  - authentifié + master key déverrouillée : gestion complète, sync active ;
 *  - authentifié + master key verrouillée : bannière « Déverrouiller » (mot de passe) + lien
 *    « utiliser ma clé de récupération » + actions locales (export, suppression, déconnexion) ;
 *    les bascules restent réglables mais sans effet tant que le déverrouillage n'est pas fait.
 *
 * Source unique des bascules `syncEnabled` / `settingsSyncOptIn` (spec 25 §4.4) : ni la modal
 * `done` ni le popup de réglages n'en portent.
 */
export default function AccountPage() {
  const router = useRouter();
  const { authEnabled } = useAccountAvailability();
  const session = authClient.useSession();
  const unlocked = useCryptoSession((s) => s.unlocked);

  const syncEnabled = useAccount((s) => s.syncEnabled);
  const setSyncEnabled = useAccount((s) => s.setSyncEnabled);
  const settingsSyncOptIn = useAccount((s) => s.settingsSyncOptIn);
  const setSettingsSyncOptIn = useAccount((s) => s.setSettingsSyncOptIn);
  const resetAccount = useAccount((s) => s.reset);

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const user = session.data?.user;
  const loading = session.isPending;

  // La proxy garantit une session avant rendu ; reste défensif si elle est absente malgré tout.
  if (!authEnabled || loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-[68ch] px-4 py-16">
          <Header />
          <p className="text-sm text-muted-foreground">…</p>
        </div>
        <SiteFooter className="mx-auto max-w-[68ch]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-[68ch] px-4 py-16">
          <Header />
          <div className="flex flex-col items-center px-4 py-20 text-center">
            <p className="text-muted-foreground">Aucune session active.</p>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('bym:open-account'))}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
            >
              <Icon icon="hugeicons:user-circle" className="h-4 w-4" />
              Se connecter
            </button>
          </div>
        </div>
        <SiteFooter className="mx-auto max-w-[68ch]" />
      </div>
    );
  }

  async function doDelete() {
    setDeleting(true);
    try {
      if (user?.id) await clearDeviceDek(user.id); // spec 28 : oublie le DEK de cet appareil.
      await deleteAccount();
      await authClient.signOut();
      resetAccount();
      router.replace('/read');
    } catch {
      // Erreur réseau / non authentifié : on laisse l'utilisateur réessayer.
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  async function signOut() {
    if (user?.id) await clearDeviceDek(user.id); // spec 28 : oublie le DEK de cet appareil.
    await authClient.signOut();
    useCryptoSession.getState().lock();
    router.replace('/read');
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[68ch] px-4 py-16">
        <Header email={user.email} />

        <div className="space-y-8">
          {/* Carte email. */}
          <section className="flex items-center gap-3 rounded-2xl border border-border bg-foreground/[2%] px-4 py-3">
            <Icon icon="hugeicons:user-circle" className="h-6 w-6 text-muted-foreground" />
            <span className="truncate text-sm text-foreground">{user.email}</span>
          </section>

          {/* Bannière de verrouillage (master key absente). */}
          {!unlocked && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
              <Icon icon="hugeicons:lock-key" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="flex-1">
                <p className="text-[13px] leading-snug text-foreground/90">
                  Synchronisation verrouillée — saisissez votre mot de passe pour reprendre la sync.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event('bym:open-account'))}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-[13px] transition-colors hover:bg-foreground/5"
                  >
                    <Icon icon="hugeicons:lock-key" className="h-4 w-4" />
                    Déverrouiller
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent('bym:open-account', { detail: { recovery: true } }),
                      )
                    }
                    className="text-[12px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
                  >
                    Utiliser ma clé de récupération
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Synchronisation. */}
          <section className="space-y-1">
            <ToggleRow
              label="Synchroniser sur mes appareils"
              checked={syncEnabled}
              onChange={() => setSyncEnabled(!syncEnabled)}
            />
            {syncEnabled && (
              <ToggleRow
                label="Synchroniser mes réglages"
                hint="Police, thème, disposition…"
                checked={settingsSyncOptIn}
                onChange={() => setSettingsSyncOptIn(!settingsSyncOptIn)}
                indent
              />
            )}
          </section>

          <div className="h-px bg-border" />

          {/* Données. */}
          <section className="space-y-1">
            <ActionRow
              icon="hugeicons:download-04"
              label="Exporter mes données"
              hint="Sauvegarde JSON locale, sans compte requis."
              onClick={downloadBackup}
            />
            {confirming ? (
              <div className="mt-1 rounded-2xl border border-destructive/40 bg-destructive/5 p-3">
                <p className="mb-3 text-[13px] leading-snug text-foreground">
                  Vos données cloud seront supprimées définitivement. Les données locales sont
                  conservées. Confirmer ?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={doDelete}
                    className="flex-1 rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
                  >
                    {deleting ? '…' : 'Supprimer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="flex-1 rounded-lg border border-input px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <ActionRow
                icon="ph:trash"
                label="Supprimer mon compte"
                destructive
                onClick={() => setConfirming(true)}
              />
            )}
            <ActionRow
              icon="hugeicons:logout-03"
              label="Se déconnecter"
              onClick={signOut}
            />
          </section>
        </div>
      </div>
      <SiteFooter className="mx-auto max-w-[68ch]" />
    </div>
  );
}

/** En-tête de page : titre + retour au lecteur (email facultatif en sous-titre). */
function Header({ email }: { email?: string }) {
  return (
    <header className="mb-10 flex items-center justify-between gap-4 pb-16 pt-24">
      <div>
        <h1 className="animate-fade-in-up font-serif text-3xl font-bold tracking-tight text-bold dark:text-white">
          Compte &amp; données
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {email ?? 'Gérez votre compte, la synchronisation et vos données.'}
        </p>
      </div>
      <Link
        href="/read"
        className="inline-flex animate-slide-in-right items-center gap-1.5 rounded-full bg-background/70 px-3 py-1.5 text-sm text-primary transition-all duration-700 hover:bg-primary/15"
      >
        <Icon icon="hugeicons:book-open-02" className="h-4 w-4" />
        Lecture
      </Link>
    </header>
  );
}

/** Bascule « switch » accessible (role="switch" + aria-checked). */
function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  indent,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: () => void;
  indent?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-foreground/[2%]',
        indent && 'pl-8',
      )}
    >
      <span>
        <span className="block text-sm text-foreground">{label}</span>
        {hint && <span className="mt-0.5 block text-[12px] text-muted-foreground">{hint}</span>}
      </span>
      <span
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-input',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
            checked ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}

/** Ligne d'action (export, suppression, déconnexion). */
function ActionRow({
  icon,
  label,
  hint,
  destructive,
  onClick,
}: {
  icon: string;
  label: string;
  hint?: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-foreground/[2%]',
        destructive ? 'text-destructive hover:bg-destructive/10' : 'text-foreground',
      )}
    >
      <Icon icon={icon} className="h-5 w-5 shrink-0" />
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="mt-0.5 block text-[12px] text-muted-foreground">{hint}</span>}
      </span>
    </button>
  );
}