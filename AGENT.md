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
3. **Coder** dans la feature branch. Commits courts et atomiques, préfixés
   [Conventional Commits](https://www.conventionalcommits.org/) quand pertinent :
   `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`, `perf:`.
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
   `CHANGELOG.md` (section `### Ajouté` / `### Modifié` / `### Corrigé`). L'agent le fait au
   moment du merge — la release ne fait que *finaliser* cette section.

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