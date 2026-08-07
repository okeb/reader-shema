# Spec 18 — Doodles (logo d'occasion)

> **Statut** : Proposé (scaffolding Rive livré — démo désactivée) · **Priorité** : Basse · **Effort** : M ·
> **Dépendances** : `@rive-app/react-canvas` (+ option : conversion calendrier hébraïque, cf. §8)
>
> **v2 — interaction redessinée (§4.6)** : le clic du doodle est libéré pour l'animation ; l'info
> passe par une **icône d'info** au survol + **dropdown** (titre, description, versets liés, lien
> externe, bouton « Accueil » pattern prev/next). Animation de clic + suivi de souris optionnels,
> pilotés par les données du doodle. **À implémenter quand tokens disponibles** — plan dans
> `PLAN.md` § « Spec 18 — Doodles v2 ».

## 1. Objectif

Faire vivre le logo de la topbar à la manière des **Google Doodles** / logo animé YouTube : certains
jours, le logo est remplacé par une **variante thématique animée** (fête, saison, anniversaire du
projet, verset phare), et un clic ouvre une carte d'explication (occasion + verset lié). Le lecteur
conserve son logo habituel le reste du temps. **Moteur d'animation : Rive** (cf. §4.4).

## 2. Valeur utilisateur

- **Identité & warmth** : un logo vivant rend le lecteur moins statique, crée un lien récurrent
  (l'utilisateur revient « voir si aujourd'hui il y a un doodle »).
- **Ancrage liturgique** : le projet est ancré hébraïquement (Shema, Bible de Yéhoshoua ha Mashiah) ;
  marquer Pâque, Shavouot, Souccot, Roch Hachana, Yom Kippour, etc. rappelle le calendrier des Écritures.
- **Découverte** : le clic mène à un verset en contexte → porte d'entrée vers la lecture (synergie
  avec spec 06 « Verset du jour »).
- **Coût nul côté serveur** : tout est statique (assets `.riv` + table éditoriale locale).

## 3. Périmètre

- **Inclus** :
  - Table éditoriale d'occasions (`lib/doodles.ts`) : dates fixes grégoriennes + saisons + quelques
    fêtes mobiles saisies annuellement (MVP sans conversion hébraïque auto, cf. §8).
  - Hook `useDoodle()` : résout l'occasion active pour « aujourd'hui » (côté client, après montage).
  - Variante de logo dans `a-logo.tsx` : prop `doodle` qui délègue le rendu animé à un renderer Rive
    (`.riv` sur `<canvas>`, thème runtime clair/sombre + state machine d'entrée/au survol).
  - Carte d'explication (popover au clic du logo) : titre, description, verset lié + « Lire en
    contexte » → `/read?livre=&chap=&v=`.
  - Respect du mode focus (spec 17) : le mark d'occasion persiste, discret, sans animation.
- **Exclu** (pour cette itération) :
  - Moteurs CSS / Lottie (décision : Rive, cf. §4.4 — alternatives écartées).
  - Doodles interactifs type mini-jeux (Google-style avancé) — on reste sur logo animé + carte
    (la state machine Rive reste décorative : entrée + survol, pas de gameplay).
  - Conversion automatique du calendrier hébraïque (tables éditoriales annuelles à la place, §8).
  - Doodle sur la vignette OG de partage (spec 14) — évoqué en §8 comme suite possible.
  - Interface d'administration : la table est en code, versionnée (comme la liste du verset du jour).
  - Personnalisation utilisateur (choix d'activer/désactiver) — §8.

## 4. Spécification fonctionnelle

### 4.1 Occasions

Une **occasion** = un créneau temporel (`when`) + un **identifiant de variante** (`id`, slug du
doodle) + un **contenu** (titre, description courte, verset lié optionnel). Plusieurs occasions
peuvent chevaucher ; la **priorité** la plus haute gagne (ex. une fête bat une saison).

Règles de `when` (typées, évaluées sur la date courante côté client) :
- `fixed` : jour/mois grégorien fixe (ex. `25/12`).
- `season` : plage jour/mois → jour/mois, gère le passage à cheval sur l'année (ex. `01/12 → 06/01`
  pour l'hiver / période de l'Avent).
- `range` : plage `YYYY-MM-DD → YYYY-MM-DD` (occasions ponctuelles, anniversaires du projet).
- `hebrewManual` : table annuelle `{ year: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" } }` pour les
  fêtes mobiles (Pâque, Shavouot, Souccot, Roch Hachana, Yom Kippour) — saisie éditoriale par année.

Une occasion peut durer **plusieurs jours** (ex. Souccot = 7). Le doodle est visible chaque jour du
créneau. L'animation d'entrée ne **rejoue qu'une fois par jour** (persisté, cf. §6.2).

### 4.2 Résolution

`useDoodle()` calcule « aujourd'hui » une seule fois au montage (après hydratation, jamais pendant
le SSR — évite le mismatch et l'effet de flash), puis re-évalue au passage minuit (un timer
`setTimeout` jusqu'au prochain 00h00, recalcul à l'écoute de `visibilitychange` au retour). Retourne
`null` (aucune occasion) ou l'occasion résolue (priorité haute gagnante).

