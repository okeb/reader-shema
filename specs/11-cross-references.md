# Spec 11 — Renvois (cross-references)

> **Statut** : ✅ Implémenté (openbible.info, CC-BY) · **Priorité** : 🟢 Basse · **Effort** : M · **Dépendances** : dataset libre **openbible.info** (pipeline `scripts/build-cross-refs.ts`)
>
> ⚠️ Correction d'implémentation : `BIBLE_BOOKS` n'est **pas** dans l'ordre canonique standard (Ésaïe après 2 Rois, NT réordonné) ; le mapping se fait via une **table OSIS→bookId explicite** dans le script, **pas par index**.

## 1. Objectif
Afficher, pour un verset, les **versets liés** (renvois/parallèles) et y naviguer, pour une lecture
croisée des Écritures.

## 2. Valeur utilisateur
Pilier de l'étude biblique (« l'Écriture s'interprète par l'Écriture »). Donne de la profondeur au
lecteur sans quitter le contexte, en réutilisant la machinerie existante (mode refs, navigation/surlignage).

## 3. Périmètre
- **Inclus** : indicateur de renvois sur un verset ; panneau/pop des références liées avec extrait ;
  navigation vers chaque renvoi (machinerie signets/Strong) ; dataset embarqué + pipeline de génération.
- **Exclu** : édition de renvois par l'utilisateur ; graphe de relations ; notes de bas de page
  éditoriales (autre donnée) ; renvois en **vue parallèle** (mono-version uniquement, comme Strong).

## 4. Source des données (décision)

Le blocage « données » est levé en embarquant un **dataset statique libre**, sans dépendre d'un nouvel
endpoint API.

- **Source retenue** : **openbible.info — Cross References** (≈ 340 000 renvois, dérivé du
  *Treasury of Scripture Knowledge*, **licence CC-BY**). Avantage clé : chaque renvoi porte un score de
  pertinence (**votes**), qui permet de **trier et plafonner** (ex. top 8–12 par verset) pour limiter le
  volume et le bruit. Alternative équivalente : **TSK brut** (domaine public, sans score).
- **Obligation de licence** : CC-BY → **créditer openbible.info** sur la page `/credits` (déjà en place,
  cf. spec 15) et dans le dataset généré. *(Si on préfère éviter l'attribution, prendre le TSK domaine
  public et le noter.)*
- **Versification** : le dataset suit l'ordre canonique **66 livres** standard, identique à
  `lib/bible-books.ts` (`BIBLE_BOOKS`). Le mapping livre→`bookId` se fait par **index canonique**
  (1=Genèse → `genese`, … 66=Apocalypse → `apocalypse`). La numérotation BYM est alignée (même API,
  mêmes sections) ; les rares renvois pointant un verset absent en BYM sont **ignorés** gracieusement
  (le mode refs ignore déjà les références introuvables).

## 5. Pipeline de génération (build-time, hors runtime)

- **`scripts/build-cross-refs.ts`** (nouveau, exécuté à la main / au build) :
  1. lit le fichier source brut (TSV openbible.info : `From Verse · To Verse · Votes`) ;
  2. parse les références OSIS (`Gen.1.1`, plages `Rom.5.8-Rom.5.10`) → `[bookIndex, chap, vStart, vEnd?]` ;
  3. mappe `bookIndex` → `bookId` via l'ordre de `BIBLE_BOOKS` ;
  4. pour chaque verset source, **trie par votes desc** et **garde les N premiers** (défaut N=12) ;
  5. écrit **un fichier compact par livre** : `public/data/cross-refs/{bookId}.json`.
- **Format compact** (clé = `"chap:verse"`, valeur = liste de cibles `[bookId, chap, vStart, vEnd?]`) :
  ```json
  { "3:16": [["romains",5,8],["1jean",4,9],["jean",1,14]],
    "3:17": [["jean",12,47]] }
  ```
- Données **statiques** servies depuis `public/` (pas dans le bundle JS), versionnées dans le repo.

## 6. Spécification fonctionnelle (runtime)
- Sur un verset, un **affordance « renvois (n) »** n'apparaît **que si** des renvois existent.
- Clic → liste des références liées avec **extrait court** (récupéré à la demande via `getReferences`),
  ordonnées canoniquement ; clic sur un renvoi → charge le passage, surligne, défile (machinerie signets).
