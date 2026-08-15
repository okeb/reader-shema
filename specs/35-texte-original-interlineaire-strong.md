# Spec 35 — Texte original interlinéaire dans le panneau Strong

> **Statut** : ✅ Implémenté · **Priorité** : 🟠 Moyenne · **Effort** : S–M · **Dépendances** : Spec 02
> (concordance Strong), Spec 29 (détail Strong + champs `lemma`/`translit`/`lang` par token),
> endpoint `/orig/:livre/:chap/:selection?mode=interlinear&translit=1`.

## 1. Objectif

Dans le panneau Strong, afficher la **phrase originale complète** (hébreu/grec) dans son ordre source,
y compris les mots qui n'ont pas de correspondance dans la traduction tokenisée. Un mot apparié est
sélectionnable dans les deux lignes ; un mot source non apparié reste visible mais neutre. L'usager
peut **masquer ou afficher** ce texte original via un toggle de l'en-tête du panneau.

## 2. Valeur utilisateur

- **Étude de la source** : voir le mot original (lemme + écriture native) à côté de sa traduction,
  sans quitter le flux de lecture — lien direct entre le français et l'hébreu/grec.
- **Sélection synchronisée** : cliquer un mot traduit active aussi son équivalent original ; on lit
  d'un coup dequel côté source/traduction correspond à quoi.
- **Confort optionnel** : le texte original est opt-in (défaut masqué) — l'expérience actuelle reste
  intacte pour qui n'en veut pas ; un toggle règle l'affichage et se souvient de la préférence.

## 3. Périmètre

- **Inclus** :
  - Affichage de la phrase source complète dans `StrongVerse`, au-dessus de la traduction.
  - Sélection **bidirectionnelle** des mots appariés par code Strong et rang d'occurrence.
  - Affichage neutre des segments source qui n'ont pas de paire traduite.
  - Toggle « texte original » dans l'en-tête du panneau Strong, **persisté** dans les préférences
    de lecture (localStorage + sync opt-in `readerPrefs`).
  - Conservation de la ponctuation, des connectives et de l'ordre natif grec/hébreu.
- **Exclu** (pour cette itération) :
  - Interlinéaire dans le tiroir concordance (`m-strong-concordance`) et la page détail
    `/strong/[code]` — ces vues colorent déjà le mot correspondant dans le texte d'occurrence.

## 4. Spécification fonctionnelle

### 4.1 Donnée source

Chaque `StrongToken` (`src/domain/entities/strong-token.entity.ts`) porte déjà :
`{ text, strong, lemma?, translit?, lang?, phonetique?, definition?, origine?, type? }`.

- `text` = mot/segment **traduit** (espace de tête préservée).
- `lemma` = mot **original** en écriture native (ex. אֱלֹהִים, θεός).
- `translit` = romanisation ; `lang` = `'hebrew' | 'greek'`.
- `strong` = code canonique `H2421` / `G25` ; `null` pour les tokens sans ancrage Strong.

La traduction utilise `/{version}/...?strongs=1`. La phrase source utilise séparément
`/orig/...?mode=interlinear&translit=1`; ses `strongs` portent les formes fléchies dans `text`, dans
l'ordre natif. Les deux jeux sont normalisés avant leur rendu.

### 4.2 Unité interlinéaire

Quand l'affichage original est activé, deux lignes autonomes sont rendues : la phrase source complète
en premier, puis la traduction tokenisée existante. Les segments source appariés sont cliquables ;
les autres restent visibles avec une teinte atténuée et une indication d'absence de correspondance.

### 4.3 Sélection synchronisée

- L'appariement utilise le code Strong et son rang d'occurrence dans chaque ligne, afin que les codes
  répétés pointent vers la bonne paire.
