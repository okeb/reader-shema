# Spec 03 — Réglages de lecture (typographie)

> **Statut** : ✅ Implémenté · **Priorité** : 🔴 Haute · **Effort** : S–M · **Dépendances** : — (consolide l'existant)

## 1. Objectif
Regrouper dans **un panneau Réglages unique** tous les paramètres de confort de lecture (police, taille,
**interligne**, **largeur de colonne de lecture**, colonnes, disposition, thème), aujourd'hui éparpillés
dans des menus flottants distincts du dock.

## 2. Valeur utilisateur
Lecture longue durée = confort = rétention. Un point d'entrée clair « Réglages » est plus découvrable
que 3–4 pastilles séparées. Ajoute deux leviers très demandés et **absents** aujourd'hui : interligne
et largeur de lecture. Atkinson Hyperlegible (déjà chargée) sert l'accessibilité/dyslexie.

## 3. Périmètre
- **Inclus** : panneau Réglages (sheet/popover) consolidant `FontSwitcher`, taille (existe :
  `fontSize`), colonnes, disposition (`flowing/verses/plain`), focus ; **nouveaux** : interligne
  (`lineHeight`) et largeur de lecture (`measure`) ; sélecteur de thème (3 choix) ; option « Installer
  l'app » (cf. spec 01).
- **Exclu** : thèmes de couleur personnalisés (sépia, etc.) — itération future possible.

## 4. Spécification fonctionnelle
- Étendre `ReaderPreferences` avec :
  - `lineHeight: number` (ex. 1.4 / 1.6 / 1.8 / 2.0 — « Serré / Normal / Aéré / Très aéré »).
  - `measure: "narrow" | "normal" | "wide" | "full"` (largeur max de la colonne de texte).
- Appliquer via variables CSS sur le conteneur de lecture : `--reader-line-height`, `--reader-measure`
  (ex. `38rem / 46rem / 60rem / 100%`). La police passe déjà par `--font-reader` (`applyFontVar`).
- Tout est persisté par `useReaderPreferences` (mécanisme existant : `update()` + validation au montage).
- Le **thème** reste géré par `useTheme` (light/dark/system) — exposé ici en segmented control en plus
  du cycle rapide du dock.

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
- Un bouton « Réglages » (icône `hugeicons:settings-01`) dans le dock ouvre le panneau. Conserver le
  cycle thème rapide existant ; les menus flottants séparés actuels sont **remplacés** par ce panneau
  (ou conservés en doublon léger — à trancher, cf. §8).

### 5.2 Disposition (wireframe)
```
┌── Réglages de lecture ───────────── ✕ ─┐
│ Thème        [ ☀ Clair | 🌙 Sombre | ⛶ Sys ]│
│ Police       [ Noto Serif ▾ ]             │
│ Taille       A−  ──●────────  A+   16 px   │
│ Interligne   [ Serré | Normal | Aéré | ++ ]│
│ Largeur      [ Étroite | Normale | Large | Pleine ]│
│ Disposition  [ Continu | Versets | Texte seul ]│
│ Colonnes     [ 1 | 2 | 3 ]                 │
│ Renvois      [ Toujours | Sélection | Jamais ]│
│ Mode focus   [○────] (lecture immersive)   │
│             → cf. spec 17 (chrome retiré,  │
│               Strong seul, bouton Quitter) │
│ ─────────────────────────────────────────  │
│ [ ⤓ Installer l'application ]   (si dispo)  │
└────────────────────────────────────────────┘
```

### 5.3 États & interactions
- Chaque contrôle applique **en direct** (aperçu immédiat sur le texte derrière). Pas de bouton
  « Enregistrer » (auto-persisté).
- Option « Réinitialiser » discrète (revient à `DEFAULTS`).
- Sliders/segmented avec état actif visible ; valeur courante affichée (px pour la taille).

### 5.4 Responsive
- Desktop : popover ancré au dock (réutiliser `m-floating-menu` mais plus large), ou sheet latérale.
- Mobile : **bottom sheet** plein largeur, contrôles tactiles ≥ 44 px, fermeture par voile/✕/glissé.

### 5.5 Thème clair/sombre & accessibilité
- Tokens de couleur → suit `.dark`. Segmented controls = `role="radiogroup"`, navigables au clavier.
- Slider taille = `<input type="range">` accessible, `aria-valuetext` en px. Respecter
  `prefers-reduced-motion` pour les transitions de mise en page.

### 5.6 Micro-copy (FR)
- Titres : « Thème », « Police », « Taille », « Interligne », « Largeur », « Disposition »,
  « Colonnes », « Renvois », « Mode focus ». Interligne : « Serré / Normal / Aéré / Très aéré ». Le
  « Mode focus » est un mode de lecture immersive détaillé en spec 17 (chrome retiré, Strong seul
  outil, bouton unique Quitter).
  Largeur : « Étroite / Normale / Large / Pleine ». Renvois : « Toujours / Sélection / Jamais »
  (visibilité de l'indicateur de cross-references, cf. spec 11 §6.1).

## 6. Spécification technique
### 6.1 Fichiers
- **Nouveaux** : `components/molecules/m-reading-settings.tsx` (le panneau) ; éventuellement
  `components/atoms/a-segmented.tsx` (segmented control réutilisable) et `a-range.tsx`.
- **Modifiés** : `lib/reader-preferences.ts` (ajouter `lineHeight`, `measure` + setters + validation +
  application CSS) ; `o-bible-reader.tsx` (bouton dock + application des variables CSS au conteneur de
  lecture ; brancher le panneau) ; possiblement retirer/condenser `m-font-switcher.tsx`,
  `m-layout-toggle.tsx`, `m-column-toggle.tsx` dans le panneau.
- `globals.scss` : variables `--reader-line-height`, `--reader-measure` + utilitaire `.font-reader`
  étendu (ou classes appliquant ces vars).

### 6.2 Données & persistance
- Étendre `DEFAULTS` : `lineHeight: 1.6`, `measure: "normal"`. Validation au montage (intervalle +
  liste blanche), comme l'existant.

### 6.3 API / contraintes
- 100 % client, aucune dépendance API.

## 7. Critères d'acceptation
- [ ] Un seul panneau « Réglages » regroupe police/taille/interligne/largeur/disposition/colonnes/focus/thème.
- [ ] Interligne et largeur s'appliquent en direct et persistent après reload.
- [ ] Pas de FOUC ni de saut de mise en page au chargement (valeurs appliquées tôt).
- [ ] Accessible clavier + lecteur d'écran ; `tsc` + build OK.

## 8. Risques & questions ouvertes
- **Garder ou supprimer** les menus flottants individuels existants ? Recommandation : les **fondre**
  dans le panneau pour éviter la redondance (à valider avec l'utilisateur).
- Largeur « Pleine » + 2/3 colonnes : vérifier la cohérence (largeur ignorée en multi-colonnes ?).
