# Spec 17 — Mode focus : lecture immersive

> **Statut** : Proposé · **Priorité** : Moyenne · **Effort** : S · **Dépendances** : spec 03 (réglages), spec 12 (dock), spec 02 (Strong)

## 1. Objectif
Faire du « Mode focus » un vrai mode de **lecture pure** : armé, l'app se tait et se retire — tout
le chrome disparaît pour ne laisser que le texte (et le Strong, seul outil autorisé). Concrétise la
doctrine spec 00 (« l'outil décrit, oriente, puis se tait / se retire quand c'est achevé »).

## 2. Valeur utilisateur
Lecture prolongée sans distraction. L'indicateur de focus et le geste de sortie sont un seul bouton
(informe même sans sélection) ; le Strong reste à portée pour l'étude sans rompre l'immersion.

## 3. Périmètre
- **Inclus** : retraite animée du chrome (dock, topbar, cluster hover, badges de renvois) sur tous
  les breakpoints ; bouton unique flottant (`Strong` + `Quitter`) ; estompage des versets
  hors-sélection quand une sélection existe ; navigation par raccourcis clavier (←/→, ⌘K, `S`).
- **Exclu** : tout nouveau chrome en focus (pas de barre de nav, pas d'actions de verset) ; sur
  mobile, quitter le focus pour naviguer (compromis assumé).

## 4. Spécification fonctionnelle
- **Gate** : la retraite et l'indicateur sont pilotés par `focusMode` (armement), pas par
  `focusActive` — ils apparaissent dès que le mode est armé, sélection ou non.
- **Logo persistant** : le logo (haut-gauche) reste visible en focus **sans dim** et bascule sur le
  mark carré `-favicon` (à la place du logotype / de l'icône) — seule ancre de chrome laissée, lien
  vers l'accueil. Desktop : `-favicon` au repos → `-icon` au survol (`group-hover`) ; mobile
  (`coarse`, pas de survol) : `-favicon` (pas de swap, évite le hover collant).
- **Estompage** : `focusActive = focusMode && selection.count > 0` → versets non sélectionnés à
  `opacity-10`. Sans sélection, pas d'estompage, juste la retraite du chrome + le bouton Quitter.
- **Strong** : seul outil autorisé en focus. Pilule flottante « Strong » (icône seule, libellé au
  survol desktop) n'apparaît que si `selection.count > 0` ; clic → `toggleStrongs()`. État actif
  `text-primary` quand `strongsOpen`.
- **Sortie** : bouton « Quitter » (icône logout, libellé au survol desktop) → `toggleFocus()`
  (désactive). Mobile (`coarse`) : icône seule (pas de survol). Chrome sobre (border-input /
  bg-background, backdrop-blur) — rien ne doit attirer le regard, l'immersion prime.
- **Navigation** : raccourcis clavier conservés (←/→ chapitres, ⌘K recherche, `S` quitte). Pas de
  bouton de nav visible en focus.
- **Reflow** : aucun. Le `pt-20` (topbar) et `pb-28` (dock) du conteneur restent — l'espace accueille
  le bouton Quitter, le texte ne saute pas à l'entrée/sortie.

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
- Armement : panneau Aa (rangée « Mode focus », spec 03 §5.2) ou raccourci `S`.
- Bouton unique : cluster flottant **bas-centre**, là où était le dock (`fixed bottom-5 left-1/2`).

### 5.2 Disposition (wireframe)
```
┌────────────────────────────────────────────┐
│ ◖logo◝                                      │  ← logo estompé (opacity-50), reste haut-gauche
│                                            │  ← sélecteur + réglages retirés
│   Premier livre                            │
│   Chapitre 1                               │
│                                            │
│   1  Au commencement…                       │  ← texte seul, numéros conservés
│   2  …                                     │
│                                            │
│                                            │
│           [ 📖 ]  [ ⎋ ]                    │  ← cluster unique bas-centre, icônes seules
│        ─hover→ [ Strong ] [ Quitter ]       │     (Strong seulement si sélection)
└────────────────────────────────────────────┘
```

### 5.3 États & interactions
- Entrée/sortie : fondu + translate (opacity/transform, 200 ms ease-out), pas de démontage.
- Icônes seules au repos ; libellé (« Strong » / « Quitter ») se déploie au survol desktop
  (convention `group-hover:max-w`, cf. m-book-chapter-selector).
- Sans sélection : seule l'icône « Quitter » (logout).
- Avec sélection : « Strong » + « Quitter » ; versets non sélectionnés estompés.
- `coarse` : icônes seules (pas de survol) ; tap = quitte / ouvre Strong.

### 5.4 Responsive
Même retraite immersive sur mobile (dock + sélecteur + réglages + badges partent ; logo estompé
persiste). Le dock mutait en cluster d'actions tactiles hors focus ; en focus, ce cluster est
retiré — la pilule Strong le remplace.

### 5.5 Thème clair/sombre & accessibilité
- Palette : pilules sobres `border-input bg-background/70 backdrop-blur-md text-muted-foreground
  hover:bg-accent hover:text-primary` (cf. dock) ; « Strong » actif = `text-primary` quand
  `strongsOpen`. Logo estompé `opacity-50` en focus (sinon `opacity-100`).
- `aria-pressed` sur les deux boutons. Respecter `prefers-reduced-motion` (retraite sans saut).
- Sortie accessible au clavier (`S` rebascule, focus navigable).

### 5.6 Micro-copy (FR)
- « Strong », « Quitter » (libellés au survol desktop uniquement ; icônes seules au repos).
- Titre/tooltips : « Désactiver le mode focus », « Strong — ouvrir/fermer le panneau ».

## 6. Spécification technique
### 6.1 Fichiers
- `components/molecules/m-focus-control.tsx` (nouveau) — cluster `Strong` + `Quitter` flottant,
  icônes seules + libellés au survol, chrome sobre.
- `components/organisms/o-reader-topbar.tsx` — logo persistant (estompé en focus) ; sélecteur +
  réglages se retirent (translate-y/opacity) ; la racine ne se retire plus.
- `components/molecules/m-reader-dock.tsx` — prop `hideDock={focusMode}` (tous breakpoints).
- `components/organisms/o-reader-content.tsx` — gates `!focusMode` sur cluster hover + badges.
- `components/organisms/o-bible-reader.tsx` — branchement `<FocusControl>`, props topbar/dock.
- `lib/reader-preferences.ts` — `focusMode` (existant).

### 6.2 Données & persistance
`focusMode` persisté via `useReaderPreferences` (spec 03). `focusActive` dérivé (non persisté).

### 6.3 API / contraintes
Aucune. Icônes `@iconify/react` `hugeicons:*` (`book-open-01`, `logout-02`) — vérifier les noms via
l'API Iconify (un nom absent rend vide sans erreur de build).

## 7. Critères d'acceptation
- [ ] Armer le focus sans sélection → dock, sélecteur + réglages topbar, badges de renvois
      fondent/s'exfiltrent ; le logo reste (estompé) haut-gauche ; l'icône « Quitter » apparaît
      bas-centre. Texte seul.
- [ ] Survol de l'icône (desktop) → libellé « Quitter » se déploie. Clic → tout réapparaît.
- [ ] Sélectionner ≥1 verset → pilule « Strong » apparaît ; versets non sélectionnés estompés.
- [ ] Cliquer Strong → panneau Strong s'ouvre (depuis le bas-centre, plus depuis un cluster de 6).
- [ ] Mobile/touch : même retraite ; icônes seules (pas de hover) ; tap = quitte / ouvre Strong.
- [ ] `S` rebascule ; ←/→ changent de chapitre ; ⌘K ouvre la recherche, même en focus.
- [ ] Pas de reflow : le texte ne saute pas à l'entrée/sortie (pt-20/pb-28 conservés).
- [ ] Hors focus : dock, topbar (logo plein + sélecteur + réglages), hover cluster (6 actions),
      badges, panneau Aa — inchangés.

## 8. Risques & questions ouvertes
- Mobile : pas de nav en focus (quitter pour naviguer) — compromis assumé, à réviser si retour
  utilisateur.
- L'icône de sortie `hugeicons:logout-02` (fallback de `arrow-right-from-bracket-04`, absent
  d'Iconify) — vérifier si une icône plus standard émerge.