- Un clic sur le mot source ou traduit active les deux correspondants.
- L'état actif surligne **les deux lignes** : la bulle traduite se remplit comme aujourd'hui ; le mot
  source prend la même
  accentuation (gras + couleur d'accent de la langue, fond léger).
- La définition Strong (bloc sous le verset) s'affiche à l'identique — inchangé.
- La reprise spec 31 (`initialActiveStrong`) active le token au montage : les deux lignes se
  surlignent ensemble, sans logique supplémentaire.

### 4.4 Toggle « texte original »

- Bouton icône dans l'en-tête du panneau Strong (`m-strong-panel`), à côté du sélecteur de version.
  État **on/off** visible (icône + teinte `primary` quand actif, muted quand inactif).
- Titre/aria-label : « Afficher le texte original » (off→on) / « Masquer le texte original »
  (on→off).
- Persisté via `strongOriginalText: boolean` dans les préférences de lecture (défaut `false` →
  comportement actuel préservé). Se souvenir entre sessions et appareils (sync opt-in `readerPrefs`).
- Quand **off** : `StrongVerse` rend exactement comme aujourd'hui (bulles seules). Zéro régression.

### 4.5 Edge cases

- Token `strong` sans `lemma` ni `translit` : la ligne original affiche le code nu (`2421`) en mono
  muted — l'unité reste cliquable et alignée.
- Token sans `strong` : texte brut sur la ligne traduction, rien au-dessus. L'interligne ne crée pas
  de « trous » visuels (la colonne de l'unité gère l'alignement).
- `strongsExperimental` (BYM/Darby) : l'alignement original/traduit hérite des mêmes imperfections
  que l'alignement Strong ; le badge « Expérimental » reste affiché, pas de garde supplémentaire.
- Panneau recouvert par la concordance (`covered`) : le toggle reste inerte avec le reste (déjà géré
  par `pointer-events-none`), pas de cas particulier.
- Aucun verset sélectionné / chargement : inchangé (skeleton / message « Aucune donnée Strong »).

## 5. UI / UX

### 5.1 Emplacement & déclencheurs

- Panneau Strong du lecteur (`m-strong-panel` → `m-strong-verse`), déjà existant — on transforme le
  rendu des tokens en paires quand le toggle est on.
- Toggle dans l'en-tête du panneau, à droite du sélecteur de version / compteur de versets.

### 5.2 Disposition (wireframe)

En-tête (ajout du toggle `◯` à droite du compteur) :
```
[obook BYM ▾]  3 versets  [Expérimental]        ◉  ✕
                                              toggle
```

Verset, toggle OFF (inchangé) :
```
JEAN 3:16
(Au) (commencement) … (Dieu) …
```

Verset, toggle ON — paires interlinéaires (chaque paire = colonne inline qui s'enroule) :
```
JEAN 3:16

  בְּרֵאשִׁית     …     אֱלֹהִים      …
 (Au)         …     (Dieu)        …

  └ clic « Au » → active aussi בְּרֵאשִׁית (les deux lignes de la paire)
```

Détail d'une paire active :
```
 ┌─────────────┐
 │ בְּרֵאשִׁית  │  ← serif, accent + bold + fond léger (actif)
 │ (Au)        │  ← bulle pleine bg-primary, texte blanc (actif)
 └─────────────┘
```

### 5.3 États & interactions

- Toggle off (défaut) : rendu identique à aujourd'hui.
- Toggle on : paires interlinéaires ; clic d'une paire active ses deux lignes + ouvre la définition.
- Token sans `strong` : texte brut, non cliquable ; il réserve une ligne originale vide afin que
  toutes les traductions restent alignées sur le même axe horizontal.
- Survol d'une paire : la bulle traduite prend son hover `bubbleColor` (inchangé) ; la ligne
  original prend un fond léger cohérent.
- Focus clavier : une paire = un tab stop ; `Enter`/`Espace` active le token.

### 5.4 Responsive

- Plein écran mobile / tiroir 440px desktop : les paires s'enroulent nativement (inline-flow), aucune
  largeur fixe, aucun débordement horizontal (`overflow-x` géré par le flux).
- Chaque paire utilise les deux mêmes rangées de hauteur fixe : les mots originaux partagent un axe
  horizontal et les traductions un second axe, y compris après un retour à la ligne.
- L'écriture hébraïque (RTL) est rendue correctement à l'intérieur de sa ligne par le navigateur ;
  l'ordre des paires reste l'ordre de la traduction (LTR du UI français).

### 5.5 Thème clair/sombre & accessibilité

- Accentuation par `lang` (hébreu = `primary`/amber, grec = purple) — réutilisation de `bubbleColor`.
- Ligne original : `font-serif`, `text-[12px]`, `text-muted-foreground` au repos ; accent de la
  langue + `font-semibold` + `bg-{lang}/10` à l'état actif.
- Cible tactile : la paire est un bouton unique ≥ 44px de haut (les deux lignes cumulées) — conforme.
- `aria-label` du bouton-paire : `{text} — {lemma}` (lisible au lecteur d'écran, reprend le `title`
  actuel `{strong} — {lemma}` en y ajoutant le mot traduit).
- Le toggle est un `button` avec `aria-pressed={strongOriginalText}`.

### 5.6 Micro-copy (FR)

- Toggle : « Afficher le texte original » / « Masquer le texte original ».
- Aucun nouveau message d'état (skeleton / vide / erreur inchangés).

## 6. Spécification technique

### 6.1 Fichiers (nouveaux / modifiés)

- **Modifiés** :
  - `src/shared/constants/reader-preferences.ts` — ajouter `strongOriginalText: boolean` à
    `ReaderPreferences` + `READER_PREFS_DEFAULTS` (défaut `false`). Aucune var CSS associée.
  - `src/presentation/stores/reader-preferences.store.ts` — ajouter le champ à `pickPrefs` (single
    point for persist + sync serialization via `getReaderPrefs`) + une action `setStrongOriginalText`
    (ou réutiliser `update({ strongOriginalText })`).
  - `src/presentation/components/molecules/m-strong-verse.tsx` — rend la phrase source complète puis
    la traduction et synchronise les mots appariés.
  - `src/infrastructure/api/bible-api.ts` / `use-strong-data.ts` — chargent et normalisent séparément
    les tokens `orig` lorsque le toggle est actif.
  - `src/presentation/components/molecules/m-strong-panel.tsx` — toggle dans l'en-tête (icône
    `hugeicons:language-skill` ou `hugeicons:translate-02`), branché sur
    `useReaderPreferences(s => s.strongOriginalText)` + `setStrongOriginalText` ; passer
    `showOriginal` à chaque `StrongVerse`.
- **Nouveaux** : aucun.
- **Inchangés** : domaine/entités, CQRS, repository, `t-reader`, route
  `/strong/[code]`, tiroir concordance. Le toggle est lu directement dans `m-strong-panel` (pas de
  nouveau prop drilling depuis `t-reader`).

### 6.2 Données & persistance

- Aucune nouvelle persistance structurelle : on étend l'objet `bibleReaderPrefs` existant
  (`READER_PREFS_STORAGE_KEY`). Hydratation existante (`onRehydrateStorage` + `hydrated`) couvre le
  champ — défaut `false` pour tout état persisté antérieur (champ absent → `READER_PREFS_DEFAULTS`).
- Sync opt-in `readerPrefs` (`sync-adapters.ts`) : `serialize()` utilise `getReaderPrefs()` →
  `pickPrefs`. **Ajouter `strongOriginalText` à `pickPrefs`** pour qu'il soit sérialisé/synchronisé
  (sinon le champ reste local). C'est le seul point à toucher côté sync.

### 6.3 API / contraintes

- Un fetch supplémentaire est lancé uniquement lorsque le texte original est affiché :
  `GET /orig/{book}/{chap}/{selection}?mode=interlinear&translit=1`.
- Régression : `showOriginal=false` (défaut) → rendu byte-identique à aujourd'hui.

## 7. Critères d'acceptation

- [ ] Un toggle « texte original » apparaît dans l'en-tête du panneau Strong ; défaut éteint.
- [ ] Toggle on : la phrase source complète apparaît dans son ordre natif au-dessus de la traduction.
- [ ] Les mots sans paire traduite restent visibles, neutres et non cliquables.
- [ ] Clic sur la ligne original **ou** la bulle active les deux lignes + ouvre la définition.
- [ ] Token Strong sans `lemma` → repli `translit` puis code nu ; token sans `strong` → texte brut,
      pas de ligne original.
- [ ] La préférence `strongOriginalText` persiste entre sessions (localStorage) et se synchronise
      opt-in (`readerPrefs`) une fois `pickPrefs` étendu.
- [ ] Toggle off → rendu identique à l'existant (aucune régression visuelle/fonctionnelle).
- [ ] Reprise spec 31 (`initialActiveStrong`) surligne les deux lignes de la paire réactivée.
- [ ] `aria-pressed` sur le toggle ; `aria-label` du bouton-paire = `{text} — {lemma}` ; cible
      tactile ≥ 44px.
- [ ] `tsc --noEmit` passe.

## 8. Risques & questions ouvertes

- **« Texte original » = aligné, pas fluide** : l'API ne donne pas le texte source dans l'ordre des
  mots hébreu/grec, seulement le `lemma` par token traduit. L'affichage suit donc l'ordre de la
  traduction (interlinéaire). C'est honnêtement ce qui sert la sélection équivalente, mais ce n'est
  pas un texte source à lire couramment. À valider comme attendu — un vrai texte source en ordre
  natif exigerait un endpoint supplémentaire côté API (hors périmètre).
- **Densité verticale** : deux lignes par mot densifie le panneau ; sur un long verset la hauteur
  croît. Le scroll du corps (`overflow-y-auto`) absorbe ; à surveiller en lecture. Le défaut off
  protège l'usage courant.
- **Alignement expérimental** : BYM/Darby ont un alignement Strong perfectible (`strongsExperimental`)
  ; l'interlinéaire en hérite tel quel (un `lemma` mal aligné → paire trompeuse). Pas de garde prévue
  au-delà du badge existant.
- **Tokens sans `lemma`** : rare mais possible ; le repli sur le code nu est utile mais moins lisible
  — à observer sur le corpus réel.
- **Sync** : oublier d'ajouter `strongOriginalText` à `pickPrefs` => champ non synchronisé (silencieux).
  Critère d'acceptation + revue pour le couvrir.