### 4.3 Comportement du logo

- Pas de doodle → logo actuel inchangé (variante `logoStyle` / focus / coarse, spec 17).
- Doodle actif → le logo est remplacé par la **variante d'occasion** (même emplacement, même
  taille `h-9 md:h-10`). Le doodle **n'est plus un lien** et **son clic n'ouvre plus la carte** :
  il déclenche désormais l'**animation de clic** (cf. §4.6). L'accès à l'accueil et à l'explication
  passe par l'**icône d'info** (cf. §4.6) et le **bouton « Accueil »** du dropdown.
- Animation d'entrée : une seule fois par jour (cf. §6.2), non bloquante, respecte
  `prefers-reduced-motion` (→ état initial figé). Moteur : **Rive** (cf. §4.4).

### 4.4 Moteur d'animation — Rive

**Décision : Rive.** Chaque doodle est un fichier `.riv` (animation vectorielle temps réel, éditeur
`rive.app`, gratuit) rejoué sur `<canvas>` via `@rive-app/react-canvas` (runtime WASM). Rive est
choisi pour deux atouts qui collent au projet :

1. **Thème runtime** : les couleurs sont des variables déclarées dans l'éditeur ; on les surcharge à
   l'exécution selon `.dark` sur `<html>`. → **un seul `.riv`** sert le clair ET le sombre — pas de
   duplication d'asset (contrairement à Lottie qui imposerait 2 JSON, ou à CSS qui duplique `_light`/
   `_dark`). C'est l'argument décisif sur ce lecteur centré clair/sombre.
2. **State machine** : l'animation est un graphe d'états, pas une timeline en boucle. On déclare des
   états `idle` / `entrance` / `hover` et Rive fait les transitions tout seul — l'entrée au montage
   (1×/jour), la micro-réaction au survol, sont natives et fluides (niveau Google Doodle).

Chaque occasion porte un champ `animate` qui désigne le fichier et l'état d'entrée :

```ts
type DoodleAnimation = {
  file: string;          // /doodle/<id>.riv (asset unique, thème runtime)
  stateMachine?: string; // état d'entrée à jouer au montage (défaut : la 1ʳᵉ state machine)
  hoverState?: string;   // état joué au survol (desktop), optionnel
  // ── v2 (cf. §4.6) ───────────────────────────────────────────────────────────────────
  // Animation déclenchée au clic du doodle (le clic n'ouvre plus la carte). Boolean SMI mis à
  // true au pointerdown / false au pointerup (réaction « press »), OU trigger SMI tiré 1× au clic.
  clickState?: string;     // input booléen de la state machine (ex. "isPressed")
  clickTrigger?: string;  // trigger de la state machine (ex. "onTap") — alternative au booléen
  // Suivi de souris : inputs nombre SMI (x/y dans le repère du canvas) nourris à chaque
  // pointermove. Inactif si non déclaré. figé si prefers-reduced-motion.
  trackMouse?: { pointerX: string; pointerY: string };
};
```

