# Spec 23 — Version du projet & signalement de bug par e-mail

> **Statut** : Proposé · **Priorité** : 🟠 Moyenne · **Effort** : S · **Dépendances** : spec 15 (socle légal, footer, `lib/legal.ts`)

## 1. Objectif
Rendre la **version de l'application** visible par l'utilisateur (pour le débogage et la transparence) et offrir un **canal de signalement de problème** par e-mail (`bug@shemaproject.org`), intégré discrètement dans l'interface existante (footer + crédits de lecture).

## 2. Valeur utilisateur
- **Transparence** : l'utilisateur sait quelle version il utilise — essentiel pour les retours de bug.
- **Canal de retour** : un lien `mailto:` pré-rempli (version, navigateur, URL) facilite le signalement et améliore la qualité des rapports reçus.
- **Confiance** : un projet qui affiche sa version et écoute les retours inspire confiance.

## 3. Périmètre
- **Inclus** :
  - Constante `APP_VERSION` centralisée, alimentée par `package.json` (`version`) ou par la variable d'environnement `NEXT_PUBLIC_APP_VERSION` (si définie, elle priorise).
  - Affichage de la version dans le footer (`SiteFooter`) et les crédits de fin de lecture (`VersionCredits` / `m-version-credits`).
  - Lien de signalement de bug (`mailto:bug@shemaproject.org`) dans le footer et les crédits de lecture, avec sujet et corps pré-remplis (version, URL, user-agent).
- **Exclu (itération 1)** :
  - Formulaire de signalement in-app (trop lourd ; le `mailto:` suffit).
  - Service de crash reporting (Sentry, etc.) — pas de dépendance serveur runtime.
  - Changelog ou page « Nouveautés ».

## 4. Spécification fonctionnelle
- **Version** : une chaîne semver (ex. `0.1.0`) lue depuis `package.json` à la compilation. Si `NEXT_PUBLIC_APP_VERSION` est défini dans l'environnement de build, il priorise (permet de distinguer les déploiements).
- **Affichage** : la version apparaît en texte discret (même style que le copyright existant), par ex. `v0.1.0`. Elle est visible :
  - Dans le `SiteFooter` (pages info, favoris, accueil) — après le copyright.
  - Dans les crédits de fin de lecture (`VersionCredits`) — après les crédits de version biblique et les liens légaux.
- **Signalement de bug** : un lien « Signaler un problème » ouvre le client e-mail avec :
  - **Destinataire** : `bug@shemaproject.org`
  - **Sujet** : `[ShemaProject] Problème sur v{version}`
  - **Corps** pré-rempli :
    ```
    URL : {URL courante}
    Version : v{version}
    Navigateur : {userAgent}
    Description du problème :
    ```
  - Le lien est construit côté client (JS) pour inclure `window.location.href` et `navigator.userAgent`.
- **Emplacement** : le lien de signalement est discrètement intégré à côté des liens légaux existants (même rangée `FooterLinks` / même bloc de crédits).

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
- **Footer plein** (`SiteFooter`) : ligne copyright/version, puis ligne `FooterLinks` + lien « Signaler un problème ».
- **Crédits de lecture** (`VersionCredits`) : après les crédits de version biblique, la même ligne de liens + le lien de signalement.

### 5.2 Disposition (wireframe)
```
Footer plein :
─────────────────────────────────────────────
  Mentions légales · Confidentialité · À propos · Crédits · Signaler un problème
  Vos données restent sur votre appareil · © 2026 ShemaProject · v0.1.0
─────────────────────────────────────────────

Crédits de fin de lecture :
  BYM — …
  LSG 1910 — …
  Mentions légales · … · Crédits · Signaler un problème
  v0.1.0
```

### 5.3 États & interactions
- Lien de signalement : clic → ouvre le client e-mail par défaut (`mailto:`). Pas d'état interne.
- Version : texte statique, pas cliquable.

### 5.4 Responsive
- Même comportement que les liens existants du footer : empilés/centrés en mobile, en ligne en desktop.

### 5.5 Thème clair/sombre & accessibilité
- Même style que les liens légaux existants (`text-foreground/50` / `hover:text-primary`). Lien focusable, `lang="fr"`.

### 5.6 Micro-copy (FR)
- Lien : « Signaler un problème »
- Version : `v0.1.0` (préfixe `v` minuscule)
- Sujet e-mail : `[ShemaProject] Problème sur v0.1.0`

## 6. Spécification technique
### 6.1 Fichiers (nouveaux / modifiés)
- **Modifiés** :
  - `lib/legal.ts` — ajout de `APP_VERSION` (lecture compile-time de `process.env.NEXT_PUBLIC_APP_VERSION ?? package.version`), ajout de `BUG_EMAIL = "bug@shemaproject.org"`, ajout du lien « Signaler un problème » dans `INFO_LINKS` (ou champ `mailto:` séparé).
  - `components/molecules/m-footer.tsx` — affichage de la version après le copyright ; ajout du lien de signalement.
  - `components/molecules/m-version-credits.tsx` — affichage de la version et du lien de signalement en fin de bloc.
  - `package.json` — ajout d'un script `"prebuild": "node scripts/set-version.mjs"` qui injecte la version avant chaque build.
