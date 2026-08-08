# Spec 19 — Quiz « fun » de chapitre

> **Statut** : Proposé · **Priorité** : Basse · **Effort** : M · **Dépendances** :
> `@rive-app/react-canvas` (optionnel, pour l'illustration animée — réutilise le renderer de la
> spec 18) · **Doctrine** : spec 00 (gamification transverse — **pas de score**).

## 1. Objectif

Piquer la curiosité du lecteur au fil de certains chapitres : un **encart quiz** pose une question
éditoriale liée au chapitre en cours (ex. Genèse 2 → « C'était quoi le fruit défendu ? »). But
purement ludique et pédagogique : faire réfléchir, casser la lecture passive, susciter le
partage/la mémorisation. **Pas de score** (doctrine spec 00 — on rejette les métriques et la vanity).

## 2. Valeur utilisateur

- **Fun & engagement** : une micro-cassure ludique dans la lecture, type « saviez-vous que ».
- **Pédagogie** : les questions ciblent des malentendus communs (la « pomme », la « relation avec
  le serpent ») → la bonne réponse (« la désobéissance ») corrige une idée reçue, avec une courte
  explication + verset d'appui.
- **Ancrage** : renforce la mémorisation du chapitre (le quiz se lit juste après).
- **Coût nul côté serveur** : tout est statique (table éditoriale locale, illustrations `.riv`
  optionnelles).

## 3. Périmètre

- **Inclus** :
  - Table éditoriale de questions (`lib/quiz.ts`) : une question par chapitre ciblé
    (`bookId` + `chapter`), avec énoncé, choix multiples, bonne réponse, explication courte,
    verset d'appui, illustration Rive **optionnelle**.
  - Déclencheur **opt-in** : un bouton « Quiz » n'apparaît que sur les chapitres qui ont une
    question (cf. §4.1). Clic → encart (modal desktop / bottom sheet mobile).
  - Feedback immédiat sans score : choix → « Correct ✅ » / « Pas tout à fait » + explication +
    verset d'appui (lien → lecture en contexte). Aucun point, aucun décompte, aucune série.
  - Persistance « déjà vu » (clé `localStorage`) — option de ne pas re-proposer (cf. §4.3).
- **Exclu** (pour cette itération) :
  - Score, classement, séries, badges, statistiques — **rejeté** (doctrine spec 00).
  - Quiz générés automatiquement / par IA — le contenu est éditorial, versionné en code.
  - Quiz après **chaque** chapitre — uniquement les chapitres éditorialement choisis.
  - Multi-question par chapitre (une seule question par chapitre en v1).
  - Mode compétition / partage du score — pas de score, donc rien à partager.

## 4. Spécification fonctionnelle

### 4.1 Déclencheur & visibilité

- Le bouton « Quiz » s'affiche **uniquement** si (a) le chapitre courant a une question dans
  `lib/quiz.ts` (`getQuiz(bookId, chapter)` non nul) **et** (b) le quiz est **activé** par le
  lecteur (toggle « Quiz » des réglages de lecture, cf. §4.5 — défaut **activé**). Sinon : rien,
  aucune trace, aucun bouton.
- Emplacement du bouton : voir §5.1. Il est discret (n'interrompt pas la lecture).
- **Opt-in à l'usage** : aucun popup automatique au chargement. C'est au lecteur de cliquer —
  cohérent avec un lecteur calme (doctrine spec 00 / esprit spec 16 « accueil à la demande »).
  Le toggle global (§4.5) permet en outre de désactiver entièrement la fonctionnalité.

### 4.2 Question

Une **question** = un énoncé + 2 à 4 choix + une **bonne réponse** + une **explication** + un
**verset d'appui** (référence à lire en contexte) + une **illustration** Rive optionnelle.

```ts
type QuizChoice = { id: string; text: string };
type Quiz = {
  id: string;                 // ex. "genese:2"
  bookId: string;             // ex. "genese"
  chapter: number;            // ex. 2
  prompt: string;            // ex. "C'était quoi le fruit défendu ?"
  choices: QuizChoice[];       // 2 à 4
  answer: string;             // id du bon choix
  explanation: string;        // ex. "Le fruit n'est pas nommé ; l'interdit est la désobéissance à l'ordre divin."
  verseRef: DoodleVerseRef;   // ex. { bookId: "genese", chapter: 2, v: "16-17" }
  animate?: DoodleAnimation;  // illustration Rive optionnelle (cf. spec 18 §4.4)
};
```

> `DoodleVerseRef` et `DoodleAnimation` repris de `lib/doodles.ts` (spec 18) — pas de redéfinition.
> L'illustration Rive est **optionnelle** : une question sans `animate` s'affiche sans illustration.

### 4.3 Déroulé & persistance

1. Clic « Quiz » → encart ouvert (état `quizOpen` piloté par le lecteur).
2. Le lecteur choisit une réponse → feedback immédiat :
   - **Bonne** → « Correct ✅ » (couleur sémantique `primary`).
   - **Mauvaise** → « Pas tout à fait » (couleur `muted`, pas de rouge « erreur » — on n'humilie
     pas) + on **met en évidence la bonne réponse**.
   - Dans les deux cas : `explanation` + lien « Voir le verset → » (`/read?…`).
3. L'encart se ferme : bouton ✕, Échap, clic extérieur, ou clic « Voir le verset » (navigue).
4. **Persistance** : clé `localStorage` `bym:quiz-seen` = `{ [quizId]: true }`. Marquée quand le
   lecteur a **vu la réponse** (pas forcément bon). Sert à (option, cf. §8) griser / masquer le
   bouton sur les chapitres déjà faits — **off par défaut en v1** (le bouton reste, rejouable).

### 4.4 Cas limites

- Chapitre sans quiz → aucun bouton, rien ne se passe.
- Quiz avec illustration Rive mais `.riv` manquant / en erreur → repli silencieux sans illustration
  (la question reste jouable). Reuse du repli `failed` du renderer doodle (spec 18 §4.5).
- `prefers-reduced-motion: reduce` → illustration figée sur l'état initial (cf. spec 18).
- Mode focus (spec 17) → le bouton « Quiz » reste accessible (lecture immersive mais le quiz est
  opt-in ; à valider au test — possiblement masqué en focus pour rester sobre).
- Plusieurs questions pour le même chapitre (future v2) → v1 n'en garde qu'une ; `getQuiz` retourne
  la première déclarée.

### 4.5 Activation / désactivation

- Un **toggle « Quiz »** dans les **réglages de lecture** (`m-reading-settings.tsx`, même pattern
  que le bouton « Mode focus » : Row + pastille on/off) permet d'**activer ou désactiver** la
  fonctionnalité globalement. Désactivé → aucun bouton « Quiz » nulle part, aucun encart, comme si
  le chapitre n'avait pas de quiz.
- **Défaut : activé** (le quiz est visible par défaut sur les chapitres ciblés). Le lecteur peut le
  couper s'il trouve ça distrayant.
- Persistance : clé `localStorage` `bym:quiz-enabled` (`"1"` activé, `"0"` désactivé), via
  `reader-preferences` (pattern existant `try/catch + hydrated`).
- Le toggle est **indépendant** de `bym:quiz-seen` (§4.3) : désactiver n'efface pas l'historique
  « déjà vu » ; réactiver retrouve l'état antérieur.

## 5. UI / UX

### 5.1 Emplacement & déclencheurs

- **Bouton « Quiz » (déclencheur de l'encart)** — emplacement **à trancher** (cf. §8). Le panneau
  des réglages (« détails de présentation ») **n'est pas** l'endroit : on n'ouvre pas un encart
  ludique depuis un panneau de réglages. Options :
  1. **Topbar** (`o-reader-topbar.tsx`, à droite près des autres actions) — recommandé : visible,
     cohérent avec les autres pastilles (thème, ⌘K), disparaît proprement hors focus.
  2. **Dock** — possible mais le dock se densifie (regroupement Notes/Favoris/Signets à venir).
  3. **Encart inline en fin de chapitre** — découverte naturelle, mais plus intrusif qu'un bouton.
  - N'apparaît que si `getQuiz(bookId, chapter)` non nul **et** toggle activé (§4.5).
- Icône `hugeicons:question-01` (ou `hugeicons:bulb-02`), libellé « Quiz » au survol desktop
  (pattern prev/next de `m-book-chapter-selector`), icône seule sur mobile.
- Discret : même style que les autres FloatingButton / pastille topbar, pas de pulsation.
- **Toggle on/off** : dans `m-reading-settings.tsx` (Row « Quiz » + pastille on/off), pas un
  bouton d'action — c'est un réglage, pas un déclencheur.

### 5.2 Disposition (wireframe)

Encart (modal desktop / bottom sheet mobile — réutiliser le pattern responsive de `m-cross-refs`
/ `m-note-editor`) :

```
┌──────────────────────────────────────┐
│ Quiz · Genèse 2              [✕]      │
│ ✦ (illustration Rive optionnelle)     │
│                                      │
│ C'était quoi le fruit défendu ?       │
│                                      │
│  ○ 1. Une pomme                       │
│  ● 2. Une relation illicite…          │  ← choix sélectionné
│  ○ 3. La désobéissance                │
│                                      │
│ [ Valider ]                           │
└──────────────────────────────────────┘
```

Après validation :

```
┌──────────────────────────────────────┐
│ Quiz · Genèse 2              [✕]      │
│ Pas tout à fait — la bonne réponse :  │
│ « La désobéissance ».                 │
│ Le fruit n'est pas nommé dans le      │
│ texte ; l'interdit est la désobéis-   │
│ sance à l'ordre divin.                │
│                                      │
│ Voir le verset →   (Genèse 2:16-17)   │  → /read?livre=genese&chap=2&v=16-17
└──────────────────────────────────────┘
```

### 5.3 États & interactions

- **Fermé** : bouton « Quiz » seul, visible seulement si quiz présent **et** toggle activé.
- **Ouvert, non répondu** : énoncé + choix (radio) + bouton « Valider » (disabled tant qu'aucun
  choix n'est sélectionné). Échap / ✕ / clic extérieur ferment sans valider.
- **Ouvert, répondu** : feedback + explication + lien verset. Les choix deviennent inactifs, la
  bonne réponse est surlignée. Bouton « Refaire » (option, cf. §8 — reposer la question).
- **Navigation** : changer de chapitre ferme l'encart (le quiz est lié au chapitre).

### 5.4 Responsive

- Mobile (< md) : **bottom sheet** (plein écran ou grande feuille), comme `m-note-editor` /
  `m-cross-refs`. Bouton « Quiz » = icône seule.
- Desktop (≥ md) : **modal** centrée, `max-w-md`, ancrage libre. Bouton = icône + libellé au survol.

### 5.5 Thème clair/sombre & accessibilité

- **Thème** : encart sur `bg-popover`/`border-input` (cohérent avec les popovers existants).
  Illustration Rive : thème runtime (cf. spec 18 §4.4 — un seul `.riv`, bascule `.dark`).
- **Accessibilité** :
  - Choix = vrais `<input type="radio">` (groupés par `name`), labels associés, navigables clavier.
  - Feedback annoncé via `aria-live="polite"` (lecteur d'écran vocalise « Correct » / « Pas tout à
    fait » + l'explication).
  - `role="dialog"` + `aria-label` sur l'encart ; focus piégé tant qu'ouvert (pattern existant).
  - Bouton « Quiz » : `aria-label="Quiz sur {livre} {chap}"`.
- `prefers-reduced-motion` : illustration figée (cf. spec 18), pas de transition de feedback.

### 5.6 Micro-copy (FR)

- Bouton : « Quiz » (`title` « Quiz sur {livre} {chap} »).
- En-tête encart : « Quiz · {livre} {chap} ».
- Avant validation : « Valider », disabled tant que rien n'est choisi.
- Bonne réponse : « Correct ✅ ». Mauvaise : « Pas tout à fait — la bonne réponse : « {texte} ». »
- Lien verset : « Voir le verset → » (+ référence en gris, ex. « Genèse 2:16-17 »).
- Refaire (option) : « Refaire le quiz ».

## 6. Spécification technique

### 6.1 Fichiers (nouveaux / modifiés)

**Nouveaux**
- `lib/quiz.ts` — registre éditorial + types + `getQuiz(bookId, chapter): Quiz | null`. Types :
  `QuizChoice`, `Quiz` (cf. §4.2). Réutilise `DoodleVerseRef` et `DoodleAnimation` de `lib/doodles`.
- `components/molecules/m-quiz-card.tsx` — encart quiz (énoncé, choix radio, validation, feedback,
  explication, lien verset, illustration Rive optionnelle via le renderer doodle en `dynamic`).
- `lib/use-quiz-seen.ts` — hook `useQuizSeen()`: hydratation de la clé `bym:quiz-seen` (pattern
  `try/catch + hydrated` existant) + `markSeen(quizId)`. Optionnel en v1 (cf. §4.3).

**Modifiés**
- `components/organisms/o-bible-reader.tsx` — importe `getQuiz`, expose `quiz = getQuiz(bookId,
  chapter)`, état `quizOpen`, rend `<QuizCard>` (près des autres overlays). Recalcule `quiz` au
  changement de chapitre ; ferme l'encart au changement de chapitre. Ne rend rien si toggle
  désactivé (§4.5).
- `components/organisms/o-reader-topbar.tsx` (ou dock — cf. §8) — rend le bouton « Quiz » si
  `quiz` non nul **et** toggle activé, `onClick={() => setQuizOpen(true)}`.
- `lib/reader-preferences.ts` — ajoute `quizEnabled` (booléen, défaut `true`) + clé
  `bym:quiz-enabled`. `useReaderPreferences` expose `quizEnabled` / `setQuizEnabled`.
- `components/molecules/m-reading-settings.tsx` — ajoute une Row « Quiz » + pastille on/off
  (même pattern que « Mode focus »), `value={quizEnabled}` `onChange={onQuizEnabled}`. C'est le
  réglage, pas le déclencheur (cf. §5.1).
- Assets (éditorial, optionnel) : `public/quiz/<id>.riv` (illustration, thème runtime).

### 6.2 Données & persistance

- **Registre** : `lib/quiz.ts`, source éditoriale versionnée (comme `lib/doodles.ts`). Aucun
  endpoint. Une entrée par chapitre ciblé.
- **Activation** : `bym:quiz-enabled` (`"1"`/`"0"`, défaut activé) via `reader-preferences`. Pilote
  la visibilité globale du bouton et de l'encart (§4.5).
- **Persistance « vu »** : clé `localStorage` `bym:quiz-seen` = `{ [quizId]: true }`. Marquée au
  moment où le lecteur voit la réponse. **v1** : sert uniquement (option) à ne pas repopser ; le
  bouton reste visible et le quiz rejouable. Indépendante du toggle. Aucune donnée sensible,
  aucune synchro (doctrine projet).
- **Pas de score** : aucun compteur, aucune agrégation, aucun envoi. Conforme spec 00.

### 6.3 API / contraintes

- **Aucune API** : contenu statique. Le verset d'appui est référencé par `bookId/chap/v` et ouvert
  via la route `/read?…` existante — pas de fetch supplémentaire.
- **Dépendances** : `@rive-app/react-canvas` **déjà** présente (spec 18). Réutilise le renderer
  doodle en `dynamic({ ssr:false })` — pas de coût bundle si aucune question n'a d'illustration
  (le renderer n'est monté que pour une question à illustration).
- **SSR** : `getQuiz` est pure (pas de `Date`, pas d'effet) → peut s'appeler côté serveur pour
  décider de rendre le bouton (pas de flash, pas de mismatch). L'illustration Rive reste
  client-only (canvas, cf. spec 18 §6.3).

## 7. Critères d'acceptation

- [ ] Chapitre sans quiz → aucun bouton « Quiz », rien ne s'affiche.
- [ ] Chapitre avec quiz **et** toggle activé → bouton « Quiz » visible ; clic ouvre l'encart.
- [ ] Toggle « Quiz » désactivé → aucun bouton nulle part (même sur un chapitre avec quiz).
- [ ] Toggle persisté (`bym:quiz-enabled`) ; défaut activé.
- [ ] Choix = radios navigables clavier ; « Valider » disabled tant qu'aucun choix.
- [ ] Bonne réponse → « Correct ✅ » ; mauvaise → « Pas tout à fait » + bonne réponse surlignée.
- [ ] Feedback + explication + lien « Voir le verset → » (`/read?…`) ; `aria-live` annonce.
- [ ] Illustration Rive (si `animate`) s'affiche ; `.riv` manquant → repli sans illustration.
- [ ] `prefers-reduced-motion` → illustration figée.
- [ ] Fermeture : ✕ / Échap / clic extérieur / changement de chapitre.
- [ ] Aucun score, aucun compteur, aucune stat (conforme spec 00).
- [ ] Responsive : modal desktop / bottom sheet mobile (pattern `m-note-editor`).
- [ ] `tsc --noEmit` + `next build` OK ; non-régression lecture / panneaux existants.

## 8. Risques & questions ouvertes

- **Déclencheur** — tranché **opt-in** (bouton, pas de popup auto) pour rester dans un lecteur
  calme. Alternative (popup auto) **écartée** pour v1 — rouvrable si l'usage montre un taux
  d'ouverture trop faible (à instrumenter **sans** stocker de score — juste un compteur local de
  vus, conformément à spec 00 ? **ouvert**).
- **Emplacement du bouton déclencheur** — tranché : le panneau « détails de présentation »
  (réglages de lecture) **n'accueille pas** le bouton (un réglage n'est pas un déclencheur). Le
  toggle on/off y vit (§4.5) ; le bouton déclencheur va en **topbar** (recommandé) ou, à défaut,
  en dock ou en encart inline fin de chapitre (cf. §5.1). **à trancher au test** (visibilité vs
  densité du dock).
- **Défaut du toggle** — tranché **activé** (le quiz apparaît par défaut sur les chapitres
  ciblés) ; l'utilisateur peut couper. Si l'effet s'avère trop intrusif à l'usage, inverser le
  défaut. **ouvert** (à confirmer au test).
- **Bouton grisé / masqué après « vu »** — off par défaut en v1 (rejouable). Si l'effet « wow »
  s'émousse à la relecture, activer le grisage via `bym:quiz-seen`. **ouvert**.
- **Quiz en mode focus** — bouton masqué en focus (sobre) ou conservé (opt-in, donc peu
  intrusif) ? **à trancher au test**.
- **Bouton « Refaire »** — utile (reposer pour ancrage mémoriel) ou superflu (pas de score, donc
  pas de défi) ? **ouvert** — MVP sans, à valider à l'usage.
- **Contenu** — la valeur dépend entièrement de la qualité éditoriale des questions (cibler des
  idées reçues, pas du quiz scolaire). Cible raisonnable : ~10–20 chapitres initialement, étendu
  au fil du temps. Qui écrit/relit le contenu ? **ouvert** (cf. risque « curateur » spec 18).
- **Authoring Rive** — illustration optionnelle ; compétence éditeur `rive.app` (cf. spec 18).
  v1 peut sortir sans aucune illustration (texte seul) et ajouter les `.riv` plus tard.
- **Contenu doctrinal** — les questions doivent rester justes bibliquement et pédagogiques (la
  « pomme » n'est pas biblique ; l'explication doit le dire clairement). Relecture éditoriale
  indispensable avant publication.