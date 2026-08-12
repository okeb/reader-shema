---
name: changelog-check
description: Vérifie / audite que CHANGELOG.md (format Keep a Changelog) est cohérent SemVer et ne fuit aucune information interne ou de sécurité avant publication sur la page /nouveautes. Lance un linter statique sur CHANGELOG.md qui détecte les titres de section techniques non user-facing, les références spec internes, les incohérences SemVer vs git tags et les fuites de noms internes (crypto, schéma DB, routes API, identifiants, variables d'env). À utiliser pour « vérifier le changelog », « check changelog », « semver changelog », « fuite changelog », « page nouveautés », « nettoyage changelog ».
---

# changelog-check — linter du CHANGELOG (format + SemVer + anti-fuite)

Vérifie que `CHANGELOG.md` — rendu tel quel sur la page publique `/nouveautes` — ne contient
**que des changements perceptibles par l'utilisateur**, respecte le format Keep a Changelog,
est cohérent avec le SemVer et les tags git, et **ne divulgue aucune information interne ou de
sécurité**. C'est un linter statique, sans dépendance, ESM, qui scanne `CHANGELOG.md`. Sortie 0
si conforme, 1 sinon.

Le driver est le livrable : `.claude/skills/changelog-check/check-changelog.mjs`. Tous les
chemins ci-dessous sont relatifs à la racine du dépôt.

## Lancer (chemin agent)

```bash
node .claude/skills/changelog-check/check-changelog.mjs            # texte lisible
node .claude/skills/changelog-check/check-changelog.mjs --json     # JSON pour parsing agent
node .claude/skills/changelog-check/check-changelog.mjs --quiet    # résumé seulement
node .claude/skills/changelog-check/check-changelog.mjs --strict-tags  # tags manquants fatals
```

Alias npm : `pnpm run changelog:check`.

Le rapport liste chaque violation `CHANGELOG.md:LINE`. Code de sortie `1` = dérive fatale,
`2` = `CHANGELOG.md` introuvable ou allowlist invalide. En mode `--json`, renvoie
`{ ok, violations[], sections[], versions[], tags[], allowlistEntries, entriesCount }` — un
agent boucle sur `violations` pour proposer des correctifs. Les `S1` (tags manquants) sont des
**warnings** : ils n'échouent pas le build sauf `--strict-tags` (les versions `0.1.x` sont
historiquement non taggées).

## Règles vérifiées

| Règle | Ce qui est contrôlé |
|---|---|
| **F1** — Unreleased en tête | Le fichier commence par `## [Unreleased]` (après le préambule). |
| **F2** — En-tête de version | `## [X.Y.Z] : YYYY-MM-DD` : version SemVer `X.Y.Z` + date ISO. |
| **F3** — Titres de section | `### ` parmi `Ajouté`/`Modifié`/`Corrigé`/`Retiré`/`Sécurisé` (+ alias EN `Added`/`Changed`/`Fixed`/`Removed`/`Security`). Tout autre titre (`Processus`, `Architecture`, `… (spec NN)`, `Changements`, `Ajouts`, `Correctifs`) = violation. |
| **F4** — Section non vide | Aucune `### ` versionnée sans item (Unreleased exempté). |
| **F5** — Version non vide | Aucune `## [X.Y.Z]` sans item (Unreleased exempté). |
| **F6 / L** — Unreleased propre | L'Unreleased est scanné par LEAK comme les autres : pas d'item dev. |
| **S1** — Tags git | Chaque `## [X.Y.Z]` ↔ un tag `vX.Y.Z` (warning, fatal avec `--strict-tags`). |
| **S2** — Bump vs contenu | `Ajouté` → mineur/majeur · `Retiré`/`Sécurisé`/item breaking → majeur · seulement `Corrigé` → patch. Cas clairs fatals (`feature-in-patch`, `breaking-in-patch`, `fix-bumped-minor`) ; ambigus en warning. |
| **S3** — Ordre monotone | Versions décroissantes de haut en bas (Unreleased = +∞) ; dates monotones (warning). |
| **L** — Anti-fuite | Denylist de motifs sensibles (ci-dessous) sur titres + items. |

### Denylist LEAK (familles)

- **crypto** : `PBKDF2`, `AES-GCM`, `SHA-256`, `256-bit`, `non-extractable`, `DEK`, `KEK`,
  `enveloppe`, `master key`, `nonce`, `ciphertext`.
  *(« clé de récupération » et « mot de passe » sont USER-FACING — volontairement absents.)*
- **db** : `BYTEA`, `neon_auth`, `user_data`, `schéma public`, `ON CONFLICT`, `updated_at`,
  `FK`, `pg.Pool`, `pooler`.
