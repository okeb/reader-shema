'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Icon } from '@iconify/react';
import { authClient } from '@/lib/auth/client';
import { Link } from '@/i18n/routing';

/**
 * Page publique de réinitialisation de mot de passe (spec 26).
 *
 * Arrivée : l'utilisateur clique le lien e-mail → Better Auth valide le token et redirige
 * vers `/${locale}/reinitialiser?token=VALID_TOKEN` (token en query param, confirmé contre
 * `better-auth/dist/api/routes/password.mjs`). Sur token invalide/expiré : `?error=INVALID_TOKEN`.
 *
 * La page n'est PAS dans `protectedRoutes` (proxy.ts) : on y arrive sans session. Après reset,
 * Better Auth ne reconnecte pas automatiquement → on propose de rouvrir la modal de connexion.
 */
function ResetForm() {
  const params = useSearchParams();
  const token = params.get('token');
  const invalid = params.get('error') === 'INVALID_TOKEN';

  const locale = useLocale();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (invalid || !token) {
    return (
      <div className="space-y-3 py-2 text-center">
        <Icon icon="hugeicons:alert-diamond" className="mx-auto h-8 w-8 text-amber-500" />
        <p className="text-[13px] leading-snug text-muted-foreground">
          Ce lien de réinitialisation est invalide ou a expiré. Demandez un nouveau lien depuis
          la modal de connexion.
        </p>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('bym:open-account'))}
          className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          Retour à la connexion
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-3 py-2 text-center">
        <Icon icon="hugeicons:tick-02" className="mx-auto h-8 w-8 text-primary" />
        <p className="text-[13px] leading-snug text-muted-foreground">
          Votre mot de passe a été réinitialisé. Vous pouvez vous connecter avec le nouveau.
        </p>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('bym:open-account'))}
          className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          Se connecter
        </button>
        <Link
          href="/read"
          className="block text-center text-[12px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Retour au lecteur
        </Link>
      </div>
    );
  }

  async function submit() {
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      // `token` est `string | null` après le guard ; `resetPassword` attend `string | undefined`.
      const { error } = await authClient.resetPassword({ newPassword: password, token: token ?? undefined });
      if (error) {
        setError(error.message ?? 'Réinitialisation impossible. Le lien a peut-être expiré.');
        return;
      }
      setDone(true);
    } catch {
      setError('Réinitialisation impossible. Le lien a peut-être expiré.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Nouveau mot de passe"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirmer le mot de passe"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <button
        type="button"
        disabled={busy || !password || !confirm}
        onClick={submit}
        className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
      >
        {busy ? 'Réinitialisation…' : 'Réinitialiser mon mot de passe'}
      </button>
      {error && <p className="text-[12px] text-destructive">{error}</p>}
    </div>
  );
}

export default function ReinitialiserPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-stretch px-4 py-10">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Réinitialiser le mot de passe</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Choisissez un nouveau mot de passe pour votre compte ShemaProject.
        </p>
      </div>
      {/* useSearchParams() exige un Suspense boundary en App Router. */}
      <Suspense fallback={<p className="text-[13px] text-muted-foreground">Chargement…</p>}>
        <ResetForm />
      </Suspense>
    </main>
  );
}