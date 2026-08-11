'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { authClient } from '@/lib/auth/client';
import { useScrollLock } from '@/src/presentation/hooks/use-scroll-lock';
import { useFocusTrap } from '@/src/presentation/hooks/use-focus-trap';
import { Link } from '@/i18n/routing';
import { useCryptoSession } from '@/src/presentation/stores/crypto-session.store';
import { useAccount } from '@/src/presentation/stores/account.store';
import {
  hasCloudData,
  migrate,
  getEnvelope,
  unlockWithPassword,
  unlockWithRecoveryKey,
  bootstrapEnvelope,
  purgeCloudData,
  upgradeLegacyToEnvelope,
  BootstrapLostError,
} from '@/src/presentation/lib/sync/sync-engine';
import { storeDeviceDek, clearDeviceDek } from '@/src/presentation/lib/sync/device-key-store';

type Step =
  | 'email' // saisie email → mot de passe
  | 'password' // saisie mot de passe (sign in / sign up)
  | 'forgot-password' // saisie email → envoi du reset (spec 26)
  | 'forgot-password-sent' // confirmation envoi reset
  | 'magic-link-sent' // confirmation envoi lien magique
  | 'unlock-password' // reload / reset legacy : (re)saisie du mot de passe (routine) — spec 28
  | 'unlock-recovery' // urgence / magic-link / legacy : saisie de la clé de récupération — spec 28
  | 'recovery-display' // 1ʳᵉ fois / reset : on montre la recovery key (e-mailée en filet) — spec 28
  | 'migrating' // migration local → cloud en cours
  | 'done'; // compte ouvert + sync active

interface AccountDialogProps {
  open: boolean;
  /** spec 28 : `'recovery'` force l'étape `unlock-recovery` à l'ouverture (lien page /account). */
  openHint?: 'recovery' | null;
  onClose: () => void;
}

/**
 * Modale de compte custom (pas de composants AuthView pré-construits) — spec 22 §7, spec 28.
 *
 * Machine à états spec 28 : le déverrouillage routine se fait au **mot de passe**, la **clé de
 * récupération** est l'urgence (compte perdu / mot de passe oublié) ET le déverrouillage routine des
 * comptes magic-link (sans mot de passe). Une enveloppe DEK/KEK (`kind='keyEnvelope'`) gate le
 * premier-login vs retour : présente → `unlockWithPassword` (transparent si mot de passe en state) ;
 * absente → `bootstrapEnvelope` (inscription) ou migration legacy.
 *
 * « Se souvenir de cet appareil (30 jours) » : opt-in qui persiste le DEK (non-extractable) sur
 * l'appareil via IndexedDB → déverrouillage silencieux au reload (hydraté dans `o-account-provider`).
 *
 * UI maison sous `createPortal`, `useScrollLock`, `role="dialog"`, piège à focus maison
 * (`use-focus-trap`), Échap pour fermer, bottom-sheet mobile / centré desktop.
 *
 * @see specs/28-deverouillage-mdp-enveloppe.md
 */
