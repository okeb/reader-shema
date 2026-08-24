# Spec 37 — Lecture audio des versets (read-along par chapitre)

> **Statut** : Proposé · **Priorité** : 🟡 Moyenne · **Effort** : M · **Dépendances** : API shema « audio feature » (champ `audio` + `/audio/manifest`, livrés 2026-08-24 sur l'API modifiée)

## 1. Objectif

Permettre l'écoute narrée des versets directement dans le lecteur, verset par verset et en continu sur tout un chapitre, avec un repère visuel indiquant à tout moment quel verset est en cours de lecture. L'audio vient de l'API shema (un fichier mp3 par verset, convention `{osis}.{chap}.{verset}.mp3`, plus un éventuel `{osis}.{chap}.title.mp3` d'introduction). Couverture initiale limitée à **Genèse 1 et 2** ; la fonctionnalité se désactive gracieusement pour tout passage sans audio.

## 2. Valeur utilisateur

- **Écoute immersive** : suivre un chapitre à l'oreille, mains libres, utile en marchant ou en voiture.
- **Repère visuel de progression** : savoir instantanément quel verset est lu — via une icône haut-parleur animée sur le verset courant (phase 1), puis un surlignage « scintillement » qui accompagne la lecture (phase 2).
- **Découverte progressive** : un bouton ▷ par verset permet d'écouter un verset isolé sans lancer tout le chapitre.
- **Robustesse** : aucun 404 côté client — seuls les versets portant un champ `audio` proposent l'écoute ; le reste du chapitre s'affiche normalement.

## 3. Périmètre

