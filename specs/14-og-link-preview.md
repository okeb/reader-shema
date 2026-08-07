# Spec 14 — Vignette de partage de lien (Open Graph dynamique)

> **Statut** : ✅ Réalisé · **Priorité** : Moyenne · **Effort** : M · **Dépendances** : — (API existante)
>
> **Écarts d'implémentation** :
> - **Logo** : la variante `light` du logo est **blanche** (invisible sur fond clair) ; on utilise donc
>   la variante **`dark`** (encre noire) sur le parchemin pour le contraste AA — le §5.5 avait l'inverse.
> - **Troncature** : ~**145** caractères (et non 200) pour tenir en **3 lignes** à 40px sans déborder
>   sur le pied — conforme à la limite « 3-4 lignes max » des §5.2/§8.
> - **Repli** : `livre`/`chap` invalides → la page se rabat déjà sur **Jean 1** (`page.tsx`), donc la
>   vignette montre Jean 1 (cohérent avec le lien ouvert). La **carte de repli branding** couvre les cas
>   où le contenu est réellement introuvable : échec API, sélection `v` sans correspondance, refs vides.

## 1. Objectif
Quand on partage le lien d'un verset (ou d'une sélection), générer **à la volée** une vignette
sociale (Open Graph / Twitter Card) affichant le **logo**, la **référence** du passage et le **texte
du verset** (tronqué si trop long, ou résumé si plusieurs versets). Cible : tout endroit qui
« déplie » une URL (WhatsApp, Telegram, Discord, iMessage, X, Facebook, Slack, LinkedIn…).

## 2. Valeur utilisateur
Un lien partagé devient une **invitation visuelle** à lire plutôt qu'une URL brute. Renforce
l'identité du projet (logo + typographie), augmente le taux de clic et la diffusion — levier
d'engagement/rétention aligné avec les specs 06/07.

## 3. Périmètre
- **Inclus** :
  - OG dynamique pour la **lecture continue** : `/bym/read?livre=…&chap=…[&v=…]`.
  - OG dynamique pour le mode **références** : `/bym/read?refs=…`.
  - Balises `og:*` + `twitter:card=summary_large_image` via `generateMetadata`.
  - Image 1200×630 rendue par `next/og` (`ImageResponse`).
  - Troncature intelligente du texte + libellé multi-versets.
  - Carte de **repli** (params absents/invalides) = branding générique.
- **Exclu (cette itération)** :
  - Image **téléchargeable/partageable à la demande** déclenchée par l'utilisateur → c'est la
    **spec 07** (partage image), distincte (action UI vs métadonnée de lien). Les deux peuvent
    partager plus tard un même moteur de rendu de carte.
  - Personnalisation par l'utilisateur (couleur/format).

## 4. Spécification fonctionnelle
Construction du contenu à partir des `searchParams` (mêmes règles de validation que `page.tsx`) :

- **Référence (titre)** :
  - Lecture continue avec `v` : `<Livre> <chap>:<sélection compressée>` (ex. `Jean 3:16`,
    `Psaumes 23:1-4,6`) via `compressVerses` (`services/bible/bibleApi.ts:167`).
  - Lecture continue sans `v` : `<Livre> <chap>` (chapitre entier).
  - Mode `refs` : la **1ʳᵉ** référence + ` (+N)` s'il y en a plusieurs (ex. `Jean 3:16 (+2)`).
- **Texte (corps)** :
  - 1 verset → son texte.
  - Plusieurs versets contigus/sélection → concaténation des textes dans l'ordre, **tronquée**.
  - Chapitre entier (sans `v`) → 1ᵉʳ verset du chapitre (amorce).
- **Troncature** : couper à ~**200 caractères** **à la frontière de mot**, suffixe `…`. Le titre ne
  se tronque pas (les références restent courtes).
- **Cas limites** :
  - Params manquants/invalides, livre/chap hors borne, `v` ne correspondant à aucun verset chargé →
    **carte de repli** (logo + « Lecteur de la Bible » + domaine), HTTP 200 (jamais d'erreur visible
    dans un dépliage de lien).
  - Échec réseau API → carte de repli (idem), **sans** casser la page ni `generateMetadata`.

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
Aucune UI in-app. Déclenché par les **crawlers** qui lisent les balises `<meta>` du document
`/bym/read` puis chargent l'URL d'image `/api/og?...`.