> Les champs `clickState` / `clickTrigger` / `trackMouse` sont **optionnels** : un doodle qui
> n'en déclare aucun se contente de l'entrée + survol (comportement v1). Le comportement v2
> (clic-animé, suivi de souris) ne s'active que pour les doodles qui le déclarent — c'est le
> principe « automatiquement opérationnel si le doodle le possède ».

**Authoring** : les `.riv` sont créés dans l'éditeur `rive.app` (dessin vectoriel + state machine +
variables de couleur `light`/`dark`). Compétence à acquérir, mais l'éditeur est gratuit et pensé pour
l'UI ; un seul fichier `.riv` porte tout (dessin, animation, thèmes, états).

**Alternatives écartées** (pour mémoire) :
- **CSS** (0 dépendance, sobre, thème `dark:` natif) — limité à de l'abstrait (fondu/pulse/slide),
  pas d'illustration animée. Suffisant pour des doodles très sobres, insuffisant pour l'ambition
  visuelle visée. Reste disponible pour un doodle trivial éventuel, mais le moteur principal est Rive.
- **Lottie** (JSON After Effects) — illustré, mais **thème clair/sombre impose 2 fichiers** par doodle
  (pas de surcharge couleur fiable) → désavantage direct sur ce projet. Écarté.

**Réduction de mouvement** : `prefers-reduced-motion: reduce` → on fige la state machine sur l'état
initial (`idle`), aucun playback.

### 4.5 Cas limites

- Aucune occasion → logo normal, aucune carte, aucun état.
- Plusieurs occasions le même jour → une seule affichée (priorité haute) ; les autres ignorées
  (pas de file).
- Chevauchement de saison + fête → la fête (priorité haute) gagne.
- Jour de transition (00h00) → recalcul, le doodle change sans recharger la page.
- Mode focus armé → mark d'occasion discret, pas d'animation, pas de carte au clic (le clic en
  focus reste « quitter le focus » via `m-focus-control`, cf. spec 17) — le doodle est purement
  décoratif en focus.
