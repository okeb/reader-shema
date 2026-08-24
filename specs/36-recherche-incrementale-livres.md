# Spec 36 — Recherche incrémentale de livres (auto-complétion)

> **Statut** : Proposé · **Priorité** : 🔴 Haute · **Effort** : M · **Dépendances** : —

## 1. Objectif

Remplacer le comportement actuel « tout ou rien » de la recherche biblique par une auto-complétion incrémentale : dès le premier caractère tapé, l'utilisateur voit les livres correspondants, et peut composer une référence complète (`mat 3 16`) de façon fluide. Corriger au passage l'absence de normalisation d'accents dans les sélecteurs de livre.

## 2. Valeur utilisateur

- **Découverte immédiate** : taper `"m"` propose Marc, Matthieu, Michée, Malachie, etc. — plus besoin de connaître l'orthographe exacte.
- **Tolérance aux accents** : `"genese"` trouve `Genèse`, `"esaie"` trouve `Ésaïe` — partout (palette ⌘K, sélecteur lecteur, lanceur accueil).
- **Fluidité de la palette** : liste déroulante navigable au clavier (↑/↓/Enter), résultat unique avec Enter dès que la référence est non ambiguë.
- **Chapitre 1 par défaut** : taper juste `"mat"` et Enter → navigue vers Matthieu 1, sans forcer l'utilisateur à taper un numéro.

## 3. Périmètre

- **Inclus** :
  - Nouvelle fonction `searchBooks()` dans `bible-books.ts` avec scoring et normalisation d'accents.
  - Nouvelle fonction `parsePartialReference()` dans `parse-reference.ts` pour le parsing incrémental.
  - Refonte de la palette ⌘K : liste de suggestions déroulante + navigation clavier.
  - Remplacement du filtre `includes()` dans le sélecteur de livre (lecteur) et le lanceur de passage (accueil) par `searchBooks()`.
  - Normalisation d'accents dans tous les points de recherche.