### 5.2 Disposition (wireframe) — 1200 × 630
```
┌──────────────────────────────────────────────────────────┐
│  [LOGO ShemaProject]                                       │  ← marge ~64px
│                                                            │
│  Jean 3:16                                  (référence)    │  ← serif, ~52px, gras
│                                                            │
│  « Car Dieu a tant aimé le monde qu'il a donné son        │  ← serif, ~40px
│  Fils unique, afin que quiconque croit en lui ne          │     interligne aéré, 3–4 lignes max
│  périsse point, mais qu'il ait la vie éternelle… »        │
│                                                            │
│  ─────────────────────────────────────────────            │
│  reader.shemaproject.org                          BYM      │  ← pied discret + mention version
└──────────────────────────────────────────────────────────┘
```

### 5.3 États & interactions
Image **statique** (pas d'interaction). Un seul rendu par combinaison de params.

### 5.4 Responsive
Ratio fixe 1200×630 (standard `summary_large_image`). Les plateformes recadrent elles-mêmes
(certaines en ~1.91:1, d'autres en carré) → garder le contenu clé **centré**, marges généreuses.

### 5.5 Thème clair/sombre & accessibilité
- **Deux palettes** « parchemin » (contraste AA) : `LIGHT` (fond `#f7f3e9`, texte `#2b2620`,
  accent `#f76808`) et `DARK` (fond `#1c1814`, texte `#f2ead9`, accent `#fb7d18` = primary sombre).
- **Résolution du thème** (côté `/api/og`) : param URL `theme=light|dark` → sinon client hint
  `Sec-CH-Prefers-Color-Scheme: dark` → sinon défaut **clair**. Header `Vary: Sec-CH-Prefers-Color-Scheme`
  pour séparer les variantes au cache CDN quand le thème vient du hint (URL identique).
- **Pourquoi pas le thème du lecteur ?** Les vignettes sont fetchées par les *crawlers* des
  plateformes (iMessage, WhatsApp, X, Slack…), pas le navigateur du visiteur : pas de cookie, pas
  de `prefers-color-scheme`, pas d'accès au `localStorage` du thème (cf. `lib/theme.ts`). Le thème
  du lecteur n'est donc **pas observable** côté serveur. Voie fiable = l'encoder dans l'URL :
  `generateMetadata` relaie `?theme=` vers `/api/og`, et l'action **« Copier le lien »** (cluster
  d'actions de verset) inscrit le thème **appliqué** (classe `.dark` sur `<html>` → gère « système »)
  dans l'URL copiée. Le hint n'est qu'un repli best-effort (quasiment jamais envoyé par les
  crawlers d'OG).
- Logo : carte claire → `logo.png` (encre sombre) ; carte sombre → `logo-light.png` (encre claire,
  converti depuis `public/logo/shema_reader-logo_light.webp`).
- `og:image:alt` = la référence + amorce du texte (lecteurs d'écran des réseaux).

### 5.6 Micro-copy (FR)
- Guillemets français `« … »`, tiret cadratin pour la référence si besoin (cohérent avec
  `lib/copy-passage.ts`).
- Pied : `reader.shemaproject.org` · mention version `BYM`.
- Repli : titre `La Bible de Yéhoshoua ha Mashiah`, sous-titre `Lecteur en ligne`.

## 6. Spécification technique
### 6.1 Fichiers (nouveaux / modifiés)
- **Nouveau** `app/api/og/route.tsx` — route handler `GET` retournant `ImageResponse` (`next/og`).
  Lit `livre/chap/v/refs`, valide, récupère le texte, rend la carte JSX. `runtime` Node (Fluid) — le
  runtime Edge n'est pas requis.
- **Modifié** `app/bym/read/page.tsx` — ajouter `export async function generateMetadata({ searchParams })`
  qui calcule la référence + l'URL `/api/og?…` et renvoie `{ title, description, openGraph, twitter }`.
  Relaye aussi `theme` (si `"light"`|`"dark"`) vers l'URL OG (spec 14 §5.5).
- **Modifié** `lib/verse-actions.ts` + `components/molecules/m-verse-actions.tsx` +
  `components/organisms/o-bible-reader.tsx` — action **« Copier le lien »** (`hugeicons:share-04`)
  dans le cluster d'actions de verset : copie l'URL courante + `&theme=<thème appliqué>` (feedback
  `linkCopied` → coche verte). Propage le thème du lecteur vers la vignette OG du destinataire.
- **Modifié** `app/layout.tsx` — ajouter `metadataBase: new URL("https://reader.shemaproject.org")`
  (URL absolue obligatoire pour `og:image`).
- **Nouveau** asset logo pour Satori : `app/api/og/logo.png` (encre sombre, carte claire) +
  `app/api/og/logo-light.png` (encre claire, carte sombre — converti depuis
  `public/logo/shema_reader-logo_light.webp` via `sips`, Satori gère mal le WebP). Le glob
  `./app/api/og/*.png` de `outputFileTracingIncludes` (next.config.js) couvre les deux.
- **Réutilisé** : `getChapter`/`getReferences`/`parseSelection`/`compressVerses`
  (`services/bible/bibleApi.ts`), `getBookById` (`lib/bible-books.ts`),
  `DEFAULT_BIBLE_VERSION` (`lib/bible-versions.ts`), conventions de validation de `page.tsx`.
- **Police** : charger une police serif bundlée pour Satori (lecture cohérente). Réutiliser
  `public/fonts/` (ou un `.ttf`/`.otf` Noto Serif) chargé en `ArrayBuffer` et passé à `ImageResponse({ fonts })`.

### 6.2 Données & persistance
Aucune persistance. Lecture seule de l'API REST existante. **Mise en cache** de la réponse image
recommandée (`Cache-Control: public, max-age=…, s-maxage=…, stale-while-revalidate`) pour des
dépliages rapides et peu coûteux — la donnée d'un verset est immuable.

### 6.3 API / contraintes
- `next/og` `ImageResponse` : sous-ensemble CSS (flexbox uniquement, pas de `gap` partout, styles
  inline), pas d'accès DOM → composer la carte en JSX plat avec styles inline.
- Récupération texte : `fetch(`${API_BASE}…`)` avec **cache** (≠ `no-store` du client) ; tolérer
  l'échec → carte de repli.
- `generateMetadata` doit rester **rapide et tolérante** : ne pas bloquer le rendu de page si l'API
  tarde (le titre/àdescription peuvent se calculer sans le texte ; seule l'image charge le texte).
- Limite de taille/temps des fonctions : la carte est légère (1 logo + texte), OK sous les quotas.

## 7. Critères d'acceptation
- [x] Partager `…/bym/read?livre=jean&chap=3&v=16` affiche une vignette : logo + `Jean 3:16` +
      texte du verset, validée par le [Debugger OG de Facebook] et les Cartes X.
- [x] Sélection multiple `?v=1-5,8` : titre `… 1-5,8`, corps = concaténation tronquée (~145 car.) + `…`.
- [x] Sans `v` : titre `Jean 3`, corps = amorce (1ᵉʳ verset).
- [x] Mode `?refs=jean/3/16,romains/5/8` : titre `Jean 3:16 (+1)`.
- [x] Params invalides / API en échec : carte de repli branding, **HTTP 200**, jamais d'erreur.
- [x] `twitter:card=summary_large_image`, `og:image:width/height=1200/630`, `og:image:alt` présents.
- [x] `metadataBase` posée → URL d'image **absolue** en HTML.
- [x] Image lisible (contraste AA), logo net, troncature au mot (pas de coupure en plein mot).
- [x] Réponse `/api/og` mise en cache (header `s-maxage`), temps de rendu < ~1 s à froid.
- [x] `?theme=dark` → carte sombre (logo encre claire, contraste AA) ; sans `theme` → carte claire.
      Header `Vary: Sec-CH-Prefers-Color-Scheme` présent.
- [x] Action « Copier le lien » → URL avec `&theme=` = thème appliqué ; l'URL OG pointe vers la
      vignette au bon thème.

## 8. Risques & questions ouvertes
- **WebP/Satori** : confirmer le format du logo OG (PNG export vs SVG inline). → PNG recommandé.
- **Longueur de troncature** : 200 car. est un défaut ; à ajuster visuellement (3–4 lignes max).
- **Thème de la carte** : ~~fixe clair retenu ; faut-il une variante sombre détectable ?~~ **Résolu** :
  deux palettes (clair/sombre) ; le thème est encodé dans l'URL (`?theme=`) relayé par
  `generateMetadata` + action « Copier le lien », avec repli best-effort sur le client hint
  `Sec-CH-Prefers-Color-Scheme`. Le thème du *lecteur* reste indétectable côté serveur (crawlers
  sans cookie/prefers-color-scheme) — l'URL est la voie fiable (cf. §5.5).
- **Police** : confirmer qu'une serif libre (Noto Serif) couvre les caractères FR ; sinon fallback.
- **Mutualisation avec spec 07** : prévoir un composant de carte commun à terme (rendu identique
  pour l'OG et pour le partage image à la demande) — non bloquant pour cette itération.
- **Coût/quotas** : le cache rend les dépliages quasi gratuits ; surveiller si un livre/chap très
  partagé génère du trafic API.
