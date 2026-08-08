# Spec 09 — Sélecteur de versions + vue parallèle (comparaison)

> **Statut** : ✅ Implémenté (récap dans [`PLAN.md`](../PLAN.md)) · **Priorité** : 🟠 Moyenne · **Effort** : M · **Dépendances** : ✅ levées — 2ᵉ version `lsg` servie par l'API

## 1. Objectif
Deux capacités liées :
1. **Sélecteur de version** : basculer toute la lecture entre la **BYM** (Bible de Yéhoshoua ha Mashiah)
   et la **LSG** (Louis Segond 1910), désormais disponibles côté API.
2. **Vue parallèle** : afficher **deux versions** d'un même chapitre **côte à côte**, versets alignés,
   défilement synchronisé, pour comparer les traductions.

## 2. Valeur utilisateur
Outil d'étude classique et attendu dès qu'il existe plusieurs versions : lire dans la traduction de son
choix et confronter la BYM à la LSG verset par verset.

## 3. Périmètre
- **Inclus** : sélecteur de version primaire (mono-colonne) ; bascule « comparer avec… » → 2 colonnes
  alignées par numéro de verset ; défilement synchronisé ; responsive (empilé sur mobile) ; crédits des
  deux versions.
- **Exclu (v1)** : 3+ versions simultanées ; diff mot-à-mot ; interlinéaire (couvert par Strong) ;
  sélection / favoris / signets / panneau Strong **en mode parallèle** (restent disponibles en mono).

## 4. Spécification fonctionnelle
- **Pré-requis levé** : l'API expose maintenant **deux** versions via le même schéma d'URL —
  `GET /{version}/:livre/:chap[/:selection]`, `…?strongs=1`, `/{version}/:livre/info` — avec
  `version ∈ { "bym", "lsg" }`. Vérifié : LSG renvoie le même JSON (clé `Jn. 3:16`, champs
  `verset`/`titre`/`paragraphe`), la **même numérotation** et les **mêmes sections** que BYM (jointure
  triviale par numéro de verset).
- **Sélecteur** : choisit la **version primaire**. Persisté ; appliqué à la lecture continue, aux
  références, aux crédits, au panneau Strong, et au namespace des favoris/signets (`${version}:…`).
- **Comparaison** : un toggle « comparer avec… » choisit une **version secondaire** ; le chapitre courant
  s'affiche en 2 colonnes. Fermer la comparaison → retour mono-colonne.
- **Alignement** : par numéro de verset. Verset présent d'un seul côté → cellule opposée vide marquée.
- **Défilement** : synchronisé — obtenu **structurellement** par un **conteneur de défilement unique**
  contenant une grille 2 colonnes (chaque ligne = une paire de versets). Pas de synchro JS à maintenir,
  et l'alignement par verset est garanti (la hauteur de ligne suit la cellule la plus haute).

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
- **`m-version-picker`** : pastille libellée dans le **dock** (bas), visible en mode `read`. Ouvre un
  menu : liste des versions (radio → version primaire) + section « Comparer avec… » (l'autre version,
  toggle) + « Arrêter la comparaison » si active.

### 5.2 Disposition (wireframe)
```
┌─────────────── Jean 3 ───────────────┐
│ BYM                  │ LSG            │   ← en-têtes de colonne (desktop)
│ 16 Car ainsi l'Elo…  │ 16 Car Dieu a… │
│ 17 Car Elohîm n'a…   │ 17 Dieu n'a…   │
└──────────────────────┴────────────────┘
   (conteneur unique → défilement synchronisé)
```

### 5.3 États & interactions
- Survol d'une ligne → surbrillance des **deux** cellules (la ligne entière).
- `loading` global (les deux versions chargées avant rendu) ; `error`/`empty` par chapitre.

### 5.4 Responsive
- Desktop (≥ 768 px) : 2 colonnes. **Mobile** : empilé par verset (numéro, texte primaire, puis texte
  secondaire avec petit tag de version + séparateur) — le côte-à-côte est illisible en < 768 px.

### 5.5 Thème clair/sombre & accessibilité
- Tokens de couleur ; en-têtes de colonne avec libellés de version clairs. Respecter
  `prefers-reduced-motion` (pas d'animation de scroll — il n'y en a pas, conteneur unique).

### 5.6 Micro-copy (FR)
- « Comparer avec… », « Arrêter la comparaison », en-têtes = labels de version, cellule vide =
  « Verset absent dans cette version. »

## 6. Spécification technique
### 6.1 Fichiers
- **Nouveaux** : `components/organisms/o-parallel-reader.tsx` (vue 2 colonnes + chargement double) ;
  `components/molecules/m-version-picker.tsx` ; `lib/active-version.ts` (hook état primaire/comparaison).
- **Modifiés** : `lib/bible-versions.ts` (déclarer LSG ; `id` = segment d'URL API) ;
  `services/bible/bibleApi.ts` (généraliser `/bym/` → `/{version}/` : `getChapter`, `getReferences`,
  `getBookInfo`, `getStrongsForVerses` prennent `version` en 1er argument) ;
  `components/organisms/o-bible-reader.tsx` (version active, montage du picker, bascule mono/parallèle,
  crédits dynamiques) ; `components/molecules/m-version-credits.tsx` (accepte un tableau de versions).

### 6.2 Données & persistance
- `bym:version` (id de la version primaire, défaut `bym`) ; `bym:compare-version` (id secondaire ou
  absent = comparaison fermée). Le préfixe `bym:` est le namespace de stockage de l'app (sans rapport
  avec la version).

### 6.3 API / contraintes
- **Concordance Strong** : l'index `/{version}/strong/:code` **n'existe que pour `bym`** (testé :
  `/lsg/strong/G2316` → « Livre introuvable »). `getStrongOccurrences` reste donc sur `/bym/strong/`
  pour la **liste des emplacements** + le **lexique** (définition Grec/Hébreu, version-agnostique).
  **Mais** le **texte des occurrences est réaffiché dans la version active** : la numérotation étant
  commune, `getVersesText(version, items)` re-récupère le texte des mêmes versets en LSG (ou autre).
  → en LSG, les occurrences montrent bien le texte LSG, pas BYM.
- Les **Strong au niveau verset** (`?strongs=1`) existent pour les deux versions → le panneau Strong et
  la coloration du mot dans la concordance fonctionnent dans la version active.

## 7. Critères d'acceptation
- [ ] Le sélecteur change la version primaire ; lecture, références, crédits, favoris/signets suivent.
- [ ] « Comparer avec… » affiche le chapitre en 2 colonnes alignées par verset ; défilement synchronisé.
- [ ] Survol surligne les deux côtés ; cellule manquante marquée.
- [ ] Mobile : empilage lisible par verset.
- [ ] Persistance version primaire + comparaison après reload.
- [ ] `tsc --noEmit` + `pnpm build` OK ; non-régression mono (sélection, Strong, signets, favoris).

## 8. Risques & questions ouvertes
- **Divergences de numérotation** entre versions (Psaumes, etc.) : BYM et LSG partagent ici la même
  numérotation (même API, mêmes sections) → jointure par numéro suffisante. Si un futur cas diverge, la
  cellule vide marquée gère gracieusement l'écart.
- **Strong / concordance en parallèle** : hors périmètre v1 (interactions riches = mono uniquement).
