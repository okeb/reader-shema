# PLAN — Spec 11 · Renvois (cross-references)

Afficher, pour un verset, les versets liés (renvois/parallèles) et y naviguer, en réutilisant la
machinerie existante (extraits via `getReferences`, navigation/surbrillance/scroll des signets).
Référence : [`specs/11-cross-references.md`](specs/11-cross-references.md).
Statut : **✅ Implémenté** (`tsc --noEmit` + `pnpm build` OK ; 66 fichiers générés, 0 code OSIS inconnu). Effort M.

## Décision données (tranchée)

- **Source** : **openbible.info — Cross References** (≈340k renvois, dérivés du TSK, **CC-BY**).
  Chaque renvoi porte un score de votes → tri + plafond N=12/verset.
- **Obligation** : attribution sur `/credits` (CC-BY).
- Dataset statique servi depuis `public/data/cross-refs/{bookId}.json`, chargé **par livre** à la
  demande. Aucun nouvel endpoint API ; les extraits passent par `getReferences(version, slugs)`.

## ⚠️ Correction critique au plan de la spec

La spec (§4) suppose que `BIBLE_BOOKS` suit l'ordre canonique standard et propose un mapping
**par index**. **C'est faux** : dans `lib/bible-books.ts`, Ésaïe (`esaie`) est placé juste après
2 Rois, et le NT est atypique (Jacques/Galates avant les Corinthiens, Romains après). Le dataset
openbible.info utilise l'ordre/les codes **OSIS standard**. → Le mapping doit se faire via une
**table explicite code OSIS → `bookId`** (ci-dessous), **jamais** par index.

## Périmètre (v1)

- **Inclus** : indicateur + compteur par verset en **mode lecture mono** (`o-reader-content.tsx`,
  affichages « verset par verset » et « continu ») ; popover desktop / bottom sheet mobile listant
  les renvois avec extrait ; clic → navigation+surbrillance+scroll (machinerie signets).
- **Exclu** : vue parallèle (`compare != null`) et mode `refs` — indicateur masqué, cohérent avec
  Strong. Édition de renvois, graphe, notes éditoriales.

---

## Étape 1 — Pipeline build-time

### `scripts/build-cross-refs.ts` (nouveau, exécuté à la main)

- Exécution : `npx -y tsx scripts/build-cross-refs.ts` (aucune dépendance ajoutée à `package.json` ;
  `tsx` est récupéré à la volée). Importe `BIBLE_BOOKS` depuis `../lib/bible-books` (fichier TS pur,
  sans dépendance React → importable).
