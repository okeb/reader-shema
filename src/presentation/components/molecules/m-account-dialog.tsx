'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { authClient } from '@/lib/auth/client';
import { useScrollLock } from '@/src/presentation/hooks/use-scroll-lock';
import { useFocusTrap } from '@/src/presentation/hooks/use-focus-trap';
import { Link } from '@/i18n/routing';
import {
  generateRecoveryKey,
  deriveMasterKey,
} from '@/src/infrastructure/crypto/crypto.service';
import { useCryptoSession } from '@/src/presentation/stores/crypto-session.store';
import { useAccount } from '@/src/presentation/stores/account.store';
import {
  hasCloudData,
  migrate,
  pullAndMerge,
} from '@/src/presentation/lib/sync/sync-engine';

type Step =
  | 'email' // saisie email → mot de passe
  | 'password' // saisie mot de passe (sign in / sign up)
  | 'recovery-display' // 1ʳᵉ fois : on montre la recovery key (à copier)
  | 'recovery-entry' // retour appareil : on saisit la recovery key
  | 'migrating' // migration local → cloud en cours
  | 'done'; // compte ouvert + sync active

interface AccountDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Modale de compte custom (pas de composants AuthView pré-construits) — spec 22 §7.
 *
 * Machine à états : `email-entry → magic-link-sent / password → recovery-key-display
 * (1ʳᵉ fois) | recovery-key-entry (retour) → migrating → done`. UI maison sous
 * `createPortal`, `useScrollLock`, `role="dialog"`, piège à focus maison
 * (`use-focus-trap`), Échap pour fermer, bottom-sheet mobile / centré desktop.
 *
 * La recovery key est **purement client** : générée et dérivée en mémoire, jamais
 * envoyée. Le serveur ne la voit jamais. Sa perte = données irrécupérables (spec).
 *
 * @see specs/22-compte-sync-admin.md §5.6, §7
 */