- **api** : `/api/sync`, `/api/account`, `GET|PUT|POST|DELETE /api`.
- **ident** : `upgradeLegacyToEnvelope`, `pushKind`, `hasCloudData`, `migrateNotes`,
  `onRehydrateStorage`, `meta[kind]`, `bym:nav-history`, `bibleReaderPrefs`, `horloge LWW`,
  `LWW`, `dated 0`.
- **postmortem** : `ne pousse plus`, `était ignoré`.
- **provider/env** : `send.shemaproject.org`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  `DATABASE_URL`, `RESEND_API_KEY`, `baseURL dérivé`.
- **spec** : `spec NN`, `(spec NN)` — une référence spec est un repère interne, jamais
  visible côté utilisateur.

Chaque match → `fuite <label>: « <match> » — <reason>`. La denylist se modifie en haut du
`check-changelog.mjs` (`LEAK_DENYLIST`), comme les règles d'`arch-check`.

## État actuel du projet (au moment de l'écriture)

Le `CHANGELOG.md` a été réécrit (entrées `0.2.0` et `0.3.0` passées d'un récit technique —
`PBKDF2`, `enveloppe DEK/KEK`, `user_data BYTEA`, `pushKind … horodatage nul`, `spec 22/26/27`,
`/api/sync`, `send.shemaproject.org` — à un ton strictement utilisateur). Le driver ressort
**conforme** (`exit 0`) sur le fichier nettoyé.

Cinq versions `0.1.x` (`0.1.1`, `0.1.4`, `0.1.5`, `0.1.6`, `0.1.11`) livraient historiquement
des `Ajouté` sous des bumps *patch* (SemVer non respecté à l'époque). Non retaggables → elles
sont échappatoires via `.changelog-allowlist.json` (`kind: "version"`). Toute **nouvelle**
incohérence SemVer sera désormais fatale : c'est la barrière de non-régression.

## Échappatoire documentée : allowlist

Pour les exceptions **intentionnelles** (historique figé, mention publique d'un fournisseur…),
créez / éditez `.changelog-allowlist.json` à la racine du dépôt :

```json
[
  { "kind": "version", "match": "0.1.5", "reason": "historique livré avant la gouvernance SemVer" },
  { "kind": "section", "match": "Processus", "reason": "section historique conservée" },
  { "kind": "leak",    "match": "Resend",  "reason": "mention publique autorisée du fournisseur e-mail" }
]
```

- `version` : silencie S1/S2/S3 pour la version `match` exacte.
- `section` : silencie F3 pour tout titre contenant `match`.
- `leak` : silencie un match LEAK dont le texte contient `match`.

Le `reason` est moralement obligatoire — l'exception est documentée dans le dépôt, donc auditable.

## Ajouter le checker en CI / script npm

Le script `changelog:check` est déjà défini dans `package.json`. Pour le (re)créer :

```bash
node -e "const p=require('./package.json');p.scripts['changelog:check']='node .claude/skills/changelog-check/check-changelog.mjs';require('fs').writeFileSync('./package.json',JSON.stringify(p,null,2)+'\n')"
```

Puis `pnpm run changelog:check` (ou en CI : `pnpm changelog:check`).

## Gotchas

- **Parser dupliqué.** Le driver reproduit les 3 regex de `src/shared/constants/legal.ts`
  `parseChangelog` mais **conserve les numéros de ligne** (l'app les jette ; le driver en a
  besoin pour `CHANGELOG.md:LINE`). Le driver et la page partagent la même grammaire, pas le
  même code. Si `parseChangelog` change, mettre à jour `HEADING_RE`/`SUB_RE`/`ITEM_RE`.
- **Continuations.** Une ligne indentée sous un `- ` est concaténée à l'item pour le scan LEAK
  (le driver est plus strict que la page, qui ne rend que la 1ʳᵉ ligne).
- **`Unreleased` vide.** N'est pas une violation (F4/F5 l'exemptent). La page `/nouveautes` le
  masque quand il n'a aucun item réel.
- **`spec NN` est une fuite.** C'est le repère le plus courant dans l'historique ; reformuler
  côté utilisateur (ne jamais citer un numéro de spec).
- **Tags en warning.** Beaucoup de `0.1.x` sont non taggés : `S1` warning pour ne pas rougir
  la CI dès le premier jour. `--strict-tags` pour les rendre fatals.
- **Denylist conservative.** `Better Auth`, `Neon`, `Vercel.app` ne sont PAS dans la liste
  (débattables) ; ajoutez-les si une fuite réelle apparaît, ou utilisez l'allowlist pour une
  mention publique légitime.

## Modifier les règles

- **Format / sections** : `ALLOWED_SECTIONS` (en haut du `.mjs`).
- **Denylist de fuite** : `LEAK_DENYLIST` (ajouter/retirer des `{ pattern, label, reason }`).
- **SemVer** : `bumpType` / `contentProfile` et le bloc `S2` dans `check()`.
- **Marqueur breaking** : `BREAKING_RE`.