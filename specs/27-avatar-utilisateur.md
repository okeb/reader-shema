# Spec 27 — Avatar utilisateur (générateurs au choix, fond thématique)

> **Statut** : Proposé · **Priorité** : 🟢 Basse (cosmétique) · **Effort** : S · **Dépendances** : spec 22 (compte/session), spec 26 (Better Auth `session.user.id`), spec 03 (réglages de lecture), spec 20 (couleur d'accent)

## 1. Objectif
Quand l'utilisateur est **connecté**, le bouton « Apparence » (roue crantée `hugeicons:settings-02`,
en haut à droite de la topbar — `m-appearance-menu.tsx`) est **remplacé par un avatar** généré
déterministiquement depuis son identifiant. L'utilisateur choisit le générateur entre deux libs
zéro-dépendance, MIT :
- **`minidenticons`** (laurentpayot/minidenticons) — identicons pixelisés (SVG string, ~269 B).
- **`playful-avatars`** (cmaas/playful-avatars) — avatars géométriques, 6 variantes (web component).

L'avatar a un **fond qui suit le thème** (clair/sombre). **Déconnecté** → le bouton reste la roue
crantée (comportement inchangé). Clic sur l'avatar = ouvre le menu Apparence (même affordance).

## 2. Valeur utilisateur
- **Repère de l'état connecté** : l'avatar remplace la roue = « tu es connecté, c'est toi », sans
  texte ni bannière.
- **Personnalisation cosmétique sans donnée serveur** : génération 100 % client, déterministe
  depuis la seed → **même avatar sur tous les appareils** sans rien stocker ni synchroniser.
- **Zéro fuite** : contrairement à Gravatar, aucun appel réseau vers un tiers — cohérent avec la
  doctrine « aucune collecte par défaut » (spec 15/22). La seed est l'`user.id` Better Auth (opaque,
  aléatoire), pas l'e-mail (évite d'incorporer une PII dans un hash visible).
- **Léger** : les deux libs pèsent < 1 Ko chacune, zéro dépendance.

## 3. Périmètre
- **Inclus** :
  - Nouvel atome `src/presentation/components/atoms/a-avatar.tsx` : génère un avatar depuis une seed,
    selon le générateur + variante choisis, dans un conteneur `h-9 w-9 rounded-full` (mêmes dimensions
    que le bouton Apparence) à fond thématique.
  - Choix du générateur (`minidenticons` | `playful-avatars`) + variante playful (6) : préférence
    cosmétique persistée localement (`reader-prefs`, localStorage `bym:reader-preferences`).
  - `m-appearance-menu.tsx` : trigger conditionnel — avatar si `session.active`, roue sinon. Le clic
    ouvre toujours le menu Apparence.
  - `o-account-provider.tsx` : `useSessionIndicator` expose `userId` (seed) en plus de
    `active`/`email`.
  - Entrée « Avatar » dans le menu Apparence (sélecteur générateur +, pour playful, variante).
  - Fond thématique via tokens existants (`bg-foreground/5 dark:…`, `ring-border`).
- **Exclu** :
  - **Upload d'image personnalisée** (avatar fichier) — hors scope : implique du stockage serveur,
    contradictoire avec la doctrine zero-collecte.
  - **Nouveau kind de sync** : le choix d'avatar est une préférence cosmétique locale (comme
    `logoStyle`) ; si l'opt-in « Synchroniser mes réglages » (spec 22/25) est actif, il se synchronise
    via le kind `readerPrefs` **existant** — pas de nouveau kind, pas de nouveau blob.
  - **Avatar ailleurs** (footer, page `/account`) — seule la topbar. La page `/account` affiche déjà
    l'e-mail ; on n'ajoute pas l'avatar partout.

## 4. Spécification fonctionnelle

### 4.1 Générateurs (API vérifiée contre les README)
- **minidenticons** : `minidenticon(seed, saturation?, lightness?)` → **string SVG** (non mémoïsé).
  Wrapper React fourni : SVG encodé en data-URI dans un `<img>`, mémoïsé par `useMemo`. Pas de
  variante (style unique pixelisé). Thémage via `saturation`/`lightness` (défaut 95/45).
