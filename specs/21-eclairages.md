# Spec 21 — Éclairages (compléments contextuels au verset)

> **Statut** : Proposé · **Priorité** : Moyenne · **Effort** : M (technique) — le vrai chantier est
> **éditorial** (hors code) · **Dépendances** : **Doctrine spec 00** (gamification transverse — pas
> de score, pas de mesure, pas de push) · réutilise le motif du panneau Strong (spec 02) et, en
> option, le renderer Rive de la spec 18 pour une illustration · **Aucune API** (contenu statique).

## 1. Objectif

Offrir, **là où le lecteur médite déjà un verset**, un court complément d'information sourcé qui
approfondit sa lecture : un jeu de mots perdu en traduction, un arrière-plan culturel, une structure
littéraire (chiasme, inclusion), un écho intertextuel, une donnée géographique, un écho messianique.
L'éclairage **ne se cherche pas** — il se présente, sans tapage, quand l'attention du lecteur est déjà
sur le verset. Objectif produit : encourager à lire davantage par **la valeur du contenu**, non par
une métrique. **Pas de score, pas de compteur, pas de collection, pas de stats** (doctrine spec 00 +
décision produit explicite).

## 2. Valeur utilisateur

- **Profondeur** : la Bible porte une distance culturelle (proche-Orient ancien, monde gréco-romain),
  des jeux de mots invisibles en traduction, des structures littéraires et un réseau d'intertextes.
  Un éclairage donne ce qu'aucune traduction ne peut donner — c'est l'extension naturelle du panneau
  Strong (profondeur lexicale) vers le contexte, la structure et la théologie.
- **Récompense de la présence, pas de la performance** : le contenu vient à celui qui est **déjà là**,
  sur le verset qu'il médite. Il ne flatter pas le lecteur, ne le chasse pas, ne lui signale jamais
  ce qu'il n'a pas vu. C'est un **cadeau contextuel**, pas un trophée.
- **Compagnon d'étude sobre** : un tiers-temps de lecture, opt-in, refermable, qui ne perturbe pas la
  lecture suivie.
- **Coût serveur nul** : contenu statique versionné dans le dépôt, servi au build, 100 % client.

## 3. Périmètre

- **Inclus** :
  - **Registre éditorial** d'éclairages indexé par verset (`lib/eclairages.ts`) : une entrée par
    verset (ou passage) ciblé, avec catégorie, titre, corps court, sources, liens optionnels.
  - **6 catégories** (§4.2) : Mots · Contexte · Structure · Intertexte · Géographie · Écho messianique.
  - **Signal subtil au verset** + **ouverture à la demande** (§4.1) : l'éclairage ne s'ouvre jamais
    tout seul ; le lecteur clique (pull, pas push — doctrine 00 §4.1).
  - **Carte de présentation** (popover léger, §5.2) — réutiliser le motif popover existant.
  - **Toggle on/off** dans les réglages de lecture (§4.5) — mode non-suivi pleinement béni
    (doctrine 00 §4.5).
  - **Persistance « déjà lu »** optionnelle (clé `localStorage`), **off par défaut en v1** (§4.3).
