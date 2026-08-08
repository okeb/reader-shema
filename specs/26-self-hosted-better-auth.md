# Spec 26 — Migration Better Auth raw + e-mails (sans toucher au chiffrage)

> **Statut** : Accepté · **Priorité** : 🔴 Haute · **Effort** : M · **Dépendances** : spec 22 (compte & sync), spec 15 (socle légal), spec 25 (page compte)
> **Découpage** : « Auth d'abord, enveloppe ensuite ». Cette spec = auth ; la suivante (spec 27, enveloppe DEK+KEK) est hors scope.

## 1. Contexte & motivation
L'auth passait par le **wrapper Neon Managed Better Auth** (`@neondatabase/auth@0.4.2-beta`)
: `createNeonAuth({ baseUrl, cookies:{secret} })` — **aucun plugin, aucun `sendEmail`** côté app.
Conséquence : pas de vérification e-mail maîtrisée, pas de « mot de passe oublié », pas de magic-link
réellement câblé (sondage live : l'endpoint de reset renvoyait 404). Le wrapper n'accepte que
`baseUrl` + `cookies`, et ne surface ni les plugins Better Auth ni le hook d'envoi de mail.

On migre vers **Better Auth raw auto-hébergé** pour reprendre le contrôle : tables applicatives à
l'app, `sendEmail` par Resend, plugins (magic-link, nextCookies, emailVerification). Objectif :
débloquer vérification e-mail, forgot-password/reset et magic-link fonctionnels.

## 2. Doctrine (lue à l'utilisateur — inchangée sauf précision)
- **forgot-password récupère l'accès au COMPTE (login), PAS les données.** Un nouvel appareil a
  toujours besoin de la recovery key pour déchiffrer. Réinitialiser son mot de passe ne donne pas
  accès aux blobs chiffrés existants sur un nouvel appareil.
- **L'accès aux données au mot de passe seul = spec 27** (enveloppe DEK+KEK). Hors scope ici.
- **Le chiffrage E2EE actuel (recovery key → PBKDF2 250k → master key AES-GCM 256) est INTOUCHABLE.**
  La recovery key reste nécessaire sur un nouvel appareil ; la friction « clé à chaque appareil »
  ne disparaît qu'en spec 27.
- **Auth désormais self-hosted** : les tables `user/session/account/verification` vivent dans le
  schéma `public` de la même base Neon eu-west-2 que `user_data` (même `DATABASE_URL`, endpoint
  **pooled `-pooler`**). **Pas de FK** vers `user_data` (doctrine d'isolation : un row compte
  orphelin ne doit pas bloquer une opération).
- **E-mails transactionnels via Resend** (sous-traitement → disclosure sur la page Confidentialité).
  No-op + `console.warn` si `RESEND_API_KEY` absent (dev sans planter les flux).

## 3. Périmètre
- **Inclus** :
  - Promotion de `better-auth@1.4.18` en dépendance directe (était transitive via le wrapper) ;
    `pg`, `resend`, `@types/pg` (dev). Retrait de `@neondatabase/auth` (après vérif build).
  - `lib/auth/server.ts` (réécrit) : `betterAuth(...)` avec `database: pg.Pool`, `nextCookies()`,
    `emailAndPassword.sendResetPassword`, `emailVerification`, plugin `magicLink`.
  - `lib/auth/client.ts` (réécrit) : `createAuthClient` depuis `better-auth/react` +
    `magicLinkClient()`. Nom `authClient` préservé (compat call sites).
  - `app/api/auth/[...path]/route.ts` (réécrit) : `toNextJsHandler(auth)` (503 si non configuré).
  - `proxy.ts` : gate par **présence de cookie** (`getSessionCookie`) — pas de hit DB au middleware ;
    vérité réelle re-validée côté serveur dans `requireUser()`. `/reinitialiser` PUBLIC.
  - `src/infrastructure/auth/auth-guard.ts` : `auth!.api.getSession({ headers: await headers() })`.
  - `src/infrastructure/database/pg-pool.ts` : singleton `pg.Pool` depuis `DATABASE_URL` (pooled, SSL).
  - `lib/email/transport.ts` + `lib/email/templates.ts` : `sendEmail` via Resend + 3 templates HTML.
  - `db/migrations/002_better_auth.sql` : tables core Better Auth (casing `camel`, colonnes
    camelCase quotées).
  - `app/[locale]/reinitialiser/page.tsx` : page **publique** de reset (`?token=` / `?error=INVALID_TOKEN`).
  - `m-account-dialog.tsx` : liens « Mot de passe oublié ? » + « Recevoir un lien de connexion » ;
    `sendVerificationEmail` best-effort après `signUp.email`. Flux recovery INTACT.
  - `i18n/routing.ts` : `'/reinitialiser'` (en `/reset-password`).
  - `env.mjs` + `.env.example` : `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL` (pooled),
    `RESEND_API_KEY` ; retrait des vars Neon.
  - Doctrine : `src/shared/constants/legal.ts` + page Confidentialité.
- **Exclu (spec 27)** : enveloppe DEK+KEK, login/nouvel appareil au mot de passe seul, recovery key
  envoyée par mail à l'inscription, migration ancien schème → enveloppe. `crypto.service.ts`,
  `crypto-session.store.ts`, `sync-engine.ts`, schéma `user_data` — tout hors scope.

## 4. API Better Auth 1.4.18 (vérifiée contre le package installé)

| Symbole | Import | Note |
|---|---|---|
| `betterAuth` | `better-auth` | `betterAuth(options)` → `Auth` |
| `toNextJsHandler` | `better-auth/next-js` | handler catch-all `{GET,POST,...}` |
| `nextCookies` | `better-auth/next-js` | **plugin serveur OBLIGATOIRE** (propagation Set-Cookie App Router) |
| `getSessionCookie` | `better-auth/cookies` | présence **sans vérification** (gate proxy) |
| `createAuthClient` | `better-auth/react` | client hooks/méthodes |
| `magicLink` / `magicLinkClient` | `better-auth/plugins/magic-link` / `better-auth/client/plugins` | `sendMagicLink({email,url,token})` |

**Corrections vs idées reçues (1.4.18)** :
- **Pas d'export `better-auth/adapters/pg-adapter`** : on passe un `pg.Pool` directement à
  `database` (duck-typé à l'exécution via `"connect" in db` → Kysely `PostgresDialect`). Cast
  `pool as any` si TS râle (type attendu `PostgresPool` Kysely).
- `sendResetPassword` est **sous `emailAndPassword`** (pas de `forgotPassword` top-level).
  `emailVerification` est top-level.
- Serveur : `auth.api.getSession({ headers: await headers() })` → `{session,user}|null`.
- **Reset par token en query param** : Better Auth redirige le `callbackURL` avec `?token=VALID_TOKEN`
  (ou `?error=INVALID_TOKEN`). Pas de hash dans l'URL.

**Nommage des méthodes client** (dérivé du chemin endpoint via `CamelCase`, confirmé dans
`dist/client/path-to-object.d.mts`) — schémas de body vérifiés dans `dist/api/routes/*` :

| Endpoint | Méthode client | Body |
|---|---|---|
| `/request-password-reset` | `requestPasswordReset` | `{ email, redirectTo? }` |
| `/reset-password` | `resetPassword` | `{ newPassword, token? }` (+ query `token?`) |
| `/sign-in/magic-link` | `signIn.magicLink` | `{ email, callbackURL? }` |
| `/send-verification-email` | `sendVerificationEmail` | `{ email, callbackURL? }` |
| `/verify-email` | `verifyEmail` | `{ token, callbackURL? }` |
| `/sign-up/email` | `signUp.email` | `{ email, password, name, callbackURL? }` |
| `/sign-in/email` | `signIn.email` | `{ email, password }` |
| `/sign-out` | `signOut` | — |

> **Piège** : la méthode pour *demander* un reset est `requestPasswordReset` (pas `forgetPassword`),
> et son paramètre de redirection est `redirectTo` (pas `callbackURL`) — contrairement à
> `signIn.magicLink` et `sendVerificationEmail` qui prennent `callbackURL`. Le serveur construit
> `${baseURL}/reset-password/${token}?callbackURL=${redirectTo}` puis l'endpoint callback redirige
> vers `/${callbackURL}?token=VALID_TOKEN`.

## 5. Flows
- **Inscription** : `signUp.email` → best-effort `sendVerificationEmail({callbackURL})` →
  `advanceAfterAuth` (premier login → `recovery-display` ; retour appareil → `recovery-entry`).
- **Connexion mdp** : `signIn.email` → cookie → `advanceAfterAuth`. Inchangé.
- **Magic-link** : `signIn.magicLink({email,callbackURL:/${locale}/account})` → `sendMagicLink`
  (Resend) → clic → `GET /api/auth/magic-link/verify` pose cookie + redirige `callbackURL`. Atterrit
  sur `/account` (verrouillé) → « Déverrouiller » → modal → recovery flow.
- **Vérification e-mail** : clic → `GET /api/auth/verify-email` → `emailVerified` +
  `autoSignInAfterVerification`. `requireEmailVerification:false` → un non-vérifié peut se
  connecter (les données restent gated par la recovery key).
- **Forgot-password** : `requestPasswordReset({email, redirectTo:/${locale}/reinitialiser})` →
  `sendResetPassword({user,url})` (Resend) → clic → `GET /api/auth/reset-password/:token` valide →
  redirige `/${locale}/reinitialiser?token=VALID_TOKEN` → page reset →
  `resetPassword({newPassword, token})` → reconnect au nouveau mdp.
- **Gate proxy** : pas de cookie sur `/account` → redirect `/` ; cookie présent → next-intl ;
  vérité réelle serveur via `auth.api.getSession` dans `requireUser()`.

## 6. Risques
- **Cast `pg.Pool`** : type `database` attend `PostgresPool` (Kysely) ; runtime duck-typed OK.
  `pool as any`.
- **SSL Neon pooled** : `pg.Pool` exige `ssl:{rejectUnauthorized:true}`.
- **Cookie prefix change** : Neon → `better-auth.session_token`. Sessions Neon existantes
  invalidées (compte de test réinitialisé — acceptable pré-lancement).
- **Livraison Resend** : domaine expéditeur (`shemaproject.org`) à vérifier ; dev no-op si clé absente.
- **Rows `user_data` orphelins** : pas de FK → pas bloquant ; cleanup optionnel non requis.
- **Compte de test réinitialisé** : identité `neon_auth` orpheline, blobs aussi — acceptable
  pré-lancement (signalé à l'utilisateur).

## 7. Critères d'acceptation
- [ ] `pnpm why better-auth` → une seule instance ; `grep -r "@neondatabase/auth"` propre (le
  `@neondatabase/serverless` reste).
- [ ] `002_better_auth.sql` appliqué (endpoint pooled) ; tables `user/session/account/verification`.
- [ ] `pnpm dev` → `isAuthConfigured` true, pas d'erreur.
- [ ] Inscription via modal → rows `user/session/account` créés, cookie `better-auth.session_token`,
  `recovery-display` se déclenche.
- [ ] Connexion → session restaurée, `recovery-entry` sur retour appareil.
- [ ] Forgot-password → mail (Resend logs / no-op) → clic → `/${locale}/reinitialiser?token=` →
  reset → login nouveau mdp.
- [ ] Magic-link → mail → clic → `/${locale}/account` → session → recovery flow.
- [ ] `/account` incognito → redirect `/` ; avec cookie → charge.
- [ ] `/api/sync` sans cookie → 401 ; avec → 200 + userId.
- [ ] Crypto intact : recovery key → PBKDF2 → master key round-trip. Aucun changement.
- [ ] `tsc --noEmit` + `pnpm build` verts ; doctrine (legal.ts + Confidentialité) à jour.
- [ ] CHANGELOG : entrée spec 26 sous `[Unreleased]`.

## 8. Hors scope (spec 27)
Enveloppe DEK+KEK (login/nouvel appareil au mdp seul), recovery key envoyée par mail à
l'inscription, migration ancien schème → enveloppe. `crypto.service.ts`, `crypto-session.store.ts`,
`sync-engine.ts`, schéma `user_data` (colonne envelope / nouvelle table) — tout hors scope ici.