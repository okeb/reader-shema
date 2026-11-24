# Spec 39 — Synchronisation sans chiffrement de bout en bout (connecté = synchronisé)

> **Statut** : ✅ Implémenté · **Priorité** : 🔴 Haute · **Effort** : M ·
> **Dépendances** : **Spec 22** (compte + sync, adapters, LWW) · **Spec 26** (Better Auth + Resend,
> reset de mot de passe) · **Spec 25** (page `/account`) · **Remplace la spec 28** (enveloppe DEK/KEK,
> clé de récupération) et la partie E2EE de la spec 22 · **Impacte la spec 33** (RGPD).
>
> **Décisions prises** : suppression du chiffrement de bout en bout · la session suffit à
> synchroniser, sans clé ni code · plus de clé de récupération (le reset du mot de passe par e-mail
> suffit) · nouvelle table en clair `user_sync`, l'ancienne `user_data` est gelée comme archive puis
> supprimée · conversion des données chiffrées **automatique et jamais bloquante**.

## 1. Objectif

Aujourd'hui, un utilisateur connecté ne synchronise **que si l'appareil détient la clé de
déchiffrement** (DEK) : obtenue avec le mot de passe ou la clé de récupération, gardée 30 jours en
IndexedDB. Sans elle, le moteur est inerte **en silence** (`pushKind`/`flush`/`pullAndMerge`
retournent sans rien faire) : on se croit synchronisé alors que rien ne part. C'est le cas quand la
clé expire ou que le navigateur purge le stockage (Safari : 7 jours sans visite), sur un appareil
restauré sans ressaisie du mot de passe, après un reset de mot de passe ou sur un ancien compte. Et
une clé de récupération perdue rend les données cloud **irrécupérables**.

Les données synchronisées (favoris, signets, surlignages, notes, position de lecture, historique,
réglages) **ne sont pas sensibles** : le chiffrement de bout en bout coûte plus qu'il ne protège. On le
retire. **Être connecté = être synchronisé**, partout, sans étape supplémentaire.

## 2. Valeur utilisateur

- **La sync marche, tout simplement** : se connecter suffit, sur n'importe quel appareil, et elle ne
  se met plus en pause sans prévenir.
- **Plus de code à garder** : la clé de récupération disparaît. Mot de passe oublié → lien par e-mail
  → on retrouve tout.
- **Plus de perte définitive** : le serveur peut toujours relire les données d'un compte.
- **Migration sans action** : les données chiffrées existantes sont converties d'elles-mêmes dès
  qu'un appareil dispose encore de la clé. Personne n'est bloqué.

## 3. Périmètre

- **Inclus** :
  - Table `user_sync` (clair, `payload TEXT`) et routes `/api/sync` réécrites dessus.
  - Moteur de sync sans clé : actif dès qu'une session existe (et que l'utilisateur n'a pas mis la
    sync en pause).
  - Conversion des données chiffrées (`user_data`) : automatique avec la clé de l'appareil ou le mot
    de passe saisi à la connexion. Récupération manuelle **facultative** depuis `/account`.
  - Simplification de la modale de compte : e-mail → mot de passe → terminé.
  - Page `/account` : la bannière « verrouillée » est retirée. On ajoute une ligne d'état de sync
    (« Synchronisé il y a 2 min » / « En attente de connexion ») et la carte de récupération
    facultative tant qu'une archive chiffrée existe.
  - Suppression : clé de récupération (affichage, e-mail, route, template), enveloppe, « se souvenir
    de cet appareil », store `crypto-session`. `device-key-store` est conservé en lecture seule, le
    temps de la migration.
  - Textes légaux : page Confidentialité et `legal.ts`. Mise à jour des specs 22, 28, 33 et du README.
  - CHANGELOG (entrée côté utilisateur).
- **Exclu** :
  - Chiffrement côté serveur au niveau applicatif (pgcrypto) : la base est déjà chiffrée au repos chez
    Neon, ce serait de la complexité sans gain réel.
  - Fusion fine des kinds « remplacement » (favoris, position) : on garde le LWW par kind.
  - Interface d'administration qui lirait les données utilisateur : aucune n'est prévue.
  - Export côté serveur : l'export JSON local de `/account` reste.

## 4. Spécification fonctionnelle

### 4.1 Règle d'activation

`syncActive = session présente && !syncPaused`.