- **Exclu** (pour cette itération) :
  - Recherche plein-texte dans les versets (pas d'endpoint API).
  - Historique de recherche textuelle (l'historique existant de navigation reste).
  - Fuzzy matching tolérant aux fautes (Levenshtein, etc.) — seul le préfixe et la sous-chaîne normalisés sont couverts.

## 4. Spécification fonctionnelle

### 4.1 `searchBooks(query: string): BookSearchResult[]`

Fonction pure, exportée de `bible-books.ts`. Prend une saisie libre, retourne une liste triée de résultats avec score.

**Algorithme de scoring** (résultat retourné si `normalizeQuery(book.{champ})` correspond) :

| Score | Condition | Exemple (`query = "mat"`) |
|-------|-----------|---------------------------|
| 0 | Correspondance exacte (id ou nom normalisé) | `"mat"` ≠ `"matthieu"` → pas de score 0 |
| 1 | Préfixe du nom normalisé | `"mat"` → `"matthieu"` ✅ |
| 2 | Préfixe de l'abbr normalisé | `"mt"` → `"mt"` ✅ |
| 3 | Sous-chaîne dans le nom normalisé | `"mat"` dans `"matthieu"` ✅ (aussi prefix, donc score 1) |

Pour un même livre, on retient le **meilleur score** uniquement.

**Tri** : par score croissant, puis par ordre canonique (`BIBLE_BOOKS`).

**Seuil** : 1 caractère suffit (contrairement à l'actuel `resolveBookId` qui exige ≥3 chars pour le prefix match). Si la query est vide, retourne tous les livres avec score 3.

**Normalisation** : réutilise `normalizeQuery()` existante (lowercase + NFD + strip combining marks + strip non-alphanum).

### 4.2 `parsePartialReference(input: string): PartialReference`

```ts
export interface PartialReference {
  bookResults: BookSearchResult[];  // suggestions de livres (toujours rempli)
  resolvedBook: BibleBook | null;    // livre identifié sans ambiguïté
  chapter: number | null;             // chapitre si présent et valide
  selection?: string;                // versets si présents (ex: "12-20")
}
```

**Logique de parsing incrémental** :

| Saisie | `bookResults` | `resolvedBook` | `chapter` | `selection` |
|--------|---------------|----------------|-----------|-------------|
| `""` | tous les livres | `null` | `null` | `undefined` |
| `"m"` | Marc, Matthieu, Michée… | `null` | `null` | `undefined` |
| `"mat"` | [Matthieu] | `Matthieu` | `null` | `undefined` |
| `"mat 3"` | [Matthieu] | `Matthieu` | `3` | `undefined` |
| `"mat 3 16"` | [Matthieu] | `Matthieu` | `3` | `"16"` |
| `"1co 3"` | [1 Corinthiens] | `1 Corinthiens` | `3` | `undefined` |
| `"xyz"` | `[]` | `null` | `null` | `undefined` |

Détail de l'algorithme :
1. Si l'input est vide → `bookResults` = tous les livres, `resolvedBook` = null.
2. Si l'input contient un ou plusieurs espaces → tenter le parsing complet avec `parseReference()` (existant). Si succès → `resolvedBook` + `chapter` + `selection` remplis, `bookResults` contient juste le livre résolu.
3. Si l'input ne contient pas d'espace → appeler `searchBooks(input)`. Si un seul résultat avec score ≤ 1 → `resolvedBook` = ce résultat. Sinon `resolvedBook` = null.
4. Si l'input contient un espace mais le parsing complet échoue → séparer le premier mot (livre) du reste, chercher le livre via `searchBooks()`, et tenter de parser le chapitre dans le reste.

### 4.3 Palette ⌘K — Comportement

**Input vide** : afficher l'historique récent (comportement actuel inchangé).

**Input non vide** : appeler `parsePartialReference(value)` et afficher :

1. **Si `resolvedBook` + `chapter`** : un bouton principal « Aller à {nom} {chap}[:{selection}] ↵ » en haut.
2. **Si `resolvedBook` sans `chapter`** : un bouton principal « Aller à {nom} 1 ↵ » (chapitre 1 par défaut).
3. **Liste des `bookResults`** en dessous du bouton principal (sauf si le livre est déjà dans le bouton principal). Chaque item : icône livre + nom du livre. Clic ou sélection → auto-remplit l'input avec `"{normalizedId} "` et place le curseur pour taper le chapitre.
4. **Si aucun résultat** (`bookResults` vide) : message existant « Référence introuvable. Essayez « jean 3 16 ». »

**Navigation clavier** :
- `↑`/`↓` : déplacer le focus dans la liste (bouton principal inclus).
- `Enter` : si focus sur le bouton principal → naviguer ; si focus sur un livre de la liste → auto-remplir.
- `Escape` : fermer la palette (comportement existant).

**Debounce** : pas de debounce explicite. Les 66 livres sont en mémoire, le calcul est instantané. Utiliser `useDeferredValue` si des soucis de performance apparaissent (non attendu).

### 4.4 Sélecteur de livre (lecteur) et lanceur (accueil)

Remplacer :
```ts
const q = search.toLowerCase().trim();
const ot = BIBLE_BOOKS.filter((b) => b.testament === 'ancien' && (!q || b.name.toLowerCase().includes(q)));
```
Par :
```ts
const q = search.trim();
const results = q ? searchBooks(q) : BIBLE_BOOKS.map((b) => ({ book: b, score: 3 }));
const ot = results.filter((r) => r.book.testament === 'ancien').map((r) => r.book);
const nt = results.filter((r) => r.book.testament === 'nouveau').map((r) => r.book);
```

L'ordre canonique est préservé au sein d'un même score, et les résultats les plus pertinents arrivent en premier.

## 5. UI / UX

### 5.1 Emplacement & déclencheurs

- **Palette ⌘K** : comportement existant (⌘/Ctrl+K ou bouton loupe), mais le panneau de résultats change.
- **Sélecteur de livre (lecteur)** : popover existant, seul le filtre change.
- **Lanceur de passage (accueil)** : panneau existant, seul le filtre change.

### 5.2 Disposition (wireframe) — Palette ⌘K

**Avant** (binaire) :
```
┌──────────────────────────────────────┐
│ 🔍  mat                              │
├──────────────────────────────────────┤
│ Référence introuvable. Essayez…      │
└──────────────────────────────────────┘
```

**Après** (suggestions) :
```
┌──────────────────────────────────────┐
│ 🔍  mat                              │
├──────────────────────────────────────┤
│ 📖 Aller à Matthieu 1         ↵      │  ← bouton principal
│ 📖 Matthieu                          │  ← sélectionné si un seul résultat
│ 📖 Malachie                           │
│ 📖 Michée                             │
│ 📖 Ésaïe                              │  ← "saï" contient "saï" ≠ prefix "mat" mais
│   …                                   │     la recherche par substring ne matche pas ici
├──────────────────────────────────────┤
│ livre chapitre [verset(s)]            │
└──────────────────────────────────────┘
```

Quand l'utilisateur tape `"mat 3"` :
```
┌──────────────────────────────────────┐
│ 🔍  mat 3                            │
├──────────────────────────────────────┤
│ 📖 Matthieu 3                 ↵      │  ← résultat unique, Enter = naviguer
├──────────────────────────────────────┤
│ livre chapitre [verset(s)]            │
└──────────────────────────────────────┘
```

### 5.3 États & interactions

**Palette ⌘K** :
- **Focus clavier** : le premier item (bouton principal ou premier livre) reçoit le focus visuel (`bg-accent`). `↑`/`↓` déplacent le focus. `Enter` active l'item focusé.
- **Clic** : équivaut à Enter sur l'item.
- **Auto-remplissage** : quand l'utilisateur sélectionne un livre dans la liste (sans chapitre), l'input passe à `"{id} "` (ex: `"matthieu "`) et le curseur est placé à la fin pour taper le chapitre.
- **Transition** : l'ouverture/fermeture garde le fond flouté existant (`backdrop-blur-sm`).

**Sélecteur & lanceur** :
- Comportement identique à l'existant, le seul changement est que `"genese"` trouve `"Genèse"` et que `"m"` affiche Marc, Matthieu, etc.

### 5.4 Responsive

- Palette ⌘K : `max-w-lg` existant, la liste de suggestions scroll verticalement si > 5 résultats (hauteur max ~`max-h-[40vh]`).
- Sélecteur & lanceur : hauteur fixe existante (`h-72`), aucun changement de layout.

### 5.5 Thème clair/sombre & accessibilité

- La liste de suggestions utilise les tokens existants (`bg-popover`, `text-foreground`, `hover:bg-accent`).
- Rôles ARIA : `role="listbox"` sur le conteneur, `role="option"` sur chaque item, `aria-selected` sur l'item focusé.
- `aria-live="polite"` sur le compteur de résultats pour les lecteurs d'écran.
- Focus visible : ring `focus-visible:ring-2 focus-visible:ring-primary` sur les items focusables.

### 5.6 Micro-copy (FR)

- Bouton principal (livre seul) : « Aller à {nom} 1 ↵ »
- Bouton principal (livre + chapitre) : « Aller à {nom} {chap} ↵ »
- Bouton principal (livre + chapitre + verset) : « Aller à {nom} {chap}:{selection} ↵ »
- Aucun résultat : « Référence introuvable. Essayez « jean 3 16 ». » (existant, inchangé)
- Placeholder input : « Aller à… ex. « 1co 3 23 » ou « genese 3 12-20 » » (existant, inchangé)

## 6. Spécification technique

### 6.1 Fichiers (nouveaux / modifiés)

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/shared/constants/bible-books.ts` | **Modifié** | Ajouter `BookSearchResult`, `searchBooks()`. Conserver `resolveBookId()` (utilisé par `parseReference()` et les URL entrantes). |
| `src/presentation/lib/parse-reference.ts` | **Modifié** | Ajouter `PartialReference`, `parsePartialReference()`. Conserver `parseReference()` existant (utilisé par le note-editor et les URL entrantes). |
| `src/presentation/components/organisms/o-command-palette.tsx` | **Modifié** | Refonte UI : liste déroulante de suggestions + navigation clavier ↑/↓/Enter. Remplacer le binaire `parsed ? bouton : erreur` par le modèle `parsePartialReference`. |
| `src/presentation/components/molecules/m-book-chapter-selector.tsx` | **Modifié** | Remplacer `b.name.toLowerCase().includes(q)` par `searchBooks(q)`. |
| `src/presentation/components/molecules/m-passage-launcher.tsx` | **Modifié** | Idem. |

Aucun nouveau fichier n'est créé. Pas de nouvelle dépendance npm.

### 6.2 Données & persistance

- Aucune donnée persistée. Les 66 livres sont en mémoire (`BIBLE_BOOKS`).
- La recherche est purement synchrone et côté client.
- Pas d'appel API.

### 6.3 API / contraintes

- Aucun nouvel endpoint nécessaire.
- `resolveBookId()` est conservé pour le parsing des URL entrantes et les usages existants (note-editor). Il n'est pas supprimé.
- `parseReference()` est conservé pour les usages existants qui nécessitent un résultat binaire (note-editor). Il n'est pas supprimé.

## 7. Critères d'acceptation

- [ ] Taper `"m"` dans la palette affiche Marc, Matthieu, Michée, Malachie, etc.
- [ ] Taper `"mat"` affiche Matthieu en premier (score prefix) + le bouton « Aller à Matthieu 1 ↵ ».
- [ ] Taper `"mat 3"` affiche le bouton « Aller à Matthieu 3 ↵ ».
- [ ] Taper `"mat 3 16"` affiche « Aller à Matthieu 3:16 ↵ » et navigue correctement.
- [ ] Taper `"genese"` trouve Genèse (normalisation d'accents) dans la palette, le sélecteur et le lanceur.
- [ ] Taper `"1co"` trouve 1 Corinthiens via l'abbr normalisée.
- [ ] `↑`/`↓` navigue dans la liste de suggestions dans la palette ⌘K.
- [ ] `Enter` sur un livre de la liste auto-remplit l'input avec `"{id} "`.
- [ ] `Enter` sur le bouton principal navigue vers le chapitre (1 par défaut si pas de chapitre).
- [ ] Le sélecteur de livre (lecteur) et le lanceur (accueil) utilisent `searchBooks()` et trouvent les livres avec normalisation d'accents.
- [ ] `tsc` + build OK. Aucune régression sur `parseReference()` et `resolveBookId()` existants.

## 8. Risques & questions ouvertes

- **Performance** : la recherche est sur 66 éléments en mémoire — aucune inquiétude. Pas de debounce nécessaire, mais `useDeferredValue` disponible si besoin.
- **Ambiguïté** : `"1"` ne matche rien comme préfixe de livre (les livres commençant par "1" sont `"1 Samuel"`, `"1 Rois"`, etc. — normalisés en `"1samuel"`, `"1rois"`). `"1s"` matche `"1samuel"` et `"1s"` matche `"1corinthiens"` non (c'est `"1co"`). Il faut vérifier que `normalizeQuery("1")` = `"1"` matche bien les id normalisés `"1samuel"`, `"1rois"`, etc. en substring (score 3). ✅ Cela fonctionne car `"1samuel".includes("1")` = true.
- **Rétro-compatibilité** : `parseReference()` et `resolveBookId()` sont conservés et inchangés. `searchBooks()` et `parsePartialReference()` sont additives.