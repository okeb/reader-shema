# Changelog

Toutes les versions notables du lecteur ShemaProject sont documentées ici.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/).

## [Unreleased]

### Modifié

- **Topbar (menu Apparence)** : bouton « Se connecter » mis en avant en CTA primaire (sans libellé « Compte & synchronisation » devant) quand l'utilisateur est déconnecté.
- **Dock de lecture** : padding vertical réduit (`py-1.5` → `py-1`).

### Corrigé

- **Auth + e-mail sur Vercel** : `baseURL` (serveur + client Better Auth) dérivé de l'origine servie (alias `reader-shema.vercel.app`, previews `$VERCEL_URL`, domaine final) au lieu d'une URL fixe — corrige « invalid origin » en test sur l'alias. Expéditeur Resend aligné sur le domaine vérifié `send.shemaproject.org`.

## [0.2.0] : 2026-08-09

### Processus

- **Convention de travail Git Flow** : ajout de `AGENT.md` gouvernant le modèle de branches
  (`master` / `develop` / `feature` / `release` / `hotfix`), la boucle de travail, les releases
  taggées et la mise à jour du `CHANGELOG.md`.

Refonte complète de l'application selon les conventions du projet de référence `whatpass_web` (Next.js 16, React 19, `src/` Clean Architecture + CQRS + DI, next-intl, Zustand+persist+immer, shadcn/ui). L'ancien dossier `shema_project_bible_site` reste intact comme référence ; ce nouveau dossier `reader_shema` reprend toute la valeur domainielle (29 questions quiz, cross-refs 66 fichiers, OG, specs, BYM) dans une architecture testable et internationalisable.

### Architecture

- **Clean Architecture + CQRS + DI** : `src/domain` (entities, value-objects, services), `src/application` (queries/handlers/factories, bus CQRS), `src/infrastructure` (api Bible axios, repositories, conteneur DI), `src/presentation` (composants atomic design, hooks, stores, providers). Le god-component `o-bible-reader` est décomposé en `o-reader-state-provider` + `o-reader-dock-controller` + `o-verse-actions-controller` + `t-reader`.
- **Stores Zustand+persist+immer** : 9 stores (favoris, signets, annotations, préférences lecteur, position, historique, version active, quiz-seen, doodle-seen) avec clés `localStorage` préservées verbatim et flag `hydrated` via `onRehydrateStorage`.
- **i18n next-intl** (`fr` défaut, `en` scaffold, `localePrefix:'always'`) : routes localisées, chemins traduits (`/accueil`→`/home`, `/favoris`→`/favorites`, etc.), coquille applicative + scripts init thème/accent sans flash.

### Fonctionnalités (ports + finalisations)

- **Lecteur** (read + refs) : sélecteurs livre/chapitre, dock flottant, réglages typographiques, mode focus, raccourcis clavier (j/k/v/b/n/?, ±, 1-3, s, t, f).
- **Strong + cross-refs** : panneau Strong, concordance paginée, chips de renvoi navigables (cross-refs 66 fichiers JSON).
- **Notes / signets / favoris / surlignage** : cluster d'actions de verset, panneaux, éditeur de note, export/import JSON.
- **Quiz** (29 questions BYM) : carte scindée (Prompt/Choices/Explanation + `useQuizState`), branchée au dock + réglages.
- **Doodles** : logo d'occasion animé Rive dans la topbar (résolution déterministe, repli silencieux, carte d'explication).
- **Accueil + Favoris** : écran d'accueil brandé (reprendre, récents, lanceur de passage), page favoris groupés par version.
- **Palette ⌘K** : recherche/aller à une référence, montée globalement (layout), loupe mobile, aide raccourcis.
- **OG + SEO** : vignette 1200×630 dynamique (`/api/og`, `next/og`), `reference-formatter.service` (pur) + `og-api` (infra), sitemap localisé (16 URLs), robots, 5 pages info (à propos, mentions légales, confidentialité, crédits, nouveautés).
- **Transfert de données** : export/import JSON avec **validation zod** de la sauvegarde (rejet explicite des fichiers malformés).

### Correctifs

- Middleware next-intl : exclusion `data` / `doodle` / `.riv` / `.xml` pour servir les assets statiques et `sitemap.xml` sans réécriture (404 sinon).

### Compte & synchronisation (spec 22 — phase 1 + 2)

