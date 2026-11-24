'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { convertLegacy, hasLegacyArchive } from '@/src/presentation/lib/sync/sync-engine';

/** Carte masquée sur cet appareil (valeur = id de l'utilisateur). */
const DISMISS_KEY = 'bym:legacy-recovery-dismissed';

/**
 * Récupération facultative des données synchronisées d'avant la spec 39 (page `/account`) —
 * spec 39 §4.3 (3) et §5.3.
 *
 * Affichée seulement si une archive chiffrée existe encore pour ce compte (la conversion
 * automatique n'a pas pu se faire faute de clé sur cet appareil). Mot de passe par défaut, ancienne
 * clé de récupération en secours. Jamais bloquante : « Ignorer » la masque pour cet appareil.
 */
export function LegacyRecoveryCard({ userId }: { userId: string }) {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<'password' | 'recovery'>('password');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    try {
      if (localStorage.getItem(DISMISS_KEY) === userId) return;
    } catch {
      // Stockage indisponible : on affiche quand même si besoin.
    }
    void hasLegacyArchive().then((has) => {
      if (!cancelled) setVisible(has);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function submit() {
    if (!secret.trim()) return;
    setBusy(true);
    setError('');
    try {
      const r = await convertLegacy(mode === 'password' ? { password: secret } : { recoveryKey: secret });
      if (r === 'wrong') {
        setError(
          mode === 'password'
            ? 'Mot de passe incorrect, ou ces données ont été chiffrées avec un ancien mot de passe. Essayez votre ancienne clé de récupération.'
            : 'Clé de récupération incorrecte.',
        );
      } else if (r === 'no-pw-wrap') {
        setMode('recovery');
        setError('Ces données ne peuvent être ouvertes qu’avec votre ancienne clé de récupération.');
      } else {
        setSuccess(
          r === 'partial'
            ? 'Vos anciennes données ont été récupérées sur cet appareil ; elles seront synchronisées dès que possible.'
            : 'Vos anciennes données ont été récupérées.',
        );
      }
    } catch {
      setError('La récupération a échoué. Réessayez.');
    } finally {
      setBusy(false);
      setSecret('');
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, userId);
    } catch {
      // Sans stockage, la carte reviendra à la prochaine visite.
    }
    setVisible(false);
  }

  if (!visible) return null;

  if (success) {
    return (
      <p role="status" className="flex items-start gap-2 rounded-2xl border border-border bg-foreground/[2%] px-4 py-3 text-[13px] text-foreground/90">
        <Icon icon="hugeicons:checkmark-circle-02" className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        {success}
      </p>
    );
  }

  return (
    <section
      aria-labelledby="legacy-recovery-title"
      className="space-y-3 rounded-2xl border border-border bg-foreground/[2%] px-4 py-3"
    >
      <div>
        <h2 id="legacy-recovery-title" className="text-sm font-medium text-foreground">
          Récupérer mes anciennes données synchronisées
        </h2>
        <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
          {mode === 'password'
            ? 'Une partie de vos données synchronisées avant la mise à jour n’a pas encore été transférée. Saisissez votre mot de passe pour les récupérer sur ce compte.'
            : 'Saisissez l’ancienne clé de récupération reçue par e-mail à la création de votre compte.'}
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          type={mode === 'password' ? 'password' : 'text'}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder={mode === 'password' ? 'Mot de passe' : 'Clé de récupération'}
          aria-label={mode === 'password' ? 'Mot de passe' : 'Clé de récupération'}
          autoComplete={mode === 'password' ? 'current-password' : 'off'}
          className={
            'min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary' +
            (mode === 'recovery' ? ' font-mono text-[13px]' : '')
          }
        />
        <button
          type="submit"
          disabled={busy || !secret.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
        >
          {busy ? '…' : 'Récupérer'}
        </button>
      </form>
      {error && <p className="text-[12px] text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        <button
          type="button"
          onClick={() => {
            setError('');
            setSecret('');
            setMode(mode === 'password' ? 'recovery' : 'password');
          }}
          className="underline underline-offset-2 transition-colors hover:text-foreground"
        >
          {mode === 'password' ? 'J’ai plutôt une ancienne clé de récupération' : 'Utiliser mon mot de passe'}
        </button>
        <button type="button" onClick={dismiss} className="underline underline-offset-2 transition-colors hover:text-foreground">
          Ignorer
        </button>
      </div>
    </section>
  );
}

export default LegacyRecoveryCard;