- `syncPaused` remplace `syncEnabled` dans `account.store` (clé `bym:account`). Il vaut `false` par
  défaut et ne passe à `true` que sur un choix explicite (bascule de `/account`). Ce changement évite
  le piège actuel : les appareils jamais déverrouillés ont `syncEnabled=false` enregistré. Au
  rehydrate, l'ancien champ `syncEnabled` est ignoré.
- La sync étant active, les abonnés (mutations des stores) et les écouteurs (`online`,
  `visibilitychange`, `focus`) sont branchés dans `o-account-provider`.
- Les erreurs `NotAuthenticatedError` (session expirée) et `AuthNotConfiguredError` restent
  silencieuses : la file locale est conservée et repart à la reconnexion.

### 4.2 Flows

- **Inscription / connexion** : session → `migrate()` (pull, fusion LWW puis push du local jamais
  poussé) → `done`. Aucune étape intermédiaire.
- **Appareil déjà utilisé sans compte** : ses collections locales (favoris, signets, notes,
  surlignages), jamais synchronisées (horloge vide), ne sont pas écrasées par le cloud au premier
  pull. Leurs entrées s'ajoutent à celles du compte (le cloud l'emporte en cas de conflit), sauf le
  groupe de signets « Mes versets » vide, créé d'office sur chaque appareil.
- **Rechargement** : la session est restaurée par le cookie Better Auth, puis `pullAndMerge()` est
  lancé en silence. Rien à saisir.
- **Mot de passe oublié** : reset Better Auth par e-mail (inchangé), puis reconnexion → tout est là.
- **Déconnexion** : les abonnés et les écouteurs sont détachés. Les données locales restent sur
  l'appareil (comportement actuel), et la file et les horloges sont vidées (`useSyncMeta.clear`,
  `useSyncQueue.clear`) pour ne pas pousser sur un autre compte.
- **Suppression du compte** : purge `user_sync` **et** `user_data` (archive), puis `clearDeviceDek`.

### 4.3 Conversion des données chiffrées (migration)

L'archive `user_data` (blobs AES-GCM et `keyEnvelope`) est **gelée** : plus aucune écriture, lecture
seule via `GET /api/sync/legacy`. La conversion fusionne l'archive dans les stores locaux, puis la
sync en clair publie le résultat.

1. **Clé de l'appareil disponible** (DEK valide dans IndexedDB `bym:device-keys`) : au
   chargement de la nouvelle version, si `GET /api/sync/legacy` n'est pas vide, on déchiffre chaque
   kind avec le DEK. Viennent ensuite le `pullAndMerge()` en clair, l'intégration de l'archive (voir
   ci-dessous), l'enfilage des kinds convertis, le `flush()`, puis `DELETE /api/sync/legacy` et
   `clearDeviceDek`.
2. **Connexion par mot de passe** : si l'archive existe et contient une enveloppe avec `pwWrap`, le
   mot de passe saisi (déjà en mémoire au moment de la connexion) déverrouille le DEK. On applique
   ensuite la même procédure qu'en 1, **sans rien demander**.
3. **Aucune clé disponible** (session restaurée, DEK expiré) : la sync en clair démarre **tout de
   suite** avec les données locales et l'archive est laissée intacte. `/account` affiche une carte
   discrète « Récupérer mes anciennes données synchronisées » : on saisit le mot de passe (ou une
   ancienne clé de récupération, dans un champ secondaire) et on applique la procédure 1. La carte
   peut être ignorée, et aucune modale ne s'ouvre automatiquement.
4. **Mauvais mot de passe ou mauvaise clé** : un message s'affiche et l'archive reste intacte. Rien
   n'est jamais supprimé sans un déchiffrement réussi d'au moins un kind.
5. **Comptes legacy pré-spec-28** (blobs sans enveloppe) : seule l'ancienne clé de récupération les
   ouvre (`deriveMasterKey`), via le champ secondaire de la carte. Sans elle, ils restent dans
   l'archive jusqu'à sa suppression.
6. **Fin de l'archive** : la table `user_data` est supprimée le **2027-06-01**, soit environ six mois
   après la mise en production (migration `004`). Le code de conversion
   (section « archive » du moteur, `device-key-store.ts`, `crypto.service.ts`) est retiré en même temps.

