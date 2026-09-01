# Spec 13 — Historique de navigation

> **Statut** : ✅ Implémenté · **Priorité** : 🟠 Moyenne · **Effort** : S–M · **Dépendances** : — (consolide l'existant : « Recherches récentes » de la palette + `useReadingPosition`)

## 1. Objectif
Conserver la trace des derniers passages consultés (livre + chapitre, verset surligné éventuel) et
permettre d'y **revenir en un geste**. Sur mobile, l'historique s'ouvre dans le **même tiroir gauche
que les signets**.

## 2. Valeur utilisateur
On saute constamment entre passages (étude, comparaison, prédication, fil de pensée). Aujourd'hui :
- « **Reprendre** » (spec 04) ne mémorise que **la dernière** position.
- Les « **Recherches récentes** » de la palette (⌘K) ne couvrent que les recherches **explicites** —
  pas les chapitres atteints par les flèches, un signet, un favori ou un lien.

Un historique **multi-positions, alimenté automatiquement** supprime la friction de « retrouver le
passage de tout à l'heure » et complète naturellement « Reprendre » (une position) et les signets
(une bibliothèque volontaire). Coût faible, 100 % client.

## 3. Périmètre
- **Inclus** :
  - Enregistrement **automatique** de chaque chapitre affiché en lecture continue (mode `read`),
    plus les recherches de la palette (déjà captées). Le plus récent en tête, **dédoublonné**,
    capé (100 entrées).
  - Une entrée = `version + livre + chapitre (+ sélections/versets surlignés, cumulés sans doublon)`.
  - **Panneau « Historique »** listant les entrées **groupées par jour** (Aujourd'hui / Hier / date) ;
    tap → revient à la référence (surbrillance si verset). Retrait d'une entrée ; « Effacer » global
    **derrière une confirmation** (`ConfirmDialog` — irréversible).
  - **Bouton dock « Historique »** + raccourci `H`.
  - **Unification** : les « Recherches récentes » de la palette lisent désormais la même source.
  - **Sauvegarde** : l'historique est inclus dans l'export/import JSON (format v2) — c'est une
    donnée de reprise de lecture, pas une préférence jetable. Fusion LWW par entrée (`at`).
- **Exclu** (cette itération) :
  - Le mode `refs` (références ponctuelles) et les ouvertures « one-shot » — ne polluent pas
    l'historique (cohérent avec « Reprendre »).
  - Recherche plein-texte, historique des **actions** (signets/favoris posés).

## 4. Spécification fonctionnelle
- À chaque chapitre rendu en mode `read` (hors chargement, `verses.length > 0`), pousser une entrée
  dans l'historique — **au même endroit** que la sauvegarde de position actuelle
  (`o-bible-reader.tsx`, l. 648-653).
- **Dédoublonnage** par `id = ${version}:${bookId}:${chapter}` : si l'entrée existe, on la **remonte
  en tête** et on met à jour `at`/`url`. Une seule entrée par chapitre, même visité plusieurs fois.
- **Cap** : 100 entrées (les plus anciennes tombent).
- La palette (`go()`) pousse également via la même API → une recherche explicite remonte l'entrée.
- **Granularité du verset** : la dédup ignore la sélection (`v`) mais l'entrée **cumule toutes les
  `selections`** consultées pour ce chapitre (sans doublon, la plus récente en dernier) ; `selection`
  reste la valeur active pour la réafficher au retour. Les entrées legacy sans `selections` sont
  migrées à l'hydratation (`selections = [selection]`).
- **Sync cloud** : au pull, fusion par `id` (LWW par `at`) avec **union des `selections`** — aucune
  sélection d'un appareil n'écrase celle d'un autre.
- **Quota localStorage** : en cas d'échec d'écriture (`QuotaExceededError`), l'historique est taillé
  aux 50 entrées les plus récentes puis l'écriture est retentée (récupération best-effort).
- **Migration** : à l'hydratation, si l'ancienne clé `bym:search-history` existe et que la nouvelle
  est vide, convertir les entrées `{label, url}` (en lisant `livre`/`chap`/`v` de l'URL), puis
  supprimer l'ancienne clé.

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
- **Dock** : nouveau `FloatingButton` « Historique » (icône `hugeicons:clock-01`), placé à côté de
  « Signets ». Raccourci clavier `H`. `active` quand le panneau est ouvert.
- **Mobile** : ouvre un **tiroir gauche identique au panneau Signets**
  (`fixed bottom-0 left-0 top-0 z-50 w-[82vw] max-w-xs … bg-background`, voile noir cliquable pour
  fermer).
- **Desktop** : flotte dans l'espace libre à gauche, comme `BookmarkPanel`
  (`md:bottom-24 md:top-24 md:w-[210px] md:bg-transparent md:shadow-none`).
- **Exclusivité** : Historique et Signets partagent ce coin gauche → **ouvrir l'un ferme l'autre**
  (sur mobile comme sur desktop).

### 5.2 Disposition (wireframe)
```
Mobile : tiroir gauche (même slot que Signets)   Dock :
┌────────────────────────────┐                   [ ♥ ] [ ⤺ Reprendre ] [ ⚙ ] [ 🕑 ] [ 🔖 ] [ 🌙 ]
│ 🕑 HISTORIQUE           ✕  │                                          └ nouveau bouton « Historique »
│                            │
│ Aujourd'hui                │
│  Jean 3:16          10:42  │  ← tap = revient à la référence (+ surbrillance)
│  Genèse 1           10:30  │
│ Hier                       │
│  Psaumes 23                │
│  Matthieu 5:1-12           │
│            … (cap 25) …     │
│                [ Effacer ] │
└────────────────────────────┘
```

### 5.3 États & interactions
- **Vide** → « Aucune navigation récente. Les chapitres consultés apparaîtront ici. »
- **Tap entrée** → `navigate(url)` (+ scroll/surbrillance si `selection`). Mobile : referme le tiroir
  pour révéler le texte (comme les signets).
- **Retrait d'une entrée** : croix `hugeicons:cancel-01` révélée au survol (desktop) / visible
  (mobile), comme dans `BookmarkPanel`.
- **« Effacer »** (pied de panneau ou palette) → **modale de confirmation** (`m-confirm-dialog`) :
  « Effacer l'historique ? — … irréversible. » avec Annuler / Effacer. Idem palette ⌘K. Le bouton
  vit au **pied du panneau**, volontairement éloigné de la croix de fermeture (évite les taps
  accidentels).
- Groupement par jour calculé à partir de `at` (Aujourd'hui / Hier / `JJ mois`).

### 5.4 Responsive
- **Mobile** : tiroir gauche opaque (slot Signets), cibles tactiles 44 px.
- **Desktop** : liste flottante à gauche, sans cadre (opacité 40 % au repos, pleine au survol/actif —
  cohérent avec les signets).
- Exclusivité mutuelle avec le panneau Signets.

### 5.5 Thème clair/sombre & accessibilité
- Couleurs via tokens → suit `.dark`. `aria-label="Revenir à {référence}"` sur chaque entrée,
  `title` sur les boutons. Bouton dock `title="Historique (H)"`.

### 5.6 Micro-copy (FR)
- Bouton dock : « Historique (H) ».
- Titre panneau : « Historique ».
- Sections : « Aujourd'hui » · « Hier » · « {JJ mois} ».
- Vide : « Aucune navigation récente. Les chapitres consultés apparaîtront ici. »
- Pied : « Effacer l'historique ».
- (Palette) la section « Recherches récentes » peut être renommée « Récemment consulté » puisqu'elle
  inclut désormais la navigation automatique.

## 6. Spécification technique
### 6.1 Fichiers (nouveaux / modifiés)
- **Nouveau** `lib/navigation-history.ts` — `useNavigationHistory()` sur le modèle de
  `useReadingPosition`/`useBookmarks` (hydratation try/catch + `hydrated`, validation au montage) :
  - retourne `{ history, hydrated, push(entry), remove(id), clear() }`.
  - `push` : dédup par `id`, remontée en tête, MAJ `at`/`selection`/`url`, cap 25, persistance.
  - migration depuis `bym:search-history` à l'hydratation.
- **Nouveau** `components/molecules/m-history-panel.tsx` — calqué sur `m-bookmark-panel.tsx`
  (positionnement mobile/desktop **identique**), avec groupement par jour. Props :
  `{ open, history, onSelect(id), onRemove(id), onClear(), onClose() }`.
- **Modifié** `components/organisms/o-bible-reader.tsx` :
  - `const navHistory = useNavigationHistory();`
  - état `historyPanelOpen` + `toggleHistoryPanel()` qui **ferme** `bookmarkPanelOpen` (et le toggle
    Signets ferme `historyPanelOpen`) → exclusivité.
  - dans le `useEffect` de sauvegarde de position (l. 648-653) : ajouter
    `navHistory.push({ version, bookId, chapter, selection: highlight || undefined, reference, url })`.
  - dock : `FloatingButton` « Historique » à côté de « Signets » ; ajout du `case "h"/"H"` dans le
    `keydown` (l. ~790).
  - rendu `<HistoryPanel … />` à côté de `<BookmarkPanel … />`.
- **Modifié** `components/organisms/o-command-palette.tsx` : remplacer `HISTORY_KEY`/`readHistory`/
  `pushHistory` par le hook partagé `useNavigationHistory` (la section « Recherches récentes » lit
  `navHistory.history`, `go()` appelle `navHistory.push`). Supprime la divergence des deux stockages.

### 6.2 Données & persistance
- `localStorage`, clé **`bym:nav-history`** : tableau capé à 100, dédup par `id`, ordre MRU.
- Forme d'une entrée :
  ```ts
  interface NavHistoryEntry {
    id: string;            // `${version}:${bookId}:${chapter}`
    version: string;
    bookId: string;
    chapter: number;
    selection?: string;    // ex. "16", "12-20" — valeur active (dernière consultée)
    selections?: string[]; // cumul sans doublon des versets/plages consultés (legacy : migrés)
    reference: string;     // ex. « Jean 3 » / « Jean 3:16 »
    url: string;           // /bym/read?livre=&chap=&v=
    at: number;            // dernière visite (ms)
  }
  ```
- Migration one-shot depuis `bym:search-history` (format `{label, url}`), puis suppression de
  l'ancienne clé.
- **Sauvegarde JSON** (`data-transfer.ts`, format v2) : clé `history` incluse à l'export ; import en
  mode « fusion » = LWW par entrée (`at`), mode « remplacer » = écrasement. Les sauvegardes v1
  (sans historique) restent importables.

### 6.3 API / contraintes
- Aucune dépendance API. Respecte l'atomic design (`a-`/`m-`/`o-`), Tailwind `darkMode:"class"`,
  `cn()`, icônes `hugeicons:*`.

## 7. Critères d'acceptation
- [ ] Naviguer dans plusieurs chapitres (flèches, sélecteur, palette) → ils apparaissent dans
      l'historique, **le plus récent en tête, sans doublon** (un chapitre revisité remonte).
- [ ] Tap une entrée → revient à la référence ; surbrillance restaurée si un verset était surligné.
- [ ] **Mobile** : l'historique s'ouvre dans le **même tiroir gauche que les signets** ; ouvrir l'un
      ferme l'autre.
- [ ] **Desktop** : l'historique flotte à gauche comme les signets ; exclusivité respectée.
- [ ] Entrées **groupées par jour** ; retrait d'une entrée et « Effacer » global fonctionnent.
- [ ] La palette et le panneau partagent **la même source** (`bym:nav-history`) ; migration depuis
      `bym:search-history` effectuée sans perte.
- [ ] Le mode `refs` / palette « one-shot » ne pollue pas l'historique.
- [ ] Raccourci `H` ouvre/ferme le panneau ; `title`/`aria-label` présents ; thème clair/sombre OK.
- [ ] `npx tsc --noEmit` propre ; build OK.

## 8. Risques & questions ouvertes
- **Unification palette ↔ historique** : l'auto-enregistrement transforme « Recherches récentes » en
  « Récemment consulté » (inclut la navigation par flèches). *Recommandé* (une seule vérité).
  Alternative si jugé déroutant : garder deux listes (palette = recherches explicites uniquement,
  panneau = navigation), au prix d'un doublon de logique.
- **Granularité du verset** : dédup par `livre+chap` (recommandé) plutôt que par `livre+chap+v`, pour
  éviter d'empiler 10 entrées d'un même chapitre lors d'une étude verset par verset.
- **Cap = 100** : à ajuster selon ressenti (50–200).
- **Chevauchement avec « Reprendre »** (spec 04) : « Reprendre » reste la dernière position en pastille
  dock ; l'historique est la liste complète — complémentaires, pas redondants.
- **Place dans le dock** : un bouton de plus sur tactile ; vérifier la largeur (le dock a déjà
  `overflow-x-auto` + `max-w-[calc(100vw-1.5rem)]`).