- **Inclus** :
  - Ajout d'un champ `osis` sur `BibleBook` (mapping un-à-un avec `db/books_meta.json` de l'API) — source propre de l'OSIS, utilisée par le manifest et l'URL du `title.mp3`.
  - Propagation du champ `audio` (URL relative) depuis l'API vers le `ChapterVerse` (mode « read ») et le `VerseText` des cartes (mode « références »).
  - Lecteur audio unique (`<audio>`) piloté par un hook `useAudioReader` : lecture d'un verset, lecture continue du chapitre, play/pause/stop, passage au verset suivant/précédent, auto-avance sur `ended`.
  - Piste d'introduction `title.mp3` en tête de lecture continue (découverte via le manifest, OSIS du livre).
  - Bouton « Écouter le chapitre » dans l'en-tête du chapitre (`BookInfoPanel`), affiché uniquement si au moins un verset a de l'audio.
  - Bouton ▷ par verset (versets avec audio uniquement), dans le mode « read » **et** sur les cartes du mode « références ».
  - **Badge de couverture audio 🔊** dans le sélecteur de livre/chapitre : les chapitres disposant d'audio sont marqués (via le manifest global `/audio/manifest`), avant toute navigation.
  - Préférence de lecture « Suivre la lecture » (auto-scroll phase 2) : activable/désactivable dans les réglages, activée par défaut.
  - **Phase 1 — Indicateur** : icône haut-parleur animée (barres d'égaliseur) sur le verset en cours de lecture.
  - **Phase 2 — Surlignage** : effet de « scintillement » (shimmer) sur le verset en cours + auto-scroll doux pour le garder centré (respect du toggle « Suivre la lecture »).

- **Exclu** (pour cette itération) :
  - Vue parallèle / comparée (`OParallelReader`) : pas de lecture audio dans la colonne secondaire.
  - Surlignage au mot près (karaoke timecodé) : l'audio étant un mp3 par verset, on reste au repère par verset. Nécessiterait des métadonnées d'offsets par mot (phase (b) de la spec API, non livrée).
  - Playlist M3U exportable (phase 4 de la spec API).

## 4. Spécification fonctionnelle

### 4.1 Source des données

L'API enrichit déjà chaque objet verset d'un champ `audio` **uniquement quand le fichier existe** (phase 1 API livrée) :

```json
{
  "Ge. 1:3": {
    "livre": "Ge. ", "chapitre": 1, "verset": 3,
    "ecrit": "Elohîm avait dit : …",
    "titre": "Jour « un » : …", "paragraphe": "start",
    "audio": "/audios/Gen.1.3.mp3"
  }
}
```

Versets sans audio → champ absent (jamais `null`). L'URL est **relative** à la base de l'API (`NEXT_PUBLIC_API_BASE_URL`, ex. `https://www.shemaproject.org`). Côté client on la résout en URL absolue avant de l'affecter à `audio.src`.

Le manifest donne la couverture et l'existence du titre :

```
GET /audio/manifest/Gen/1 → { "verses": [1,2,…,31], "title": true }
```

Il n'est appelé qu'au chargement d'un chapitre qui contient au moins un verset audio, et uniquement pour connaître `title` (la couverture verset est déjà portée par la réponse du chapitre).

### 4.2 Champ `osis` sur `BibleBook`

`BibleBook` gagne un champ `osis: string` (code OSIS canonique : `Gen`, `Exod`, `Matt`…), mapping un-à-un avec `db/books_meta.json` côté API. C'est la source propre utilisée par :
- le manifest (`/audio/manifest/{osis}` et `/audio/manifest/{osis}/{chap}`) ;
- l'URL du `title.mp3` : `/audios/{osis}.{chap}.title.mp3`.

Les 66 entrées de `BIBLE_BOOKS` sont complétées une fois pour toutes (ex. `{ id: "genese", osis: "Gen", … }`, `{ id: "matthieu", osis: "Matt", … }`). L'OSIS n'est jamais dérivée d'une URL au runtime : un seul source of truth, et l'audio reste utilisable même avant qu'un chapitre ne renvoie de champ `audio` (utile pour le badge du sélecteur, §4.5).

### 4.3 `useAudioReader(verses, bookId, chapter)`

Hook client, source unique de l'état audio. Gère un unique élément `<audio>` (rendu une fois dans `TReader`, jamais par verset). Expose :

```ts
interface AudioReaderState {
  isPlaying: boolean;            // true si une piste joue
  currentVerse: number | null;   // numéro du verset en cours (null si idle)
  hasAudio: boolean;            // au moins un verset du chapitre a de l'audio
  playChapter: () => void;      // lecture continue depuis le 1er verset audio (+ title)
  playVerse: (n: number) => void; // lit un verset précis (interrompt la lecture continue)
  toggle: () => void;           // play/pause de la piste courante
  stop: () => void;             // arrêt + reset (currentVerse = null)
  next: () => void;             // verset suivant qui a de l'audio
  prev: () => void;             // verset précédent qui a de l'audio
}
```

**Construction de la playlist** (au chargement du chapitre, mémoïsée) :
1. Filtrer `verses` pour ne garder ceux qui ont `audio`.
2. Si la liste est vide → `hasAudio = false`, rien d'autre.
3. Dériver `osis` du livre courant (`getBookById(bookId).osis`) et fetcher `/audio/manifest/{osis}/{chapter}`. Si `title === true`, prépendre une piste « titre » d'URL `/audios/{osis}.{chapter}.title.mp3` (résolue en absolu). Le manifest est best-effort : en cas d'échec réseau, on zappe le titre et on garde les versets.
4. Playlist finale = `[title?, v1, v2, …, vN]` où chaque piste verset porte son numéro.

**Lecture continue** (`playChapter`) : joue la playlist du début. Sur `ended` → piste suivante. À la fin du dernier verset → `stop()` (pas de boucle).

**Lecture d'un verset** (`playVerse(n)`) : recherche la piste correspondante dans la playlist et la joue ; l'auto-avance continue ensuite sur les versets suivants (comportement identique à `playChapter` à partir de `n`). Le `title.mp3` n'est pas joué quand on démarre depuis un verset.

**Pause/Reprise** (`toggle`) : agit sur la piste courante. `currentVerse` est conservé à la pause (l'indicateur visuel reste sur le verset, à l'arrêt).

**Changement de chapitre** : l'ID de query React-Query change avec `chapter`/`bookId`/`version` → `verses` change → le hook réinitialise (`stop()`), rebuild la playlist. Pas de fuite audio d'un chapitre à l'autre.

**Désactivation gracieuse** : un mp3 manquant (404) déclenche l'événement `error` → on zappe la piste et on passe à la suivante (même logique que `ended`). Le chapitre n'est jamais bloqué.

### 4.4 Persistance & préférences

- Aucune persistance du timecode ni de la position de lecture. L'écoute est volatile (par session).
- **Nouvelle préférence** `followAudio: boolean` (défaut `true`) ajoutée au store des préférences de lecture (`reader-preferences.store`), à côté de `layout`, `columns`, etc. Elle pilote l'auto-scroll phase 2 (« Suivre la lecture ») et est exposée dans le panneau des réglages de lecture (`m-reading-settings`). Un toggle off → l'écoute continue sans déplacement de la vue.
- Pas de préférence « lecture auto à l'ouverture » pour l'instant (l'audio se déclenche à la demande).

### 4.5 Manifest global & badge du sélecteur

Au premier affichage du sélecteur de livre/chapitre (`m-book-chapter-selector`), on fetche en arrière-plan le manifest global :

```
GET /audio/manifest → { "Gen": { "1": [...], "2": [...] }, "Exod": {}, … }
```

Ce manifest est mis en cache côté client (React-Query, `staleTime` longue, ex. 24 h — la couverture ne change qu'au déploiement de l'API). Il sert à marquer, dans la grille des chapitres du livre survolé/sélectionné, les chapitres disposant d'audio :

- Les boutons de chapitre avec audio reçoivent un point/indicateur `🔊` (ou un anneau coloré `ring-primary`) en complément du numéro.
- Un livre entièrement sans audio n'affiche aucun indicateur (pas de bruit visuel).
- Tant que le manifest n'est pas chargé (ou échoue), la grille s'affiche sans badge — pas de blocage de l'UI. Le badge n'est une amélioration progressive, jamais une dépendance.

### 4.6 Audio en mode « références » (VerseCard)

Le mode références affiche des `VerseCard` (une carte = une référence = plusieurs versets). Chaque verset de la carte porte désormais un `audio?` propagé depuis l'API (`getReferences` mappe `audio` comme `getChapter`).

- Un bouton ▷ s'affiche à côté du numéro de chaque verset de la carte ayant `audio`. Clic → `playVerse` de ce verset (l'`useAudioReader` est partagé avec le mode « read » via `TReader`).
- Il n'y a pas de « lecture continue du chapitre » en mode références (les cartes peuvent venir de livres/chapitres différents) ; l'auto-avance se limite aux versets d'une même carte ayant de l'audio. À la fin de la carte, lecture stoppée (pas de saut vers une autre carte).
- L'indicateur de verset courant (icône égaliseur + surlignage phase 2) s'applique à la carte contenant le verset en lecture.

## 5. UI / UX

### 5.1 Emplacement & déclencheurs

- **Bouton « Écouter le chapitre »** : dans l'en-tête `BookInfoPanel`, à droite du titre du livre, sous forme de pilule glass (cohérente avec les pilules existantes du topbar). Affiché uniquement si `hasAudio`. Clic → `playChapter()` (ou `toggle()` si déjà en lecture). Change d'icône : ▷ au repos, ⏸ en lecture.
- **Bouton ▷ par verset** : à l'extrémité droite de chaque verset ayant `audio`, dans les deux layouts (`verses` et continu) du mode « read », et à côté du numéro de chaque verset audio dans les `VerseCard` du mode « références ». Discret au repos (opacité réduite), plein au survol du verset ou quand le verset est en cours de lecture. Clic → `playVerse(n)`.
- **Badge 🔊 de chapitre** : dans la grille des chapitres du sélecteur (`m-book-chapter-selector`), un anneau `ring-primary` (ou point `🔊`) sur les numéros de chapitre avec audio (manifest global, §4.5).
- **Indicateur de lecture** : sur le verset dont `currentVerse === v.number` et `isPlaying === true`.

### 5.2 Disposition (wireframe)

**En-tête du chapitre avec audio** :
```
┌──────────────────────────────────────────────────┐
│ Genèse 1                          [ ▷ Écouter ] │  ← pilule, masquée si pas d'audio
└──────────────────────────────────────────────────┘
```

**Layout « versets » — verset en cours de lecture (phase 2) ** :
```
    1   Elohîm, au commencement, créa les cieux…        ▷
    2   la terre était informe et vide, les ténèbres…   ▷
▌ ╿ 3   Elohîm dit : Que la lumière apparaisse !  ✦ ░▒▓ │  ← surlignage scintillant + ▷→⏸
    4   Elohîm vit que la lumière était bonne…          ▷
```

**Layout continu — verset en cours (phase 2) ** :
```
… ² la terre était informe et vide, les ténèbres…
  ³ Elohîm dit : Que la lumière apparaisse !Et la lumière apparut. ⁴ Elohîm vit …
      ▲ surlignage scintillant englobant le verset 3, ▷→⏸ inline
```

**Sélecteur de chapitre — badge audio (Genèse) ** :
```
┌─────────────────────────┐
│  ①②③④⑤  ⑥⑦⑧⑨⑩        │  ① ② → anneau ring-primary (audio dispo.)
│ ⑪⑫⑬⑭⑮  ⑯⑰⑱⑲⑳          │  autres → pas d'anneau
│ ㉑㉒㉓㉔㉕  ㉖㉗㉘㉙㉚    │
└─────────────────────────┘
```

### 5.3 États & interactions

- **Repos, pas d'audio** : aucun bouton, aucun indicateur. Comportement du lecteur inchangé.
- **Repos, audio disponible** : pilule « ▷ Écouter » visible ; boutons ▷ par verset visibles (discrètement).
- **Lecture en cours** :
  - Phase 1 : le verset courant porte une icône **haut-parleur animée** (3 barres d'égaliseur qui oscillent, `animate-eq`). Les autres versets gardent leur ▷ statique. La pilule en-tête devient « ⏸ Pause ».
  - Phase 2 : en plus, le verset courant reçoit un **surlignage scintillant** (dégradé qui se déplace, `verse-playing`) et déclenche un `scrollIntoView({ behavior: 'smooth', block: 'center' })` à l'entrée en lecture — **uniquement si la préférence `followAudio` est activée** (défaut activé). Throttle : 1 scroll par changement de verset, jamais pendant un scroll manuel de l'utilisateur (désactivé si l'utilisateur scrolle dans les ~800 ms suivant un scroll programmatique).
- **Pause** : l'icône égaliseur se fige (barres fixes), le surlignage scintillant s'arrête (reste un fond statique léger). `currentVerse` conservé.
- **Fin du chapitre** : retour à l'état de repos (pilule ▷, `currentVerse = null`).
- **Changement de verset sélectionné à la main** : indépendant de l'audio (la sélection texte reste gérée par `useVerseSelection`).

### 5.4 Responsive

- Mobile (`coarse`) : la pilule « Écouter » reste dans l'en-tête (taille réduite). Les boutons ▷ par verset restent tactiles (zone de clic ≥ 28 px). L'auto-scroll phase 2 utilise `block: 'center'` et respecte la barre de navigation fixe (`scroll-mt-24` déjà appliqué aux versets).
- Desktop : boutons ▷ apparaissent au survol du verset (opacité transition), sauf verset courant toujours visible.

### 5.5 Thème clair/sombre & accessibilité

- Tokens existants : la pilule reprend `GLASS_PILL` / `bg-primary` du topbar ; le surlignage scintillant utilise `primary` (teinte d'accent) à faible opacité pour ne pas écraser le surlignage `?v=` ni la sélection.
- Priorité visuelle : **sélection (`?v=` / clic) > audio en cours**. Si un verset est à la fois sélectionné et en lecture, c'est le style sélection qui l'emporte pour le fond ; l'indicateur audio se rabat sur l'icône égaliseur seule (pas de double fond).
- Contraste : l'icône égaliseur est `text-primary` sur fond neutre — contraste AA.
- `aria-label` : pilule « Écouter le chapitre / Mettre en pause le chapitre » (changé selon l'état) ; bouton verset « Écouter le verset N / Mettre en pause ».
- `aria-live="polite"` sur une zone invisible annonçant « Verset N en lecture » (changée sur `currentVerse`) pour les lecteurs d'écran.
- Réduction de mouvement : sous `prefers-reduced-motion: reduce`, les animations `animate-eq` et `verse-playing` sont désactivées (fond statique simple, icône figée) — repère visuel conservé sans animation.

### 5.6 Micro-copy (FR)

- Pilule (repos) : « ▷ Écouter »
- Pilule (lecture) : « ⏸ Pause »
- Bouton verset (repos) : titre/aria « Écouter le verset {n} »
- Bouton verset (lecture) : titre/aria « Mettre en pause le verset {n} »
- Annonce lecteur d'écran : « Verset {n} en lecture »
- Réglage : « Suivre la lecture » (toggle) + aide « Faire défiler automatiquement vers le verset en cours de lecture »
- Badge chapitre : pas de label texte (purement visuel) ; `aria-label` « Chapitre {n} avec audio » si nécessaire pour lecteur d'écran (sinon l'anneau reste décoratif, le numéro suffit).

## 6. Spécification technique

### 6.1 Fichiers (nouveaux / modifiés)

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/shared/constants/bible-books.ts` | **Modifié** | Ajouter `osis: string` à `BibleBook` et aux 66 entrées de `BIBLE_BOOKS` (mapping avec `books_meta.json`). |
| `src/domain/entities/chapter-verse.entity.ts` | **Modifié** | Ajouter `audio?: string` (URL relative, présent si le fichier existe). |
| `src/domain/entities/biblical-verse.entity.ts` | **Modifié** | Ajouter `audio?: string` à `VerseText` (mode références). |
| `src/infrastructure/api/bible-api.ts` | **Modifié** | Ajouter `audio?: string` à `ApiVerse`. Propager `audio: v.audio` dans `getChapter` et dans `getReferences` (`verses.map`). Ajouter `getAudioManifestChapter(osis, chap)` et `getAudioManifest()` (global) → best-effort, `null` si 404/erreur. |
| `src/shared/constants/reader-preferences.ts` | **Modifié** | Ajouter `followAudio: boolean` au type des préférences (défaut `true`) + option du store. |
| `src/presentation/stores/reader-preferences.store.ts` | **Modifié** | État + action `setFollowAudio`. |
| `src/presentation/lib/audio.ts` | **Nouveau** | `resolveAudioUrl(rel?: string): string | null` (préfixe `NEXT_PUBLIC_API_BASE_URL`, `null` si `rel` absent). |
| `src/presentation/hooks/use-audio-reader.ts` | **Nouveau** | Hook `useAudioReader(verses, bookId, chapter)`. Gère l'élément `<audio>` via un `ref`, la playlist mémoïsée, le fetch manifest chapitre (React-Query), les events `ended`/`error`/`play`/`pause`. Renvoie `AudioReaderState` (§4.3). Consomme `followAudio` pour piloter l'auto-scroll (phase 2). |
| `src/presentation/hooks/use-audio-manifest.ts` | **Nouveau** | `useAudioManifest()` → React-Query sur `getAudioManifest()`, `staleTime` 24 h. Retourne une map `osis → Set(chap)` des chapitres audio (pour le badge sélecteur). |
| `src/presentation/components/atoms/a-audio-verse-button.tsx` | **Nouveau** | Bouton ▷/⏸ + icône égaliseur animée pour un verset. Props : `hasAudio`, `isCurrent`, `isPlaying`, `onToggle`. Discret au repos, plein si courant. Réutilisé mode « read » et mode « références ». |
| `src/presentation/components/molecules/m-book-info-panel.tsx` | **Modifié** | Ajouter la pilule « Écouter le chapitre » (props `hasAudio`, `isPlaying`, `onToggleListen`). Masquée si `!hasAudio`. |
| `src/presentation/components/molecules/m-book-chapter-selector.tsx` | **Modifié** | Consommer `useAudioManifest()` ; anneau `ring-primary` sur les boutons de chapitre avec audio (via `osis` du livre survolé). |
| `src/presentation/components/molecules/m-reading-settings.tsx` | **Modifié** | Ajouter le toggle « Suivre la lecture » (lié à `followAudio`). |
| `src/presentation/components/molecules/m-verse-card.tsx` | **Modifié** | Rendre `AAudioVerseButton` à côté du numéro de chaque verset ayant `audio`. Props `currentVerse`, `isPlaying`, `onPlayVerse` depuis `TReader`. |
| `src/presentation/components/organisms/o-reader-content.tsx` | **Modifié** | Ajouter `currentVerse`, `isPlaying`, `playVerse` aux props. Rendre `AAudioVerseButton` sur les versets avec audio. Appliquer la classe `verse-playing` (phase 2). |
| `src/presentation/components/templates/t-reader.tsx` | **Modifié** | Instancier `useAudioReader(verses, bookId, chapter)` (mode « read ») et `useAudioReader` partagé pour le mode « références » (une playlist par carte active), rendre l'élément `<audio>` unique, passer l'état à `BookInfoPanel`, `ReaderContent` et `VerseCard`. |
| `tailwind.config.ts` | **Modifié** | Ajouter les keyframes `eq` (barres égaliseur) et `shimmer` (dégradé mobile), exposés en `animate-eq` et `verse-playing`. |

Aucune nouvelle dépendance npm (audio natif HTML5, Iconify déjà présent).

### 6.2 Données & persistance

- Aucune donnée persistée. La playlist est dérivée en mémoire des `verses` (déjà en cache React-Query, `staleTime` 1 h) et d'un fetch manifest best-effort.
- L'URL audio résolue est absolue (`https://www.shemaproject.org/audios/Gen.1.3.mp3`) → mise en cache navigateur + CDN Vercel (servi statiquement par l'API).

### 6.3 API / contraintes

- L'audio est **agnostique de la version** (spec API) : même narration servie sous `/bym`, `/lsg`… On n'affiche donc le bouton que sur la version primaire, mais l'URL audio est la même quelle que soit la version active. Aucune logique version-spécifique côté client.
- Le manifest n'existe que sur l'API modifiée. En production (tant que l'audio n'est pas déployé), aucun verset ne porte le champ `audio` → `hasAudio = false` → la feature est invisible. Aucun garde-fou explicite nécessaire.
- `getChapter` continue à renvoyer `ChapterVerse[]` ; le nouveau champ `audio` est optionnel — aucun impact sur les consommateurs existants (`OParallelReader`, etc.). Idem pour `VerseText.audio` côté références.
- Le manifest global (`/audio/manifest`) n'existe que sur l'API modifiée. En production tant que l'audio n'est pas déployé : aucun verset ne porte `audio` et le manifest peut 404 → `hasAudio = false` partout, le badge sélecteur ne s'affiche pas, la feature est entièrement invisible. Aucun garde-fou explicite nécessaire au-delà du best-effort déjà prévu.

## 7. Critères d'acceptation

### Phase 1 — Lecture + indicateur

- [ ] Sur Genèse 1, la pilule « ▷ Écouter » apparaît dans l'en-tête ; sur un chapitre sans audio (ex. Genèse 3 tant que non couvert), elle est absente.
- [ ] Cliquer « ▷ Écouter » lance la lecture continue depuis le `title.mp3` (s'il existe) puis enchaîne les versets 1 → 31 sans intervention.
- [ ] Le verset en cours de lecture porte une icône égaliseur animée ; la pilule passe en « ⏸ Pause ».
- [ ] Cliquer ▷ sur un verset isole lit ce verset puis enchaîne les suivants.
- [ ] ⏸ met en pause (l'icône égaliseur se fige, `currentVerse` conservé) ; ▷ reprend.
- [ ] Bouton stop/fin : à la fin du chapitre, retour à l'état de repos.
- [ ] Un mp3 404 est zappé silencieusement, la lecture continue sur le verset suivant.
- [ ] Naviguer vers un autre chapitre arrête l'audio en cours (pas de fuite).
- [ ] Mode « références » : un bouton ▷ apparaît à côté des versets de carte ayant `audio` ; le clic lit le verset et enchaîne les versets audio de la même carte ; pas de saut vers une autre carte.
- [ ] Badge sélecteur : dans la grille des chapitres de Genèse, les chapitres 1 et 2 portent l'indicateur audio ; les autres non ; un livre sans audio n'affiche rien.
- [ ] `aria-label` et `aria-live` présents et corrects ; `prefers-reduced-motion` fige l'égaliseur.
- [ ] `tsc` + build OK ; aucun impact sur la vue parallèle et les consommateurs existants de `ChapterVerse` / `VerseText`.

### Phase 2 — Surlignage scintillant + auto-scroll

- [ ] Le verset en cours reçoit le surlignage scintillant (`verse-playing`) en plus de l'icône.
- [ ] Auto-scroll doux amène le verset courant au centre au changement de verset — **uniquement si `followAudio` est activé**.
- [ ] Le toggle « Suivre la lecture » dans les réglages désactive/active l'auto-scroll (persisté).
- [ ] L'auto-scroll cède à un scroll manuel de l'utilisateur (pas de combat de scroll).
- [ ] Si le verset est aussi sélectionné (`?v=` / clic), le style sélection l'emporte sur le fond ; l'indicateur audio reste l'icône seule.
- [ ] `prefers-reduced-motion` désactive le scintillement (fond statique léger) et l'auto-scroll (centrage instantané).

## 8. Risques & questions ouvertes

- **Couverture limitée** : seul Genèse 1 (et bientôt 2) est testable. La feature reste invisible ailleurs via le champ `audio` optionnel et le manifest best-effort. Le badge sélecteur ne sert qu'à partir du moment où plusieurs chapitres sont couverts — il est en place dès maintenant pour ne pas revenir sur le sélecteur plus tard.
- **Manifest global en production** : `/audio/manifest` peut 404 tant que l'API modifiée n'est pas déployée en prod. Le `useAudioManifest` gère l'échec en silence (pas de badge) ; vérifier qu'aucune erreur non-404 ne remonte bruyamment dans la console.
- **Auto-scroll intrusif** : un scroll automatique à chaque verset peut gêner un utilisateur qui lit. Mitigations : (a) scroll doux, (b) `followAudio` désactivable dans les réglages (défaut activé), (c) pas de scroll si le verset est déjà visible, (d) cède immédiatement à un scroll manuel.
- **Performance mobile** : 31 mp3 chargés un à un (un par verset). Pas de préchargement agressif pour préserver la data ; le navigateur met en cache le mp3 joué. Un préchargement du verset suivant pourrait être ajouté si besoin.
- **Audio et mode focus (spec 17)** : en mode focus, les versets hors sélection sont atténués. Le verset audio en lecture doit rester visible (pas atténué) — exception explicite à la règle `dimmed()`.
- **`osis` : vérité source** : le mapping `osis` est saisi à la main dans `BIBLE_BOOKS`. Un livre mal mappé → mauvais manifest/mauvaise URL titre. Mitigation : valeurs reprises de `db/books_meta.json` de l'API (déjà validées) ; à vérifier par un test rapide (`getBookById('genese').osis === 'Gen'`).
- **Mode références multi-livres** : une carte de référence peut contenir des versets d'un seul livre/chapitre (les références sont de la forme `livre/chap/selection`). L'auto-avance par carte est donc cohérent ; mais si l'utilisateur enchaîne manuellement des versets de cartes différentes (livres différents), l'`useAudioReader` doit réinitialiser sa playlist à chaque carte active — à valider à l'implémentation.