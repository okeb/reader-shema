# Spec 38 — Recherche de verset par référence libre (`/search?p=`)

> **Statut** : ✅ Implémenté · **Priorité** : Moyenne · **Effort** : S · **Dépendances** : — (réutilise `parseReference`, `parsePartialReference`, `useRouter` next-intl)

## 1. Objectif
Permettre d'atteindre un verset depuis une URL acceptant une référence biblique libre (`Mc 1:7`), sans avoir à connaître le schéma interne `?livre=&chap=&v=`. Accessoirement, corriger le parseur qui rejetait le `:` (notation standard), ce qui cassait aussi la saisie `Mc 1:7` dans la palette ⌘K.

## 2. Valeur utilisateur
- Liens de partage lisibles et mémorisables : `https://reader.shemaproject.org/fr/search?p=Mc+1:7`.
- Notation naturelle `livre chapitre:verset` au lieu d'une URL technique.
- Page de recherche réutilisable comme fallback éditorial (saisie progressive + suggestions).

## 3. Périmètre
- **Inclus** : route localisée `/fr/search` + `/en/search`, param `p`, redirection 307 vers `/read` quand la référence résout, page de recherche avec suggestions sinon ; correction du parseur (`:` accepté).
- **Exclu** : recherche plein-texte (l'API ne le permet pas, cf. README specs) ; agrégation multi-références dans `p` (une seule référence par requête).

## 4. Spécification fonctionnelle
- URL : `/{locale}/search?p=<référence>`.
- Format accepté : `<livre> <chapitre>[:<verset(s)>]`. Séparateur chapitre/verset = `:` **ou** espace. Versets = `7`, `7-9`, `1,3,5-8`.
- Le livre se résout via `resolveBookId` : id (`marc`), nom (`Marc`), abréviation (`Mc`, `1Co`), ou préfixe du nom (≥ 3 chars).
- **Si `p` résout** (livre + chapitre valides) → redirection 307 vers `/{locale}/read?livre=&chap=&v=` (verset surligné + défilement côté client).
- **Sinon** (référence partielle, livre inconnu, `p` absent) → rendu de la page de recherche, champ pré-rempli avec `p`, suggestions de livres en direct.
- Chapitre seul (`Mc 1`) résout et redirige (pas de `v`).

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
Route dédiée accessible par URL directe. Pas de bouton dans l'app (la palette ⌘K reste l'entrée in-app), mais `/search` sert de cible de partage/lien externe.

### 5.2 Disposition
Pleine page, conteneur centré `max-w-2xl`, champ de recherche en haut (icône `hugeicons:search-01`), liste de suggestions dessous. Même langage visuel que la palette ⌘K (`bg-popover`, `border-input/60`, `bg-accent` au focus).

### 5.3 États & interactions
- Auto-focus du champ au montage.
- Saisie → `parsePartialReference` → livre résolu en résultat principal (« Aller à Marc 1:7 » ↵), autres livres en suggestions.
- Flèches ↑/↓ pour parcourir, Entrée pour activer.
- Sélection d'un livre-suggestion pré-remplit le champ (`<id> `) pour continuer la saisie.
- 0 résultat → « Référence introuvable. Essayez « Mc 1:7 » ou « jean 3 16 ». »

### 5.4 Responsive
`max-w-2xl` + `px-4`, fonctionne du mobile au desktop.

### 5.5 Thème clair/sombre & accessibilité
Tokens Tailwind (`bg-popover`, `text-muted-foreground`) — suit le thème. `role="combobox"` + `listbox`/`option` + `aria-activedescendant`, navigation clavier complète.

### 5.6 Micro-copy (FR)
- Placeholder : `Aller à…  ex. « Mc 1:7 » ou « genese 3:12-20 »`
- Pied : `livre chapitre[:verset(s)]` + compte de résultats.

## 6. Spécification technique
### 6.1 Fichiers
- `src/presentation/lib/parse-reference.ts` — regex `parseReference` : séparateur verset `\s+` → `[:\s]+`.
- `i18n/routing.ts` — ajout `'/search': { en: '/search', fr: '/search' }` dans `pathnames`.
- `app/[locale]/search/page.tsx` — **nouveau**. Page serveur : `parseReference(p)` → `redirect({ pathname: '/read', query })` (next-intl), sinon `<SearchPage initialQuery={p} />`.
- `src/presentation/components/organisms/o-search-page.tsx` — **nouveau**. Composant client, variante pleine page de `o-command-palette.tsx` (réutilise `parsePartialReference`, `useRouter`, `useNavigationHistory`, `useActiveVersion`).
- `src/presentation/components/organisms/o-command-palette.tsx` — placeholder + pied MAJ pour montrer la forme `:`.

### 6.2 Données & persistance
Aucune nouvelle persistance. La navigation poussée dans `useNavigationHistory` (pour « Récemment consulté » de la palette) réutilise le store existant.

### 6.3 API / contraintes
Aucun appel API : la résolution livre/chapitre est purement cliente (`BIBLE_BOOKS`). La redirection se fait côté serveur avant tout rendu de données.

## 7. Critères d'acceptation
- [x] `/fr/search?p=Mc+1:7` redirige vers `/fr/read?livre=marc&chap=1&v=7` (verset 7 surligné).
- [x] `/fr/search?p=jean` affiche la page, champ pré-rempli « jean », suggestions.
- [x] `/fr/search?p=truc+12:3` affiche « Référence introuvable ».
- [x] `/fr/search` (sans `p`) affiche la page vide, auto-focus.
- [x] Palette ⌘K : `Mc 1:7` va sur Marc 1:7 (bug du `:` corrigé).
- [x] `pnpm build` passe (typage `redirect` + `pathnames`).

## 8. Risques & questions ouvertes
- **Ambiguïté livre multi-mots** : `1 samuel 3:5` — géré par backtracking non-gourmand du regex ; à surveiller si nouveaux alias ajoutés.
- **`p` vide dans un lien de partage** : redirige vers la page de recherche (pas de boucle).
- Pas de normalisation de la locale dans l'URL de redirection (next-intl `redirect` préfixe selon la locale courante) — comportement attendu.