- **playful-avatars** : web component `<playful-avatar name variant colors>`. 6 variantes :
  `beam` (défaut), `marble`, `pixel`, `sunset`, `ring`, `bauhaus`. Thémage via palette `colors`
  (tableau de hex). Sizing/border-radius via CSS (`::part(svg)`).

### 4.2 Seed
- `session.user.id` (Better Auth, spec 26) : stable, identique sur tous les appareils, opaque
  (aléatoire — n'incorpore pas l'e-mail). **Pas l'e-mail** (PII, peut changer).

### 4.3 États du trigger
- **Déconnecté / session en cours** (`active === null | false`) → roue crantée (inchangé).
- **Connecté** (`active === true` et `userId` résolu) → avatar (générateur + variante choisis).
- **Connecté mais `userId` pas encore résolu** (race au montage) → repli temporaire sur la roue
  (évite un flash / un mismatch d'hydration).

### 4.4 Choix (réglage)
- Entrée « Avatar » dans le menu Apparence (visible tous appareils, après « Logo », avant
  « Réduire les animations »). Deux cartes-radio (minidenticons aperçu / playful aperçu) ; si
  playful sélectionné, sous-sélecteur des 6 variantes en grille. **Aperçu live depuis la seed
  courante** de l'utilisateur.
- Persistance : `avatarStyle: 'minidenticons' | 'playful'` + `avatarVariant: PlayfulVariant` dans
  `ReaderPreferences` (defaults : `playful` + `beam`). Synchronisé via `readerPrefs` si opt-in.

## 5. UI / UX

### 5.1 Trigger (wireframe)
```
déconnecté :  [⚙]        →  connecté :  [ avatar rond, fond thématique ]
```
Mêmes dimensions (`h-9 w-9`), même glass pill, même ancrage du popover, même `title`/`aria-label`
que le bouton Apparence. L'avatar **est** le bouton : clic → ouvre le menu Apparence.

### 5.2 Fond thématique
- Conteneur : `rounded-full` + `ring-1 ring-border` + fond `bg-muted/60 dark:bg-muted/30`
  (suit le thème via variants `dark:`).
- minidenticons : SVG à fond transparent → le fond du conteneur est visible. `lightness` ajustée
  au thème (clair ≈ 45, sombre ≈ 55) pour la lisibilité.
- playful-avatars : SVG remplit le cercle → le fond du conteneur est peu visible ; le `ring` + la
  bordure suffisent à délimiter.

### 5.3 Menu « Avatar »
- `role="radiogroup"` : 2 options « Identicons » (minidenticons) / « Avatars » (playful), chacune
  avec un aperçu de l'avatar courant.
- Si playful : grille des 6 variantes (`role="radio"`), aperçu live.
- Focus visible (rings existants), fermeture au clic dehors / Échap (comme le reste du menu).

## 6. Spécification technique

### 6.1 Dépendances
```
pnpm add minidenticons playful-avatars
```
Les deux : zéro dépendance, MIT, < 1 Ko.
- `import { minidenticon } from 'minidenticons'` → string SVG.
- `import 'playful-avatars'` (side-effect : enregistre le custom element) puis
  `<playful-avatar name={…} variant={…} colors={[…]}>` en JSX. **TypeScript** : le custom element
  n'est pas typé nativement → déclarer dans `IntrinsicElements` (ou un wrapper React typé qui rend
  le web component) pour éviter `any`.