- `prefers-reduced-motion: reduce` → pas d'animation, variante statique.
- Asset d'occasion manquant (slug inconnu, 404, runtime WASM cassé) → repli silencieux sur le logo
  normal (jamais d'erreur visible) ; la clé `seen` n'est pas marquée (cf. §6.2 — pour qu'un deploy
  correctif plus tard dans la journée rejoue l'entrée).

### 4.6 Interaction redessinée (v2 — à implémenter quand tokens disponibles)

La v1 (clic sur le doodle → carte d'explication) est **remplacée** : le clic est libéré pour
l'animation, et l'explication passe par une icône d'info distincte. Objectif : un doodle
**vivant** (animation au clic, suivi de souris optionnel) tout en gardant l'accès à l'info et à
l'accueil. **Tout est piloté par les données du doodle** : si un doodle ne déclare pas
d'animation de clic / de suivi de souris / de versets liés / de lien externe, les éléments
correspondants ne s'affichent pas — le comportement est « automatiquement opérationnel si le
doodle le possède ».

#### Détail

1. **Icône d'info au survol** : au survol du doodle (desktop), une **icône d'info**
   (`hugeicons:information-circle`) apparaît en surimpression sur le doodle (fondu, coin du
   doodle). Sur mobile (coarse, pas de survol), l'icône d'info est **toujours visible** (discrète,
   pour rester tapable). C'est **cette icône** qui est cliquable et ouvre le **dropdown**
   d'explication — plus le doodle lui-même.
2. **Clic sur le doodle** : déclenche l'**animation de clic** (state machine Rive, cf. §4.4 —
   input `clickState` ou trigger `clickTrigger`). Si le doodle n'en déclare pas, le clic est
   inerte (pas de dropdown, pas de navigation) — l'icône d'info reste la seule porte vers l'info.
3. **Dropdown d'explication** (remplace la « carte » v1) — ancré sous l'icône d'info (`top-full
   left-0` + `max-w` clampé, même garde anti-débordement que `m-version-picker`, cf. fix 894baeb) :
   - **Bouton « Accueil »** : icône `hugeicons:home-01` qui, **au survol (desktop)**, déploie le
     libellé « Accueil » — **même pattern que les flèches prev/next du sélecteur livre/chapitre
     de la topbar** (`max-w-0 … opacity-0 … group-hover:max-w-[64px] group-hover:opacity-100`,
     cf. `m-book-chapter-selector`). Clic → `/accueil`. Sur mobile, libellé toujours visible.
     Ce bouton **remplace l'ancien comportement « clic doodle → /accueil »**.
   - **Titre** du doodle (`doodle.label`).
   - **Description** (`doodle.description`) — infos sur la fête / l'événement biblique.
   - **Versets liés** (`doodle.verses[]`, liste) : chaque entrée est un lien → `/read?…` (route
     existante). Rendu seulement si `verses` non vide.
   - **Lien externe** (`doodle.source`, facultatif) : « En savoir plus → » (`target="_blank"`).
   - **Fermeture** : bouton ✕, Échap, clic extérieur (géré par le parent topbar/home).
4. **Suivi de souris (tracking)** — optionnel, par doodle : si `animate.trackMouse` est déclaré
   (inputs SMI nombre `pointerX`/`pointerY` de la state machine Rive), le renderer nourrit ces
   inputs avec la position du pointeur relative au canvas à chaque `pointermove`. Le doodle
   « suit » alors la souris (ex. regard qui pivote, élément qui s'oriente vers le curseur).
   Inactif si non déclaré. Respecte `prefers-reduced-motion` (inputs figés).

#### Cas limites (compléments à §4.5)

- Doodle sans `animate.clickState`/`clickTrigger` → clic inerte (rien ne se passe).
- Doodle sans `animate.trackMouse` → pas de suivi de souris.
- Doodle sans `verses` → section « Versets liés » absente du dropdown.
- Doodle sans `source` → pas de lien externe.
- Mobile (coarse) : l'icône d'info est toujours visible (tap → dropdown) ; le clic doodle
  déclenche l'animation de clic si déclarée. Le survol n'existant pas, le suivi de souris est
  inactif (pas de `pointermove` hors tap).
- Mode focus : doodle discret, **pas d'icône d'info, pas de dropdown, pas d'animation de clic**
  (cohérent avec §4.5 — le clic en focus reste « quitter le focus »).

## 5. UI / UX

### 5.1 Emplacement & déclencheurs

- Emplacement : le **logo de la topbar** (`o-reader-topbar.tsx`), à gauche — emplacement existant,
  aucune nouvelle zone.
- Déclencheur visuel : le doodle remplace le logo sur les jours d'occasion (automatique).
- Déclencheurs interactifs (**v2**, cf. §4.6) :
  - **Survol du doodle (desktop)** → apparaît une **icône d'info** en surimpression.
  - **Clic sur l'icône d'info** → ouvre le **dropdown** d'explication.
  - **Clic sur le doodle** → déclenche l'**animation de clic** (si déclarée), n'ouvre pas le dropdown.
  - **Survol du doodle (desktop)** → micro-réaction `hoverState` (ex. l'élément animé rejoue) +,
  si déclaré, **suivi de souris** (`trackMouse`).
  - **Mobile (coarse)** : icône d'info toujours visible (tap → dropdown) ; tap doodle →
  animation de clic si déclarée (pas de suivi de souris).

### 5.2 Disposition (wireframe)

Topbar (inchangée structurellement) :

```
[logo-doodle animé + icône info]   [sélecteur livre/chap]   [⌘K]  [ thème ]
```

Doodle au survol (desktop) — icône d'info en surimpression (coin du doodle) :

```
┌──────────────┐
│  [doodle]  ⓘ │   ← icône info (fondu au survol)
└──────────────┘
```

Dropdown d'explication (ancré sous l'icône d'info, `top-full left-0` + clamp — même garde que
`m-version-picker`, cf. fix 894baeb) :

```
┌──────────────────────────────────────┐
│ [🏠 Accueil]              [✕]        │   ← bouton home (libellé au survol, pattern prev/next)
│ ✦ Pâque (Pessah)                     │   ← titre
│ Célébration de la délivrance…         │   ← description
│                                      │
│ Versets liés                          │
│ • Exode 12:1-14  →                    │   → /read?livre=exode&chap=12&v=1-14
│ • 1 Corinthiens 5:7  →               │   → /read?…
│                                      │
│ En savoir plus →                      │   → lien externe (facultatif, target=_blank)
└──────────────────────────────────────┘
```

### 5.3 États & interactions

- **Repos** : variante d'occasion statique (après l'animation d'entrée). Icône d'info masquée
  (desktop) / visible (mobile).
- **Entrée** : animation une fois/jour (subtle : fondu + légère mise à l'échelle, ou spécifique au
  doodle — ex. pétales qui tombent, flamme qui vacille).
- **Survol (desktop)** : icône d'info apparaît en fondu + `hoverState` (micro-réaction) +, si
  déclaré, suivi de souris (`trackMouse`).
- **Clic sur le doodle** : animation de clic (`clickState`/`clickTrigger`, si déclarée) — n'ouvre
  pas le dropdown. Si rien de déclaré → clic inerte.
- **Clic sur l'icône d'info** : ouvre le dropdown. Second clic / Échap / clic extérieur ferment.
- **Bouton « Accueil » du dropdown** : icône home, libellé « Accueil » au survol (pattern prev/next
  de `m-book-chapter-selector`). Clic → `/accueil` (remplace l'ancien « clic doodle → /accueil »).
- **Versets liés** : chaque entrée `verses[]` est un lien → `/read?…` (machinerie existante),
  ferme le dropdown.
- **Focus mode** : doodle discret, pas d'icône d'info, pas de dropdown, pas d'animation de clic.

### 5.4 Responsive

- Mobile (< md) : comme le logo actuel, on affiche le **mark carré** d'occasion (pas le logotype
  complet) pour gagner de place. Animation d'entrée conservée (subtle).
- Desktop (≥ md) : variante d'occasion respecte `logoStyle` (« logotype » → doodle logotype ;
  « icon » → doodle mark). Si l'asset logotype d'occasion n'existe pas, repli sur le mark.
- Carte : `max-w-[calc(100vw-1rem)]`, ancrage `left-0` avec clamp (cf. §5.2).

### 5.5 Thème clair/sombre & accessibilité

- **Thème** : Rive charge **un seul** `.riv` et surcharge ses variables de couleur au runtime selon
  `.dark` sur `<html>` (cf. §4.4) — pas de duplication d'asset, pas de flash de bascule. Le renderer
  écoute le thème (réutilise le hook `useTheme` / l'observer `.dark`) et réapplique les couleurs.
- **Contraste** : la variante d'occasion doit respecter AA sur les fonds `bg-background` clair et
  sombre (le soin est éditorial, à la création du `.riv` — variables `light`/`dark` calibrées).
- `prefers-reduced-motion` : animation désactivée — la state machine est figée sur l'état initial
  (`idle`), aucun playback.
- **Lecteurs d'écran** : le rendu Rive est sur `<canvas>` (pas de DOM textuel). L'occasion est
  exposée via un `aria-label`/`role="img"` sur le conteneur du canvas (`aria-label={doodle.label}`).

### 5.6 Micro-copy (FR)

- Titre du dropdown : nom de l'occasion (ex. « Pâque (Pessah) », « Shavouot », « Anniversaire — 1 an
  du lecteur »).
- Description : 1–2 phrases (ex. « Célébration de la délivrance d'Égypte, figure de la rédemption
  en Yéhoshoua ha Mashiah. »).
- Section versets : « Versets liés » ; chaque entrée affiche sa référence (ex. « Exode 12:1-14 »).
- Lien externe (facultatif) : « En savoir plus → ».
- Bouton home : libellé « Accueil » (au survol desktop, sinon icône seule — pattern prev/next).
- Icône d'info : `title`/aria « En savoir plus sur {label} ».
- `title`/aria du doodle : « {label} » (le clic ne mène nulle part — il anime ; l'info est via
  l'icône dédiée).

## 6. Spécification technique

### 6.1 Fichiers (nouveaux / modifiés)

**Nouveaux**
- `lib/doodles.ts` — registre éditorial + types + `resolveDoodle(now: Date): Doodle | null`.
  Types : `DoodleWhen = fixed | season | range | hebrewManual` ; `Doodle = { id, label,
  description?, verseRef?, verses?, source?, when, priority, animate?: DoodleAnimation }`
  (`DoodleAnimation` = Rive, cf. §4.4 — dont champs v2 `clickState`/`clickTrigger`/`trackMouse`).
  (`verseRef` conservé pour back-compat v1 ; `verses` est la liste multi-versets du dropdown v2.)
- `lib/use-doodle.ts` — hook `useDoodle(): { doodle: Doodle | null }`. Calcule après montage (effet,
  pas pendant le SSR), re-évalue à minuit + au retour `visibilitychange`.
- `components/molecules/m-doodle-card.tsx` — devient le **dropdown** v2 (titre, description,
  `verses[]`, `source?`, bouton « Accueil » pattern prev/next, fermeture). Renommage possible en
  `m-doodle-info.tsx` au moment de l'implémentation (au choix).
- `components/molecules/m-doodle-renderer.tsx` — wrappe `@rive-app/react-canvas` (import **lazy**
  via `next/dynamic`) : monte le `.riv` sur `<canvas>`, joue la state machine d'entrée au montage
  (1×/jour, cf. §6.2), bascule le thème runtime selon `.dark`, fige sur l'état initial si
  `prefers-reduced-motion`. **v2** : déclenche l'animation de clic (`clickState`/`clickTrigger`) au
  `onClick` du doodle et nourrit `trackMouse.pointerX/Y` à chaque `pointermove` (inputs SMI
  résolus via `stateMachineInputs`). `aria-label`/`role="img"` sur le conteneur (canvas non
  textuel).
- Assets (éditorial, un `.riv` par occasion) : `public/doodle/<id>.riv` (fichier unique, thème
  runtime — pas de variante `_light`/`_dark`).

**Modifiés**
- `components/atoms/a-logo.tsx` — prop optionnelle `doodle?: Doodle`. Quand présente, délègue le rendu
  animé à `<DoodleRenderer animate={doodle.animate} id={doodle.id} …>` (Rive), en respectant
  `focus`/`coarse` (mark discret en focus) et `logoStyle` (logotype vs mark, repli mark si l'asset
  logotype absent). **v2** : le doodle n'est plus un `<a href="/accueil">` — c'est un élément dont le
  clic appelle `onDoodleClick` (→ animation de clic dans le renderer). L'icône d'info et l'ouverture du
  dropdown sont gérées par le parent (topbar/home), pas par `a-logo`. `aria-label` = `doodle.label`.
- `components/organisms/o-reader-topbar.tsx` (et `o-home.tsx`, qui partagent le même montage doodle)
  — consomme `useDoodle()`, passe `doodle` à `<Logo>`. **v2** : rend l'**icône d'info** (survol
  desktop / toujours visible coarse) au-dessus du doodle, gère l'ouverture du **dropdown** au clic
  de l'icône (Échap / clic extérieur ferment), et passe `onDoodleClick` au renderer pour
  l'animation de clic. Préserve le lien `/accueil` quand **pas de doodle** (logo normal).
- `lib/reader-preferences.ts` ou un petit store dédié — clé `bym:doodle-seen` (cf. §6.2).
- `package.json` — ajoute `@rive-app/react-canvas` comme dépendance réelle (le moteur est Rive,
  cf. §4.4). Importée en **lazy** côté renderer pour ne pas alourdir le bundle de la topbar quand
  aucun doodle n'est actif.

### 6.2 Données & persistance

- **Registre** : `lib/doodles.ts` est la source éditoriale (en code, versionnée), comme la liste du
  verset du jour (spec 06). Aucun endpoint.
- **Modèle `Doodle` (v2)** — champs ajoutés pour le dropdown et l'interaction :
  - `verses?: { ref: DoodleVerseRef; label?: string }[]` — versets liés (liste) affichés dans le
    dropdown. `verseRef` (singleton v1) est conservé pour back-compat mais le dropdown v2 lit
    `verses` (et tombe sur `verseRef` si `verses` absent — repli).
  - `source?: { label: string; url: string }` — lien externe facultatif (« En savoir plus »).
  - `animate.clickState?` / `clickTrigger?` / `trackMouse?` — cf. §4.4 (animation de clic, suivi
    souris). Optionnels → comportement « auto si le doodle le possède ».
- **Persistance** : clé `localStorage` `bym:doodle-seen` = `{ [doodleId]: "YYYY-MM-DD" }` (dernier jour
  où l'animation d'entrée a **joué avec succès** pour ce doodle). Sert uniquement à **ne pas rejouer
  l'animation à chaque navigation** dans la même journée (un doodle visible reste statique après sa
  première apparition du jour). Pattern d'hydratation `try/catch + hydrated` existant (cf.
  `useReaderPreferences`).
- **Échec d'asset** : la clé n'est marquée `seen` **que si le `.riv` a chargé et que l'entrée a joué**.
  En cas d'échec de chargement (404, runtime WASM cassé, import lazy en erreur), on ne marque pas —
  comme ça, si l'asset arrive plus tard dans la journée (deploy correctif), l'entrée rejoue
  légitimement à la prochaine visite. Côté renderer, un état `failed` repli sur le logo normal (cf.
  §4.5) sans rien persister.
- Aucune donnée utilisateur sensible, aucune synchronisation (localStorage seul, doctrine du projet).

### 6.3 API / contraintes

- **Aucune API** : tout est statique (assets `.riv` + table locale). Le verset lié est référencé par
  `bookId/chap/v` et ouvert via la route `/read?…` existante — pas de fetch supplémentaire.
- **Assets** : `.riv` (Rive, cf. §4.4) sous `public/doodle/`. Servis statiquement ; chargés par le
  renderer au montage du doodle. Un seul fichier par occasion (thème runtime, pas de doublon
  `_light`/`_dark`).
- **Dépendances** : `@rive-app/react-canvas` (+ runtime WASM) — dépendance réelle du projet (moteur
  choisi, cf. §4.4). Importée en **lazy** (`next/dynamic`) dans `m-doodle-renderer` : un visiteur
  n'ayant aucun doodle actif ne télécharge pas le runtime Rive. À weighing au premier doodle (taille
  du runtime WASM vs. valeur visuelle — cf. §8).
- **SSR / hydratation** : `useDoodle` calcule côté client après montage (jamais de valeur au SSR)
  → pas de mismatch ; le logo normal est rendu server-side, remplacé après hydratation si doodle
  (flash acceptable, ou `suppressHydrationWarning` sur le wrapper — à valider au test). Le canvas
  Rive n'a **pas de contenu SSR** à préserver (il ne s'hydrate qu'après montage) — pas de
  mismatch côté renderer.
- **Conversion hébraïque** : MVP = `hebrewManual` (table annuelle). Auto-conversion = question ouverte
  (§8), dépendance potentielle (`@hebcal/core` ≈ 100 kB) à éviter tant que la table suffit.

## 7. Critères d'acceptation

- [ ] Sans occasion : logo strictement inchangé (rendu, taille, lien, focus/coarse).
- [ ] Une occasion `fixed` active ce jour : logo remplacé par la variante d'occasion, clair + sombre
  corrects (thème runtime Rive), `aria-label` = label.
- [ ] Animation d'entrée jouée **une seule fois** par jour (recharge de page → statique).
- [ ] `prefers-reduced-motion: reduce` → aucune animation, state machine figée sur l'état initial.
- [ ] **v2** : le clic sur le doodle **n'ouvre pas** le dropdown — il déclenche l'animation de clic
  (`clickState`/`clickTrigger`) si déclarée ; sinon clic inerte.
- [ ] **v2** : icône d'info apparaît au survol (desktop) / toujours visible (mobile) ; son clic ouvre
  le dropdown ; Échap / clic extérieur ferment.
- [ ] **v2** : dropdown affiche titre + description (si présente) + `verses[]` (si présents, chacun
  lien → `/read?…`) + `source` (si présent, lien externe) ; sections absentes si données absentes.
- [ ] **v2** : bouton « Accueil » du dropdown (icône + libellé « Accueil » au survol, pattern
  prev/next de `m-book-chapter-selector`) → `/accueil`. Remplace l'ancien « clic doodle → /accueil ».
- [ ] **v2** : si `animate.trackMouse` déclaré, le doodle suit la souris (inputs `pointerX/Y`) ;
  inactif si non déclaré ou si `prefers-reduced-motion`.
- [ ] Dropdown ancré `left-0` + clamp : aucun débordement écran sur mobile (cf. fix 894baeb).
- [ ] Mode focus : mark d'occasion discret, pas d'icône d'info, pas de dropdown, pas d'animation
  de clic.
- [ ] Plusieurs occasions le même jour → seule la priorité haute s'affiche.
- [ ] Passage minuit → recalcul sans recharger (doodle change si la journée change).
- [ ] Asset d'occasion manquant (`.riv` introuvable) → repli silencieux sur le logo normal.
- [ ] `.riv` **unique** par occasion (pas de variante `_light`/`_dark`) ; thème runtime basculé avec
  `.dark` sur `<html>`.
- [ ] State machine d'entrée jouée 1×/jour ; état `hover` (optionnel) joué au survol desktop.
- [ ] `@rive-app/react-canvas` importé en **lazy** : aucun doodle actif → aucun code `@rive-app` dans
  le bundle de la page topbar.
- [ ] `tsc --noEmit` + `next build` OK ; sitemap/OG inchangés (hors périmètre).

## 8. Risques & questions ouvertes

- **Calendrier hébraïque** : les fêtes majeures (Pâque, Shavouot, Souccot, Roch Hachana, Yom Kippour)
  sont mobiles. MVP = table annuelle `hebrewManual` à maintenir chaque année (1 ligne/fête/an).
  Vaut-il la peine d'ajouter `@hebcal/core` pour l'auto-conversion ? Coût bundle vs. maintenance
  éditoriale annuelle — **ouvert**.
- **Désactivation utilisateur** : certains lecteurs veulent un logo immuable. Prévoir un réglage
  « Doodles » (on/off) dans les préférences de lecture ? Pas dans le MVP — **ouvert**.
- **Fréquence éditoriale** : trop de doodles banalisent l'effet, trop peu le rendent invisible.
  Cible raisonnable : ~10–15 occasions/an. Le seuil « au moins une fois par mois » est-il souhaité ?
  — **ouvert**.
- **Doodle sur la vignette OG (spec 14)** : un doodle actif pourrait remplacer le logo de la carte
  OG de partage ce jour-là (cohérence marque partagée). Réutiliserait le moteur commun évoqué en
  spec 14/07. Suite possible, **hors MVP**.
- **Hydratation / flash** : remplacer le logo après montage peut produire un léger flash. Valider au
  test ; `suppressHydrationWarning` ou rendu server de la variante si la date est connue server-side
  (risque de mismatch timezone visiteur vs serveur) — **à trancher au test**.
- **Décision moteur — Rive** (tranché) : Rive est choisi comme moteur d'animation (cf. §4.4) pour son
  **thème runtime** (1 `.riv` au lieu de 2 fichiers) et sa **state machine** native (entrée + survol).
  Alternatives **écartées** : CSS (limité à l'abstrait, insuffisant pour l'ambition visuelle —
  réservé à un doodle trivial éventuel) ; Lottie (2 fichiers par doodle pour le thème → désavantage
  direct sur ce projet). Framer Motion est **hors périmètre**.
- **Risques Rive spécifiques** :
  - **Authoring** : les `.riv` se créent dans l'éditeur `rive.app` (gratuit) — compétence à acquérir
    (dessin vectoriel + state machine + variables de couleur). Curateur identifié ?
  - **Taille du runtime** : `@rive-app/react-canvas` embarque du WASM. L'import lazy limite le coût
    aux jours de doodle, mais le runtime se télécharge à la première occurrence — à valider au test
    (poids vs. valeur).
  - **SSR / canvas** : pas de contenu SSR (canvas s'hydrate après montage) → pas de mismatch, mais
    le logo normal doit rester rendu server-side jusqu'à l'hydratation (cf. §6.3).