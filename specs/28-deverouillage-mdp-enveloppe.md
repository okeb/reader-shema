# Spec 28 — Déverrouillage par mot de passe (enveloppe DEK/KEK) + clé de récupération e-mailée

> **Statut** : Proposé (décisions posées) · **Priorité** : 🔴 Haute · **Effort** : M ·
> **Dépendances** : **Spec 22** (sync E2EE, blobs opaques `user_data`, `deriveMasterKey` + recovery key) ·
> **Spec 26** (self-hosted Better Auth, Resend, e-mails transactionnels) · **Spec 25** (page `/account`).
>
> **Numérotation** : nommée **28** car le slot `27` est pris par la spec avatar (déjà releasée en 0.2.0).
>
> **Décisions prises** : déverrouillage **routine = mot de passe**, **urgence = clé de récupération** ·
> la clé de récupération est **e-mailée à l'inscription** (plus jamais perdue) · friction reload = **« se
> souvenir N jours (hybride) »** — DEK persisté sur l'appareil (IndexedDB, non-extractable, 30 j, opt-in).

## 1. Objectif

La sync E2EE de la spec 22 se déverrouille avec la **clé de récupération** (`masterKey =
deriveMasterKey(recoveryKey)`, mémoire seule). Deux problèmes vécus :

1. La clé de récupération **n'a jamais été e-mailée** → l'utilisateur l'a perdue → ses blobs cloud sont
   **irécupérables par design**, et il ne peut pas déverrouiller sur un nouvel appareil.
2. « On ne demande pas le mot de passe pour déverrouiller » : l'utilisateur veut que le **mot de passe**
   soit le déverrouillage quotidien, et la **clé de récupération** uniquement pour récupérer un compte
   perdu.

Cette spec introduit une **enveloppe DEK/KEK** : un DEK aléatoire chiffre `user_data` ; le DEK est wrappé
par un KEK dérivé du mot de passe (routine) ET par un KEK dérivé de la clé de récupération (urgence). La
clé de récupération est **e-mailée à l'inscription** (filet). Le DEK peut être persisté sur l'appareil
(IndexedDB, non-extractable, 30 j) pour éviter de retaper le mot de passe à chaque reload.

## 2. Valeur utilisateur

