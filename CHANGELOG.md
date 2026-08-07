# Changelog

Toutes les versions notables du lecteur ShemaProject sont documentées ici.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/).

## [Unreleased]

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