- **Compte facultatif (Neon Managed Better Auth)** : authentification par **magic link ET email/password** (les deux), UI custom (modal, pas les composants pré-construits). Le lecteur reste **ouvert sans compte** — l'auth ne protège que `/account` et `/admin` (proxy), jamais les pages de lecture. Première dépendance serveur runtime du projet.
- **Chiffrement bout-en-bout (Web Crypto natif, zéro dépendance)** : `PBKDF2` (250k iters, SHA-256) sur une **clé de récupération** aléatoire 256-bit → master key `AES-GCM` 256 non-extractable. La clé de récupération est affichée **une fois**, purement client (jamais stockée par le serveur). **Perte = données synchronisées irrécupérables** (assumé par la spec). Le serveur ne stocke que des **blobs opaques** (ciphertext + nonce).
- **Synchronisation multi-appareil per-kind-blob LWW** : un blob JSON chiffré par kind (`favorites`, `bookmarkGroups`, `bookmarks`, `notes`, `highlights`, `readingPosition`, `readerPrefs` opt-in). Fusion au pull : `remote.updatedAt > local → remplacer`. **Pas de tombstones** (suppression = réécriture du blob). Simplification assumée vs « par entité » (§4.2) — per-entity = raffinement futur.
- **File offline** : kinds sales dans un store persisté, flush debouncé 2 s, déclenché aussi sur `online` et `visibilitychange` (hidden). Mode local-only silencieux si pas de compte / Neon absent.
- **API routes** : `GET /api/sync` (pull-all), `GET/PUT /api/sync/[kind]` (LWW server-side `ON CONFLICT … WHERE updated_at < EXCLUDED`), `DELETE /api/account` (purge immédiate). Table applicative `user_data` (BYTEA ciphertext/nonce) à côté du schéma `neon_auth`.
- **UI compte** : modal custom (machine à états email → magic-sent/password → recovery-display/entry → migration → done), focus trap maison, ouverture cross-panels via `bym:open-account`. Entrées « Retrouver sur tous vos appareils » dans les empty-states (notes, signets, favoris). Indicateur de session discret dans le menu Apparence.
- **Section « Vos données »** (réglages de lecture) : email/lien compte, toggle « Synchroniser mes réglages » (opt-in), **export JSON** (réutilise `downloadBackup()`), **suppression de compte** en deux temps. « Pas de score, pas de stats. »
- **Migration premier login** : local présent + cloud vide → le local devient la source (push). Distinction premier login / retour via `hasCloudData()` (pull sans décrypt).
- **Horodatages d'entités (phase 2)** : `updatedAt` ajouté à `FavoriteVerse`, `BookmarkVerse`, `BookmarkGroup` (migration `onRehydrateStorage` `updatedAt ?? createdAt`, miroir de `migrateNotes`). `Note` déjà pourvu ; `HighlightMap` reste blob-LWW. Clés `localStorage` inchangées.
- **Mentions RGPD** : section « Compte & synchronisation (facultatif) » sur la page Confidentialité (blobs E2EE opaques, région eu-west-2 / AWS Londres, Royaume-Uni — adéquation RGPD, clé de récupération responsabilité utilisateur, droits export/suppression, aucune métrique, lecture anonyme préservée). `STORAGE_KEYS` complété avec les clés sync.

### Page « Compte & données » (spec 25)

- **Page dédiée `/account`** : la gestion des données (email, bascules de sync, export JSON, suppression de compte en deux temps, déconnexion) quitte le popup « Réglages de lecture » pour une page dédiée, respirante et bookmarkable. La modal reste l'unique entrée pour **se connecter** et **déverrouiller** (recovery key) ; la page gère un compte déjà authentifié. Route protégée par le proxy (chemin `/account` identique dans les deux locales pour préserver le gating).
- **Source unique des bascules** : `syncEnabled` et l'opt-in `settingsSyncOptIn` ne vivent plus que sur `/account` (plus de toggle dans la modal `done` ni dans le popup réglages). Évite la triplication et les états divergents.
- **Retrait de la section compte du popup réglages** : le popup « Réglages de lecture » ne porte plus aucune entrée compte — l'entrée reste uniquement dans le menu Apparence (top-left), qui ouvre la modal.
- **États verrouillé / déverrouillé** : master key absente (retour sur l'appareil) → bannière « Déverrouiller » (ouvre la modal à l'étape `recovery-entry`) ; export et suppression restent disponibles (locaux / serveur, sans master key).

