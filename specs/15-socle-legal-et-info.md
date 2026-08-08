# Spec 15 — Socle légal & informationnel (mentions, confidentialité, à propos, crédits, SEO)

> **Statut** : ✅ Implémenté · **Priorité** : 🔴 Haute · **Effort** : S–M · **Dépendances** : — (éditeur : Quentin Rochefort, particulier)

## 1. Objectif
Mettre le site public en **conformité légale** (LCEN + RGPD) et lui donner son socle informationnel
manquant : pages mentions légales, confidentialité, à propos, crédits/licences, plus un footer et un
socle SEO (`robots`/`sitemap`). C'est un prérequis *exigible* puisque `reader.shemaproject.org` est en
ligne et accessible au public francophone.

## 2. Valeur utilisateur
- **Confiance & légalité** : un site public francophone doit afficher éditeur + hébergeur (LCEN) et une
  politique de confidentialité (RGPD).
- **Argument produit** : le site est 100 % `localStorage`, sans compte ni traceur → la confidentialité
  se résume en *« vos données restent dans votre navigateur »*, ce qui rassure.
- **Découvrabilité** : `robots.txt`/`sitemap.xml` natifs comblent le trou SEO actuel.
- **Crédits** : citer correctement les versions (LSG 1910 = domaine public ; BYM = éditeur).

## 3. Périmètre
- **Inclus** :
  - 4 pages statiques : `/mentions-legales`, `/confidentialite`, `/a-propos`, `/credits`.
  - Un **footer** (`m-footer`) avec liens légaux + crédits courts + version.
  - Points d'entrée : footer sur la home et `/bym/favoris` ; entrée « À propos / Mentions légales »
    dans le menu du dock du lecteur ; `m-version-credits` pointe vers `/credits`.
  - `app/robots.ts` + `app/sitemap.ts` (natifs Next App Router).
  - `metadata` (title/description) par page info.
- **Exclu (itération 1)** :
  - CGU (non requis pour un service gratuit sans compte ; ajoutable plus tard).
  - **Bandeau cookies/consentement** : *non requis tant qu'aucun traceur* (pas d'analytics). À
    réintroduire si Vercel Web Analytics ou autre traceur est ajouté un jour.
  - Déclaration d'accessibilité RGAA formelle (le site vise l'accessibilité mais pas l'audit officiel).
  - Manifest PWA (couvert par spec `01`).