- **Source brute** : `scripts/data/cross_references.txt` (TSV, téléchargé depuis
  <https://www.openbible.info/labs/cross-references/> — *Download as a TSV file*). **Non commité**
  (volumineux) ; documenter le chemin et l'URL en tête du script. Seuls les JSON générés sont versionnés.
- **Format source** : 3 colonnes `From Verse \t To Verse \t Votes` + ligne d'en-tête à ignorer.
  Références OSIS pointées : `Gen.1.1` ; plages `Rom.5.8-Rom.5.10` (la **cible** est souvent une plage,
  la **source** parfois aussi).
- **Algorithme** :
  1. Parser chaque ligne ; ignorer l'en-tête et les votes ≤ 0.
  2. Parser une réf OSIS `Book.chap.verse[-Book.chap.verse]` → `{ osis, chap, vStart, vEnd? }`.
  3. Mapper `osis` → `bookId` via `OSIS_TO_BOOKID` (table ci-dessous). Code inconnu → ligne ignorée.
  4. **Source en plage** → dupliquer le renvoi sur chaque verset de la plage source (chaque verset
     porte ainsi ses renvois).
  5. Regrouper par `bookId` source puis clé `"chap:verse"` ; trier par votes desc ; **garder N=12**.
  6. Trier la liste finale de chaque verset en **ordre canonique BIBLE_BOOKS** (index `bookId`) puis
     chap/verset, pour un affichage stable.
  7. Écrire `public/data/cross-refs/{bookId}.json` (un fichier par livre source qui a des renvois).
- **Format de sortie** (compact, clé `"chap:verse"`, cibles `[bookId, chap, vStart]` ou
  `[bookId, chap, vStart, vEnd]`) :
  ```json
  { "3:16": [["romains",5,8],["1jean",4,9],["jean",1,14]],
    "3:17": [["jean",12,47]] }
  ```
- Logguer : nb de lignes lues, nb de codes OSIS inconnus, poids total + plus gros fichiers
  (Psaumes, Ésaïe) — à vérifier (cf. risques).

### Table `OSIS_TO_BOOKID` (dans le script)

Codes OSIS standard → `id` de `BIBLE_BOOKS`. Ordre canonique standard ci-dessous (≠ ordre BIBLE_BOOKS) :

```
Gen→genese, Exod→exode, Lev→levitique, Num→nombres, Deut→deuteronome,
Josh→josue, Judg→juges, Ruth→ruth, 1Sam→1samuel, 2Sam→2samuel,
1Kgs→1rois, 2Kgs→2rois, 1Chr→1chroniques, 2Chr→2chroniques, Ezra→esdras,
Neh→nehemie, Esth→esther, Job→job, Ps→psaumes, Prov→proverbes,
Eccl→ecclesiaste, Song→cantique, Isa→esaie, Jer→jeremie, Lam→lamentations,
Ezek→ezechiel, Dan→daniel, Hos→osee, Joel→joel, Amos→amos,
Obad→abdias, Jonah→jonas, Mic→michee, Nah→nahum, Hab→habacuc,
Zeph→sophonie, Hag→aggee, Zech→zacharie, Mal→malachie,
Matt→matthieu, Mark→marc, Luke→luc, John→jean, Acts→actes,
Rom→romains, 1Cor→1corinthiens, 2Cor→2corinthiens, Gal→galates, Eph→ephesiens,
Phil→philippiens, Col→colossiens, 1Thess→1thessaloniciens, 2Thess→2thessaloniciens,
1Tim→1timothee, 2Tim→2timothee, Titus→tite, Phlm→philemon, Heb→hebreux,
Jas→jacques, 1Pet→1pierre, 2Pet→2pierre, 1John→1jean, 2John→2jean,
3John→3jean, Jude→jude, Rev→apocalypse
```

> Vérif obligatoire : `Object.values(OSIS_TO_BOOKID)` doit couvrir exactement les 66 `id` de
> `BIBLE_BOOKS` (assertion dans le script).

---

## Étape 2 — Chargement runtime

### `lib/cross-refs.ts` (nouveau, `"use client"`)

- Types :
  ```ts
  export type CrossRef = { bookId: string; chapter: number; vStart: number; vEnd?: number };
  type BookRefMap = Record<string, [string, number, number, number?][]>; // "chap:verse" → cibles
  ```
- Cache module : `Map<bookId, BookRefMap>` + `Map<bookId, Promise>` (dédup des requêtes en vol).
- `loadBookRefs(bookId)` : `fetch('/data/cross-refs/{bookId}.json')` ; 404 → map vide cachée (livre
  sans renvois). Erreur réseau → rejet (géré par le hook).
- **Hook `useBookCrossRefs(bookId)`** : charge la map du livre courant à chaque changement de
  `bookId` ; expose `{ refsFor(chap, verse): CrossRef[], hasRefs(chap, verse): boolean, ready }`.
  Charger la map entière du livre (et non par verset) permet d'afficher l'indicateur + compteur
  **sans fetch par verset**. `refsFor` est synchrone une fois la map chargée.

### Construction des slugs d'extraits

Pour une `CrossRef`, slug `getReferences` = `"{bookId}/{chapter}/{vStart}"` ou
`"{bookId}/{chapter}/{vStart}-{vEnd}"` (sélection compatible avec `getReferences`, déjà testée).

---

## Étape 3 — UI : molécule renvois

### `components/molecules/m-cross-refs.tsx` (nouveau)

Modelée sur `m-note-editor` (modale desktop / bottom sheet mobile via `coarse`) et `m-strong-panel`.

- **Props** : `open`, `coarse`, `reference` (ex. « Jean 3:16 »), `refs: CrossRef[]`, `version`,
  `onNavigate(ref: CrossRef)`, `onClose`.
- À l'ouverture : `getReferences(version, slugs)` → extraits dans la **version active** ; états
  `loading` / `loaded` / `error`. Cibles introuvables (versification BYM) : ignorées par
  `getReferences` (déjà le cas).
- Affichage : titre « Renvois · {reference} » ; liste ordonnée (référence + extrait court tronqué) ;
  survol → fond `accent` ; clic / `Enter` → `onNavigate` (le pop **reste ouvert** pour enchaîner).
- Erreur : « Renvois indisponibles. » Tokens de couleur, focusable, `aria-label`.
- Desktop : popover ; mobile : bottom sheet (réutiliser le pattern responsive de `NoteEditor`).

### Indicateur par verset — `components/organisms/o-reader-content.tsx` (modifié)

- Nouvelles props (miroir de `hasNote`/`onOpenNote`) :
  `refsCountFor(verseNumber): number` et `onOpenRefs(verseNumber): void`.
- Dans **les deux** affichages (verset-par-verset ~l.212 et continu ~l.300), à côté du bouton note :
  bouton inline `hugeicons:link-02` + compteur, **rendu seulement si `refsCountFor(v.number) > 0`**.
  `onClick` → `e.stopPropagation(); onOpenRefs(v.number)`. `aria-label="{n} renvois"`,
  `title="{n} renvois"`.

---

## Étape 4 — Câblage lecteur

### `components/organisms/o-bible-reader.tsx` (modifié)

- `const crossRefs = useBookCrossRefs(bookId);` (chargé seulement en mode lecture mono).
- État : `const [refsTarget, setRefsTarget] = useState<{ verse:number; refs:CrossRef[] } | null>(null);`
- `openRefsForVerse(verseNumber)` : lit `crossRefs.refsFor(chapter, verseNumber)` → `setRefsTarget`.
- **`goToCrossRef(ref)`** (miroir exact de `goToBookmark`, l.345) :
  ```ts
  setBookId(ref.bookId); setChapter(ref.chapter);
  setHighlight(ref.vEnd ? `${ref.vStart}-${ref.vEnd}` : String(ref.vStart));
  setInfoOpen(false);
  router.replace(`/bym/read?livre=${ref.bookId}&chap=${ref.chapter}&v=${ref.vStart}`, { scroll:false });
  ```
  La surbrillance + le scroll passent par l'effet `highlightRef` existant (l.291).
- Garde : indicateur/popover **uniquement** si `mode === "read" && !compare`. Sinon
  `refsCountFor` renvoie 0 (pas d'indicateur) — parallèle/refs exclus.
- Passer à `<ReaderContent>` : `refsCountFor={(n) => (!compare ? crossRefs.refsFor(chapter, n).length : 0)}`
  et `onOpenRefs={openRefsForVerse}`.
- Monter `<CrossRefs … />` près des autres panneaux (après `NoteEditor`), avec `version`, `coarse`,
  `onNavigate={(ref) => { goToCrossRef(ref); if (coarse) setRefsTarget(null); }}`,
  `onClose={() => setRefsTarget(null)}`, `reference` = `${book?.name} ${chapter}:${refsTarget.verse}`.

---

## Étape 5 — Attribution licence (CC-BY)

- `lib/legal.ts` : ajouter à `CREDITS` une clé
  `crossRefs: "Renvois bibliques : openbible.info (Cross References), licence CC-BY."`.
- `app/(info)/credits/page.tsx` : nouvelle `ProseSection title="Renvois"` avec le texte + lien
  <https://www.openbible.info/labs/cross-references/> (`target="_blank" rel="noreferrer"`) et mention
  CC-BY.

---

## Étape 6 — Vérification

- [ ] `npx tsx scripts/build-cross-refs.ts` génère `public/data/cross-refs/*.json` au format §sortie ;
      assertion couverture OSIS↔66 livres OK ; poids total + gros livres logués/acceptables.
- [ ] Jean 3:16 affiche l'indicateur + compteur exact ; un verset sans renvoi n'affiche rien.
- [ ] Popover/bottom sheet liste les renvois avec extrait (version active) ; clic → navigue, surligne,
      défile ; le pop reste ouvert (desktop).
- [ ] Chargement **par livre** (un fetch par changement de livre) ; loading/error gérés ;
      indicateur masqué en vue parallèle et en mode refs.
- [ ] Attribution openbible.info visible sur `/credits`.
- [ ] `tsc --noEmit` + `pnpm build` OK ; non-régression lecture / Strong / signets / notes.
- [ ] Déploiement `vercel --prod` **depuis la racine du projet**, vérif sur `reader.shemaproject.org`.

## Risques / points ouverts

- **Poids** `public/data/cross-refs/` (Psaumes, Ésaïe) : à mesurer après génération ; le lazy par
  livre rend le coût acceptable, mais vérifier le gzip des gros fichiers.
- **Plafond N=12** : ajustable au build (compromis pertinence/volume).
- **Versification BYM** divergente (rare) : cible absente → ignorée silencieusement par `getReferences`.
- **Sources en plage** dupliquées sur chaque verset : peut gonfler quelques versets ; le plafond N
  limite l'effet.

---

# Spec 18 — Doodles v2 (interaction redessinée)

> Statut : **À implémenter quand tokens disponibles** (consigné 2026-07-25). Référence :
> [`specs/18-doodles.md`](specs/18-doodles.md) §4.6. Le scaffolding Rive v1 est livré (démo
> désactivée) ; cette section planifie l'évolution de l'interaction, sans toucher au code pour
> l'instant.

## Contexte

La v1 (clic doodle → carte d'explication) occupe le clic, empêchant d'animer le doodle au clic.
La v2 **libère le clic pour l'animation** et déplace l'explication vers une **icône d'info** au
survol (desktop) / toujours visible (mobile), qui ouvre un **dropdown**. Le dropdown porte aussi
un **bouton « Accueil »** (icône + libellé au survol, pattern prev/next de `m-book-chapter-selector`)
qui remplace l'ancien « clic doodle → /accueil ». Animation de clic et suivi de souris sont
**optionnels par doodle** (déclarés dans `animate`) — principe « automatiquement opérationnel si
le doodle le possède ».

## Décisions (tranchées)

- **Clic doodle** → animation de clic (SMI booléen `clickState` press/release, OU trigger
  `clickTrigger`). Aucun dropdown, aucune navigation.
- **Info** → icône `hugeicons:information-circle` en surimpression, fondu au survol (desktop),
  toujours visible (mobile/coarse). Son clic ouvre le dropdown.
- **Dropdown** ancré `top-full left-0` + clamp (même garde que `m-version-picker`, fix 894baeb).
- **Bouton « Accueil »** du dropdown : icône `home-01` + libellé « Accueil » déployé au survol
  (`max-w-0 … opacity-0 … group-hover:max-w-[64px] group-hover:opacity-100`, copié de
  `m-book-chapter-selector`). Clic → `/accueil`.
- **Suivi de souris** : inputs SMI nombre `trackMouse.pointerX/Y` nourris au `pointermove`
  (position relative au canvas). Inactif si non déclaré, figé si `prefers-reduced-motion`.
- **Focus mode** : pas d'icône d'info, pas de dropdown, pas d'animation de clic (doodle décoratif).

## Périmètre (v2)

- **Inclus** : icône d'info + dropdown (titre, description, `verses[]`, `source?`, bouton home),
  animation de clic, suivi de souris — tous pilotés par les données du doodle.
- **Exclu** : mini-jeux interactifs, perso utilisateur (on/off doodles — reste ouvert §8).

## Étapes d'implémentation

### Étape 1 — Modèle de données (`lib/doodles.ts`)

Étendre les types (sans casser les entrées existantes) :

```ts
export interface DoodleAnimation {
  file: string;
  stateMachine?: string;
  hoverState?: string;
  clickState?: string;                          // input booléen SMI (press/release)
  clickTrigger?: string;                        // trigger SMI (alternative)
  trackMouse?: { pointerX: string; pointerY: string }; // inputs nombre SMI
}

export interface DoodleRelatedVerse {
  ref: DoodleVerseRef;   // { bookId, chapter, v? }
  label?: string;        // ex. « Exode 12:1-14 » (calculé si absent)
}

export interface Doodle {
  // … existant …
  verses?: DoodleRelatedVerse[];     // liste multi-versets (dropdown v2)
  source?: { label: string; url: string }; // lien externe facultatif
  animate?: DoodleAnimation;        // + champs v2
}
```

Repli : si `verses` absent mais `verseRef` présent → `verses = [{ ref: verseRef }]` (back-compat v1).
Aucune entrée existante n'est cassée.

### Étape 2 — Renderer (`m-doodle-renderer.tsx`)

- Exposer les inputs SMI via `useRive`/`stateMachineInputs` (cf. API `@rive-app/react-canvas`).
- **Clic** : `onClick` → si `clickTrigger`, `fire(trigger)` ; si `clickState`, passer le booléen à
  `true` au `pointerdown`, `false` au `pointerup`/`pointerleave`. Rien si aucun des deux.
- **Suivi de souris** : si `trackMouse`, écouter `pointermove` sur le canvas, convertir
  `event.clientX/Y` en coordonnées relatives au canvas (`getBoundingClientRect`), alimenter
  `inputs[pointerX]/[pointerY]`. Désactiver l'écouteur si `prefers-reduced-motion`.
- Respecter le `hoverState` existant + thème runtime + repli `failed` déjà en place.

### Étape 3 — Icône d'info + dropdown (`a-logo.tsx`, `o-reader-topbar.tsx`, `o-home.tsx`)

- `a-logo.tsx` : quand `doodle` présent, ne plus rendre un `<a href="/accueil">` mais un conteneur
  (bouton) dont `onClick` → `onDoodleClick` (→ renderer animation). L'icône d'info et le dropdown
  sont rendus par le parent (topbar/home), en overlay positionné sur le conteneur doodle.
- Topbar/home : rendent l'icône d'info (survol desktop / toujours coarse), gèrent `infoOpen` +
  `<DoodleCard>` (renommé dropdown) au clic de l'icône. Fermeture Échap / clic extérieur (déjà géré
  par `logoWrapRef`).
- Le bouton logo « normal » (sans doodle) conserve son lien `/accueil`.

### Étape 4 — Dropdown v2 (`m-doodle-card.tsx`)

Rendre (sections conditionnelles aux données) :
1. En-tête : bouton « Accueil » (icône `home-01` + libellé « Accueil » au survol, pattern
   prev/next) à gauche, bouton ✕ à droite.
2. Titre (`doodle.label`).
3. Description (`doodle.description`) si présente.
4. « Versets liés » : `doodle.verses.map(v => <a href="/read?livre=&chap=&v=">)` si non vide.
5. « En savoir plus → » (`doodle.source`, `target="_blank"`) si présent.

Ancrage `top-full left-0` + `max-w-[calc(100vw-1rem)]` clamp (déjà en place v1).

### Étape 5 — Vérification

- [ ] Doodle sans `clickState`/`clickTrigger` → clic inerte ; avec → animation au clic.
- [ ] Icône d'info : fondu au survol desktop, toujours visible mobile.
- [ ] Dropdown : titre + sections conditionnelles (description / versets / source) ; bouton
      « Accueil » (libellé au survol) → `/accueil` ; Échap / clic extérieur ferment.
- [ ] `trackMouse` : le doodle suit le curseur ; inactif si non déclaré ou reduced-motion.
- [ ] Mode focus : pas d'icône, pas de dropdown, pas d'anim clic.
- [ ] `tsc --noEmit` + `pnpm build` OK ; non-régression logo normal (sans doodle) + focus.
- [ ] Déploiement `vercel --prod` ; vérif sur `reader.shemaproject.org` avec une occasion couvrant
      le jour de test (réactiver `demo` ou un `range` temporaire, remettre une plage passée avant
      commit).

## Risques / points ouverts (v2)

- **Authoring Rive** : animation de clic et suivi de souris exigent une state machine Rive bien
  déclarée (inputs booléen/trigger/nombre nommés). Compétence éditeur `rive.app` — curateur ?
- **Mobile + suivi souris** : pas de `pointermove` hors tap → suivi inactif sur coarse (accepté).
- **Accessibilité** : le clic doodle n'a pas de cible sémantique (animation pure) → `aria-label`
  neutre (« {label} »), l'info étant portée par l'icône dédiée (focusable).
- **Réactivation démo** : pour tester, rebasculer l'occasion `demo` sur aujourd'hui (ou un `range`
  temporaire), puis remettre une plage passée avant de committer.