> Phase 3 (administration éditoriale) hors scope.

### Authentification & e-mails (spec 26 — Better Auth raw)

- **Migration vers Better Auth raw auto-hébergé** : abandon du wrapper Neon Managed Better Auth
  (`@neondatabase/auth`, qui ne surfaceait ni plugins ni `sendEmail`) au profit de `better-auth`
  branché directement sur un `pg.Pool` (endpoint Neon **pooled `-pooler`**). Les tables
  d'authentification (`user`, `session`, `account`, `verification`) vivent désormais dans le
  schéma `public` de la même base Neon eu-west-2 que `user_data` — **sans FK** vers cette dernière
  (doctrine d'isolation). `@neondatabase/auth` retiré ; `@neondatabase/serverless` conservé
  (toujours utilisé pour `user_data`).
- **E-mails transactionnels via Resend** : vérification de l'adresse e-mail, réinitialisation
  du mot de passe (forgot-password) et lien de connexion (magic-link) sont désormais réellement
  câblés via `sendEmail` (Resend). No-op en dev si la clé est absente. Templates HTML maison
  (`lib/email/templates.ts`) — pas de dépendance `@react-email`.
- **Forgot-password** : « Mot de passe oublié ? » dans la modal → e-mail → page publique
  `/${locale}/reinitialiser?token=` → nouveau mot de passe. **Doctrinal : récupère l'accès au
  compte (login), pas aux données** — un nouvel appareil garde besoin de la clé de récupération
  (le chiffrage E2EE est intact, spec 22). La connexion au seul mot de passe est renvoyée à une
  spec ultérieure (enveloppe DEK+KEK).
- **Magic-link** : « Recevoir un lien de connexion » sur l'étape e-mail → mail → `/account`
  (verrouillé) → déverrouillage via la clé de récupération.
- **Vérification e-mail** : `sendVerificationEmail` best-effort après inscription ;
  `requireEmailVerification:false` (un non-vérifié peut se connecter ; les données restent gated
  par la clé de récupération).
- **Gate proxy allégée** : `getSessionCookie` (présence de cookie, sans hit DB) au middleware ;
  vérité réelle re-validée côté serveur dans `requireUser()` (`auth.api.getSession`).
- **Environnement** : `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL` (pooled),
  `RESEND_API_KEY` (optionnel) ; retrait de `NEON_AUTH_BASE_URL` / `NEON_AUTH_COOKIE_SECRET`.
- **Doctrine RGPD** : page Confidentialité complétée — authentification auto-hébergée (Better Auth,
  tables applicatives dans `public`), sous-traitement e-mails via Resend (canal limité à
  l'adresse + un lien signé à courte expiration), précision « mot de passe oublié ≠ accès aux
  données ». `EMAIL_PROVIDER` ajouté à `src/shared/constants/legal.ts`.

### Avatar utilisateur (spec 27)

- **Avatar déterministe depuis l'identifiant** : connecté, le bouton de réglages (roue crantée)
  en haut à droite devient l'avatar de l'utilisateur (fond qui suit le thème) au lieu de l'icône.
  Le clic ouvre toujours le menu Apparence. La seed est `user.id` (opaque, stable, identique sur
  tous les appareils) — **jamais l'e-mail** (PII). Aucune collection serveur, aucun upload.
- **Deux générateurs au choix** : `minidenticons` (laurentpayot/minidenticons, identicons
  pixelisés en string SVG → data URI dans un `<img>`, SSR-safe) ou `playful-avatars`
  (cmaas/playful-avatars, web component `<playful-avatar>` à 6 variantes — `beam`, `marble`,
  `pixel`, `sunset`, `ring`, `bauhaus`). `playful-avatars` appelle `customElements.define` au
  top-level sans garde → **import dynamique côté client** (effet) pour éviter un crash SSR.
- **Réglage dans le menu Apparence** : section « Avatar » (connecté seulement) avec choix du
  générateur (radiogroup) + grille des 6 variantes `playful` (prévisualisation live sur la seed).
  Préférence cosmétique persistée dans `bibleReaderPrefs` (`avatarStyle`, `avatarVariant`),
  synchronisée via le kind existant `readerPrefs` (opt-in) — pas de nouveau kind de sync.
- **Déconnecté** : la roue crantée reste ; l'entrée « Compte & synchronisation / Se connecter »
  ouvre la modal de compte (possibilité de se connecter dans ce même menu).

## [0.1.12] : 2026-07-30

### Changements

- **Quiz — validation** : après avoir cliqué « Valider », les choix et le bouton disparaissent pour laisser la place à l'explication (transition 600 ms).
- **Quiz — choix** : style affiné (arrondi `rounded-xl`, léger zoom au survol, fond coloré sur sélection).
- **Changelog** : entrées détaillées ajoutées pour les versions v0.1.0 à v0.1.11 ; titres en gras pour v0.1.0.

## [0.1.11] : 2026-07-30

### Ajouts

- **Carte Question/Réponse (morph)** : animation fluide entre état replié et développé, icône qui grandit, label qui change.
- **Bouton retour (quiz)** : icône `arrow-turn-backward`, positionné en absolu en haut à droite.

## [0.1.10] : 2026-07-30

### Changements

- **Carte Question/Réponse** : design inline (pas de popup), icône à droite, carte empilée pour les questions multiples.

## [0.1.9] : 2026-07-30

### Changements

- **Renommage** : « Quiz » devient « Question/Réponse » dans toute l'interface.
- **Bouton quiz retiré du dock et de la barre supérieure** : le toggle est déplacé dans le menu Apparence (engrenage).

## [0.1.8] : 2026-07-30

### Changements

- **Bouton raccourcis clavier retiré de la barre supérieure** : déplacé dans le menu Apparence (engrenage).

## [0.1.7] : 2026-07-30

### Changements

- **Bouton raccourcis clavier retiré du dock** : déplacé dans le panneau Réglages de lecture.

## [0.1.6] : 2026-07-30

### Ajouts

- **Boutons Quiz et raccourcis clavier** : ajoutés dans la barre supérieure (côté droit).

## [0.1.5] : 2026-07-30

### Ajouts

- **Quiz popup** : questions bibliques interactives sur l'en-tête du chapitre, toggle dans les réglages, 3 questions exemples.

## [0.1.4] : 2026-07-30

### Ajouts

- **Visualiseur de notes (lecture seule)** : cliquer l'icône note ouvre un visualiseur au lieu de l'éditeur. Le bouton « Modifier » bascule vers l'éditeur complet.

## [0.1.3] : 2026-07-30

### Changements

- **Séparateur de version** : le parser du changelog accepte maintenant le deux-points (`:`) en plus du tiret long (`—`).

## [0.1.2] : 2026-07-29

### Changements

- **Footer redesigné** : liens info à gauche, signalement à droite ; copyright à gauche, version à droite.
- **Dock raccourci** : le bouton raccourcis clavier est retiré du dock (déplacé dans les réglages).

## [0.1.1] : 2026-07-29

### Ajouts

- **Signalement de problème** : lien « Signaler un problème » dans le footer (mailto:bug@shemaproject.org, pré-rempli avec version, URL et navigateur).
- **Version affichée** : la version de l'app est visible dans le footer et les crédits de lecture, sous forme de bouton cliquable menant au changelog.
- **Page Changelog** : `/nouveautes` liste les changements par version.

## [0.1.0] : 2026-07-28

### Ajouts

- **Première version publique** du lecteur ShemaProject : lecture de la Bible de Yéhoshoua ha Mashiah (BYM), Darby et Louis Segond 1910, avec outils d'étude intégrés.
- **Lecture continue** avec réglages typographiques (police, taille, interligne, colonnes, thème clair/sombre).
- **Concordance Strong** : exploration des mots originaux (hébreu, grec) depuis chaque verset BYM.
- **Vue parallèle** : comparaison de deux versions côte à côte.
- **Notes & surlignages** : annotations personnelles multi-versets, surlignage en couleur, stockage local.
- **Favoris & signets** : versets favoris, groupes de signets thématiques, reprise automatique de la lecture.
- **Recherche par référence** : raccourci ⌘K (Ctrl+K).
- **Renvois bibliques** : liens contextuels vers d'autres passages (données openbible.info, licence CC-BY).
- **Partage** : copie avec référence, vignette OG dynamique.
- **Mode focus** : lecture immersive, tout le chrome disparaît.
- **Données 100 % locales** : aucun compte, aucun traceur.