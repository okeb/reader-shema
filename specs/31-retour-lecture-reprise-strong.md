# Spec 31 — Retour à la lecture depuis une fiche Strong : reprise sans perte

> **Statut** : ✅ Implémenté · **Priorité** : 🔴 Haute · **Effort** : S · **Dépendances** : Spec 29
> (détail Strong, store `useStrongResume`, page `/strong/[code]`).

## 1. Objectif

Corriger la perte d'état au retour depuis une fiche Strong : le bouton « Retour à la lecture » de la
page `/[locale]/strong/[code]` doit ramener le lecteur sur le **même passage**, verset sélectionné
restauré, panneau Strong rouvert et mot strong réactivé — sans race avec l'auto-reprise de position.

## 2. Valeur utilisateur

- **Continuité d'étude** : explorer la chaîne étymologique (origine → fiche → origine → fiche) puis
  revenir à la lecture sans tout re-sélectionner à la main. Sans ce fix, la fonctionnalité d'origine
  cliquable (spec 29) est « peu concluante » — le retour annule le contexte d'étude.
- **Cohérence** : le bouton précédent du navigateur restaure correctement ; le bouton in-app doit
  offrir la même fidélité (c'est le chemin le plus emprunté depuis une fiche).

## 3. Périmètre

- **Inclus** :
  - Étendre `StrongResume` avec le passage du lecteur (`bookId`, `chapter`) au moment de la
    navigation vers la fiche.
  - Sauvegarder ce passage dans `navigateStrong` (`t-reader.tsx`).
  - Faire pointer « Retour à la lecture » (`t-strong-detail.tsx`) vers `/{locale}/read?livre=…&chap=…`
    (+ `&v=` pour le scroll) lu dans le store **sans le consommer**.
- **Exclu** :
  - Rendre les refs `origine` cliquables dans le tiroir concordance (`m-strong-concordance` les rend
    aujourd'hui en spans colorés non cliquables — hors sujet).
  - Refonte du mécanisme de reprise lui-même (on réutilise `useStrongResume` tel quel).
  - Persistance multi-appareil de la reprise (transitoire par onglet, par spec 29).

## 4. Spécification fonctionnelle

### 4.1 Comportement attendu

- Depuis le lecteur (panneau Strong inline), clic d'une ref `origine` → `navigateStrong` mémorise
  `{ selectedIds, activeToken, bookId, chapter }` puis `router.push('/{locale}/strong/[code]')`.
- Sur la fiche, « Retour à la lecture » pointe vers le passage mémorisé :
  `/{locale}/read?livre={bookId}&chap={chapter}[&v={verse}]`.
- Au remontage du lecteur, `explicitTarget=true` (présence de `?livre`) → l'auto-reprise de position
  est sautée → pas de `router.replace` → pas de changement de `bookId`/`chapter` après le mount → la
  reprise restore `selection.set(...)`, rouvre le panneau, réactive le token. `consume()` efface le
  resume (one-shot).

### 4.2 Règles

- Lecture **non-consommante** du store côté fiche : seule la consommation au montage du lecteur
  efface le resume. `goToOccurrence` conserve son `clear()` (aller à un verset précis ≠ retour).
- `&v=` dérivé de `activeToken.verseId ?? selectedIds[0]` (préféré : verset du mot strong regardé),
  parsé sur le suffixe `:n` du verseId (format `bookId:chapter:n`). Omis si non numérique (mode refs,
  vieille entrée) — `?livre&chap` seuls suffisent à garantir `explicitTarget`.
- Repli : resume absent (nav directe vers `/strong/[code]`), ou vieille entrée sessionStorage sans
  `bookId`/`chapter` → `backHref = /read` → auto-reprise normale (pas de régression).

### 4.3 Multi-hop

- Chaîne reader → A → B : `navigateStrong` de la fiche (`t-strong-detail.tsx:37`) fait `router.push`
  **sans** `setResume` → le resume écrit en quittant le lecteur est préservé à travers A→B. « Retour
  à la lecture » depuis B retourne donc **directement au lecteur** avec restauration — meilleur que
  `router.back()` qui atterrirait sur A.

## 5. UI / UX

### 5.1 Emplacement & déclencheurs

- Bouton « Retour à la lecture » existant (`t-strong-detail.tsx`, en-tête) — inchangé visuellement ;
  seul le `href` devient dynamique.
- Aucun nouveau contrôle.

### 5.2 Disposition

Inchangée. Le bouton garde icône `hugeicons:arrow-left-01` + libellé « Retour à la lecture ».

### 5.3 États & interactions

- Avant : `href="/read"` → perte d'état au retour.
- Après : `href="/read?livre=…&chap=…[&v=…]"` → restoration complète (sélection, panneau, token,
  scroll sur `?v`).
- Repli (resume absent) : `href="/read"` → comportement actuel (auto-reprise).

### 5.4 Responsive / 5.5 Thème & a11y / 5.6 Micro-copy

Inchangés (pas de nouvel élément, pas de nouveau libellé).

## 6. Spécification technique

### 6.1 Fichiers (modifiés uniquement — aucun nouveau)

- `src/presentation/stores/strong-resume.store.ts` — interface `StrongResume` +2 champs
  (`bookId: string`, `chapter: number`). `setResume`/`clear`/`consume` inchangés ; `partialize`
  sérialise déjà tout `resume` → persistance auto.
- `src/presentation/components/templates/t-reader.tsx` — `navigateStrong` (lignes ~505-514) :
  ajouter `bookId`, `chapter` dans `setResume(...)` et dans les deps du `useCallback`. `bookId`/
  `chapter` déjà en scope (props TReader). Effet de consommation (386-398) inchangé.
- `src/presentation/components/templates/t-strong-detail.tsx` — bouton « Retour à la lecture »
  (52-58) : calculer `backHref` depuis `useStrongResume.getState().resume` (non-consommant) et le
  passer à `<Link href={backHref}>`. `Link` de `@/i18n/routing` préfixe la locale auto.

### 6.2 Données & persistance

- `useStrongResume` (Zustand + persist `sessionStorage`, clé `bym:strong-resume`) : on y ajoute
  `bookId`/`chapter`. Transitoire, par onglet, non synchronisé (inchangé par spec 29). Aucune
  migration nécessaire (sessionStorage éphémère) ; vieilles entrées → repli sûr.

### 6.3 API / contraintes

Aucune dépendance backend. Navigation client uniquement. Pas de full reload. `explicitTarget`
lu par `app/[locale]/read/page.tsx:50` ; auto-reprise par `t-reader.tsx:319-328`.

## 7. Critères d'acceptation

- [ ] Depuis le lecteur, clic d'une ref `origine` → fiche → « Retour à la lecture » → le lecteur
      revient sur le même passage, verset sélectionné restauré, panneau Strong ouvert, mot strong
      réactivé, scroll sur le verset.
- [ ] Multi-hop reader → A → B → « Retour à la lecture » depuis B retourne directement au lecteur
      avec restauration (pas à la fiche A).
- [ ] Navigation directe vers `/strong/[code]` (resume absent) → « Retour à la lecture » → `/read`
      (repli) → auto-reprise normale, pas de crash.
- [ ] Vieille entrée `bym:strong-resume` sans `bookId`/`chapter` → repli `/read` (pas de crash).
- [ ] Bouton précédent navigateur continue de restaurer correctement (pas de régression).
- [ ] `sessionStorage` `bym:strong-resume` = `null` après remontage du lecteur (consume a fui).
- [ ] `pnpm build` (ou `tsc --noEmit`) passe.

## 8. Risques & questions ouvertes

- **Remontage vs cache client App Router** : la correction suppose que TReader remonte frais au
  `router.push` vers `/read?…` (segments `/strong/[code]` et `/read` distincts) → `strongResumeRef`
  réinitialisé → `consume()` s'exécute. À vérifier en dev (Next 16). Si cache client restaurait
  l'instance sans re-monter, l'effet `[]` ne re-tournerait pas — cas à surveiller, mais le push
  vers une URL à query params différente de l'entrée précédente force un remount en pratique.
- **`?v=` et multi-sélection** : si plusieurs versets sont sélectionnés, `?v` prend le verset du
  token actif (ou le 1er sélectionné) pour le scroll — la sélection complète est restaurée par
  `selectedIds`, le `?v` n'est que le point de scroll. Acceptable.
- **Historique** : `Link` = push (ajoute une entrée). Après « Retour à la lecture », back retourne à
  la dernière fiche visitée — intuitif pour un bouton « Retour ». `router.replace` retirerait la
  fiche de l'historique (moins intuitif) — écarté.