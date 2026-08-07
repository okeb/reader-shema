# Spec 16 — Écran d'accueil

> **Statut** : Proposé · **Priorité** : 🟠 Moyenne · **Effort** : S–M · **Dépendances** : ✅ levée (réutilise spec 04 `useReadingPosition` + spec 13 `useNavigationHistory`, déjà implémentés)

## 1. Objectif
Offrir un **écran d'accueil** calme, accessible à la demande, qui fait entrer la Parole en premier (la
référence de reprise en `font-reader`), propose un lanceur livre/chapitre, liste les chapitres
récemment consultés, et donne accès aux Favoris/Signets — sans verset du jour, sans compteur, sans
streak, sans push.

## 2. Valeur utilisateur
Aujourd'hui l'app n'a pas d'accueil : `/` redirige vers `/bym/read` qui auto-reprend (spec 04). C'est
conforme à la doctrine (« la Parole accueille à l'ouverture ») mais ne laisse aucun point d'entrée pour
**choisir où lire**, ni de vue douce de ses passages récents. Un accueil **à la demande** (route
dédiée, pas d'intercalaire avant le texte) ajoute ce point d'entrée **sans frictionner l'ouverture** :
qui veut reprendre ne fait toujours qu'un geste (la racine `/` auto-reprend) ; qui veut naviguer
dispose d'un lanceur et d'un fil de lecture récent.

## 3. Périmètre
- **Inclus** :
  - Route dédiée `/accueil` (server) + organisme client `o-home`.
  - Hero « Reprendre la lecture · {référence} » (ou « Commencer la lecture · Jean 1 » si rien) → navigue
    avec params explicites (pas de danse auto-reprise).
  - Lanceur « Choisir un passage » (inline, deux colonnes : liste livres groupée par testament +
    recherche, grille 5 col de chapitres).
  - Section « Récemment consultés » (top 8, groupée par jour) depuis `useNavigationHistory` —
    **masquée si vide**.
  - Raccourcis « Favoris » (`/bym/favoris`) et « Signets » (`/bym/read?signets=1` → ouvre le panneau
    signets au montage).
  - Entrées : logo topbar → `/accueil` ; bouton dock « Accueil » → `/accueil`. Racine `/` inchangée.
  - Bascule de thème + `ShortcutsHelp` (miroir page favoris).
- **Exclu** (cette itération) :
  - Verset du jour (spec 06) — rejeté par l'utilisateur.
  - Compteurs/streaks/cartes de progression (interdit par la doctrine, spec 00).
  - Notifications push, « vous avez été absent » (pull pas push).
  - Vue couverture Bible 66 livres (future spec « séries/progression »).
  - Prévisualisation du texte du chapitre à reprendre (variant B non retenue).

## 4. Spécification fonctionnelle
- **Racine `/`** : `redirect("/bym/read")` inchangé → auto-reprise (spec 04) vers le texte. Aucune
  friction ajoutée avant la Parole.
- **`/accueil`** : écran client. Au montage, hydrate `useReadingPosition` + `useNavigationHistory` +
  `useTheme`.
- **Hero Reprendre** :
  - Si `position` existe → carte « Reprendre la lecture · {position.reference} » →
    `router.push('/bym/read?livre={bookId}&chap={chapter}')` (params explicites → `explicitTarget=true`,
    atterrissage direct, pas de flash).
  - Si aucune position → « Commencer la lecture · Jean 1 » → `/bym/read?livre=jean&chap=1`.
- **Lanceur passage** : déclencheur « Choisir un passage ▾ » révélant un panneau inline deux colonnes
  (modèle popover du sélecteur existant, sans prev/next). `onSelect(bookId, chapter)` →
  `router.push('/bym/read?livre=…&chap=…')`.
- **Récemment consultés** : `history.slice(0, 8)` groupé par jour (`groupByDay` extrait de
  `m-history-panel`). Chaque entrée → `router.push(entry.url)`. **Section absente si
  `history.length === 0`** (pas d'état vide accusateur). Lecture seule (retrait/effacement restent dans
  le panneau Historique).
- **Raccourcis** : « Favoris » → `/bym/favoris` ; « Signets » → `/bym/read?signets=1`.
- **Signets au montage** : `app/bym/read/page.tsx` lit `searchParams.signets` ; passe
  `openBookmarksOnMount` au lecteur, qui ouvre `bookmarkPanelOpen` une fois au montage. `signets`
  n'entre **pas** dans `hasExplicitTarget` (l'auto-reprise reste souhaitée).
- **Raccourcis clavier** (miroir page favoris) : `Escape` → reprendre la lecture ; `?` → aide.
- **Rendu gardé par `hydrated`** pour éviter toute divergence SSR/localStorage.

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
- Route `/accueil`. Entrées : **logo** (topbar du lecteur) → `/accueil` ; **bouton dock « Accueil »**
  (icône `hugeicons:home-02`) → `/accueil`. Racine `/` inchangée.

### 5.2 Disposition (wireframe)
```
┌──────────────────────────────┐
│          [LOGO]        ☀/◐    │
│                               │
│   Reprendre la lecture        │
│   ┌────────────────────────┐  │
│   │  Jean 3   (font-reader) │  │
│   └────────────────────────┘  │
│                               │
│   Choisir un passage    ▾     │
│   ┌─ (panneau inline) ─────┐  │  ← révélé au clic
│   │ Genèse │ 1 2 3 … 50    │  │
│   │ Exode  │               │  │
│   │ …      │               │  │
│   └────────────────────────┘  │
│                               │
│   Récemment consultés         │
│   Aujourd'hui                 │
│    · Jean 3   · Romains 8     │
│   Hier                        │
│    · Psaumes 23               │
│                               │
│   Favoris · Signets           │
│   ─────  liens légaux  ─────  │
└──────────────────────────────┘
```

### 5.3 États & interactions
- **Première visite** (rien en `localStorage`) : hero « Commencer la lecture · Jean 1 » ; section
  « Récemment consultés » absente ; lanceur présent.
- **Avec position + historique** : hero « Reprendre · {réf} » ; section récents peuplée et groupée par
  jour.
- **Lanceur fermé** : seul le déclencheur « Choisir un passage ▾ » est visible. Ouvert : panneau inline
  deux colonnes ; clic chapitre → navigation ; clic dehors / `Escape` → ferme.
- **Hero / récents / raccourcis** : tous naviguent vers `/bym/read` (params explicites).

### 5.4 Responsive
- Coque miroir de la page Favoris : `min-h-screen`, colonne `max-w-[68ch]`, `px-4 py-16`, `SiteFooter`.
  Cibles tactiles 44 px. Lanceur inline (pas de popover absolu) → pas de souci de positionnement mobile.

### 5.5 Thème clair/sombre & accessibilité
- Couleurs via tokens → suit `.dark`. `Logo` (bascule clair/sombre sans flash). `ThemeToggle` réutilisé.
  `aria-label` sur les liens de navigation ; `title` sur le bouton dock. Animations
  `animate-fade-in-up` (hero) / `animate-slide-in-right` (raccourcis), cohérentes avec la page Favoris.

### 5.6 Micro-copy (FR)
- Hero : « Reprendre la lecture » / « Commencer la lecture ».
- Lanceur : « Choisir un passage ».
- Section : « Récemment consultés » ; jours « Aujourd'hui » / « Hier » / « {JJ mois} ».
- Raccourcis : « Favoris » · « Signets ».
- Bouton dock : « Accueil ».

## 6. Spécification technique
### 6.1 Fichiers (nouveaux / modifiés)
- **Nouveau** `app/accueil/page.tsx` (server) — `metadata` + `<HomeScreen/>`.
- **Nouveau** `components/organisms/o-home.tsx` (`"use client"`) — l'écran (hooks + UI).
- **Nouveau** `components/molecules/m-passage-launcher.tsx` (`"use client"`) — déclencheur + panneau
  inline (modèle popover de `m-book-chapter-selector`).
- **Nouveau** `lib/date-grouping.ts` — `startOfDay` / `dayLabel` / `groupByDay` extraits de
  `m-history-panel.tsx`.
- **Modifié** `components/organisms/o-reader-topbar.tsx` (l.57) — logo `href="/bym/read"` → `"/accueil"`.
- **Modifié** `components/molecules/m-reader-dock.tsx` — `Link` « Accueil » (`FLOATING_BTN`,
  `hugeicons:home-02`).
- **Modifié** `app/bym/read/page.tsx` — lire `searchParams.signets` ; passer `openBookmarksOnMount`.
- **Modifié** `components/organisms/o-bible-reader.tsx` — prop `openBookmarksOnMount` + effect one-shot.
- **Modifié** `components/molecules/m-history-panel.tsx` — importer les helpers depuis
  `lib/date-grouping`.
- **Modifié** `specs/README.md` — ajouter la ligne 16 à l'index.

### 6.2 Données & persistance
- **Aucune nouvelle persistance**. Lit uniquement `useReadingPosition` (`bym:last-position`, spec 04),
  `useNavigationHistory` (`bym:nav-history`, spec 13), `useTheme` (`bym:theme`). Aucune écriture depuis
  l'accueil (lecture seule).

### 6.3 API / contraintes
- Aucune dépendance API. Atomic design (`o-home`, `m-passage-launcher`), Tailwind `darkMode:"class"`,
  `cn()`, icônes `hugeicons:*`. Conforme à la doctrine spec 00.

## 7. Critères d'acceptation
- [ ] `/accueil` s'affiche ; `/` redirige toujours vers `/bym/read` (auto-reprise inchangée).
- [ ] **Première visite** (localStorage vide) : hero « Commencer la lecture · Jean 1 » → atterrit sur
      Jean 1 ; section « Récemment consultés » absente.
- [ ] **Avec position** : hero « Reprendre · {réf} » → atterrit sur le bon chapitre sans flash.
- [ ] Lanceur « Choisir un passage » : ouvre le panneau inline, sélection livre+chapitre → navigue ;
      `Escape`/clic dehors ferme.
- [ ] « Récemment consultés » peuplé après lecture, groupé par jour ; tap → retourne au passage ;
      masqué si vide.
- [ ] « Favoris » → `/bym/favoris` ; « Signets » → lecteur avec panneau signets ouvert au montage.
- [ ] Logo topbar + bouton dock → `/accueil` ; racine `/` inchangée.
- [ ] Bascule de thème sans flash ; `?` ouvre l'aide, `Escape` reprend la lecture.
- [ ] **Doctrine** : aucun compteur/streak/« vous avez été absent »/état vide accusateur.
- [ ] `npx tsc --noEmit` propre ; `npm run build` OK (14 routes).

## 8. Risques & questions ouvertes
- **Changement de comportement logo** : taper le logo dans le lecteur n'auto-reprend plus, il mène à
  `/accueil` (la reprise devient le hero, 1 geste). La racine `/` conserve l'auto-reprise immédiate.
  *À valider.*
- **« Signets » via query param** : ajoute une porte d'entrée `?signets=1` dans le lecteur. Alternative à
  moindre risque : « Signets » pointe vers `/bym/read` (le dock y a le bouton signets) — moins direct.
- **Extraction `lib/date-grouping`** : refactor d'un composant en place (`m-history-panel`). Alternative :
  dupliquer les ~15 lignes dans `o-home` (zéro risque sur l'existant).
- **Lanceur inline vs popover** : inline (choisi) consomme de la hauteur ; popover absolu serait plus
  compact mais introduit du positionnement. Sur un accueil peu dense, inline est plus lisible.
- **Future spec « séries/progression »** : la doctrine évoque une carte de couverture Bible 66 livres —
  hors périmètre ici, mais l'accueil est le futur hôte naturel de cette carte.