# Spec 20 — Couleur principale au choix

> **Statut** : Proposé · **Priorité** : Basse · **Effort** : M · **Dépendances** : — (aucune ;
> réutilise le système de tokens CSS existant + le pattern d'hydratation `useTheme`).

## 1. Objectif

Permettre au lecteur de **choisir la couleur principale** de l'interface (l'accent `--primary`,
aujourd'hui orange), parmi **8 teintes** (orange + 7 autres). Le choix est persistant, appliqué
avant le premier paint (pas de flash), et respecte le mode clair/sombre. La couleur par défaut
reste l'orange actuel (identité du projet).

## 2. Valeur utilisateur

- **Personnalisation légère** : un lecteur qui préfère le bleu ou le vert peut adapter l'accent —
  sentiment de « chez soi » sans casser l'identité par défaut.
- **Accessibilité** : certaines personnes percevant mal l'orange (deutéranopie/pie) gagnent à
  choisir un accent plus contrasté pour elles.
- **Coût nul** : pur runtime CSS (variables), aucun asset, aucune dépendance.

## 3. Périmètre

- **Inclus** :
  - 8 teintes d'accent (orange + 7 autres), chacune avec une variante claire et sombre + un
    `--primary-foreground` (blanc ou foncé selon la teinte, pour le contraste AA).
  - Hook `useAccent()` + script bloquant `ACCENT_INIT_SCRIPT` (anti-flash), sur le modèle de
    `useTheme` / `THEME_INIT_SCRIPT` (`lib/theme.ts`).
  - Sélecteur dans les **réglages de lecture** (`m-reading-settings.tsx`) : Row « Couleur
    principale » + échantillons (swatches) cliquables, sélection marquée.
  - Application : `--primary` / `--primary-foreground` posés en inline sur `<html>` (surclassent
    `:root` et `.dark` de `globals.scss`), recalculés au basculement clair/sombre.
- **Exclu** (pour cette itération) :
  - Personnalisation libre (roue couleur / hex code) — 8 teintes éditoriales suffisent ; une
    couleur libre exigerait un calcul de contraste `--primary-foreground` à la volée.
  - Thème clair/sombre distinct de l'accent — l'accent s'adapte au thème existant, ne le remplace.
  - Couleur du **logo / doodles** (spec 18) — les `.riv` ont leur propre thème runtime Rive,
    indépendant du `--primary` CSS. Hors périmètre (peut être aligné plus tard via les variables
    Rive, cf. §8).
  - Couleur `--ring` (anneau de focus) — reste neutre (non lié à `--primary` aujourd'hui).

## 4. Spécification fonctionnelle

### 4.1 Teintes

8 teintes éditoriales, identifiées par un slug, un libellé FR et des valeurs HSL (light/dark) +
foreground. L'orange (`orange`) est le défaut et reproduit les valeurs actuelles de `globals.scss`
(`24 94% 50%` clair / `24 94% 53%` sombre, foreground blanc).

Palette proposée (libellés + ordre du sélecteur) :

| Slug | Libellé | Note |
|---|---|---|
| `orange` | Orange | défaut (identité) |
| `bleu` | Bleu | |
| `vert` | Vert | |
| `violet` | Violet | |
| `rose` | Rose | |
| `cyan` | Cyan | |
| `ambre` | Ambre | foreground probablement foncé (cf. §4.3) |
| `indigo` | Indigo | |

> Les valeurs HSL exactes (light/dark/foreground) sont **à calibrer au test** pour le contraste
> AA sur `bg-background` clair et sombre (cf. §4.3). La structure de données (ci-dessous) est la
> contractuelle ; les triplets sont éditoriaux.

### 4.2 Modèle de données

```ts
export interface AccentShade { primary: string; primaryForeground: string; }
// Valeurs HSL au format "H S% L%" (sans `hsl()`) — format des tokens existants (globals.scss).

export interface Accent {
  id: string;            // ex. "orange"
  label: string;         // ex. "Orange"
  light: AccentShade;    // ex. { primary: "24 94% 50%", primaryForeground: "0 0% 100%" }
  dark: AccentShade;     // ex. { primary: "24 94% 53%", primaryForeground: "0 0% 100%" }
}

export const ACCENTS: Accent[] = [ /* 8 entrées — orange en tête */ ];
export const DEFAULT_ACCENT_ID = "orange";
```

`useAccent()` renvoie `{ accent: Accent, setAccent(id), hydrated }` et applique les variables CSS.
`ACCENT_INIT_SCRIPT` (injecté dans `<head>`, cf. §6.1) lit l'id + résout clair/sombre et pose les
variables avant le paint.

### 4.3 Contraste (AA)

- Chaque teinte doit conserver un contraste AA entre `--primary` (fond des boutons/liens) et
  `--primary-foreground` (texte sur ces fonds), **et** entre le texte coloré `text-primary` et
  `bg-background` (clair + sombre).
- La plupart des teintes saturées acceptent un foreground **blanc** (`0 0% 100%`). L'**ambre**
  (claire) nécessite probablement un foreground **foncé** en mode clair (sinon texte blanc sur
  jaune = illisible) — d'où le `primaryForeground` par variante. Le calibrage se fait à
  l'implémentation avec un check de contraste (ex. script `scripts/check-accent-contrast.ts`, cf.
  §6.1) — **recommandé** mais non bloquant pour v1.

### 4.4 Application & bascule clair/sombre

- Les variables sont posées en **inline** sur `document.documentElement` (`style.setProperty`),
  ce qui sur classe les `:root` / `.dark` de `globals.scss` (l'inline gagne en spécificité).
- L'accent dépend du **thème résolu** (clair/sombre) : on applique `accent.light` ou
  `accent.dark`. → `useAccent` **réapplique** les variables quand le thème change (couplage avec
  `useTheme` : écouter la classe `.dark` sur `<html>` via `MutationObserver`, ou exposer un
  hook combiné `useAccent+theme`). Décision d'implémentation (cf. §8).
- Au montage : hydratation depuis `localStorage` (clé `bym:accent`), puis application. Avant
  hydratation, le script bloquant a déjà posé les variables (anti-flash).

### 4.5 Cas limites

- Aucun choix (`bym:accent` absent) → défaut orange (= valeurs actuelles → rendu identique à
  aujourd'hui, aucune régression visuelle).
- Id inconnu (ancienne valeur supprimée) → repli sur défaut orange.
- `localStorage` indisponible → défaut orange, non persistant (comme `useTheme`).
- Bascule clair/sombre → les variables `--primary` sont recalculées avec la variante dark/light
  de l'accent choisi (pas de flash si le script + hook réappliquent synchro).

## 5. UI / UX

### 5.1 Emplacement & déclencheurs

- Sélecteur dans `m-reading-settings.tsx` : une Row « Couleur principale » + 8 échantillons
  ronds (swatches), alignés, défilables horizontalement si nécessaire. La sélection courante est
  marquée (anneau `ring-2 ring-primary` ou coche centrée).
- Chaque swatch = bouton (`<button>`) avec `aria-label="Couleur : {label}"`, `aria-pressed` =
  sélectionné ou non. Taille ~`h-7 w-7`, couleur = la teinte (aperçu `hsl(primary)`).
- Ordre : orange d'abord (défaut), puis les 7 autres.

### 5.2 Disposition (wireframe)

Dans le panneau de réglages (entre « Logo » et le séparateur « Mode focus », cf. `m-reading-settings`) :

```
Couleur principale   [●][●][●][●][●][●][●][●]
                      ↑ orange (sélectionné : anneau)
```

### 5.3 États & interactions

- **Repos** : 8 swatches, sélection courante marquée.
- **Clic** : applique immédiatement (pas de bouton « Valider ») — feedback visuel instantané
  (toute l'UI recolore à la volée via les variables CSS). Persisté.
- **Survol** : `hover:scale-110` discret (ou anneau secondaire), `prefers-reduced-motion` →
  pas de scale.
- **Focus clavier** : `focus-visible:ring-2` (anneau de focus neutre, cf. §3 exclu `--ring`).

### 5.4 Responsive

- Le panneau de réglages est déjà responsive (popover desktop / bottom sheet tactile). La Row
  « Couleur principale » suit. Sur tactile (coarse), les swatches restent tapables ; pas de
  survol. Sur écran étroit, les 8 swatches tiennent en une ligne (~8 × 28px + gaps ≈ 250px) ; si
  débordement, `overflow-x-auto` sur le conteneur des swatches.

### 5.5 Thème clair/sombre & accessibilité

- **Thème** : chaque accent a ses deux variantes (§4.1) — la bascule clair/sombre ne casse pas
  l'accent, elle change ses valeurs.
- **Accessibilité** :
  - Swatches = vrais `<button>` focusables, `aria-label`, `aria-pressed`.
  - Contraste AA vérifié par teinte (§4.3).
  - L'aperçu d'un swatch utilise `hsl(var(--primary))` de CETTE teinte (pas de la courante) —
    nécessite de poser temporairement les variables ou d'utiliser une couleur statique par
    swatch (implémentation : valeur HSL statique `style={{ background: \`hsl(${shade.primary})\` }}`).
- `prefers-reduced-motion` : pas de `scale` au survol.

### 5.6 Micro-copy (FR)

- Row : « Couleur principale ».
- `aria-label` swatch : « Couleur : {label} » (ex. « Couleur : Orange »).
- `title` swatch : « Accent {label} » (au survol desktop).
- Pas de libellé « par défaut » explicite (l'orange est juste le premier swatch).

## 6. Spécification technique

### 6.1 Fichiers (nouveaux / modifiés)

**Nouveaux**
- `lib/accent.ts` — `Accent`, `ACCENTS` (8), `DEFAULT_ACCENT_ID`, `useAccent()` (hook, modèle
  `useTheme`), `ACCENT_INIT_SCRIPT` (script bloquant anti-flash, injecté dans `<head>` comme
  `THEME_INIT_SCRIPT`).
- `scripts/check-accent-contrast.ts` (optionnel, exécuté à la main) — vérifie le contraste AA de
  chaque `Accent` (light/dark) et logge les teintes non conformes. Non bloquant v1.

**Modifiés**
- `app/layout.tsx` (ou le composant racine qui injecte `THEME_INIT_SCRIPT`) — injecte aussi
  `ACCENT_INIT_SCRIPT` dans `<head>` (avant le paint, après le script thème, car l'accent dépend
  du thème résolu).
- `lib/theme.ts` — **pas** modifié pour la logique, mais `useAccent` peut écouter la classe
  `.dark` (cf. §4.4). Alternative : exposer un hook combiné dans `lib/accent.ts` qui consomme
  `useTheme` et réapplique l'accent au changement.
- `components/molecules/m-reading-settings.tsx` — ajoute la Row « Couleur principale » + swatches,
  props `accent` / `onAccent` (ajoutées au bundle `ReadingSettingsProps`).
- `components/organisms/o-bible-reader.tsx` (ou plus haut, racine applicative) — consomme
  `useAccent()`, passe `accent`/`onAccent` à `ReadingSettings`. L'application des variables est
  centrale dans `useAccent` (pas besoin de propager l'`Accent` à toute l'arborescence — seules
  les variables CSS changent).
- `app/styles/base/globals.scss` — **inchangé** : les valeurs `:root`/`.dark` restent (orange par
  défaut) et servent de repli avant l'hydratation / si `localStorage` vide. L'inline sur `<html>`
  les surclasse au runtime.

### 6.2 Données & persistance

- **Persistance** : clé `localStorage` `bym:accent` = id de l'accent (ex. `"bleu"`). Pattern
  `try/catch + hydrated` existant (cf. `useTheme`).
- **Anti-flash** : `ACCENT_INIT_SCRIPT` lit `bym:accent`, résout le thème (clair/sombre, comme
  `THEME_INIT_SCRIPT`), et pose `--primary`/`--primary-foreground` en inline sur `<html>` avant
  le paint → aucun flash orange→bleu au chargement.
- Aucune donnée sensible, aucune synchro (doctrine projet : localStorage seul).

### 6.3 API / contraintes

- **Aucune API**, aucune dépendance. Tout est runtime CSS + `localStorage`.
- **SSR** : le rendu server utilise les valeurs `:root` de `globals.scss` (orange) ; le script
  bloquant + l'hydratation corrigent côté client avant le paint. Pas de mismatch visible (les
  variables CSS ne provoquent pas d'hydration warning React — ce sont des styles, pas du DOM
  textuel). L'`accent` choisi n'est pas rendu server-side dans le JSX (les swatches utilisent
  des valeurs HSL statiques par teinte, cf. §5.5 — pas de dépendance à l'état hydraté pour le
  rendu du sélecteur ; seul l'état `aria-pressed`/anneau dépend de `hydrated`).
- **Audit couleur** : avant livraison, grep des littéraux couleur durs (`orange`, `amber`,
  hex `#…`, `bg-amber-*`, `text-amber-*`) pour s'assurer que rien de censé suivre l'accent
  n'est codé en dur. Le badge « Expérimental » Strong (spec 02) utilise `amber` intentionally
  (signal distinct de l'accent) → **laissé**. Toute autre occurrence à évaluer.

## 7. Critères d'acceptation

- [ ] 8 swatches dans les réglages ; l'orange est le défaut et le premier.
- [ ] Clic sur un swatch recolore immédiatement toute l'UI (boutons, liens, pastilles actives,
  tick, etc.) via `--primary` — pas de rechargement.
- [ ] Choix persisté (`bym:accent`) ; restauré au rechargement **sans flash** (script bloquant).
- [ ] Bascule clair/sombre → l'accent garde sa teinte, avec sa variante dark/light (pas de flash).
- [ ] Aucun choix / id inconnu → orange (rendu identique à aujourd'hui, zéro régression).
- [ ] Swatches focusables clavier, `aria-label`, `aria-pressed` ; sélection marquée visuellement.
- [ ] Contraste AA respecté pour les 8 teintes (light + dark) — vérifié (script ou manuel).
- [ ] `prefers-reduced-motion` → pas de `scale` au survol.
- [ ] Audit : aucun littéral couleur dur qui devrait suivre l'accent (hors badge amber Strong).
- [ ] `tsc --no-noemit` + `next build` OK ; non-régression thème / focus / panneaux.

## 8. Risques & questions ouvertes

- **Couplage accent/thème** — l'accent dépend du thème résolu (clair/sombre) pour choisir sa
  variante. Deux approches : (a) `useAccent` écoute la classe `.dark` sur `<html>` via
  `MutationObserver` et réapplique ; (b) hook combiné `useAccentTheme` qui consomme `useTheme`.
  **(b) plus propre** (pas d'observer) — à confirmer à l'implémentation.
- **Calibrage HSL** — les triplets exacts des 7 nouvelles teintes sont à calibrer (contraste AA
  + rendu visuel agréable clair/sombre). Le script `check-accent-contrast.ts` (§6.1) aide ;
  sinon calibrage manuel. **ouvert**.
- **Ambre** — probablement le seul accent à foreground foncé en clair (sinon blanc sur jaune).
  À valider ; si problématique, le remplacer par une teinte plus sûre (ex. « Émeraude »).
- **Couleur du logo / doodles** — l'identité visuelle (logo, doodles Rive) reste orange
  indépendante du `--primary`. Si on veut que le logo suive l'accent, c'est un chantier à part
  (le logo est un asset/vectoriel, les doodles ont leur thème Rive). **hors v1, ouvert**.
- **Logo focus / favicon** — le `a-logo.tsx` peut utiliser `text-primary` ou des couleurs
  vectorielles propres. À auditer : le logo doit rester lisible sur les 8 accents. **ouvert**.
- **OG (spec 14)** — la vignette OG est générée server-side avec des couleurs fixes (cf.
  `lib/og-passage.ts`) ; l'accent du destinataire ne s'y applique pas (le serveur ne connaît pas
  son `localStorage`). Acceptable (l'OG reste orange, identité de marque). **hors v1**.
- **Contenu Rive des doodles/quiz (spec 18/19)** — les illustrations `.riv` ont leur propre thème
  runtime, non lié à `--primary`. Aligner (variables Rive ↔ accent) est possible plus tard mais
  complexe. **hors v1, ouvert**.