## 4. Spécification fonctionnelle
- **Mentions légales** (éditeur = particulier) : nom de l'éditeur, e-mail de contact, directeur de
  publication ; **hébergeur** = Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA. *(Adresse
  postale de l'éditeur non obligatoire à afficher pour un particulier non-professionnel ; e-mail requis.)*
- **Confidentialité** : déclarer qu'aucune donnée personnelle n'est collectée côté serveur ; lister les
  clés `localStorage` (favoris, signets, notes/surlignages, réglages, version active, position de
  lecture) ; préciser qu'elles ne quittent jamais l'appareil et comment les effacer (vider le stockage
  du navigateur / export-import JSON de la spec 10). Mention RGPD : pas de base légale requise puisque
  pas de traitement côté serveur.
- **À propos** : présentation du projet (lecteur de la Bible de Yéhoshoua ha Mashiah), lien vers
  shemaproject.org, contact.
- **Crédits** : versions (BYM — éditeur à créditer ; LSG 1910 — domaine public), polices (Google Fonts),
  icônes (Iconify/Hugeicons), hébergement (Vercel).
- **robots/sitemap** : autoriser l'indexation ; sitemap listant `/`, `/bym/read`, `/bym/favoris` et les
  4 pages info.

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
- **Footer** : bas de `/` et `/bym/favoris`. Le lecteur plein écran n'a pas de footer → entrée dans le
  **menu du dock** (« À propos / Mentions légales ») et lien depuis `m-version-credits`.
- Pages info : accessibles en navigation directe (URL) et via le footer/dock.

### 5.2 Disposition (wireframe)
```
─────────────────────────────────────────────
  ShemaProject — Lecture de la Bible
  Mentions légales · Confidentialité · À propos · Crédits
  © 2026 · vBYM/LSG · Données 100 % locales
─────────────────────────────────────────────

[ ← Retour ]   Mentions légales
  Éditeur : …    Hébergeur : Vercel Inc. …
  (contenu prose, lisible, max-width lecture)
```

### 5.3 États & interactions
- Pages statiques (pas d'état). Lien « Retour » → home ou `history.back()`.

### 5.4 Responsive
- Footer : liens empilés/centrés en mobile, en ligne en desktop. Pages info : colonne unique,
  `max-width` confort de lecture (~65ch).

### 5.5 Thème clair/sombre & accessibilité
- Réutilise les tokens existants (Tailwind `darkMode: "class"`), `cn()`. Contraste AA, titres
  hiérarchisés (`h1`/`h2`), liens focusables, `lang="fr"`.

### 5.6 Micro-copy (FR)
- Footer : « Mentions légales », « Confidentialité », « À propos », « Crédits »,
  « Vos données restent sur votre appareil ».
- Confidentialité : « Aucune donnée n'est envoyée à un serveur. Tout est stocké dans votre navigateur. »

## 6. Spécification technique
### 6.1 Fichiers (nouveaux / modifiés)
- **Nouveaux** :
  - `app/(info)/layout.tsx` — coque légère (en-tête retour + `m-footer`).
  - `app/(info)/mentions-legales/page.tsx`, `…/confidentialite/page.tsx`, `…/a-propos/page.tsx`,
    `…/credits/page.tsx` (chacun avec `export const metadata`).
  - `components/molecules/m-footer.tsx`.
  - `app/robots.ts`, `app/sitemap.ts`.
  - (option) `lib/legal.ts` — constantes éditeur/hébergeur centralisées, réutilisées par les pages.
- **Modifiés** :
  - `app/page.tsx` et `app/bym/favoris/page.tsx` — montage du footer.
  - `components/molecules/m-reader-dock.tsx` (ou le menu associé) — entrée « À propos / Mentions légales ».
  - `components/molecules/m-version-credits.tsx` — lien vers `/credits`.

### 6.2 Données & persistance
- Aucune. Contenu statique. (`lib/legal.ts` = constantes en dur, pas de stockage.)

### 6.3 API / contraintes
- Aucune API. Pages rendues côté serveur (statique) → bon pour SEO et léger. Respecte les contraintes
  transverses du `README` (atomic design, Tailwind, icônes Hugeicons).

### 6.4 Écarts d'implémentation
- **Atomic design** : pages décomposées en atome `a-prose-section` (h2 + contenu) + template
  `t-info-page` (chrome : retour + h1 + footer) ; les pages ne font que de la composition.
- **Entrée lecteur** : le dock est une barre d'outils serrée sans menu → l'accès aux pages légales se
  fait via `FooterLinks` (molécule `m-footer`) **rendu en fin de lecture dans `m-version-credits`**,
  pas via le dock. Plus discret et sans encombrer le dock.
- **Crédits** : `m-version-credits` reste un bloc d'attribution (non transformé en lien) ; la page
  `/credits` réutilise directement les crédits de `lib/bible-versions.ts`.
- Le **back-link** du template utilise un SVG inline (pas `@iconify/react`) pour garder les pages info
  en Server Components purs (SEO/poids).

## 7. Critères d'acceptation
- [ ] Les 4 pages info existent et sont atteignables depuis le footer et le dock.
- [ ] Mentions légales affichent éditeur (particulier) + contact + hébergeur Vercel.
- [ ] Confidentialité décrit le modèle 100 % local et comment effacer/exporter ses données.
- [ ] Crédits citent BYM, LSG (domaine public), polices, icônes, Vercel.
- [ ] `robots.txt` et `sitemap.xml` servis et corrects (URLs absolues sur `reader.shemaproject.org`).
- [ ] Footer responsive, thème clair/sombre OK, navigation clavier OK.
- [ ] `tsc --noEmit` + `pnpm build` OK ; non-régression home/lecteur/favoris.

## 8. Risques & questions ouvertes
- **Infos éditeur à confirmer avant mise en ligne** : nom à afficher + e-mail de contact (placeholders
  dans `lib/legal.ts` en attendant). Crédit exact attendu pour la BYM.
- **Si ajout futur d'analytics** : réintroduire un bandeau de consentement et une section cookies.
- **Accessibilité** : viser AA sans audit RGAA formel à ce stade.
