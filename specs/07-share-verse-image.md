# Spec 07 — Partager un verset en image

> **Statut** : Proposé · **Priorité** : 🟠 Moyenne · **Effort** : M · **Dépendances** : —

## 1. Objectif
Générer une **carte visuelle** d'un (ou plusieurs) verset(s) — texte + référence sur un fond soigné aux
couleurs du projet — à **télécharger** ou **partager** (Web Share API).

## 2. Valeur utilisateur
Le partage d'images de versets est un usage majeur (réseaux, messageries). C'est un canal d'acquisition
viral, et on dispose déjà de l'identité visuelle (logo, thème clair/sombre) pour des cartes cohérentes.

## 3. Périmètre
- **Inclus** : depuis une sélection de versets, ouvrir un générateur ; choix de quelques styles de fond ;
  aperçu ; export PNG ; partage natif (mobile) + téléchargement (desktop).
- **Exclu** : éditeur libre (polices/positions arbitraires), fonds importés par l'utilisateur, vidéos.

## 4. Spécification fonctionnelle
- Entrée : sélection courante (`useVerseSelection`) ou un verset/bookmark donné → `{ reference, text }`.
- Rendu : composer une carte (format **carré 1080×1080** + option **story 1080×1920**) avec le texte
  (auto-`fit`/réduction si long), la référence, le logo discret et un fond parmi 3–4 presets.
- Export : rasteriser la carte en PNG (haute résolution) côté client.
- Diffusion : si `navigator.canShare({ files })` → **Web Share** (partage natif avec l'image) ; sinon
  **téléchargement** du PNG + bouton « Copier l'image » (clipboard) en repli.

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
- Action « Partager en image » (icône `hugeicons:image-01` ou `share-01`) dans `VerseActions` (à côté
  de favori/bookmark) et dans la carte « Verset du jour » (spec 06).

### 5.2 Disposition (wireframe)
```
┌── Partager ─────────────────────────── ✕ ─┐
│  ┌───────────────────────┐                 │
│  │                       │  Format          │
│  │  « Car Dieu a tant    │  [ ◻ Carré ][ ▯ Story ]│
│  │    aimé le monde… »    │                 │
│  │        Jean 3:16      │  Fond            │
│  │             shema ▟    │  [■][■][■][■]    │
│  └───────────────────────┘                 │
│        (aperçu live)        [ ⤓ Télécharger ] [ 🔗 Partager ]│
└─────────────────────────────────────────────┘
```

### 5.3 États & interactions
- Changer format/fond → aperçu mis à jour en direct.
- « Partager » (mobile) → feuille de partage native ; « Télécharger » (desktop) → PNG.
- `generating` (spinner bref pendant la rastérisation), `error` (« Échec de la génération »).

### 5.4 Responsive
- Mobile : bottom sheet, aperçu réduit, priorité au bouton « Partager » natif.
- Desktop : modal centré, priorité « Télécharger » + « Copier l'image ».

### 5.5 Thème clair/sombre & accessibilité
- Les presets de fond sont indépendants du thème UI (la carte a son propre style). Le modal suit `.dark`.
- Boutons accessibles ; aperçu avec `alt` décrivant la référence.

### 5.6 Micro-copy (FR)
- Titre « Partager ». Formats « Carré » / « Story ». Boutons « Télécharger », « Partager »,
  « Copier l'image ». Erreur « La génération de l'image a échoué. »

## 6. Spécification technique
### 6.1 Fichiers
- **Nouveaux** : `components/molecules/m-share-card.tsx` (rendu DOM de la carte) ;
  `components/molecules/m-share-dialog.tsx` (modal/sheet + presets) ; `lib/share-image.ts`
  (rastérisation + Web Share/téléchargement/clipboard).
- **Modifiés** : `m-verse-actions.tsx` (action partage + props `onShare`) ; `o-bible-reader.tsx`
  (ouverture du dialog avec la sélection) ; `m-verse-of-the-day.tsx` (réutilise le dialog).

### 6.2 Données & persistance
- Aucune persistance (sauf mémoriser le dernier preset choisi : `bym:share-style`, optionnel).
- Rastérisation : **`html-to-image`** (ou `satori` + `resvg` pour un rendu serveur net) — privilégier
  `html-to-image`/`modern-screenshot` côté client (pas de dépendance lourde, polices déjà chargées).
  Attention au CORS du logo (servi en local `public/` → OK).

### 6.3 API / contraintes
- Web Share API *files* : supportée sur mobile (Android/iOS récents), pas partout sur desktop → repli
  téléchargement/clipboard obligatoire.

## 7. Critères d'acceptation
- [ ] Depuis une sélection, ouvrir le générateur, choisir format + fond, voir l'aperçu.
- [ ] Mobile : « Partager » ouvre la feuille native **avec l'image** jointe.
- [ ] Desktop : « Télécharger » produit un PNG net (texte non flou, logo présent).
- [ ] Texte long correctement ajusté (pas de débordement).
- [ ] `tsc` + build OK.

## 8. Risques & questions ouvertes
- Qualité du rendu des polices Google en rastérisation (s'assurer qu'elles sont chargées avant capture).
- Choix lib : `html-to-image` (simple) vs `satori`/OG (plus net, plus lourd) → trancher selon qualité
  voulue. Recommandation MVP : `html-to-image`.