### 6.2 Fichiers (nouveaux / modifiés)
- **Nouveau** `src/presentation/components/atoms/a-avatar.tsx` : props
  `{ seed: string; style: AvatarStyle; variant?: PlayfulVariant; theme: 'light'|'dark'; className? }`.
  Rend minidenticons (`<img src={dataUri}>` mémoïsé) ou playful (`<playful-avatar>`). `aria-hidden`
  sur le rendu (l'avatar est décoratif ; le label vit sur le bouton parent).
- **Modifié** `m-appearance-menu.tsx` : trigger conditionnel (avatar si `session.active`), entrée
  « Avatar » dans le menu (radiogroup + grille variantes playful).
- **Modifié** `o-account-provider.tsx` : `useSessionIndicator` → `{ active, email, userId }`
  (`session.data?.user?.id ?? null`).
- **Modifié** `src/shared/constants/reader-preferences.ts` : `AvatarStyle`, `PlayfulVariant` +
  `avatarStyle`/`avatarVariant` dans `ReaderPreferences` + defaults (`playful`/`beam`).
- **Modifié** `reader-preferences.store.ts` : setters `setAvatarStyle`, `setAvatarVariant`.
- **Non modifié** `legal.ts` `STORAGE_KEYS` : `bym:reader-preferences` déjà listé (sync opt-in) —
  pas de nouvelle clé.

### 6.3 Contraintes
- **SSR / hydration** : la topbar est `'use client'`, mais le rendu serveur d'un custom element
  (`playful-avatar`) ou d'un data-URI mémoïsé peut causer un mismatch. Rendre l'avatar
  **uniquement après mount** (repli roue côté SSR / premier paint) via un flag `mounted`.
- **Thème** : lire `useThemeCycle().theme` (résolu `light`/`dark`) ; le fond s'appuie sur les variants
  `dark:`. Recalculer l'aperçu au changement de thème (minidenticons `lightness`).
- **Performance** : générer une fois par seed (`useMemo`). minidenticon n'est pas mémoïsé en
  interne → mémoïsation côté composant. playful : le web component gère son rendu shadow DOM.
- **React 19 + custom elements** : React 19 supporte la propagation des props vers les custom
  elements ; `colors` (array) peut nécessiter un `ref` + affectation impérative si l'attribut
  string ne suffit pas (comma-separated hex) — à confirmer à l'implémentation.

## 7. Critères d'acceptation
- [ ] Déconnecté : la topbar affiche la roue crantée (comportement inchangé).
- [ ] Connecté : la topbar affiche l'avatar (fond thématique) aux mêmes dimensions/emplacement que
  la roue ; le clic ouvre le menu Apparence.
- [ ] L'avatar est déterministe depuis `user.id` → **identique sur tous les appareils** pour un même
  compte (vérifiable en se connectant sur un second appareil).
- [ ] L'utilisateur peut choisir entre minidenticons et playful-avatars dans le menu Apparence ; le
  changement s'applique immédiatement au trigger et à l'aperçu.
- [ ] Pour playful, l'utilisateur peut choisir parmi les 6 variantes.
- [ ] Le fond de l'avatar suit le thème (clair/sombre) — vérifiable en basculant le thème.
- [ ] Le choix persiste au rechargement ; si l'opt-in « Synchroniser mes réglages » est actif, il se
  synchronise entre appareils (kind `readerPrefs` existant — pas de nouveau kind).
- [ ] Aucune donnée envoyée à un service tiers (génération 100 % client).
- [ ] `tsc --noEmit` + `pnpm build` verts ; pas de régression lecture / menus existants.
- [ ] Doctrine : zéro collecte serveur — l'avatar n'ajoute aucune donnée personnelle stockée.

## 8. Risques & questions ouvertes
- **Web component + TS** : `playful-avatar` non typé → déclarer `IntrinsicElements` ou wrapper
  React typé. `colors` array vs attribut string comma-separated — à confirmer à l'implémentation.
- **Hydration** : custom element rendu serveur → risque mismatch. Rendre après mount (repli roue).
- **Seed PII** : `user.id` opaque (Better Auth génère un id aléatoire) — **ne pas** hasher l'e-mail.
- **Palette thématique playful** : définir une palette par thème (clair/sombre) ou réutiliser la
  couleur d'accent (spec 20) ? **Question ouverte** — recommandation : palette neutre accordée à
  l'accent, deux jeux clair/sombre.
- **minidenticons `lightness` thème** : ajuster le paramètre selon thème (clair 45 / sombre 55)
  plutôt qu'un `filter` CSS (préserve la netteté du pixel art).
- **Variante ignorée** : si l'utilisateur choisit minidenticons, la variante playful est ignorée
  (silencieusement) mais **mémorisée** pour un retour à playful sans perte.
- **Accessibilité** : `aria-hidden` sur le SVG décoratif, `aria-label`/`title` « Apparence » sur le
  bouton (comportement identique à la roue) ; `aria-current` indicateur de connexion discret déjà
  présent dans le menu (spec 22).
- **Focus** : `focus-visible:ring` sur le bouton-avatar (identique à la roue).