- **Nouveaux** :
  - `scripts/set-version.mjs` — script Node qui :
    1. Lit le dernier tag git annoté (`git describe --tags --abbrev=0`). Si aucun tag n'existe, lit `version` du `package.json`.
    2. Extrait le numéro de version semver (enlève le préfixe `v` si présent, ex. `v0.2.0` → `0.2.0`).
    3. Met à jour le champ `version` du `package.json` avec cette valeur.
    4. Écrit la version dans `.next-version` (fichier texte à la racine, ignoré par git) pour que `lib/legal.ts` puisse la lire si besoin.
  - `lib/bug-report.ts` — fonction `buildBugReportUrl(version: string)` : construit le `mailto:` avec sujet + corps pré-rempli (URL courante, version, user-agent). Appelée côté client uniquement (pas d'accès à `window`/`navigator` en SSR).

### 6.2 Données & persistance
- Aucune runtime. La version est une constante compile-time, le signalement est un lien `mailto:`.
- Le fichier `.next-version` est un artefact de build local (ignoré par git) — il n'est pas lu au runtime, seulement par le script de pré-build.

### 6.3 API / contraintes
- Aucune API. Le lien `mailto:` est côté client uniquement — `buildBugReportUrl` utilise `window.location.href` et `navigator.userAgent`, donc ne peut pas être appelé en SSR. Le composant doit utiliser un handler `onClick` (ou `href` construit au rendu client via un état/local) pour générer l'URL dynamique.
- La version est déterminée au **build time** :
  - **Flux automatisé** : le script `prebuild` (`scripts/set-version.mjs`) lit le dernier tag git et met à jour `package.json.version` avant que webpack n'incline la valeur.
  - **Priorité** : `process.env.NEXT_PUBLIC_APP_VERSION` (si défini par l'environnement CI) > tag git > `package.json` actuel.
  - En local (`pnpm dev`), le `predev` n'est pas nécessaire — c'est la version du `package.json` qui est utilisée telle quelle.

### 6.4 Convention de versionnement (Git tags)
- La version de l'application est pilotée par les **tags git annotés** au format `vX.Y.Z` (semver).
- **Chaque release** : on pose un tag → `npm version patch|minor|major` (qui met à jour `package.json` + pose le tag) → `git push --follow-tags` → Vercel déploie.
- Le script `prebuild` synchronise automatiquement : il lit le tag et met à jour `package.json` si nécessaire. Ainsi, un déploiement déclenché sans avoir bumpé localement reflète quand même le bon tag.
- **Convention de commit** : les commits qui justifient un changement de version suivent le format :
  - `fix: …` → bump **patch** (0.x.Z)
  - `feat: …` → bump **minor** (0.Y.0)
  - `feat!: …` ou `BREAKING CHANGE` → bump **major** (X.0.0) (quand applicable)
  - Les commits sans préfixe (`chore`, `docs`, `style`, etc.) ne justifient pas un bump.
- En pratique, le bump est fait au moment du release via `npm version <patch|minor|major>` (qui crée le commit + le tag).

## 7. Critères d'acceptation
- [ ] La version de l'app (ex. `v0.1.0`) est affichée dans le footer et dans les crédits de fin de lecture.
- [ ] Un lien « Signaler un problème » est visible dans le footer et dans les crédits de fin de lecture.
- [ ] Cliquer le lien ouvre le client e-mail avec destinataire `bug@shemaproject.org`, sujet pré-rempli contenant la version, et corps contenant URL + navigateur + version.
- [ ] La version peut être surchargée par `NEXT_PUBLIC_APP_VERSION` dans l'environnement de build.
- [ ] Le script `scripts/set-version.mjs` lit le dernier tag git et met à jour `package.json.version` avant le build.
- [ ] `npm version patch|minor|major` crée un commit + tag au format `vX.Y.Z` et met à jour `package.json`.
- [ ] Aucune erreur SSR (pas d'accès à `window`/`navigator` côté serveur).
- [ ] Footer et crédits restent visuellement cohérents (thème clair/sombre, responsive).
- [ ] `tsc --noEmit` + `pnpm build` OK ; non-régression home/lecteur/favoris/pages info.

## 8. Risques & questions ouvertes
- **`mailto:` vs. formulaire** : le `mailto:` suppose que l'utilisateur a un client e-mail configuré. Sur mobile, ça ouvre l'app eail native — OK. Sur desktop webmail, c'est plus incertain. À réévaluer si les retours le nécessitent (passer à un formulaire dans une itération future).
- **Spam** : l'adresse `bug@shemaproject.org` sera publique dans le HTML. Un filtre anti-spam côté boîte sera nécessaire.
- **Version dynamique** : l'automatisation via `npm version` + `prebuild` résout le problème. Le développeur lance `npm version patch|minor|major` → commit + tag créés → push → Vercel déploie avec la bonne version.