**Intégration de l'archive** : on tire d'abord le cloud en clair, puis, kind par kind, l'archive
remplace le local si elle est plus récente (LWW). Sinon, pour les collections, ses entrées absentes
s'ajoutent au local (le local l'emporte en cas de conflit), pour ne rien perdre au moment de la
supprimer.

**Pourquoi l'ordre des appareils n'importe pas** : un appareil sans clé a pu publier en clair avant
celui qui convertit. Les horodatages de l'archive sont conservés au déchiffrement : le plus récent
l'emporte, et les collections plus anciennes sont fusionnées au lieu d'être ignorées.

### 4.4 Cas limites

1. **Ancienne version en cache (onglet ouvert, PWA)** : elle envoie `{ciphertext, nonce}` sur
   `PUT /api/sync/[kind]`, ce qui lui vaut une 400. Ses modifications restent dans sa file locale et
   partent au prochain chargement de la nouvelle version. Aucune perte.
2. **Deux appareils convertissent en même temps** : l'hydratation est idempotente et
   `DELETE /api/sync/legacy` aussi. Le second obtient une archive vide et passe son tour.
3. **Comparaison de chaînes des kinds `merge`** (`adapter.serialize() !== plaintext`) : `payload` est
   un `TEXT` stocké **tel quel**. Un `JSONB` normaliserait l'ordre des clés et les espaces, ce qui
   ferait échouer la comparaison et provoquerait une republication infinie.
4. **Taille** : `PUT` refuse un `payload` de plus de 2 Mo (413) ou un JSON invalide (400). Ce sont des
   garde-fous, puisque le serveur stocke désormais du clair.

## 5. UI / UX

### 5.1 Emplacement & déclencheurs

Les entrées sont inchangées : modale de compte (`bym:open-account`), page `/account`, mentions
« Retrouver sur tous vos appareils ». Le hint `openHint: 'recovery'` est supprimé.

### 5.2 Modale de compte (machine à états)

`email → password (in/up) → done`, avec `forgot-password` et `forgot-password-sent` inchangés. Sont
supprimés : `unlock-password`, `unlock-recovery`, `recovery-display`, la case « se souvenir de cet
appareil », le mode `reset` et `migrating`. Ce dernier est remplacé par l'état `busy` du bouton
pendant `migrate()`.

### 5.3 Page `/account`