- États : `loading` (extraits), `loaded`, `empty` (pas d'indicateur du tout), `error`.

### 6.1 Mode d'affichage de l'indicateur (préférence)
L'indicateur peut être visuellement bruyant lorsqu'il s'affiche au bout de **chaque** verset. Un réglage
`crossRefsMode` (persisté avec les autres préférences de lecture) gouverne sa visibilité :
- **`always`** : indicateur sur tous les versets qui ont des renvois (comportement historique).
- **`selection`** *(défaut)* : indicateur masqué, n'apparaît **que sur les versets sélectionnés**.
- **`never`** : indicateur jamais affiché (les renvois restent accessibles, mais sans affordance inline).

La règle de rendu effective est `refsCount > 0 && (mode === "always" || (mode === "selection" && versetSélectionné))`.
Le mode n'altère ni le dataset, ni le panneau de renvois, ni la navigation : il ne pilote que l'affordance inline.

## 7. UI / UX
### 7.1 Emplacement & déclencheurs
- Indicateur discret en marge du verset (icône `hugeicons:link-02` + compteur), **ou** action dans
  `VerseActions`. Masqué si aucun renvoi.
- Visibilité réglée par `crossRefsMode` (cf. §6.1), contrôlée depuis le panneau **Réglages de lecture**
  (segmented control « Renvois : Toujours / Sélection / Jamais », cf. spec 03).

### 7.2 Disposition (wireframe)
```
  16 Car Dieu a tant aimé le monde…  ⛓ 3
        └ clic → ┌── Renvois · Jean 3:16 ──────────┐
                 │ Romains 5:8  « Dieu prouve son… »│
                 │ 1 Jean 4:9   « L'amour de Dieu… »│
                 │ Jean 1:14    « La Parole a été… »│
                 │            (clic = ouvrir)        │
                 └──────────────────────────────────┘
```

### 7.3 États & interactions
- Survol d'un renvoi → fond `accent` ; clic → navigation ; le pop reste ouvert pour enchaîner.

### 7.4 Responsive
- Desktop : popover ancré au verset. Mobile : bottom sheet listant les renvois.

### 7.5 Thème clair/sombre & accessibilité
- Tokens de couleur. Liste focusable, `Enter` = ouvrir. Compteur en texte (`aria-label="3 renvois"`).

### 7.6 Micro-copy (FR)
- Indicateur « {n} renvois ». Titre « Renvois · {référence} ». Vide : (masqué). Erreur : « Renvois
  indisponibles. »

## 8. Spécification technique
### 8.1 Fichiers
- **Nouveaux** :
  - `scripts/build-cross-refs.ts` — pipeline de génération (§5).
  - `public/data/cross-refs/{bookId}.json` — données générées (66 fichiers, par livre).
  - `lib/cross-refs.ts` — chargement **lazy par livre** (`fetch('/data/cross-refs/{bookId}.json')`) +
    cache mémoire ; `crossRefsFor(bookId, chap, verse)` → `CrossRef[]`.
  - `components/molecules/m-cross-refs.tsx` — indicateur + popover/bottom sheet (atomic : molécule,
    réutilise les extraits via `getReferences`).
- **Modifiés** :
  - `components/organisms/o-bible-reader.tsx` — indicateur par verset + ouverture + navigation
    (réutilise la mécanique de surlignage/scroll des signets) ; relaie `crossRefsMode`.
  - `components/organisms/o-reader-content.tsx` — rendu de l'indicateur inline, gardé par `crossRefsMode`
    (helper `showRefsIndicator(isSel)`, appliqué aux layouts `verses` et `flowing`).
  - `lib/reader-preferences.ts` — type `CrossRefsMode`, `CROSS_REFS_OPTIONS`, champ `crossRefsMode`
    (défaut `"selection"`) + setter + validation au montage.
  - `components/molecules/m-reading-settings.tsx` — ligne « Renvois » (segmented control).
  - `app/(info)/credits/page.tsx` + `lib/legal.ts` — **attribution openbible.info** (CC-BY).

### 8.2 Données & persistance
- Dataset volumineux → **chargé par livre à la demande** et caché en mémoire ; jamais tout d'un coup.
  Aucune persistance utilisateur. Plafond N renvois/verset fixé au build (§5.4).

### 8.3 API / contraintes
- **Aucun nouvel endpoint requis.** Les extraits réutilisent `getReferences(version, slugs)` existant
  (slugs `"bookId/chap/verse"`), donc les renvois s'affichent **dans la version active** (BYM ou LSG).
- En **vue parallèle** : indicateur masqué (interactions riches = mono, cohérent avec Strong).

## 9. Critères d'acceptation
- [ ] `scripts/build-cross-refs.ts` génère les 66 fichiers `public/data/cross-refs/*.json` au format §5.
- [ ] Un verset avec renvois affiche l'indicateur + le compteur exact ; aucun indicateur sinon.
- [ ] Réglage « Renvois » (Toujours / Sélection / Jamais) : `selection` par défaut → indicateur visible
      seulement sur les versets sélectionnés ; `always` partout ; `never` nulle part. Choix persisté après reload.
- [ ] Le pop liste les renvois avec extrait (version active) ; clic → navigue et surligne le passage.
- [ ] Chargement **par livre** (pas de bundle global) ; états loading/error gérés.
- [ ] Attribution openbible.info présente sur `/credits`.
- [ ] `tsc --noEmit` + `pnpm build` OK ; non-régression lecture/Strong/signets.

## 10. Risques & questions ouvertes
- **Licence** : CC-BY impose l'attribution (gérée via `/credits`). Choisir openbible.info (avec votes,
  meilleur tri) **ou** TSK domaine public (sans attribution, sans score). → **décision produit à confirmer.**
- **Plafond N par verset** : compromis pertinence / volume (défaut 12) — ajustable au build.
- **Cas de versification** divergente (rare en BYM) : renvoi vers verset absent → ignoré silencieusement.
- **Poids total** de `public/data/cross-refs/` à mesurer après génération (chargement lazy par livre rend
  le coût acceptable, mais à vérifier pour les gros livres : Psaumes, Ésaïe).