- **Exclu** (pour cette itération) :
  - Score, compteur, collection, badges, statistiques, envoi de données — **rejeté** (doctrine 00 +
    décision produit). Aucun « X/Y éclairages trouvés », aucun carnet d'accumulation.
  - Notification, relance, popup automatique au chargement — **rejeté** (pull, pas push).
  - Couverture exhaustive (tout le canon) — v1 pilote **un livre** (§8, à compléter).
  - Éclairages générés par IA sans relecture humaine — le contenu est éditorial, versionné, relu.
  - Illustration Rive systématique — **optionnelle** (réutilise spec 18 si l'auteur fournit un `.riv`).

## 4. Spécification fonctionnelle

### 4.1 Déclencheur & visibilité

L'éclairage est **pull** : il ne vient jamais trouver le lecteur, il se laisse ouvrir quand le lecteur
est déjà sur le verset. Deux affordances complémentaires (curseur à trancher en §5.1 / §8) :

1. **Marqueur distinctif au verset** — une petite icône `hugeicons:fan-02` (éventail liturgique :
   souffle, louange, ornement — **pas** `laurel-wreath-*`, qui est un trophée et contredirait la
   doctrine 00 « carte pas trophée ») posée en marge du verset. Le marqueur **décrit qu'il y a de la
   profondeur ici** sans inviter à tout collecter. Deux états visuels sobres (§5.3) :
   - **Repos** : icône statique, estompée (`text-muted-foreground/40`), visible au survol (desktop)
     ou à la sélection (mobile) — jamais en mouvement permanent, pour ne pas concurrencer le texte
     (doctrine 00 « la Parole d'abord »).
   - **Ouverture** : un **geste unique** d'ouverture de l'éventail (~90°, ~300 ms, puis se fige) au
     clic / à l'ouverture de la carte — geste d'offrande, **une seule fois**, sans rebouclage.
     **Pas de vague multicolore** : au plus un **voile de teinte unique** (l'accent du lecteur) en
     fondu sur le verset pendant ~400 ms puis effacé. **Pas de rotation infinie** : le mouvement
     perpétuel ancré au verset siphonnerait l'attention du texte (doctrine 00 « la Parole d'abord » +
     « grâce non instrumentée »). Repli `prefers-reduced-motion` : l'icône apparaît sans transition.
2. **Entrée « Éclairage » dans les actions du verset** (`m-verse-actions.tsx`) — quand le lecteur
   **sélectionne** un verset qui a un éclairage, une entrée sobre apparaît à côté de Strong /
   concordance / signet. C'est le proxy le plus fidèle de « je médite ce verset ».

Aucun popup automatique. L'ouverture résulte toujours d'un geste du lecteur. Si le toggle global est
désactivé (§4.5) : aucun marqueur, aucune entrée, comme si le verset n'avait pas d'éclairage.

### 4.2 L'éclairage (modèle de contenu)

Un **éclairage** = un ancrage (verset ou passage) + une catégorie + un titre + un corps court +
des sources + des liens optionnels + une illustration Rive optionnelle.

```ts
type EclairageCategory =
  | "mots"        // nuance hébreu/grec, jeu de mot (pont vers Strong)
  | "contexte"    // arrière-plan historique / culturel
  | "structure"   // chiasme, inclusion, répétition, jeu littéraire
  | "intertexte"  // écho d'un autre passage, accomplissement
  | "geographie"  // lieu, avec lien carte éventuel
  | "messianique"; // écho Yéhoshoua (cohérent « Bible de Yéhoshoua Ha Mashiah »)

type EclairageLink =
  | { kind: "verse"; bookId: string; chapter: number; v: string }   // verset d'appui → /read?…
  | { kind: "strong"; code: string };                                // token Strong → concordance

type Eclairage = {
  id: string;                  // ex. "jean:1:1-logos"
  bookId: string;              // ex. "jean"
  chapter: number;             // ex. 1
  verse: string;               // ex. "1" ou "3-5" (range)
  category: EclairageCategory;
  title: string;               // ex. "Le Logos, avant le commencement"
  body: string;                // court (~1 min de lecture) — markdown léger autorisé
  sources: string[];           // ex. ["Lexique BDB", "Commentaire X, p. 12"] — systématique
  links?: EclairageLink[];     // verset d'appui / token Strong (optionnel)
  animate?: DoodleAnimation;   // illustration Rive optionnelle (cf. spec 18 §4.4)
};
```

> `DoodleAnimation` repris de `lib/doodles.ts` (spec 18) — pas de redéfinition. L'illustration est
**optionnelle** : un éclairage sans `animate` s'affiche sans illustration (v1 peut sortir texte seul).

**Charte éditoriale** (à compléter avec l'auteur — cf. §8) :
- **Ton** : révérent, jamais joueur ; compagnon d'étude, pas divertissement.
- **Longueur** : court (une minute de lecture, ~80–150 mots) ; on approfondit, on ne rédige pas un
  article. Si le sujet exige plus, le scinder en deux éclairages ou renvoyer vers une source.
- **Sourçage systématique** : chaque éclairage cite au moins une source (référence biblique interne,
  lexique, commentaire, ou note d'auteur). Pas d'affirmation gratuite.
- **Périmètre in** : sens, nuance lexicale, contexte, structure, intertexte, accomplissement.
- **Périmètre out** : spéculations présentées comme certaines, doctrines controversées tranchées
  unilatéralement, polémique, actualisation politique.
- **Langue** : français, registre accessible (pas de jargon académique non expliqué).

### 4.3 Déroulé & persistance

1. Le lecteur clique le marqueur (ou l'entrée « Éclairage » des actions du verset) → la carte
   s'ouvre (état `eclairageOpen` piloté par le lecteur).
2. La carte affiche : catégorie (icône + label) · ancrage (référence) · titre · corps · sources ·
   liens optionnels (« Voir le verset → », « Concordance → »). **Aucun feedback**, **aucune
   validation** : c'est un contenu à lire, pas un quiz.
3. Fermeture : ✕, Échap, clic extérieur, ou navigation (changement de verset/chapitre).
4. **Persistance « déjà lu »** : clé `localStorage` `bym:eclairages-seen` = `{ [id]: true }`,
   marquée à l'ouverture. **Off par défaut en v1** (le marqueur reste, re-ouvrable) — sert
   uniquement (option, §8) à estomper le marqueur sur les éclairages déjà lus. **Aucun compteur
   dérivé** : la clé est un drapeau par id, jamais agrégée en un chiffre (doctrine 00 §2).

### 4.4 Cas limites

- Verset sans éclairage → aucun marqueur, aucune entrée ; rien ne se passe.
- Plusieurs éclairages sur le même verset (future v2) → v1 n'en garde qu'un (`getEclairage`
  retourne le premier déclaré) ; un compteur « +N » sur le marqueur est **exclu** (agrégat flattable
  — doctrine 00 §2 corollaire 1).
- Éclairage avec illustration Rive mais `.riv` manquant / en erreur → repli silencieux sans
  illustration (le texte reste lisible). Reuse du repli `failed` du renderer doodle (spec 18 §4.5).
- `prefers-reduced-motion: reduce` → illustration figée sur l'état initial (cf. spec 18) **et**
  aucun geste d'ouverture / voile au marqueur (§5.3) : l'icône apparaît statique.
- **Mode focus (spec 17)** → le marqueur et l'entrée disparaissent (lecture immersive ; l'éclairage
  est opt-in, on le coupe avec le reste du superflu). À valider au test.
- Lien verset d'appui → navigation `/read?…` (ferme la carte).
- Lien Strong → ouvre la concordance existante (spec 02) — pas de fetch supplémentaire.

### 4.5 Activation / désactivation

- Un **toggle « Éclairages »** dans les **réglages de lecture** (`m-reading-settings.tsx`, même
  pattern que « Mode focus » / « Quiz » spec 19 : Row + pastille on/off) active ou désactive la
  fonctionnalité **globalement**. Désactivé → aucun marqueur, aucune entrée, aucune carte, comme si
  aucun verset n'avait d'éclairage.
- **Défaut : activé** (les éclairages sont visibles par défaut sur les versets ciblés). Le lecteur
  peut couper s'il trouve ça distrayant. À confirmer au test (§8).
- Persistance : clé `localStorage` `bym:eclairages-enabled` (`"1"` / `"0"`), via `reader-preferences`
  (pattern existant `try/catch + hydrated`).
- Indépendant de `bym:eclairages-seen` : désactiver n'efface pas les drapeaux « déjà lu » ;
  réactiver retrouve l'état antérieur.

## 5. UI / UX

### 5.1 Emplacement & déclencheurs

- **Marqueur au verset** (`o-reader-content.tsx`) — posé en marge droite du verset (aligné sur le
  numéro de verset), icône `hugeicons:fan-02`, taille ~14 px, couleur `text-muted-foreground/40` au
  repos, `text-primary` au survol/sélection. N'apparaît qu'au survol (desktop) ou à la sélection
  (mobile/tap) — **jamais en permanence**, jamais en rotation continue. `title` + `aria-label`
  « Éclairage sur {livre} {chap}:{v} ». Clic → ouvre la carte (et déclenche le geste unique
  d'ouverture de l'éventail, §4.1 / §5.3).
- **Entrée « Éclairage » dans les actions du verset** (`m-verse-actions.tsx`) — apparaît dans le
  cluster d'actions **uniquement si** le verset sélectionné a un éclairage. Icône de catégorie +
  libellé « Éclairage ». Cohérent avec Strong / concordance / signet déjà présents.
- **Carte** — popover léger ancré près du marqueur / du verset (cf. §5.2). Alternative : tiroir
  droit (pattern panneau Strong) si le contenu s'avère régulièrement long. **À trancher au test**
  (§8). Recommandation v1 : **popover** (un éclairage est court par charte).
- Aucun accueil à l'ouverture de l'app (doctrine 00 §4.6 — « la Parole accueille ; le chiffre
  attend »). L'éclairage vit dans le texte, pas en page d'accueil.

### 5.2 Disposition (wireframe) — popover

```
        ┌──────────────────────────────────────┐
        │ 💡 Mots · Jean 1:1            [✕]     │
        │                                      │
        │ Le Logos, avant le commencement      │
        │                                      │
        │ Au commencement était la Parole…     │
        │ « Parole » traduit le grec Logos,     │
        │ terme déjà chargé dans la pensée      │
        │ grecque et juive (Philon, Targoums).  │
        │ Jean ancre le Christ dans une         │
        │ éternité antérieure à la Genèse.      │
        │                                      │
        │ Source : Lexique BDB · Commentaire X │
        │ Concordance (G3056) →   Voir Proverbes 8 → │
        └──────────────────────────────────────┘
```

### 5.3 États & interactions

- **Repos** : marqueur visible uniquement au survol/sélection du verset (si éclairage présent **et**
  toggle activé), icône estompée, statique. Aucun signal par défaut, **aucun mouvement perpétuel**.
- **Ouvert** : un geste unique d'ouverture de l'éventail (~90°, ~300 ms, une fois, figé à l'ouverture)
  + un voile de teinte unique (l'accent du lecteur) en fondu sur le verset ~400 ms puis effacé ;
  ensuite la carte popover affiche le contenu. Échap / ✕ / clic extérieur / navigation ferment.
  **Aucune vague multicolore, aucune rotation infinie** (doctrine 00 « la Parole d'abord » +
  « décrit, ne célèbre pas ») ; le geste signifie *l'éventail qui s'ouvre = la Parole qui se donne*,
  pas une récompense.
- **Après lecture** (option, `bym:eclairages-seen`, off par défaut en v1) : le marqueur passe
  d'estompé à **« posé »** (`text-primary/60`, statique) — trace retenue, re-ouvrable, **pas un
  compteur ni une collection** (doctrine 00 « carte pas trophée »).
- **Désactivé** (toggle off) : aucun marqueur, aucune entrée — rien.
- **`prefers-reduced-motion`** : ni geste d'ouverture, ni voile ; l'icône apparaît statique et la
  carte s'ouvre sans animation d'entrée (ou quasi-instant via la classe `reduce-motion`).
- **Mode focus** : marqueur et entrée masqués (§4.4).

### 5.4 Responsive

- Mobile (< md) : marqueur à la sélection (pas de survol) ; carte en **bottom sheet** (pattern
  `m-note-editor` / `m-cross-refs`) ou popover ancré si court.
- Desktop (≥ md) : marqueur au survol ; **popover** ancré près du verset, `max-w-sm`.

### 5.5 Thème clair/sombre & accessibilité

- **Thème** : carte sur `bg-popover` / `border-input` (cohérent avec les popovers existants).
  Illustration Rive : thème runtime (spec 18 §4.4 — un seul `.riv`, bascule `.dark`).
- **Accessibilité** :
  - Marqueur = vrai `<button>` avec `aria-label` ; la carte est `role="dialog"` + `aria-label`.
  - `aria-live="polite"` non requis (pas de changement dynamique de contenu).
  - Focus piégé tant qu'ouvert (pattern existant) ; Échap ferme.
  - Le corps en markdown léger rendu en HTML sémantique (paragraphes, emphase).
- `prefers-reduced-motion` : illustration figée (spec 18), pas de geste d'ouverture de l'éventail
  ni de voile au marqueur (§5.3), pas d'animation d'entrée de la carte (ou `animate-fade-in-up`
  réduit à quasi-instant via la classe `reduce-motion` existante).

### 5.6 Micro-copy (FR)

- Marqueur / entrée : « Éclairage » (`title` « Éclairage sur {livre} {chap}:{v} »).
- En-tête carte : « {icône catégorie} {Catégorie} · {livre} {chap}:{v} ».
- Liens : « Concordance → » (si lien Strong), « Voir le verset → » (si lien verset, + réf en gris).
- Toggle réglages : « Éclairages » (pastille on/off).

## 6. Spécification technique

### 6.1 Fichiers (nouveaux / modifiés)

**Nouveaux**
- `lib/eclairages.ts` — registre éditorial + types + `getEclairage(bookId, chapter, verse):
  Eclairage | null` (et `hasEclairage(…)` pour décider du marqueur sans charger le corps — utile si
  on scinde « index » et « contenu » en v2). Types : `EclairageCategory`, `EclairageLink`,
  `Eclairage` (§4.2). Réutilise `DoodleAnimation` de `lib/doodles`.
- `components/molecules/m-eclairage-card.tsx` — carte popover (catégorie, ancrage, titre, corps
  markdown léger, sources, liens, illustration Rive optionnelle via le renderer doodle en
  `dynamic`).
- `lib/use-eclairages-seen.ts` — hook `useEclairagesSeen()`: hydratation de `bym:eclairages-seen`
  (pattern `try/catch + hydrated`) + `isSeen(id)` + `markSeen(id)`. Optionnel en v1 (§4.3).

**Modifiés**
- `components/organisms/o-reader-content.tsx` — rend le marqueur sur les versets qui ont un
  éclairage (si toggle activé) ; ouvre la carte au clic. Pas de marqueur en mode focus.
- `components/organisms/o-bible-reader.tsx` — état `eclairageOpen` + `activeEclairage` ; rend
  `<EclairageCard>` ; ferme au changement de chapitre. Ne rend rien si toggle désactivé.
- `components/molecules/m-verse-actions.tsx` — entrée « Éclairage » dans le cluster quand le verset
  sélectionné a un éclairage (relais `onOpenEclairage`).
- `lib/reader-preferences.ts` — ajoute `eclairagesEnabled` (booléen, défaut `true`) + clé
  `bym:eclairages-enabled`. `useReaderPreferences` expose `eclairagesEnabled` / `setEclairagesEnabled`.
- `components/molecules/m-reading-settings.tsx` — Row « Éclairages » + pastille on/off (même
  pattern que « Mode focus » / « Quiz »).
- Assets (éditorial, optionnel) : `public/eclairages/<id>.riv` (illustration, thème runtime).

### 6.2 Données & persistance

- **Registre** : `lib/eclairages.ts`, source éditoriale versionnée (comme `lib/doodles.ts` /
  `lib/quiz.ts`). Aucun endpoint. Une entrée par verset/passage ciblé.
- **Authoring** (à compléter — §8) : deux options.
  1. **Registre TS** (cohérent `lib/quiz.ts`) — simple, typé, mais demande à l'auteur d'éditer du
     `.ts` (peu ergonomique pour un non-dev).
  2. **Markdown + frontmatter** par éclairage (`content/eclairages/<book>/<id>.md`), compilé au
     build en registre — ergonomie d'écriture pour l'auteur, au coût d'un petit script de build.
  Recommandation : **markdown + frontmatter** pour l'auteur, compilé en `lib/eclairages.ts` (ou un
  JSON importé) au build. **Ouvert** — à trancher selon le profil de l'auteur.
- **Activation** : `bym:eclairages-enabled` (`"1"`/`"0"`, défaut activé) via `reader-preferences`.
- **Persistance « lu »** : clé `bym:eclairages-seen` = `{ [id]: true }`, jamais agrégée en chiffre.
- **Pas de score / pas de stats** : aucun compteur, aucune agrégation, aucun envoi. Conforme spec 00
  et à la décision produit (pas d'instrumentation de la feature).

### 6.3 API / contraintes

- **Aucune API** : contenu statique. Le lien verset d'appui utilise la route `/read?…` existante ;
  le lien Strong ouvre la concordance existante (spec 02). Aucun fetch supplémentaire.
- **Dépendances** : `@rive-app/react-canvas` déjà présente (spec 18) pour l'illustration
  **optionnelle**. Réutilise le renderer doodle en `dynamic({ ssr:false })` — pas de coût bundle si
  aucun éclairage n'a d'illustration.
- **SSR** : `getEclairage` / `hasEclairage` sont pures (pas de `Date`, pas d'effet) → peuvent
  s'appeler côté serveur pour décider de rendre le marqueur (pas de flash, pas de mismatch). Le
  marqueur n'a pas de géométrie qui saute ; l'illustration Rive reste client-only (canvas).

## 7. Conformité doctrine 00 (tests décidables)

La feature **passe** la checklist de la doctrine :

- [x] **Carte, pas trophée** : aucun chiffre global ; l'éclairage est du contenu, pas une mesure. Pas
      de « X/Y trouvés ».
- [x] **Avant, pas arrière** : l'éclairage ouvre sur le verset présent, pas sur un butin accumulé.
- [x] **Décrit, ne célèbre pas** : aucun point, fanfare, badge ; ouvrir un éclairage ne « paie » rien.
- [x] **Territoire, pas calendrier** : ancré dans le texte, jamais contre une horloge.
- [x] **Porte, pas chambre** : on ne score **aucun** acte intérieur (méditation). L'éclairage est un
      contenu offert, pas une mesure de la méditation. Le drapeau « déjà lu » est un repère, pas une
      note.
- [x] **Pull, pas push** : aucun popup auto, aucune notification, aucun signalement d'absence.
- [x] **Additif seulement** : pas de représentation de l'absence (pas de « versets sans éclairage »
      affichés, pas de cases vides).
- [x] **Grâce non instrumentée** : **pas de stats** (décision produit) — rien n'est branché sur une
      métrique de rétention ; pas d'A/B test.
- [x] **Test des 30 jours** : un absent de 30 jours rouvre l'app sans aucune appréhension — la
      feature ne laisse aucun résidu culpabilisant.
- [x] **Mode non-suivi** : toggle on/off, désactivation totale présentée comme un choix béni.
- [x] **La Parole d'abord** : aucun éclairage à l'accueil ; le texte accueille, l'éclairage vit dans
      le texte.

**Test synthétique** : *« Si je retirais le score, les gens le feraient-ils quand même ? »* → Oui :
la valeur est le contenu (profondeur), pas une récompense. → Pas de score, une **invitation**. ✅

## 8. Critères d'acceptation

- [ ] Verset sans éclairage → aucun marqueur, aucune entrée d'action, rien ne s'affiche.
- [ ] Verset avec éclairage **et** toggle activé → marqueur au survol/sélection ; clic ouvre la carte.
- [ ] Entrée « Éclairage » dans le cluster d'actions du verset sélectionné (si éclairage présent).
- [ ] Toggle « Éclairages » désactivé → aucun marqueur nulle part (même sur un verset avec éclairage).
- [ ] Toggle persisté (`bym:eclairages-enabled`) ; défaut activé.
- [ ] Carte : catégorie (icône + label) · référence · titre · corps · sources · liens optionnels.
- [ ] Lien verset → navigation `/read?…` (ferme la carte) ; lien Strong → concordance existante.
- [ ] Illustration Rive (si `animate`) s'affiche ; `.riv` manquant → repli sans illustration.
- [ ] `prefers-reduced-motion` → illustration figée.
- [ ] Fermeture : ✕ / Échap / clic extérieur / changement de verset ou chapitre.
- [ ] Mode focus → marqueur et entrée masqués.
- [ ] **Aucun score, aucun compteur, aucune stat, aucun envoi** (conforme spec 00 + décision produit).
- [ ] Responsive : popover desktop / bottom sheet mobile (pattern `m-note-editor`).
- [ ] `tsc --noEmit` + `next build` OK ; non-régression lecture / panneaux existants.

## 9. Risques & questions ouvertes

- **Livre pilote** — **à compléter** : sur quel livre démarrer (un évangile vu l'axe « Yéhoshoua Ha
  Mashiah » ? Jean ? Psaumes ?). Cible raisonnable : ~30–50 éclairages sur un livre, étendu au fil
  du temps. **Ouvert**.
- **Auteur & ton de référence** — **à compléter** : auteur identifié mais **pas encore de modèle**
  (commentaire français de référence ? rédaction originale ?). La charte (§4.2) est à valider avec
  lui. **Ouvert**.
- **Curseur déclencheur** — marqueur distinctif au verset (signale la profondeur) **et/ou** entrée
  à la sélection stricte (zéro marqueur, le plus pur). Recommandation : **les deux** (marqueur
  discret + entrée d'action). À trancher au test. **Ouvert**.
- **Élément distinctif du verset porteur** — **décidé** : icône `hugeicons:fan-02` (éventail, pas
  laurier-trophée), marqueur statique estompé au repos, **geste unique d'ouverture** (rotation ~90°
  une fois, puis figé) + **voile de teinte unique** (accent du lecteur, ~400 ms) à l'ouverture ;
  **pas de vague multicolore, pas de rotation infinie** (conforme doctrine 00). Repli
  `prefers-reduced-motion` sans geste. État « déjà lu » = icône « posée » statique (option, off en
  v1). Détails §4.1 / §5.3.
- **Surface de la carte** — popover (recommandé, contenu court par charte) vs tiroir droit (pattern
  Strong) si le contenu s'avère régulièrement long. **Ouvert**.
- **Format d'authoring** — registre TS (simple) vs markdown + frontmatter compilé (ergonomique pour
  un auteur non-dev). Recommandation : markdown. **Ouvert**.
- **Défaut du toggle** — activé (recommandé) ; à inverser si l'effet s'avère trop intrusif à l'usage.
- **Marqueur estompé après « lu »** — off par défaut en v1 (re-ouvrable). Activer l'estompage via
  `bym:eclairages-seen` si la relecture s'avère charger la colonne. **Ouvert**.
- **Éclairages en mode focus** — masqués (recommandé, sobre). À valider au test.
- **Illustration Rive** — optionnelle ; compétence éditeur `rive.app` (cf. spec 18). v1 peut sortir
  sans aucune illustration (texte seul) et ajouter les `.riv` plus tard.
- **Contenu doctrinal** — relecture éditoriale indispensable avant publication (justesse biblique,
  sourçage, ton). La valeur de la feature dépend entièrement de la qualité du contenu.
- **Mesure d'effet sans stats** — validation uniquement **qualitative** (retours de lecteurs de
  confiance, jugement de l'équipe). L'effet sur la lecture se constatera dans l'usage réel au fil du
  temps. **Assumé** (décision produit).