- **Déverrouillage au quotidien avec le mot de passe** (que l'utilisateur connaît), sans manipuler une
  longue clé de récupération à chaque nouvel appareil.
- **Clé de récupération jamais perdue** : e-mailée à l'inscription, affichée une fois à l'écran. C'est le
  secours d'urgence (mot de passe oublié / compte magic-link).
- **Moins de friction au reload** : « se souvenir de cet appareil 30 jours » déverrouille
  silencieusement sans redemander le mot de passe.
- **Migration sans perte** pour les comptes pré-spec-28 qui ont encore leur ancienne clé.

## 3. Périmètre

- **Inclus** :
  - Primitives crypto enveloppe : `generateDek`, `generatePwSalt`, `deriveKekPw` (PBKDF2 + sel
    par-utilisateur), `wrapDek`/`unwrapDek` (via `exportKey`+`encryptBlob`/`decryptBlob`), `buildEnvelope`/
    `parseEnvelope`/`serializeEnvelope`. KEK recovery réutilise `deriveMasterKey` (sel app global).
  - Kind `keyEnvelope` dans `SyncKind`/`SYNC_KINDS` (route générique `/api/sync/[kind]`, pas d'adapter).
  - sync-engine : `getEnvelope`, `unlockWithPassword`, `unlockWithRecoveryKey`, `bootstrapEnvelope`,
    `purgeCloudData`, `upgradeLegacyToEnvelope`, `rewrapPassword`, `BootstrapLostError`.
  - Modale de compte rewire : étapes `unlock-password` (routine) + `unlock-recovery`
    (urgence/legacy/magic-link) ; `recovery-display` e-mailée + framing urgence ; déverrouillage
    transparent après sign-in (mot de passe déjà en state) ; lien « utiliser ma clé de récupération »
    depuis `/account` (`openHint: 'recovery'`).
  - **Se souvenir N jours** : `device-key-store` (IndexedDB keyval du DEK par `userId`, non-extractable,
    expiry 30 j) + hydratation au chargement (restauration silencieuse si valide) + case à cocher + clear
    au signOut / suppression de compte.
  - E-mail de la clé : route `POST /api/email/recovery-key` (requireUser + email via session, throttle
    60 s/user) + template `recoveryKeyEmailHtml`.
  - Migration legacy : blobs anciens sans enveloppe → récupération (ancienne clé via
    `upgradeLegacyToEnvelope`) ou reset définitif (`purgeCloudData` + `bootstrapEnvelope`).
  - Page `/account` : copy bannière « saisissez votre mot de passe » + lien secondaire « utiliser ma clé
    de récupération ».
  - Doctrine page Confidentialité + `legal.ts` (clé e-mailée, se souvenir appareil, IndexedDB).
- **Exclu** (specs ultérieures) :
  - Re-wrap **auto** au forgot-password reset (impossible : DEK absent hors session ; la clé e-mailée est
    le filet). `rewrapPassword` est fourni comme primitif + entry point manuel tant que déverrouillé.
  - Robust rate-limiting du endpoint e-mail (throttle minimal en mémoire pour spec 28).
  - Sync du thème clair/sombre (toujours pas d'adapter).
  - Rotation / explicit re-keying du DEK (hors changement de mot de passe).

## 4. Spécification fonctionnelle

### 4.1 Modèle cryptographique

- **DEK** : `AES-GCM` 256 bits, aléatoire, **extractable** en mémoire (nécessaire pour `exportKey` au
  wrap / rewrap / re-chiffrement legacy). Chiffre les blobs `user_data` (kinds de données).
- **KEK_pw** : `PBKDF2(password, sel par-utilisateur 16 octets, 250k iters, SHA-256) → AES-GCM`. Non-
  extractable. Sel **par-utilisateur** (domain separation vs sel app global du KEK recovery).
- **KEK_rec** : `deriveMasterKey(recoveryKey)` (PBKDF2, sel app global — réutilise spec 22).
- **Wrap** : `exportKey('raw', dek)` → base64 → `encryptBlob(kek, b64)` → `{ct, nonce}`. On évite
  `wrapKey` (exigerait des usages KEK `['wrapKey','unwrapKey']`, cassant la réutilisation de
  `deriveMasterKey` pour KEK_rec) pour le même résultat (DEK non-extractable à steady state).
- **Unwrap** : `decryptBlob(kek, ct, nonce)` → base64 → `importKey('raw', …, true, ['encrypt','decrypt'])`.
  Un mauvais mot de passe / mauvaise clé → auth tag AES-GCM invalide → exception → `'wrong'`.

### 4.2 Enveloppe JSON (stockée `user_data` kind=`keyEnvelope`)

```jsonc
{ "v":1, "pwSalt":"<b64>", "pwWrap":{"ct":"<b64>","nonce":"<b64>"},
  "recoveryWrap":{"ct":"<b64>","nonce":"<b64>"}, "pwWrapPresent":true }
```

- `pwWrap` **optionnel** (`pwWrapPresent:false` pour comptes magic-link sans mot de passe) ;
  `recoveryWrap` **toujours** présent.
- Row `user_data` : `ciphertext` = base64(JSON), `nonce` = base64(12 octets zéros, placeholder — la
  colonne est `BYTEA NOT NULL`, la route ne parse pas le contenu). Préfixe `v:1` pour qu'un relecteur ne
  suppose pas de l'AES-GCM au niveau de la row.

### 4.3 Flows

- **Inscription (e-mail/mot de passe)** : `submitPassword`(up) → session → `advanceAfterAuth` →
  `getEnvelope`=null, pas de blobs legacy → `bootstrapEnvelope({password, emailKey:true})` →
  `recovery-display` (clé affichée + e-mailée, framing urgence) → `acknowledgeRecovery` → `migrate()` → done.
- **Connexion (compte déjà enveloppé)** : `submitPassword`(in) → session → `advanceAfterAuth` →
  `getEnvelope`=présent + `password` en state → `unlockWithPassword` → done. **Transparent.**
- **Reload (DEK device valide)** : hydratation `o-account-provider` → `loadDeviceDek` → `setMasterKey` +
  `pullAndMerge` silencieux. Pas de prompt.
- **Reload (DEK device absent/expiré)** : `advanceAfterAuth` → `getEnvelope`=présent + pas de password →
  étape `unlock-password` → saisie → `unlockWithPassword`. `'wrong'` → erreur + lien `unlock-recovery`.
  `'no-pw-wrap'` (magic-link) → `unlock-recovery`.
- **Urgence (clé de récupération)** : `unlock-recovery` → `unlockWithRecoveryKey` → done.
- **Legacy (anciens blobs, pas d'enveloppe)** : `advanceAfterAuth` → `getEnvelope`=null +
  `hasCloudData()=true` → `unlock-recovery` (legacy) « saisissez votre ancienne clé pour récupérer, ou
  repartir à zéro (définitif) » → `upgradeLegacyToEnvelope` (récupération, pwWrap absent, rewrap
  ultérieur) OU `purgeCloudData` + `bootstrapEnvelope({password, emailKey})` (reset — chemin de
  l'utilisateur actuel qui a perdu sa clé).
- **Magic-link** : inscription sans mot de passe → `bootstrapEnvelope({emailKey:true})` avec
  `pwWrapPresent:false` → déverrouillage routine via clé de récupération e-mailée (`unlock-recovery`).
- **Two-device bootstrap race** : perdant détecté via post-push re-GET (`BootstrapLostError`) →
  `unlock-recovery` avec la clé e-mailée du gagnant. Données locales du perdant conservées sur disque.

### 4.4 Edge cases

1. **Password change/reset** : `rewrapPassword` fourni (primitif + entry point tant que déverrouillé) ;
   l'auto-re-wrap au forgot-password est **différé** (impossible hors session : DEK absent). Filet = clé
   e-mailée.
2. **Two-device race** : post-push re-GET (pas de route dédiée). Acceptable.
3. **Magic-link** : clé de récupération = déverrouillage routine (pwWrap absent). On ne désactive pas le
   magic-link pour la sync.
4. **`exportKey` vs `wrapKey`** : `exportKey`+`encryptBlob` (réutilise `deriveMasterKey`, cohérent
   codebase). DEK re-importé extractable en mémoire (permet le rewrap/re-chiffrement ; XSS = game-over de
   toute façon).
5. **Friction reload** : « se souvenir N jours » (choix utilisateur explicite) — IndexedDB
   non-extractable, 30 j, opt-in.
6. **Legacy mauvaise clé** : `upgradeLegacyToEnvelope` **vérifie** l'ancienne clé avant tout push (un
   flush sous mauvaise clé écraserait le cloud legacy en chiffré illisible = perte définitive). Si aucun
   blob ne décrypte → `wrong-legacy-key` (cloud préservé, reverrouillé).

## 5. UI / UX

### 5.1 Emplacement & déclencheurs

- Modale de compte (`m-account-dialog`), ouverte via `bym:open-account` (topbar, panneaux, page
  `/account`). Lien secondaire page `/account` → `bym:open-account` avec `detail.recovery=true`
  (`openHint:'recovery'`) → atterrit directement sur `unlock-recovery`.
- Page `/account` : bannière verrouillée « Saisissez votre mot de passe » + bouton « Déverrouiller » +
  lien « Utiliser ma clé de récupération ».

### 5.2 Étapes (machine à états)

`email → password (in/up) → {unlock-password | unlock-recovery | recovery-display | done}`. Les étapes
`forgot-password`, `forgot-password-sent`, `magic-link-sent`, `migrating` restent.

### 5.3 États & interactions

- `unlock-password` : input mot de passe + case « se souvenir de cet appareil (30 jours) » + bouton
  « Déverrouiller » (mode unlock) / « Repartir à zéro » (mode reset). Lien « Utiliser ma clé de
  récupération » (unlock) / « Annuler — saisir mon ancienne clé » (reset).
- `unlock-recovery` : input clé (mono) + case « se souvenir » + bouton « Déverrouiller » /
  « Récupérer mes données » (legacy). En legacy : lien « Je n'ai plus ma clé — repartir à zéro ».
- `recovery-display` : bandeau urgence + bloc `<code>` + « Copier la clé » + « J'ai noté ma clé,
  synchroniser ». Mention « envoyée par e-mail ».

### 5.4 Micro-copy (FR)

- Bannière `/account` : « Synchronisation verrouillée — saisissez votre mot de passe pour reprendre la
  sync. » + « Utiliser ma clé de récupération ».
- `unlock-password` (unlock) : « Saisissez votre mot de passe pour déverrouiller vos données sur cet
  appareil. » ; (reset) : « Saisissez votre mot de passe actuel pour repartir à zéro : les anciennes
  données chiffrées seront supprimées et une nouvelle synchronisation sera créée. »
- `unlock-recovery` (urgence) : « Saisissez votre clé de récupération pour déverrouiller vos données.
  Elle est chiffrée localement et ne quitte pas ce navigateur. » ; (legacy) : « Des données existantes
  (antérieures…) ont été détectées. Saisissez votre ancienne clé de récupération pour les récupérer —
  une nouvelle clé vous sera envoyée par e-mail. Sans cette ancienne clé, repartez à zéro (définitif). »
- `recovery-display` : « Cette clé de récupération est votre secours d'urgence… Elle vous a aussi été
  envoyée par e-mail. Sans elle, vos données sont irrécupérables ; nous ne la stockons pas. »

## 6. Spécification technique

### 6.1 Fichiers

- **Modifiés** : `src/infrastructure/crypto/crypto.service.ts` (primitives enveloppe) ·
  `src/domain/entities/sync.entity.ts` (kind `keyEnvelope`) ·
  `src/presentation/lib/sync/sync-engine.ts` (fonctions enveloppe) ·
  `src/presentation/components/molecules/m-account-dialog.tsx` (rewire étapes + flows) ·
  `src/presentation/components/organisms/o-account-provider.tsx` (hydratation DEK + `openHint`) ·
  `app/[locale]/account/page.tsx` (copy + lien + `clearDeviceDek`) ·
  `lib/email/templates.ts` (`recoveryKeyEmailHtml`) ·
  `src/shared/constants/legal.ts` + `app/[locale]/(info)/confidentialite/page.tsx` (doctrine) ·
  `CHANGELOG.md`.
- **Nouveaux** : `app/api/email/recovery-key/route.ts` · `src/presentation/lib/sync/device-key-store.ts` ·
  `specs/28-deverouillage-mdp-enveloppe.md`.
- **Inchangés** : `crypto-session.store.ts` (mémoire seule) · `app/api/sync/[kind]/route.ts` (générique)
  · `db/migrations` (réutilise `user_data`, pas de DDL) · `auth-guard.ts`/`auth/server.ts`.

### 6.2 Données & persistance

- `user_data` row `kind='keyEnvelope'` (réutilise la table spec 22, LWW). Pas de nouvelle table.
- `IndexedDB` `bym:device-keys` store `deks` (key = `userId` → `{ dek: CryptoKey, expiresAt }`).
  Non-extractable, expiry 30 j. Purge au signOut / suppression de compte / expiration.
- `crypto-session.store` reste mémoire seule ; l'hydratation IndexedDB appelle `setMasterKey`.

### 6.3 API / contraintes

- `POST /api/email/recovery-key` : `requireUser()` → throttle 60 s/user (en mémoire) → body
  `{recoveryKey}` → email via `auth.api.getSession` (destinataire = email session, pas confiance au
  client) → `recoveryKeyEmailHtml` → 204 / 429 / 400 / 502. `force-dynamic`.
- Le serveur **ne persiste jamais** la clé de récupération (vue fugacement pour Resend). Aucune
  modification de la route sync générique.

## 7. Critères d'acceptation

- [ ] `tsc --noEmit` passe (cast `pool as any`, types `CryptoKey`/IndexedDB).
- [ ] Inscription e-mail/mot de passe → enveloppe poussée (`kind='keyEnvelope'`), e-mail de la clé reçu,
  `recovery-display` affichée.
- [ ] Reload → si « se souvenir » cochée → déverrouillage silencieux (DEK restauré) ; sinon →
  `unlock-password` → saisie du mot de passe → blobs décryptés.
- [ ] Mot de passe incorrect → `'wrong'` → message + lien `unlock-recovery`.
- [ ] Clé de récupération (urgence) → déverrouillage → blobs décryptés.
- [ ] 2ᵉ appareil : connexion → déverrouillage transparent (password en state) → sync.
- [ ] Legacy : compte ancien (blobs sans enveloppe) + ancienne clé → `upgradeLegacyToEnvelope` →
  données re-chiffrées. Sans clé → reset (`purgeCloudData` + bootstrap).
- [ ] Legacy mauvaise clé → `'wrong-legacy-key'` → message, cloud legacy préservé (rien poussé).
- [ ] Magic-link : enveloppe `pwWrapPresent:false` → `unlock-password` redirige vers `unlock-recovery`.
- [ ] Suppression compte → `user_data` (dont enveloppe) purgé + `clearDeviceDek`.
- [ ] Race : deux bootstraps simultanés → perdant → `unlock-recovery` avec clé e-mailée.
- [ ] Page Confidentialité + `legal.ts` reflètent la clé e-mailée + le se-souvenir appareil (IndexedDB).

## 8. Risques & questions ouvertes

- **Clé de récupération vue par le prestataire e-mail** : compromis « backup code par e-mail » assumé
  (demande utilisateur). Une boîte mail compromise peut déverrouiller la sync via `unlockWithRecoveryKey`
  (exposition emergency-only pour les comptes mot de passe ; routine pour magic-link).
- **DEK extractable en mémoire** : nécessaire pour le rewrap/re-chiffrement. XSS = game-over de toute
  façon ; on ne défend pas contre un XSS actif.
- **Throttle e-mail en mémoire** : suffisant pour spec 28, mais reset au redéploiement ; un robust
  rate-limiter est reporté.
- **`rewrapPassword` manuel** : après un déverrouillage via recovery, l'utilisateur doit re-lier son mot
  passe lui-même (pas d'auto). À conforter par une entry point dédiée (spec ultérieure).