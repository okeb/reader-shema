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
import { convertLegacy, migrate, setSyncUser } from '@/src/presentation/lib/sync/sync-engine';

type Step =
  | 'email' // saisie email → mot de passe
  | 'password' // saisie mot de passe (sign in / sign up)
  | 'forgot-password' // saisie email → envoi du reset (spec 26)
  | 'forgot-password-sent' // confirmation envoi reset
  | 'done'; // compte ouvert + sync active

interface AccountDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Modale de compte custom (pas de composants AuthView pré-construits) — spec 22 §7, spec 39.
 *
 * Connecté = synchronisé (spec 39) : e-mail → mot de passe → terminé. Après la connexion, le mot
 * de passe (en mémoire le temps de la modale) sert une seule fois, en silence, à convertir
 * l'archive chiffrée d'avant la spec 39 si elle existe ; puis le local est rapproché du cloud.
 *
 * UI maison sous `createPortal`, `useScrollLock`, `role="dialog"`, piège à focus maison
 * (`use-focus-trap`), Échap pour fermer, bottom-sheet mobile / centré desktop.
 *
 * @see specs/39-sync-sans-chiffrement.md
 */
export function AccountDialog({ open, onClose }: AccountDialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollLock(open);
  useFocusTrap(open, ref);

  const session = authClient.useSession();
  const locale = useLocale();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pwMode, setPwMode] = useState<'in' | 'up'>('in');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Mot de passe validé par le serveur à la connexion (mémoire, le temps de la modale) : ouvre
  // l'archive chiffrée d'avant la spec 39 pour la convertir.
  const loginPasswordRef = useRef('');
  // Garde contre un double déclenchement de `finishSignIn` (la session peut se rafraîchir).
  const finishingRef = useRef(false);

  // Callbacks localisés pour les flux e-mail (Better Auth appends le token à l'URL). (spec 26)
  const resetCallbackURL = `/${locale}/reinitialiser`;
  const accountCallbackURL = `/${locale}/account`;

  // Initialisation à l'ouverture de la modale selon la session courante.
  useEffect(() => {
    if (!open) return;
    setError('');
    setStep(session.data?.user ? 'done' : 'email');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Session confirmée pendant l'étape mot de passe → on synchronise puis on termine.
  useEffect(() => {
    if (!open || session.isPending) return;
    if (session.data?.user && step === 'password') {
      void finishSignIn(session.data.user.id);
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
   * Après connexion / inscription : conversion silencieuse de l'archive chiffrée avec le mot de
   * passe (si elle existe et qu'il l'ouvre), puis rapprochement local ↔ cloud. Ne bloque jamais :
   * en cas d'échec, la carte de récupération de `/account` prend le relais.
   */
  async function finishSignIn(userId: string) {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setBusy(true);
    setError('');
    setSyncUser(userId);
    const pw = loginPasswordRef.current;
    loginPasswordRef.current = '';
    setPassword('');
    try {
      if (pw) await convertLegacy({ password: pw });
    } catch (err) {
      console.warn('sync: conversion de l’archive à la connexion échouée', err);
    }
    try {
      await migrate();
    } catch {
      // La file offline reprendra (réseau).
      console.warn('sync: migration partielle');
    }
    setBusy(false);
    setStep('done');
    finishingRef.current = false;
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
    loginPasswordRef.current = password;
    // Le succès déclenche la suite via l'effet sur `session.data`.
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

  async function signOut() {
    await authClient.signOut();
    setSyncUser(null);
    setStep('email');
    setPassword('');
    loginPasswordRef.current = '';
    onClose();
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
                Retrouvez vos favoris, signets, notes et votre position de lecture sur tous vos
                appareils. Aucun score, aucune statistique.
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

          {/* Étape : compte ouvert. La gestion des données (bascules de sync, export,
              suppression) vit sur la page /account (spec 25) — la modale n'est que le point
              d'entrée pour se connecter. */}
          {step === 'done' && session.data?.user && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-foreground/[3%] px-3 py-2">
                <Icon icon="hugeicons:user-circle" className="h-5 w-5 text-muted-foreground" />
                <span className="truncate text-[13px] text-foreground">
                  {session.data.user.email}
                </span>
              </div>
              <p className="text-[12px] leading-snug text-muted-foreground">
                Votre historique, votre position de lecture, vos favoris, signets et notes se
                synchronisent sur vos appareils. Pas de score, pas de statistique.
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