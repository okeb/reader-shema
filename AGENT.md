# AGENT.md — Convention de travail (Git Flow)

> Ce fichier gouverne la façon dont l'agent (Claude Code) collabore au dépôt `reader_shema`.
> Il est chargé automatiquement à chaque session. **En cas de conflit avec une instruction
> ponctuelle de l'utilisateur, l'utilisateur gagne.**

## 1. Pourquoi Git Flow

Le projet versionne via des **tags git** lus par `scripts/set-version.mjs`
(`git describe --tags --abbrev=0` → `package.json` / `.next-version`). Le `CHANGELOG.md` suit
[Keep a Changelog](https://keepachangelog.com/fr/). Git Flow est donc le modèle le plus adapté :
il isole chaque évolution, garde `master` exclusivement pour les releases taggées, et fait de
`develop` le point de fusion de tout le travail en cours.

## 2. Modèle de branches

| Branche | Rôle | Source | Re-mergé vers | Commit direct ? |
|---------|------|--------|---------------|-----------------|
| `master` | Production. Chaque commit = une release taggée `vX.Y.Z`. | — | — | ❌ Jamais |
| `develop` | Intégration de la prochaine release. | `feature/*` `release/*` `hotfix/*` | — | ❌ (uniquement des merges `--no-ff`) |
| `feature/<slug>` | Une évolution produit/technique. | `develop` | `develop` | ✅ (commits de travail) |
| `release/<X.Y.Z>` | Préparation d'une release (CHANGELOG + version). | `develop` | `master` **et** `develop` | ✅ (uniquement meta) |
| `hotfix/<slug>` | Correctif urgent en production. | `master` | `master` **et** `develop` | ✅ |

> **Note** : la branche de production s'appelle `master` dans ce dépôt (pas `main`).

## 3. Règles de nommage

- Branche de travail : `feature/<slug-kebab-court-descriptif>` — ex. `feature/strong-concordance`,
  `feature/pwa-offline`. Une spec = idéalement une feature nommée d'après la spec
  (`feature/spec-05-reading-plans`).
- Travail non-produit (docs, outillage, processus) : `chore/<slug>` ou `docs/<slug>`.
- Release : `release/X.Y.Z` (**sans** le `v`).
- Hotfix : `hotfix/<slug>`.
- Slug en kebab-case, court, descriptif.

## 4. Boucle de travail (à appliquer pour chaque tâche)

1. **Se synchroniser** : `git checkout develop && git pull origin develop`.
2. **Créer la branche** : `git checkout -b feature/<slug> develop`.
3. **Coder** dans la feature branch. Commits courts et atomiques respectant **strictement**
   le format décrit au §10 (`<type>(<portée>): <sujet>` + description + footer).
4. **Terminer la feature** (une fois testée) :
   ```
   git checkout develop
   git merge --no-ff feature/<slug> -m "Merge feature/<slug> into develop"
   ```
   `--no-ff` préserve l'historique de branche (merge commit visible) — obligatoire.
5. **Pousser** : `git push origin develop`.
6. **Nettoyer** (après validation par l'utilisateur / passage en prod) :
   `git branch -d feature/<slug>`.
7. **CHANGELOG** : à chaque merge de feature, ajouter une ligne sous `## [Unreleased]` dans
   `CHANGELOG.md` (section `### Ajouté` / `### Modifié` / `### Corrigé` / `### Retiré` / `### Sécurisé`).
   **Ton utilisateur uniquement** — voir §11 (rédaction du CHANGELOG). L'agent le fait au moment
   du merge ; la release ne fait que *finaliser* cette section.
8. **`pnpm changelog:check`** avant tout push sur `develop` (et avant toute release) : le
   linter `changelog-check` valide le format, la cohérence SemVer et l'absence de fuite
   d'information interne. Sortie non nulle = corriger avant de pousser.

### Règles strictes
- ❌ Ne jamais committer directement sur `master`.
- ❌ Ne jamais push sur `master` sans un tag de release.
- ❌ `develop` ne reçoit que des merges `--no-ff` (pas de commit direct).
- ✅ Toujours `--no-ff` pour conserver l'historique de branche.
- ✅ Avant chaque push sur `origin/develop`, s'assurer que `develop` est à jour
  (`git pull --rebase origin develop` si nécessaire).
- ❌ Ne jamais pousser de secret ; `.env*` (sauf `.env.example`) est ignoré.

## 5. Release (quand suffisamment de features sont accumulées sur `develop`)

> Déclencheur : l'utilisateur le demande, ou un lot cohérent de features est prêt pour la prod.

1. `git checkout develop && git pull origin develop`
2. `git checkout -b release/<X.Y.Z> develop` (déterminer X.Y.Z — voir §7)
3. **Finaliser le CHANGELOG** :
   - Renommer la section `## [Unreleased]` courante en `## [X.Y.Z] : YYYY-MM-DD` (date du jour).
   - Recréer une section `## [Unreleased]` vide en haut du fichier.
4. Mettre à jour `package.json` (`version` → `X.Y.Z`) pour cohérence — le tag git reste la source
   de vérité lue par `set-version.mjs`. Commit : `chore(release): vX.Y.Z`.
5. `git checkout master && git pull origin master` (si master n'existe pas sur origin, le push crée la branche).
6. `git merge --no-ff release/<X.Y.Z> -m "Release X.Y.Z"`
7. `git tag vX.Y.Z` — **c'est ce tag que `set-version.mjs` lit** pour la version affichée dans l'app.
8. `git push origin master && git push origin vX.Y.Z`
9. Re-merger vers develop : `git checkout develop && git merge --no-ff release/<X.Y.Z> && git push origin develop`
10. `git branch -d release/<X.Y.Z>`

## 6. Hotfix (correctif urgent en production)

1. `git checkout master && git pull origin master`
2. `git checkout -b hotfix/<slug> master`
3. Corriger + committer (`fix: …`). Ajouter une ligne sous une nouvelle section
   `## [X.Y.Z+1]` du CHANGELOG (ou `## [Unreleased]` si une release est déjà en cours).
4. `git checkout master && git merge --no-ff hotfix/<slug>`
5. `git tag vX.Y.Z` (patch bump)
6. `git push origin master && git push origin vX.Y.Z`
7. `git checkout develop && git merge --no-ff hotfix/<slug> && git push origin develop`
8. `git branch -d hotfix/<slug>`

## 7. Numérotation de version (SemVer)

- `MAJEUR.MINEUR.CORRECTIF` (`X.Y.Z`).
- `MAJEUR` : changement incompatible / refonte publique.
- `MINEUR` : nouvelle feature rétro-compatible (typiquement une spec livrée).
- `CORRECTIF` : bug fix rétro-compatible (hotfix ou fix de release).
- Version actuelle de référence : voir le dernier tag `git describe --tags` ou `CHANGELOG.md`.
- Tag préfixé de `v` : `v0.1.13`, `v0.2.0`… Branche `release/` **sans** le `v`.

## 8. Spécifications (specs/)

Chaque évolution produit est spécifiée dans `specs/NN-<slug>.md` (gabarit `_TEMPLATE.md`,
index dans `specs/README.md`). Une spec « Proposé » n'engage rien ; elle devient plan
d'implémentation (repris dans `PLAN.md`) puis est réalisée via une `feature/<slug>`. À la
livraison, son statut passe à ✅ Implémenté dans `specs/README.md`.

## 9. Résumé — ce que l'agent fait par défaut

- Pour **toute** tâche de code : créer une `feature/` (ou `chore/`) depuis `develop`, y travailler,
  merger `--no-ff` vers `develop`, push `origin/develop`. Ne jamais coder directement sur `develop`.
- Ne faire de **release** que sur demande explicite (ou accord de l'utilisateur) : suivre §5,
  mettre à jour le `CHANGELOG.md`, tagger, pusher `master` + tag.
- Mettre à jour le `CHANGELOG.md` à chaque merge de feature (sous `[Unreleased]`).
- **Tous** les commits respectent strictement le format §10.

## 10. Format des commits (obligatoire)

Chaque commit suit le format [Conventional Commits](https://www.conventionalcommits.org/) :

```
<type>(<portée>): <sujet>

<description>

<footer>
```

### Type (obligatoire)

| Type | Usage |
|------|-------|
| `feat` | Ajout d'une fonctionnalité |
| `fix` | Correction de bogue |
| `perf` | Amélioration des performances |
| `refactor` | Changement de code sans changement de comportement |
| `style` | Changement de style du code (sans changer la logique) |
| `test` | Modification des tests |
| `docs` | Documentation |
| `build` | Système de build (gulp, webpack, npm, etc.) |
| `ci` | Intégration continue (Travis, Circle, BrowserStack, SauceLabs, etc.) |
| `chore` | Tâches diverses ne rentrant pas dans les catégories ci-dessus (outillage, dépendances, processus) |

### Portée (optionnelle)

Partie de l'application/librairie affectée — `feat(reader): …`, `fix(strong): …`,
`docs(agent): …`. Sans portée : `docs: …`. Suivie d'un `:` puis d'une espace.

### Sujet

- Description **succincte** des changements.
- **Impératif présent** : « change », pas « changed » ni « changes ».
- **Pas de majuscule** au début.
- **Pas de point** à la fin.
- ≤ ~50 caractères idéalement.

### Description (corps)

- Détaille les **motivations** derrière le changement (le « pourquoi »), pas seulement le « quoi ».
- Mêmes règles que le sujet : impératif présent, pas de majuscule, pas de point à la fin de chaque
  ligne/paragraphe.
- Laisser une **ligne vide** entre le sujet et la description.

### Footer

- **Breaking Changes** : préfixer `BREAKING CHANGE:` puis l'explication. Le type peut aussi porter
  un `!` : `feat(api)!: …`.
- **Références** : `Closes #123`, `Refs #42`, `Fixes #7` (issues GitHub/GitLab).
- Laisser une **ligne vide** entre la description et le footer.

### Exemples

```
feat(reader): ajouter le mode focus

le mode focus masque la topbar et le dock tant que la touche Escape
n'est pas pressée, pour réduire les distractions pendant la lecture

Closes #14
```

```
fix(strong): gérer l'absence de code strong sur la version lsg

la concordance repliait vers un état vide quand le code strong etait
invalide ; on affiche maintenant un message explicite
```

```
docs(agent): formaliser le format des commits conventionnels

ajoute la section 10 a AGENT.md decrivant le format type(portee): sujet
plus description et footer, ainsi que les regles de typographie
```

> Les **commits de merge** Git Flow suivent un format libre :
> `Merge feature/<slug> into develop` (cf. §4 étape 4).

## 11. Rédaction du CHANGELOG (obligatoire)

Le `CHANGELOG.md` est rendu **tel quel** sur la page publique `/nouveautes`. Il ne doit donc
contenir **que des changements perceptibles par l'utilisateur** — jamais d'information interne
ou de sécurité. La conformité est vérifiée par `pnpm changelog:check`
(skill `changelog-check`, cf. `.claude/skills/changelog-check/SKILL.md`).

### Ton : utilisateur uniquement

- Décrire **ce que voit l'utilisateur** (feature, UX, correctif visible), pas le « comment ».
- Un item se lit en une phrase, sans jargon d'implémentation.

### Contenu interdit (fuite d'information)

❌ Aucun de ces éléments ne doit apparaître dans une entrée changelog :

- **Crypto** : `PBKDF2`, `AES-GCM`, `SHA-256`, `256-bit`, `non-extractable`, `DEK`, `KEK`,
  `enveloppe`, `master key`, `nonce`, `ciphertext`.
- **DB / schéma** : `BYTEA`, `neon_auth`, `user_data`, `schéma public`, `ON CONFLICT`,
  `updated_at`, `FK`, `pg.Pool`, `pooler`.
- **API** : routes internes (`/api/sync`, `/api/account`, `GET/PUT/POST/DELETE /api…`).
- **Identifiants internes** : noms de fonctions (`upgradeLegacyToEnvelope`, `pushKind`…),
  clés `localStorage` (`bym:nav-history`, `bibleReaderPrefs`), mécanique sync (`LWW`,
  `meta[kind]`, `dated 0`).
- **Récit de bug interne** (postmortem) : « ne pousse plus », « était ignoré »… → reformuler
  en correctif utilisateur (« certaines données n'apparaissaient pas sur un second appareil ;
  corrigé »).
- **Provider / env** : `send.shemaproject.org`, `BETTER_AUTH_SECRET`, `DATABASE_URL`,
  `RESEND_API_KEY`, `baseURL dérivé`…
- **Références spec** : `spec 22`, `(spec 28)`… — un numéro de spec est un repère interne,
  jamais visible côté utilisateur.

✅ Sont **user-facing** et donc autorisés : « clé de récupération », « mot de passe »,
« synchronisation chiffrée », « compte facultatif », « concordance Strong »…

### Sections autorisées

`### Ajouté` · `### Modifié` · `### Corrigé` · `### Retiré` · `### Sécurisé` (+ alias EN
`Added`/`Changed`/`Fixed`/`Removed`/`Security`). Tout autre titre (`Processus`, `Architecture`,
`Fonctionnalités`, `… (spec NN)`, `Changements`, `Ajouts`, `Correctifs`) est **interdit**.

### SemVer vs contenu

Le bump doit refléter le contenu de la section (vérifié par `changelog:check`, règle S2) :

| Contenu de la section | Bump attendu |
|---|---|
| `Ajouté` (nouvelle feature) | `MINEUR` (ou `MAJEUR` si breaking) |
| seulement `Corrigé` | `CORRECTIF` |
| `Retiré` / `Sécurisé` / item breaking | `MAJEUR` |
| seulement `Modifié` (cosmétique) | `CORRECTIF` ou `MINEUR` |

### Boucle de travail

- À chaque merge de feature : ajouter l'item sous `## [Unreleased]` dans la bonne section.
- Lancer `pnpm changelog:check` avant de pousser sur `develop`.
- À la release (§5) : renommer `## [Unreleased]` en `## [X.Y.Z] : YYYY-MM-DD`, recréer un
  `## [Unreleased]` vide, puis `pnpm changelog:check` avant le tag.
- Exception historique figée (version déjà publiée non retaggable) : documentée dans
  `.changelog-allowlist.json` avec un `reason`.