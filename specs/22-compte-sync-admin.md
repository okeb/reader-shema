# Spec 22 — Compte, synchronisation multi-appareil & administration

> **Statut** : Proposé (décisions posées) · **Priorité** : 🔴 Haute · **Effort** : L (backend) ·
> **Dépendances** : **Doctrine spec 00** (grâce, pas performance — aucune métrique) · réutilise les
> hooks de persistance locaux existants (favoris, signets, annotations, position, historique,
> préférences) · **introduit la première dépendance serveur runtime du projet** : auth + DB ·
> **Aucune instrumentation** (décision produit + doctrine 00).
>
> **Décisions prises** : auth = **magic link** · chiffrement = **E2EE dès v1** (clé de récupération à
> l'inscription) · stockage = **Neon (Postgres)**, région **UE** (RGPD) · priorité = **sync d'abord**
> (phase 1 : compte + sync favoris/position + migration). **Reste ouvert** : modèle admin (B/C, phase 3).

## 1. Objectif

Le lecteur est aujourd'hui **100 % client** : ses données personnelles vivent en `localStorage`, donc
**liées à un appareil**. Deux besoins concrets émergent :

1. **Retrouver sa sélection d'un appareil à l'autre** — notes, surlignages, favoris, signets, position
   de lecture. Actuellement perdus au changement de téléphone/ordinateur. Demande un **compte** +
   un **backend de synchronisation**.
2. **Administrer le contenu éditorial plus simplement** — éclairages (21), doodles (18), quiz (19),
   plans (05), verset du jour (06) — sans éditer du markdown/TS dans le dépôt. Demande une
   **interface d'administration** pour l'équipe.

Cette spec **recense l'ensemble** (compte, sync, admin) et le backend qui les supporte, **sans rompre
la posture du projet** : lecture anonyme toujours possible, aucune métrique, contenu éditorial
toujours versionné et relisible.

## 2. Valeur utilisateur

- **Continuité multi-appareil** : mes notes/signets/favoris/reprise me suivent d'un appareil à l'autre.
- **Compte juste-à-temps** : la lecture reste anonyme ; le compte se présente **quand on veut
  sauvegarder**, jamais comme une porte à l'entrée. Promesse claire : « Retrouvez vos notes sur tous
  vos appareils (nécessite un compte ShemaProject). »
- **Administration ergonomique** : l'auteur/l'équipe édite le contenu éditorial via une UI, sans git ni
  markdown, avec un workflow brouillon → relecture → publication.
- **Posture de confiance préservée** : pas de métriques, données exportables et supprimables, lecture
  jamais bloquée derrière un login. Le serveur est un **dumb pipe**, pas un analytics.

## 3. Périmètre

- **Inclus** :
  - **Compte ShemaProject** — auth **juste-à-temps**, magic link recommandé (§4.1).
  - **Synchronisation multi-appareil** des données personnelles : favoris, signets (+ groupes), notes,
    surlignages, position de lecture ; réglages en **opt-in** ; historique en **local-only** par défaut
    (§4.2).
  - **Migration local → cloud à la création du compte** (perte zéro : l'existant anonyme remonte).
  - **Portabilité** (export JSON) & **suppression de compte** (RGPD-friendly).
  - **Interface d'administration** du contenu éditorial (CMS-lite, équipe only) : éclairages, doodles,
    quiz, plans, verset du jour ; workflow brouillon → relecture → publication ; export vers le dépôt
    (§4.4).
- **Exclu** (pour cette itération) :
  - **Métriques, stats, tableaux de bord de comportement lecteur** — rejeté (doctrine 00 + décision
    produit). L'admin a un tableau de **contenu**, jamais d'**usage**.
  - **Notifications / relances email push** — rejeté (pull, pas push). Un magic link n'est jamais
    réemployé pour pousser.
  - **Partage public de notes / réseau social** — hors périmètre.
  - **Compte obligatoire pour lire** — jamais une porte (§7).
  - **Éclairages générés par IA sans relecture humaine** (cf. spec 21 §3).

## 4. Spécification fonctionnelle

### 4.1 Compte & authentification juste-à-temps

- La **lecture anonyme est inchangée** : `localStorage` reste la source locale, l'app fonctionne sans
  compte comme aujourd'hui.
- Le compte se présente **aux points où l'on veut sauvegarder** : panneau Notes, panneau Favoris,
  panneau Signets — entrée sobre « Retrouver sur tous vos appareils ». Jamais d'icône compte dans la
  topbar au lancement (la topbar reste lecture-first, doctrine 00 §4.6).
- **Création** : email + **magic link** (**décidé** — pas de mot de passe à retenir, pas de flux
  OAuth lourd). Saisie de l'email → envoi d'un lien (valable ~15 min, à usage unique) → vérification
  → compte créé. (Passkey / OAuth Google écartés pour v1 — pourraient s'ajouter plus tard sans
  casser le modèle.)
- **À la création** : **migration local → cloud** (merge, §4.3) — l'existant anonyme remonte, rien ne
  se perd. L'UI annonce « Récupération de vos notes/signets/favoris… » pendant la migration.
- **Session** : cookie httpOnly côté serveur (pattern Auth.js) sur le domaine ; le lecteur reste
  connecté entre les visites.
- **Déconnexion** : repasse en mode local-only **sans perte** (les données restent dans le cloud et
  localement).

### 4.2 Synchronisation — jeu de données & direction

Jeu de données personnelles (clés `localStorage` existantes, inchangées) :

| Donnée | Clé | Sync | Note |
|---|---|---|---|
| Favoris | `bymFavorites` | ✅ défaut | `FavoriteVerse[]` |
| Signets (groupes) | `bymBookmarkGroups` | ✅ défaut | groupes nommés + couleur |
| Signets (versets) | `bymBookmarks` | ✅ défaut | `BookmarkVerse[]` |
| Notes | `bymNotes` | ✅ défaut | `NoteMap` (lib/annotations.ts) |
| Surlignages | `bymHighlights` | ✅ défaut | `HighlightMap` |
| Position de lecture | `lib/reading-position.ts` | ✅ défaut | reprise (spec 04) |
| Réglages de lecture | `bibleReaderPrefs` | ⚙️ **opt-in** | certains veulent du per-device (taille police) |
| Historique nav. | `bym:nav-history` | ❌ local-only | éphémère, faible valeur cross-appareil |
| « déjà lu » éclairages | `bym:eclairages-seen` | ✅ défaut | drapeau par id, jamais agrégé (spec 21) |
| Thème / accent | `lib/theme.ts`, prefs | ⚙️ opt-in | suit les réglages |

- **Modèle de réconciliation** : chaque entité porte un `updatedAt` ; merge par **last-write-wins par
  entité** au pull. Les conflits réels sont rares (timestamp + granularité par verset/signet).
- **Direction bidirectionnelle** : écriture locale → push cloud (debounced) ; ouverture sur un nouvel
  appareil → pull puis hydratation.
- **Hors-ligne** : les écritures restent locales (localStorage, inchangé) ; une **file d'attente** push
  au retour réseau. La lecture reste 100 % fonctionnelle sans réseau.
- **Toggle global « Synchronisation »** dans les réglages (section « Vos données ») ; défaut **activé
  si connecté**. Désactivé → l'app revient au mode local-only d'aujourd'hui (aucune perte).

### 4.3 Migration local → cloud

- Au premier login : on lit toutes les clés `localStorage` listées ci-dessus, on merge avec l'état
  cloud (vide si nouveau compte) selon last-write-wins, on pousse le résultat, on réécrit le local
  fusionné. **Aucune donnée n'est écrasée sans merge**.
- L'UI signale la migration en cours (un instant) puis « Vos données sont suivies sur vos appareils. »

### 4.4 Confidentialité & doctrine (point critique)

- **Pas de métriques** : le serveur est un **dumb pipe** stockant des blobs personnels ; aucune
  agrégation, aucun comptage, aucun envoi analytique. Conforme doctrine 00 + décision produit
  (pas d'instrumentation, comme pour spec 21).
- **Chiffrement (décidé — E2EE dès v1)** : contenu personnel **chiffré côté client**, le serveur ne
  stocke que du chiffré (Neon ne voit que des blobs opaques) ; l'admin ne peut **jamais** lire les
  notes (séparation nette : l'admin gère le **contenu éditorial**, pas les **données lecteur**). Le
  client détient la clé (dérivée d'un secret utilisateur) ; le serveur n'a jamais la clé en clair.
- **Récupération de compte (décidé — clé de récupération)** : à l'inscription, génération d'une
  **clé de récupération** (string) affichée **une fois**, à copier/télécharger/conserver par
  l'utilisateur (pattern Proton/1Password). Perte de l'accès **et** de la clé = perte des données —
  message explicite à l'inscription (« Sans elle, vos données sont irrécupérables. »). Honnête avec
  la promesse E2EE ; charge utilisateur assumée (UI de copie + rappel à la connexion possible).
- **Portabilité** : « Exporter mes données » (JSON complet, bouton dans le compte).
- **Suppression** : « Supprimer mon compte » efface le cloud ; le local reste maîtrisé par le
  navigateur. Effacement immédiat, sans délai accusateur.
- **La Parole d'abord** : le prompt de compte vit dans les coins (notes/favoris/signets), **jamais** à
  l'ouverture de l'app ; aucun modal au lancement.
- **Pull, pas push** : aucun email de relance (« ça fait 4 jours ») ; le magic link n'est jamais
  réemployé pour pousser vers le lecteur.

### 4.5 Interface d'administration (contenu éditorial)

- **Auth séparée** : comptes **équipe only** (pas les comptes lecteurs). Route `/admin` non liée depuis
  le lecteur.
- **Périmètre** : contenu éditorial uniquement — éclairages (21), doodles (18), quiz (19), plans (05),
  verset du jour (06). **Jamais** de données lecteur (séparation §4.4).
- **Workflow** : brouillon → relecture → publication. Audit léger (qui/quoi/quand) — pas pour scorer,
  pour la traçabilité éditoriale.
- **Trois modèles d'hébergement du contenu** (à trancher, §9) :
  - **A. DB source de vérité, reader lit la DB live** (ISR) — le reader devient **runtime-dépendant**
    de la DB ; perd le statut 100 % client + le versioning git + la review par PR. **Déconseillé**
    (casse la posture actuelle et la qualité éditoriale versionnée).
  - **B. DB = atelier d'édition, publish → export vers le dépôt** (markdown/JSON commité, build
    statique) — le reader **reste statique**, le contenu reste versionné/reviewable, l'admin n'est
    qu'une couche d'édition au-dessus du dépôt. **Recommandé** (préserve la posture).
  - **C. Sans DB éditoriale** : l'admin commit directement via l'API GitHub (forms authentifiés →
    commit/PR sur le dépôt) — le plus léger, zéro DB pour le contenu ; draft/review via branches/PR.
    Alternative légère si l'on ne veut pas de DB éditoriale.
- **Recommandation** : **B** (ergonomie draft/review + reader statique). **C** si l'on veut zéro DB
  éditoriale. **A** écarté. **Ouvert**.

## 5. UI / UX

### 5.1 Emplacement & déclencheurs

- **Entrée compte** : dans les panneaux Notes / Favoris / Signets — lien « Retrouver sur tous vos
  appareils ». Pas d'icône compte en topbar au lancement. Si connecté, un **indicateur de session
  discret** (point / avatar miniature) dans le menu Apparence (roue crantée), pas dans le champ de
  lecture.
- **Création de compte** : modal « Créer votre compte ShemaProject — Retrouvez vos notes, signets et
  favoris sur tous vos appareils. » Saisie email → magic link.
- **Réglages de lecture** : nouvelle section « Vos données » (compte, toggle sync, export,
  suppression) — en bas du panneau, après « Mode focus ».
- **Admin** : route `/admin` séparée, non liée depuis le lecteur ; auth équipe.

### 5.2 Disposition (wireframe) — modal création de compte

```
        ┌──────────────────────────────────────┐
        │  Retrouver vos notes sur tous vos     │
        │  appareils                            │
        │                                       │
        │  Créez un compte ShemaProject pour     │
        │  synchroniser notes, signets, favoris │
        │  et votre position de lecture.         │
        │                                       │
        │  ┌──────────────────────────────┐     │
        │  │  votre@email.fr              │     │
        │  └──────────────────────────────┘     │
        │  [  Envoyer le lien de connexion  ]    │
        │                                       │
        │  Vos données actuelles seront          │
        │  conservées et suivies. Rien ne se     │
        │  perd.  ·  Pas de score, pas de stats. │
        └──────────────────────────────────────┘
```

### 5.3 États & interactions

- **Anonyme** : comportement identique à aujourd'hui (localStorage only).
- **Migration en cours** (premier login) : indicateur « Récupération de vos données… ».
- **Connecté, sync active** : indicateur de session discret ; écritures propagées (debounced).
- **Hors-ligne** : badge « synchronisation en attente » discret ; file d'attente push au retour réseau.
- **Sync désactivée** (toggle off) : repasse en local-only, données conservées des deux côtés.
- **Compte supprimé** : retour à l'état anonyme, local intact.

### 5.4 Responsive

- Modal compte : **bottom sheet** sur mobile (pattern `m-note-editor`), centrée sur desktop.
- Admin : interface desktop d'abord (outils équipe) ; utilisable sur tablette, non prioritaire
  mobile.

### 5.5 Thème clair/sombre & accessibilité

- Modales/panneaux sur `bg-popover` / `border-input` (cohérent popovers existants).
- `prefers-reduced-motion` : pas d'animation de transition de session (fade réduit).
- a11y : modal `role="dialog"` + focus piégé + Échap ferme ; email field `type="email"` + label.

### 5.6 Micro-copy (FR)

- Lien d'entrée : « Retrouver sur tous vos appareils ».
- Modal : titre « Retrouver vos notes sur tous vos appareils », sous-titre « Créez un compte
  ShemaProject pour synchroniser notes, signets, favoris et votre position de lecture. »
- Bouton : « Envoyer le lien de connexion ».
- Email reçu : « Votre lien de connexion ShemaProject — valable 15 min. »
- Section réglages : « Vos données » → « Synchroniser sur mes appareils » (toggle), « Exporter mes
  données », « Supprimer mon compte ».
- Garde-fou doctrinal affiché : « Pas de score, pas de stats. »

## 6. Spécification technique

### 6.1 Fichiers (nouveaux / modifiés)

**Nouveaux**
- `lib/auth/` — config Auth.js (provider **magic link** email), gestion de session (cookie httpOnly).
- `lib/sync/` — moteur de sync client : push/pull, merge last-write-wins, file d'attente offline,
  **wrapper de chiffrement E2EE** (dérivation de clé, chiffrement/déchiffrement des blobs) +
  **gestion de la clé de récupération** (génération à l'inscription, affichage unique, vérification
  au futur login).
- `app/api/sync/` — route handlers (Vercel functions) : `pull`, `push`, `migrate` (premier login).
- `app/api/auth/` — routes Auth.js (magic link callback).
- `app/account/` — page compte (export JSON, suppression, toggle sync).
- `app/admin/` — interface d'administration (CRUD éditorial, workflow, audit).
- `lib/admin/` — export publish → dépôt (modèle B) ou commit via API GitHub (modèle C).

**Modifiés**
- `lib/favorites.ts`, `lib/bookmarks.ts`, `lib/annotations.ts`, `lib/reading-position.ts`,
  `lib/reader-preferences.ts` — ajouter une **couche sync** : hook d'écriture → file d'attente push ;
  pull → hydratation au login. La persistance `localStorage` reste la source de vérité locale
  (offline-first inchangé).
- `components/molecules/m-notes-panel.tsx`, panneau favoris, panneau signets — entrée
  « Retrouver sur tous vos appareils » + indicateur de session.
- `components/molecules/m-reading-settings.tsx` — section « Vos données » (compte, sync, export,
  suppression), après « Mode focus ».

### 6.2 Données & persistance

- **DB** : **Neon (Postgres serverless)** — **décidé** (Vercel Marketplace ; KV/Postgres natifs
  Vercel supprimés). Région **UE** (Frankfurt) pour la souveraineté des données (RGPD). Neon stocke
  des **blobs chiffrés opaques** pour la sync (le relationnel sert surtout à l'admin phase 3 dans la
  même base). Branching Neon utile pour les migrations de schéma.
- **Schéma (indicatif)** :
  - `users` (id, email, createdAt, encryptedKey? si E2EE)
  - `sessions` (Auth.js)
  - `user_data` (userId, kind, payload chiffré?, updatedAt) — ou une table par entité (favoris,
    signets, notes…) si l'on préfère du relationnel lisible.
  - `editorial_drafts` / `editorial_published` (ou export repo selon modèle) — éclairages, doodles,
    quiz, plans, verset du jour.
- **Persistance locale** : `localStorage` inchangé (cache/offline-first) ; la DB est miroir sync, pas
  source runtime du reader (modèle B/C).

### 6.3 API / contraintes

- **Première dépendance serveur runtime** du projet (hors API Bible externe `shemaproject.org`).
  Vercel Functions (Fluid Compute) — déjà hébergé sur Vercel.
- **Pas d'agrégation** : les endpoints sync ne renvoient que les blobs de l'utilisateur authentifié ;
  **aucun endpoint « stats »**, aucun comptage côté serveur.
- **Rate-limit** sur l'envoi de magic link (anti-abus) **sans loguer** le comportement de lecture.
- **SSR** : compte/sync/admin sont client-only ; le reader reste SSR/static (modèle B/C). Aucun
  runtime DB sur le chemin critique de lecture.

## 7. Conformité doctrine 00 (tests décidables)

- [x] **Carte, pas trophée** : aucune métrique de lecture ; le serveur ne compte rien, n'agrège rien.
- [x] **Avant, pas arrière** : la sync est additive (sauvegarder), pas un butin brandissable.
- [x] **Décrit, ne célèbre pas** : aucune fanfare à la migration (« vos données sont suivies » sobre).
- [x] **Territoire, pas calendrier** : N/A (pas de progression temporelle).
- [x] **Porte, pas chambre** : la sync porte des **gestes observables** (écrire une note), jamais
      l'intériorité ; le serveur ne jauge pas la méditation.
- [x] **Pull, pas push** : aucun email de relance ; le compte n'est jamais une porte.
- [x] **Additif seulement** : N/A (pas de heatmap).
- [x] **Grâce non instrumentée** : aucune donnée sync branchée sur une métrique de rétention ; pas
      d'A/B.
- [x] **Test des 30 jours** : un absent rouvre l'app **sans appréhension** ni résidu — aucun
      « vous avez manqué ».
- [x] **Mode non-suivi** : sync désactivable, compte supprimable, lecture anonyme possible.
- [x] **La Parole d'abord** : le texte accueille ; le prompt de compte vit dans les coins, jamais à
      l'ouverture.

**Test synthétique** : *« Si je retirais la sync, les gens liraient-ils quand même ? »* → Oui : la sync
est une **commodité**, pas un moteur. → Pas de score, une **invitation à sauvegarder**. ✅

## 8. Critères d'acceptation

- [ ] Lecture anonyme inchangée (aucun compte requis pour lire).
- [ ] Entrée « Retrouver sur tous vos appareils » dans Notes / Favoris / Signets ; pas d'icône compte
      au lancement.
- [ ] Création de compte par magic link ; email → lien → session.
- [ ] Migration local → cloud au premier login (perte zéro, merge last-write-wins).
- [ ] Sync bidirectionnelle de : favoris, signets (+ groupes), notes, surlignages, position.
- [ ] Réglages synchronisés **seulement si** opt-in (toggle « Synchroniser mes réglages »).
- [ ] Historique en local-only par défaut.
- [ ] Hors-ligne : écritures locales mises en file ; push au retour réseau.
- [ ] Toggle global « Synchronisation » (désactivable, sans perte).
- [ ] Export JSON de toutes mes données ; suppression de compte (efface le cloud).
- [ ] Indicateur de session discret (dans le menu Apparence, pas dans le champ de lecture).
- [ ] Admin `/admin` (auth équipe) : CRUD éclairages/doodles/quiz/plans/verset du jour ;
      workflow brouillon → relecture → publication.
- [ ] Admin ne **peut pas** accéder aux données lecteur (séparation nette).
- [ ] Contenu éditorial publié → reader statique (modèle B/C), versionné dans le dépôt.
- [ ] **Aucune métrique, aucun compteur, aucune stat, aucun envoi analytique** (conforme spec 00 +
      décision produit).
- [ ] Aucun email de relance (pull, pas push) ; magic link à usage unique.
- [ ] `tsc --noEmit` + `next build` OK ; non-régression lecture / panneaux existants.

## 9. Risques & questions ouvertes

**Décisions tranchées** (reportées dans §1 / §4 / §6) :

- ✅ **Méthode d'auth** — **magic link** (email). Passkey / OAuth Google écartés pour v1.
- ✅ **Chiffrement** — **E2EE dès v1** (chiffré côté client, blobs opaques sur Neon).
- ✅ **Récupération de compte** — **clé de récupération** affichée une fois à l'inscription.
- ✅ **Fournisseur DB** — **Neon (Postgres)**, région **UE (Frankfurt)**.
- ✅ **Ordonnancement** — **sync d'abord** : phase 1 = compte + sync favoris/position + migration.
- ✅ **Données sync** — favoris/signets/notes/surlignages/position par défaut ; réglages **opt-in** ;
  historique **local-only**.
- ✅ **Conflits** — **last-write-wins par entité** (granularité par verset/signet).

**Reste ouvert** (principalement phase 3) :

- **Modèle admin** — B (DB atelier + export dépôt, recommandé) vs C (commit API GitHub, zéro DB
  éditoriale) vs A (live, déconseillé). **Ouvert** — à trancher en phase 3 (l'admin est repoussée ;
  le contenu éditorial reste édité à la main dans le dépôt en attendant).
- **RGPD fines** — export + suppression suffisent-ils ? mention légale compte + données (mise à jour
  de `lib/legal.ts` / spec 15) ; délai d'effacement ; politique de conservation. Région UE posée
  (Neon Frankfurt). À finaliser avant phase 1.
- **Coût & ops** — première dépendance serveur runtime : monitoring, **backups Neon**, quota email
  magic link (service transactionnel : Resend / Vercel Email ?), responsabilité de données
  personnelles. Assumé — à budgéter.
- **Service email transactionnel** — pour le magic link : Resend (recommandé, DX Vercel) vs
  alternatives. **Ouvert** — à choisir avant phase 1.
- **Dérivation de clé E2EE** — via la clé de récupération (KDF type Argon2/scrypt) vs secret
  utilisateur séparé. Détail crypto à valider en revue avant phase 1.
- **Séparation admin / lecteur** — l'admin est équipe-only et ne touche **jamais** les données
  lecteur (séparation nette, à valider en revue de sécurité).
- **Doctrine 00** — toute métrique, même « innocente » (ex. nombre de comptes créés côté admin),
  reste **interdite côté produit** ; l'admin affiche un tableau de **contenu**, jamais d'**usage**.

**Séquençage confirmé** (sync d'abord) :

1. **Phase 1** — Compte (magic link + clé de récupération) + sync de **favoris + position de
   lecture** (jeu minimal, prouve le pipeline E2EE) + migration local → cloud.
2. **Phase 2** — Sync complet (signets, notes, surlignages) + opt-in réglages + export/suppression +
   mention légale compte.
3. **Phase 3** — Interface d'administration (modèle B ou C à trancher alors).