- **Ligne d'état** sous la bascule de sync :
  - « Synchronisé · il y a 2 min » (le plus récent `useSyncMeta`, ou l'heure du dernier pull réussi) ;
  - « 3 modifications en attente de connexion » quand `useSyncQueue.pending` n'est pas vide et
    qu'on est hors ligne ;
  - « Synchronisation en pause » quand `syncPaused` est vrai.
- **Bascule** « Synchroniser sur mes appareils » : elle pilote `syncPaused` (inversé).
- **Carte de récupération** (seulement si l'archive existe et que la conversion automatique n'a pas
  pu se faire) : un titre, une phrase, un champ mot de passe, un bouton « Récupérer », un lien
  « J'ai plutôt une ancienne clé de récupération » qui bascule le champ, et un lien « Ignorer » qui
  masque la carte pour cet appareil (`localStorage`).

### 5.4 Thème & accessibilité

Les composants existants sont réutilisés. La ligne d'état est en `role="status"` et
`text-muted-foreground`. La carte utilise les styles de bannière actuels (sans ton d'alerte).

### 5.5 Micro-copy (FR)

- Ligne d'état : « Synchronisé · il y a {durée} » · « {n} modification(s) en attente de connexion » ·
  « Synchronisation en pause ».
- Carte : **« Récupérer mes anciennes données synchronisées »**, puis « Une partie de vos données
  synchronisées avant la mise à jour n'a pas encore été transférée. Saisissez votre mot de passe pour
  les récupérer sur ce compte. » Bouton « Récupérer », liens « J'ai plutôt une ancienne clé de
  récupération » et « Ignorer ».
- Échec : « Mot de passe incorrect, ou ces données ont été chiffrées avec un ancien mot de passe.
  Essayez votre ancienne clé de récupération. »
- Succès : « Vos anciennes données ont été récupérées. »

## 6. Spécification technique

### 6.1 Fichiers

- **Nouveaux** :
  - `db/migrations/003_user_sync_plain.sql` crée `user_sync`, appliquée **avant** le déploiement
    (additive, sans risque).
  - `app/api/sync/legacy/route.ts` : `GET` (blobs `user_data` de l'utilisateur, format actuel) et
    `DELETE` (purge de l'archive).
  - `src/presentation/components/molecules/m-legacy-recovery-card.tsx` et
    `src/presentation/components/molecules/m-sync-status.tsx` (ligne d'état).
  - `src/presentation/stores/sync-status.store.ts` (dernière synchronisation, mémoire seule).
  - `specs/39-sync-sans-chiffrement.md`.
- **Modifiés** :
  - `src/domain/entities/sync.entity.ts` : `SyncBlob { payload: string; updatedAt }` remplace
    `EncryptedBlob`. `keyEnvelope` sort de `SYNC_KINDS` (il ne reste que dans `LegacyKind`, le type de l'archive).
  - `src/infrastructure/repositories/sync.repository.impl.ts`, ainsi que les commandes et requêtes
    sync : payload en clair.
  - `app/api/sync/route.ts` et `app/api/sync/[kind]/route.ts` : `user_sync`, body
    `{ payload, updatedAt }`, validation JSON et taille, même garde LWW.
  - `app/api/account/route.ts` : purge `user_sync` et `user_data`.
  - `src/presentation/lib/sync/sync-engine.ts` : suppression des gardes `masterKey` et `unlocked` et
    du code d'enveloppe. Ajout de `setSyncUser()` et de la garde `isSyncActive()` (session et
    `!syncPaused`). `migrate()` pousse aussi tout kind local absent du cloud (premier passage en
    clair). Section temporaire « archive » : `convertLegacy({ dek } | { password } | { recoveryKey })`
    et `hasLegacyArchive()` (dans le moteur plutôt qu'un module à part, pour ne pas ajouter une
    dépendance presentation → infrastructure de plus à `pnpm arch:check`).
  - `src/presentation/stores/account.store.ts` : `syncPaused` remplace `syncEnabled`.
  - `src/presentation/components/organisms/o-account-provider.tsx` : branchement des listeners et
    subscribers selon la session. Conversion automatique au chargement (DEK de l'appareil). Plus de
    restauration de DEK vers une session crypto.
  - `src/presentation/components/molecules/m-account-dialog.tsx` : étapes simplifiées. Conversion
    automatique après connexion avec le mot de passe en mémoire.
  - `app/[locale]/account/page.tsx` : ligne d'état, carte de récupération, bannière « verrouillée »
    retirée.
  - `src/shared/constants/legal.ts` et `app/[locale]/(info)/confidentialite/page.tsx` : nouvelle
    doctrine (§6.4).
  - `specs/22`, `specs/28` (statut « Remplacé par 39 »), `specs/33`, `specs/README.md`,
    `CHANGELOG.md`.
- **Supprimés** :
  - `src/presentation/stores/crypto-session.store.ts`.
  - `app/api/email/recovery-key/route.ts`.
  - `lib/email/templates/recovery-key.tsx`, ainsi que son export dans `lib/email/templates.tsx`.
  - Les primitives de chiffrement de `crypto.service.ts` : il ne garde que le déchiffrement de
    l'archive (supprimé le 2027-06-01). `device-key-store.ts` ne garde que la lecture et la purge.

### 6.2 Données & persistance

```sql
-- 003_user_sync_plain.sql
CREATE TABLE IF NOT EXISTS user_sync (
  user_id        TEXT    NOT NULL,
  kind           TEXT    NOT NULL,
  payload        TEXT    NOT NULL,   -- JSON sérialisé par l'adapter, stocké tel quel (cf. §4.4.3)
  updated_at     BIGINT  NOT NULL,   -- horloge LWW (ms)
  schema_version INT     NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, kind)
);
CREATE INDEX IF NOT EXISTS user_sync_user_id_idx ON user_sync (user_id);
```

- `user_data` reste en place, gelée (lecture et suppression uniquement), jusqu'à la migration `004`
  du 2027-06-01 (`DROP TABLE user_data`).
- Côté client, `bym:account` passe de `syncEnabled` à `syncPaused`. `bym:device-keys` (IndexedDB) est
  lu seulement pour la conversion, puis purgé.
- Les migrations sont appliquées à la main sur Neon, comme `001` et `002`.

### 6.3 API

- `GET /api/sync` : `{ [kind]: { payload, updatedAt } }`.
- `PUT /api/sync/[kind]` : body `{ payload: string, updatedAt: number }`. Réponse 400 si le body est
  invalide ou si `payload` n'est pas du JSON, 413 au-delà de 2 Mo. Réponse
  `{ updatedAt: retenu }` (LWW inchangé).
- `GET /api/sync/legacy` : `{ [kind]: { ciphertext, nonce, updatedAt } }` (le format actuel, y
  compris `keyEnvelope`), ou `{}` si l'archive est vide.
- `DELETE /api/sync/legacy` : 204.
- Toutes ces routes passent par `requireUser()` et sont en `force-dynamic`.

### 6.4 Doctrine de confidentialité (nouvelle)

- Par défaut, tout reste local et aucun compte n'est nécessaire (inchangé).
- Avec un compte, les données synchronisées sont stockées **sur notre serveur, associées à votre
  compte**. Seul votre compte connecté y accède. Elles sont chiffrées pendant le transfert (HTTPS)
  et au repos par l'hébergeur (Neon, {région}).
- **Elles ne sont pas chiffrées de bout en bout** : l'équipe technique pourrait techniquement y
  accéder. Nous nous engageons à ne pas les consulter, sauf à votre demande (support) ou sur
  obligation légale.
- Mot de passe oublié : un lien de réinitialisation est envoyé par e-mail, sans perte de données.
- Suppression du compte : effacement complet et immédiat des données synchronisées.
- Une phrase transitoire précise qu'une copie chiffrée des données antérieures à la mise à jour est
  conservée au plus tard jusqu'au 2027-06-01, puis effacée.

## 7. Critères d'acceptation

- [ ] `tsc --noEmit`, `pnpm lint`, `pnpm arch:check` (sans nouvelle violation) et
  `pnpm changelog:check` passent.
- [ ] Nouvel utilisateur : inscription → les données locales apparaissent dans `user_sync`, sans
  écran de clé.
- [ ] 2ᵉ appareil : connexion → les données du 1ᵉʳ apparaissent, et une modification y remonte en
  moins de 5 s après sa sortie de l'onglet.
- [ ] Rechargement plus de 30 jours plus tard, ou après une purge d'IndexedDB : la sync fonctionne
  sans rien saisir.
- [ ] Mot de passe réinitialisé par e-mail → reconnexion → toutes les données sont là.
- [ ] Compte chiffré avec un DEK d'appareil valide : premier chargement → données converties,
  `user_data` vide pour cet utilisateur, `bym:device-keys` purgé, aucune perte (surlignages, notes,
  signets comparés avant et après).
- [ ] Compte chiffré, connexion par mot de passe : conversion silencieuse, sans écran supplémentaire.
- [ ] Compte chiffré sans clé : la sync en clair fonctionne tout de suite. La carte de récupération
  apparaît sur `/account`, et avec le mot de passe correct, les anciennes données sont fusionnées.
- [ ] Mauvais mot de passe sur la carte : message d'erreur, archive intacte.
- [ ] Suppression du compte : `user_sync` et `user_data` sont vides pour cet utilisateur.
- [ ] Déconnexion puis connexion avec un autre compte : les modifications en attente du premier compte
  ne partent pas dans le second (la file et les horloges sont vidées à la déconnexion).
- [ ] La ligne d'état de `/account` affiche « Synchronisé · il y a … », et « en attente » hors ligne.
- [ ] La page Confidentialité et `legal.ts` ne mentionnent plus le chiffrement de bout en bout, la clé
  de récupération ni « se souvenir de cet appareil ».

## 8. Risques & questions ouvertes

- **Confidentialité réduite (assumée)** : les notes personnelles deviennent lisibles par
  l'administrateur de la base. C'est un choix produit (données non sensibles), annoncé clairement sur
  la page Confidentialité. Une fuite de la base exposerait le contenu : le risque est limité par
  l'hébergement chez Neon (chiffrement au repos, accès restreint) et par la nature des données.
- **Archive non convertie** : un utilisateur qui ne revient pas avant le 2027-06-01 avec une clé
  perdra ses anciennes données cloud (il les perdrait déjà aujourd'hui). Ses données **locales**
  ne sont pas touchées.
- **Kinds de remplacement** (favoris, position, réglages) : en cas de conversion tardive, la version
  la plus récente l'emporte, comme dans le LWW actuel.
- **Autre usage du serveur** : le clair rendrait possibles des fonctions côté serveur (export, partage
  de notes, sauvegarde). Hors périmètre : la doctrine spec 00 (aucune métrique) reste en vigueur.