export function AccountDialog({ open, openHint, onClose }: AccountDialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollLock(open);
  useFocusTrap(open, ref);

  const session = authClient.useSession();
  const locale = useLocale();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pwMode, setPwMode] = useState<'in' | 'up'>('in');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // spec 28 : case « se souvenir de cet appareil (30 jours) » sur les étapes de déverrouillage.
  const [rememberDevice, setRememberDevice] = useState(false);
  // spec 28 : `unlock-recovery` en mode legacy (anciens blobs sans enveloppe) vs urgence.
  const [legacyMode, setLegacyMode] = useState(false);
  // spec 28 : `unlock-password` en mode 'unlock' (reload routine) ou 'reset' (legacy → repartir à zéro).
  const [unlockMode, setUnlockMode] = useState<'unlock' | 'reset'>('unlock');

  // Callbacks localisés pour les flux e-mail (Better Auth appends le token à l'URL). (spec 26)
  const resetCallbackURL = `/${locale}/reinitialiser`;
  const accountCallbackURL = `/${locale}/account`;

  // Initialisation à l'ouverture de la modale : positionne l'étape selon la session courante et
  // l'état de déverrouillage de la master key.
  useEffect(() => {
    if (!open) return;
    setError('');
    setRememberDevice(false);
    const unlocked = useCryptoSession.getState().unlocked;
    if (session.data?.user && unlocked) {
      setStep('done');
    } else if (session.data?.user && !unlocked) {
      void advanceAfterAuth({ forceRecovery: openHint === 'recovery' });
    } else {
      setStep('email');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Quand la session passe à un utilisateur (login confirmé) pendant qu'on est sur une étape
  // d'auth, on avance vers le chemin de déverrouillage / bootstrap.
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

  /**
   * Route le post-auth selon la PRÉSENCE de l'enveloppe (gate premier-login vs retour) — spec 28.
   *
   * - Enveloppe présente + mot de passe en state (connexion fraîche) → `unlockWithPassword`
   *   transparent → done.
   * - Enveloppe présente + pas de mot de passe (reload, DEK device absent/expiré) → étape
   *   `unlock-password` (routine).
   * - Enveloppe absente + blobs legacy (`hasCloudData()=true`) → `unlock-recovery` legacy
   *   (récupérer via ancienne clé OU repartir à zéro).
   * - Enveloppe absente + compte vierge → `bootstrapEnvelope` (inscription) → `recovery-display`.
   * - Enveloppe absente + mode local-only (`hasCloudData()=null`) → done (rien à synchroniser).
   */
  async function advanceAfterAuth(opts?: { forceRecovery?: boolean }) {
    setBusy(true);
    setError('');
    try {
      const envelope = await getEnvelope();
      if (envelope) {
        if (opts?.forceRecovery) {
          // Lien « utiliser ma clé de récupération » de /account : on saute le mot de passe.
          setLegacyMode(false);
          setStep('unlock-recovery');
          return;
        }
        if (password) {
          // Connexion fraîche : le mot de passe est en state → déverrouillage transparent.
          const r = await unlockWithPassword(password);
          setPassword('');
          if (r === 'ok') {
            await maybeStoreDevice();
            setStep('done');
          } else if (r === 'wrong') {
            setUnlockMode('unlock');
            setStep('unlock-password');
            setError('Mot de passe incorrect.');
          } else if (r === 'no-pw-wrap') {
            // Compte magic-link (pas de pwWrap) → déverrouillage routine par clé de récupération.
            setLegacyMode(false);
            setStep('unlock-recovery');
          } else {
            // no-envelope (race deux-appareils entre temps) → on bootstrappe.
            await doBootstrap();
          }
        } else {
          // Reload : pas de mot de passe en state → on le demande (routine).
          setUnlockMode('unlock');
          setStep('unlock-password');
        }
        return;
      }

      // Enveloppe absente : distingue local-only / legacy / compte vierge via hasCloudData().
      setPassword('');
      const has = await hasCloudData();
      if (has === null) {
        setStep('done'); // mode local-only : rien à synchroniser.
      } else if (has) {
        // Anciens blobs pré-spec-28 sans enveloppe → récupération (ancienne clé) ou reset.
        setLegacyMode(true);
        setUnlockMode('reset');
        setStep('unlock-recovery');
      } else {
        // Compte vierge (inscription) → on crée l'enveloppe.
        await doBootstrap();
      }
    } catch {
      setError('Impossible de vérifier vos données synchronisées.');
      setStep('done');
    } finally {
      setBusy(false);
    }
  }

  /** Persiste le DEK sur l'appareil si « se souvenir » est coché (opt-in, 30 j) — spec 28. */
  async function maybeStoreDevice() {
    if (!rememberDevice || !session.data?.user) return;
    const dek = useCryptoSession.getState().masterKey;
    if (dek) await storeDeviceDek(session.data.user.id, dek);
  }

  /**
   * Crée l'enveloppe DEK/KEK (inscription ou reset legacy) — spec 28. E-mail la clé de récupération
   * (filet) puis affiche `recovery-display`. En cas de race perdue → `unlock-recovery` avec la clé
   * e-mailée du gagnant.
   */
  async function doBootstrap() {
    try {
      const key = await bootstrapEnvelope({ password: password || undefined, emailKey: true });
      setGeneratedKey(key);
      await maybeStoreDevice();
      setStep('recovery-display');
    } catch (e) {
      if (e instanceof BootstrapLostError) {
        setLegacyMode(false);
        setStep('unlock-recovery');
        setError('Un autre appareil a déjà configuré la synchronisation. Saisissez la clé de récupération qui vous a été envoyée par e-mail.');
      } else {
        setError('Impossible de configurer la synchronisation.');
        setStep('done');
      }
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
      // Best-effort : on demande l'envoi de l'e-mail de vérification (Resend). Ne bloque
      // pas l'inscription — swallow si Resend absent (no-op) ou si l'envoi échoue. (spec 26)
      void authClient
        .sendVerificationEmail({ email: trimmed, callbackURL: accountCallbackURL })
        .catch(() => {});
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

  /**
   * Soumet l'étape `unlock-password` — spec 28. En mode 'unlock' : déverrouillage routine au mot de
   * passe. En mode 'reset' (legacy sans ancienne clé) : purge les blobs legacy + bootstrap d'une
   * nouvelle enveloppe (mot de passe courant pour le pwWrap, ou magic-link si vide).
   */
  async function submitUnlockPassword() {
    if (unlockMode === 'reset' && !password && !rememberDevice) {
      // Reset autorisé sans mot de passe (magic-link) ; on n'exige pas password ici.
    }
    setBusy(true);
    setError('');
    try {
      if (unlockMode === 'reset') {
        await purgeCloudData();
        try {
          await doBootstrap();
        } catch {
          setError('Réinitialisation échouée. Réessayez.');
        }
        return;
      }
      const r = await unlockWithPassword(password);
      setPassword('');
      if (r === 'ok') {
        await maybeStoreDevice();
        setStep('done');
      } else if (r === 'wrong') {
        setError('Mot de passe incorrect.');
      } else if (r === 'no-pw-wrap') {
        setLegacyMode(false);
        setStep('unlock-recovery');
      } else {
        // no-envelope (race) → on bootstrappe.
        await doBootstrap();
      }
    } catch {
      setError('Déverrouillage échoué. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Soumet l'étape `unlock-recovery` — spec 28. En mode urgence : déverrouillage par clé de
   * récupération. En mode legacy : migration des anciens blobs vers l'enveloppe (la nouvelle clé
   * est e-mailée ; pwWrap absent → rewrap ultérieur depuis /account).
   */
  async function submitRecovery() {
    if (!recoveryKey.trim()) return;
    setBusy(true);
    setError('');
    try {
      if (legacyMode) {
        await upgradeLegacyToEnvelope(recoveryKey.trim());
        await maybeStoreDevice();
        setStep('done');
        return;
      }
      const r = await unlockWithRecoveryKey(recoveryKey.trim());
      if (r === 'ok') {
        await maybeStoreDevice();
        setStep('done');
      } else if (r === 'no-envelope') {
        await doBootstrap();
      } else {
        setError('Clé de récupération incorrecte.');
      }
    } catch {
      // wrong-legacy-key (sync-engine) ou mauvaise clé de récupération → même message.
      setError('Clé de récupération incorrecte.');
    } finally {
      setBusy(false);
      setRecoveryKey('');
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

  // --- Flux e-mail (spec 26 : Better Auth raw + Resend) ---

  async function submitForgotPassword() {
    if (!email.trim()) return;
    setBusy(true);
    setError('');
    try {
      // Même message quel que soit le résultat : on ne fuite pas l'existence du compte.
      // 1.4.18 : l'endpoint `/request-password-reset` expose `redirectTo` (pas `callbackURL`) ;
      // le serveur construit `${baseURL}/reset-password/${token}?callbackURL=${redirectTo}`.
      await authClient.requestPasswordReset({ email: email.trim(), redirectTo: resetCallbackURL });
      setStep('forgot-password-sent');
    } catch {
      setStep('forgot-password-sent');
    } finally {
      setBusy(false);
    }
  }

  async function submitMagicLink() {
    if (!email.trim()) return;
    setBusy(true);
    setError('');
    try {
      await authClient.signIn.magicLink({ email: email.trim(), callbackURL: accountCallbackURL });
      setStep('magic-link-sent');
    } catch {
      setError("Impossible d'envoyer le lien de connexion.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const userId = session.data?.user?.id;
    await authClient.signOut();
    if (userId) await clearDeviceDek(userId); // spec 28 : oublie le DEK de cet appareil.
    useCryptoSession.getState().lock();
    setStep('email');
    setRecoveryKey('');
    setGeneratedKey('');
    setPassword('');
    setLegacyMode(false);
    setUnlockMode('unlock');
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
              <div className="flex items-center gap-2 py-0.5 text-[11px] text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>ou</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <button
                type="button"
                disabled={busy || !email.trim()}
                onClick={submitMagicLink}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm transition-colors hover:bg-foreground/5 disabled:opacity-50"
              >
                {busy ? '…' : 'Recevoir un lien de connexion'}
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
              {pwMode === 'in' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setError('');
                    setStep('forgot-password');
                  }}
                  className="text-right text-[12px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground disabled:opacity-50"
                >
                  Mot de passe oublié&nbsp;?
                </button>
              )}
              {error && <p className="text-[12px] text-destructive">{error}</p>}
            </div>
          )}

          {/* Étape : mot de passe oublié — saisie email → envoi reset (spec 26). */}
          {step === 'forgot-password' && (
            <div className="space-y-3">
              <p className="text-[13px] leading-snug text-muted-foreground">
                Saisissez votre e-mail : si un compte existe, vous recevrez un lien pour
                réinitialiser votre mot de passe.
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
                onClick={submitForgotPassword}
                className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
              >
                {busy ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setError('');
                  setStep('password');
                }}
                className="w-full text-center text-[12px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground disabled:opacity-50"
              >
                Retour
              </button>
              {error && <p className="text-[12px] text-destructive">{error}</p>}
            </div>
          )}

          {/* Étape : confirmation envoi reset (spec 26). */}
          {step === 'forgot-password-sent' && (
            <div className="space-y-3 py-2 text-center">
              <Icon icon="hugeicons:mail-send-02" className="mx-auto h-8 w-8 text-primary" />
              <p className="text-[13px] leading-snug text-muted-foreground">
                Si un compte existe pour <strong className="text-foreground">{email || 'cette adresse'}</strong>,
                un e-mail de réinitialisation a été envoyé. Vérifiez votre boîte de réception
                (et les spams). Le lien expire rapidement.
              </p>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setStep('email');
                }}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
              >
                Retour à la connexion
              </button>
            </div>
          )}

          {/* Étape : confirmation envoi lien magique (spec 26). */}
          {step === 'magic-link-sent' && (
            <div className="space-y-3 py-2 text-center">
              <Icon icon="hugeicons:mail-send-02" className="mx-auto h-8 w-8 text-primary" />
              <p className="text-[13px] leading-snug text-muted-foreground">
                Un lien de connexion a été envoyé à <strong className="text-foreground">{email}</strong>.
                Cliquez dessus pour vous connecter — il expire dans 5 minutes et est à usage unique.
              </p>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setStep('email');
                }}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
              >
                Retour
              </button>
            </div>
          )}

          {/* Étape : (re)saisie du mot de passe — routine (reload) ou reset legacy — spec 28. */}
          {step === 'unlock-password' && (
            <div className="space-y-3">
              <p className="text-[13px] leading-snug text-muted-foreground">
                {unlockMode === 'reset'
                  ? 'Saisissez votre mot de passe actuel pour repartir à zéro : les anciennes données chiffrées seront supprimées et une nouvelle synchronisation sera créée.'
                  : 'Saisissez votre mot de passe pour déverrouiller vos données sur cet appareil.'}
              </p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                Se souvenir de cet appareil (30 jours)
              </label>
              <button
                type="button"
                disabled={busy || (unlockMode === 'unlock' && !password)}
                onClick={submitUnlockPassword}
                className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
              >
                {busy ? '…' : unlockMode === 'reset' ? 'Repartir à zéro' : 'Déverrouiller'}
              </button>
              {unlockMode === 'unlock' ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setError('');
                    setLegacyMode(false);
                    setRecoveryKey('');
                    setStep('unlock-recovery');
                  }}
                  className="w-full text-center text-[12px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground disabled:opacity-50"
                >
                  Utiliser ma clé de récupération
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setError('');
                    setPassword('');
                    setLegacyMode(true);
                    setStep('unlock-recovery');
                  }}
                  className="w-full text-center text-[12px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground disabled:opacity-50"
                >
                  Annuler — saisir mon ancienne clé
                </button>
              )}
              {error && <p className="text-[12px] text-destructive">{error}</p>}
            </div>
          )}

          {/* Étape : saisie de la clé de récupération — urgence / magic-link / legacy — spec 28. */}
          {step === 'unlock-recovery' && (
            <div className="space-y-3">
              {legacyMode ? (
                <p className="text-[13px] leading-snug text-muted-foreground">
                  Des données existantes (antérieures à la synchronisation par mot de passe) ont été
                  détectées. Saisissez votre <strong>ancienne clé de récupération</strong> pour les
                  récupérer — une nouvelle clé vous sera envoyée par e-mail. Sans cette ancienne clé,
                  repartez à zéro (définitif).
                </p>
              ) : (
                <p className="text-[13px] leading-snug text-muted-foreground">
                  Saisissez votre clé de récupération pour déverrouiller vos données. Elle est
                  chiffrée localement et ne quitte pas ce navigateur.
                </p>
              )}
              <input
                type="text"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                placeholder="Clé de récupération"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-[13px] outline-none focus:border-primary"
              />
              <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                Se souvenir de cet appareil (30 jours)
              </label>
              <button
                type="button"
                disabled={busy || !recoveryKey.trim()}
                onClick={submitRecovery}
                className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
              >
                {busy ? 'Déverrouillage…' : legacyMode ? 'Récupérer mes données' : 'Déverrouiller'}
              </button>
              {legacyMode && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setError('');
                    setRecoveryKey('');
                    setUnlockMode('reset');
                    setStep('unlock-password');
                  }}
                  className="w-full text-center text-[12px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground disabled:opacity-50"
                >
                  Je n’ai plus ma clé — repartir à zéro
                </button>
              )}
              {error && <p className="text-[12px] text-destructive">{error}</p>}
            </div>
          )}

          {/* Étape : affichage unique de la clé de récupération (e-mailée en filet) — spec 28. */}
          {step === 'recovery-display' && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                <Icon icon="hugeicons:alert-diamond" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-[12px] leading-snug text-foreground/90">
                  Cette clé de récupération est votre <strong>secours d'urgence</strong> : elle permet
                  de retrouver vos données si vous perdez votre mot de passe. Elle vous a aussi été
                  envoyée par e-mail. Sans elle, vos données sont <strong>irrécupérables</strong> ;
                  nous ne la stockons pas.
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