export function AccountDialog({ open, onClose }: AccountDialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollLock(open);
  useFocusTrap(open, ref);

  const session = authClient.useSession();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pwMode, setPwMode] = useState<'in' | 'up'>('in');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Initialisation au redimensionnement de la modale : positionne l'étape selon la session
  // courante et l'état de déverrouillage de la master key.
  useEffect(() => {
    if (!open) return;
    setError('');
    const unlocked = useCryptoSession.getState().unlocked;
    if (session.data?.user && unlocked) {
      setStep('done');
    } else if (session.data?.user && !unlocked) {
      void advanceAfterAuth();
    } else {
      setStep('email');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Quand la session passe à un utilisateur (login confirmé) pendant qu'on est sur
  // une étape d'auth, on avance vers le chemin recovery.
  useEffect(() => {
    if (!open || session.isPending) return;
    if (session.data?.user && step === 'password') {
      void advanceAfterAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.data, session.isPending, open]);

  // Déconnexion détectée (depuis un autre onglet, ou après signOut) → retour à l'email.
  useEffect(() => {
    if (!open) return;
    if (!session.data?.user && !session.isPending && step !== 'email') {
      setStep('email');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.data, session.isPending, open]);

  async function advanceAfterAuth() {
    setBusy(true);
    setError('');
    try {
      const has = await hasCloudData();
      if (has === null) {
        // Pas de compte configuré (mode local-only) : rien à synchroniser.
        setStep('done');
        return;
      }
      if (has) {
        // Retour sur un appareil : le cloud a des blobs → on demande la recovery key.
        setStep('recovery-entry');
      } else {
        // Premier login : on génère une recovery key (affichée une fois) et on dérive.
        const key = generateRecoveryKey();
        const masterKey = await deriveMasterKey(key);
        useCryptoSession.getState().setMasterKey(masterKey);
        setGeneratedKey(key);
        useAccount.getState().setSyncEnabled(true);
        setStep('recovery-display');
      }
    } catch {
      setError('Impossible de vérifier vos données synchronisées.');
      setStep('done');
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword() {
    if (!email.trim() || !password) return;
    setBusy(true);
    setError('');
    const trimmed = email.trim();
    if (pwMode === 'up') {
      const { error } = await authClient.signUp.email({
        email: trimmed,
        password,
        name: trimmed.split('@')[0],
      });
      setBusy(false);
      if (error) {
        setError(error.message ?? 'Un compte existe déjà pour cet email.');
        return;
      }
    } else {
      const { error } = await authClient.signIn.email({ email: trimmed, password });
      setBusy(false);
      if (error) {
        setError(error.message ?? 'Email ou mot de passe incorrect.');
        return;
      }
    }
    // Le succès déclenche l'avancée via l'effet sur `session.data`.
  }

  async function submitRecovery() {
    if (!recoveryKey.trim()) return;
    setBusy(true);
    setError('');
    try {
      const masterKey = await deriveMasterKey(recoveryKey.trim());
      useCryptoSession.getState().setMasterKey(masterKey);
      await pullAndMerge();
      setStep('done');
    } catch {
      setError('Clé de récupération incorrecte.');
    } finally {
      setBusy(false);
    }
  }

  async function acknowledgeRecovery() {
    setStep('migrating');
    setError('');
    try {
      await migrate();
    } catch {
      // La migration peut échouer partiellement (réseau) ; la file offline reprendra.
      console.warn('sync: migration partielle');
    }
    setStep('done');
  }

  async function signOut() {
    await authClient.signOut();
    useCryptoSession.getState().lock();
    setStep('email');
    setRecoveryKey('');
    setGeneratedKey('');
    onClose();
  }

  function copyRecovery() {
    void navigator.clipboard?.writeText(generatedKey);
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Compte et synchronisation"
        className="w-full max-w-md overflow-hidden rounded-t-2xl border border-border bg-popover shadow-2xl animate-fade-in-up sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Compte &amp; synchronisation</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          >
            <Icon icon="hugeicons:cancel-01" className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto px-4 py-4">
          {/* Étape : saisie email → mot de passe. */}
          {step === 'email' && (
            <div className="space-y-3">
              <p className="text-[13px] leading-snug text-muted-foreground">
                Retrouvez vos favoris et votre position de lecture sur tous vos appareils.
                Aucun score, aucune statistique. Vos données sont chiffrées bout-en-bout.
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                disabled={busy || !email.trim()}
                onClick={() => {
                  setPwMode('in');
                  setStep('password');
                }}
                className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
              >
                Continuer
              </button>
              {error && <p className="text-[12px] text-destructive">{error}</p>}
            </div>
          )}

          {/* Étape : mot de passe (sign in / sign up). */}
          {step === 'password' && (
            <div className="space-y-3">
              <div className="flex gap-0.5 rounded-lg bg-input p-0.5">
                {(['in', 'up'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPwMode(m)}
                    className={cn(
                      'flex-1 rounded-md px-1.5 py-1 text-[12px] font-medium transition-colors',
                      pwMode === m ? 'bg-background text-foreground shadow-sm' : 'text-foreground/70',
                    )}
                  >
                    {m === 'in' ? 'Se connecter' : 'Créer un compte'}
                  </button>
                ))}
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                disabled={busy || !email.trim() || !password}
                onClick={submitPassword}
                className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
              >
                {busy ? '…' : pwMode === 'up' ? 'Créer mon compte' : 'Se connecter'}
              </button>
              {error && <p className="text-[12px] text-destructive">{error}</p>}
            </div>
          )}

          {/* Étape : affichage unique de la recovery key (1ʳᵉ fois). */}
          {step === 'recovery-display' && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                <Icon icon="hugeicons:alert-diamond" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-[12px] leading-snug text-foreground/90">
                  Sans cette clé, vos données sont <strong>irrécupérables</strong>. Nous ne
                  la stockons pas. Notez-la maintenant et conservez-la en lieu sûr.
                </p>
              </div>
              <code className="block break-all rounded-lg border border-input bg-muted px-3 py-3 font-mono text-[13px] tracking-wide text-foreground">
                {generatedKey}
              </code>
              <button
                type="button"
                onClick={copyRecovery}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-input px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
              >
                <Icon icon="hugeicons:copy-02" className="h-4 w-4" />
                Copier la clé
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={acknowledgeRecovery}
                className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
              >
                J’ai noté ma clé, synchroniser
              </button>
            </div>
          )}

          {/* Étape : saisie de la recovery key (retour sur un appareil). */}
          {step === 'recovery-entry' && (
            <div className="space-y-3">
              <p className="text-[13px] leading-snug text-muted-foreground">
                Saisissez votre clé de récupération pour déverrouiller vos données sur cet
                appareil. Elle est chiffrée localement et ne quitte pas ce navigateur.
              </p>
              <input
                type="text"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                placeholder="Clé de récupération"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-[13px] outline-none focus:border-primary"
              />
              <button
                type="button"
                disabled={busy || !recoveryKey.trim()}
                onClick={submitRecovery}
                className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
              >
                {busy ? 'Déverrouillage…' : 'Déverrouiller'}
              </button>
              {error && <p className="text-[12px] text-destructive">{error}</p>}
            </div>
          )}

          {/* Étape : migration en cours. */}
          {step === 'migrating' && (
            <div className="space-y-3 py-4 text-center">
              <Icon icon="hugeicons:cloud-upload" className="mx-auto h-8 w-8 animate-pulse text-primary" />
              <p className="text-[13px] leading-snug text-muted-foreground">
                Récupération de vos données sur le cloud chiffré…
              </p>
            </div>
          )}

          {/* Étape : compte ouvert. La gestion des données (bascules de sync, export,
              suppression) vit sur la page /account (spec 25) — la modale n'est plus que le
              point d'entrée se connecter / déverrouiller. */}
          {step === 'done' && session.data?.user && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-foreground/[3%] px-3 py-2">
                <Icon icon="hugeicons:user-circle" className="h-5 w-5 text-muted-foreground" />
                <span className="truncate text-[13px] text-foreground">
                  {session.data.user.email}
                </span>
              </div>
              <p className="text-[12px] leading-snug text-muted-foreground">
                Vos favoris et votre position de lecture se synchronisent sur vos appareils.
                Pas de score, pas de statistique.
              </p>
              <Link
                href="/account"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Icon icon="hugeicons:settings" className="h-4 w-4" />
                Gérer mes données
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground transition-colors hover:bg-foreground/5"
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default AccountDialog;