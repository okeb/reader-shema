---
name: arch-check
description: Vérifie / audite que la clean architecture (Clean Architecture + CQRS + atomic design) du projet est respectée de façon stricte. Lance un linter statique sur src/ qui détecte les dépendances inter-couches interdites, les violations de tier atomic design, les .impl.ts mal placés et le domain non-pur. À utiliser pour « vérifier l'architecture », « check arch », « architecture clean », « audit couches », « avais-tu respecté l'architecture ».
---

# arch-check — linter d'architecture clean

Vérifie **strictement** que `src/` respecte l'architecture du projet (Clean Architecture + CQRS + atomic design). C'est un linter statique, sans dépendance, qui scanne tous les `.ts`/`.tsx` de `src/`, résout les imports (alias `@/*` et relatifs), et signale toute dérive. Sortie 0 si conforme, 1 sinon.

Le driver est le livrable : `.claude/skills/arch-check/check-arch.mjs`. Tous les chemins ci-dessous sont relatifs à la racine du dépôt.

## Lancer (chemin agent)

```bash
node .claude/skills/arch-check/check-arch.mjs            # texte lisible
node .claude/skills/arch-check/check-arch.mjs --json     # JSON pour parsing agent
node .claude/skills/arch-check/check-arch.mjs --quiet    # résumé seulement
```

Alias npm (si ajouté) : `pnpm run arch:check`.

Le rapport liste chaque violation `file:line`, la règle enfreinte et le spec fautif. Code de sortie `1` = dérive présente. En mode `--json`, renvoie `{ ok, violations[], allowlistEntries, filesScanned }` — un agent boucle sur `violations` pour proposer des correctifs.

## Règles vérifiées

| Règle | Ce qui est contrôlé |
|---|---|
| **A** — Direction des couches | `domain → {domain, shared}` · `application → {application, domain, shared}` · `infrastructure → {infrastructure, application, domain, shared}` · `presentation → {presentation, application, domain, shared}` · `shared → {shared}`. Toute arête vers une couche absente = violation. |
| **B** — Tiers atomic design | Un composant ne peut importer qu'un tier de rang **égal ou inférieur** (`atoms` ≤ `molecules` ≤ `organisms` ≤ `templates`). Une `molecule` qui importe un `organism` = violation. |
| **C** — `.impl.ts` confiné | Tout `*.impl.ts` (implémentation de repository/service) doit vivre sous `src/infrastructure/`. |
| **D** — Domain pur | `src/domain/` ne doit importer aucun framework UI/serveur (`next`, `react`, `zustand`, `react-query`, `zod`, `better-auth`, …). |

## État actuel du projet (au moment de l'écriture)

Le driver signale **6 dérives réelles** — l'architecture est propre mais pas parfaite. C'est volontaire : un outil strict doit montrer la dette, pas la masquer.

- **3 × B** : les `molecules` `m-appearance-menu`, `m-bookmark-panel`, `m-notes-panel` importent l'`organism` `o-account-provider` (une molecule ne devrait pas dépendre d'un tier supérieur — extraire ce qui est partagé vers une molecule commune, ou remonter ces panels en `organisms`).
- **3 × A** : `presentation → infrastructure` — `use-book-cross-refs.ts` importe directement `cross-refs.repository.impl` (contourne l'abstraction ; passer par le repository interface du domaine ou un use-case). `use-cqrs.ts` et `sync-engine.ts` importent `infrastructure/di/container` (wiring du container DI — légitime mais discutable en clean stricte).

## Échappatoire documentée : allowlist

Pour les exceptions **intentionnelles** (pas pour masquer une dérive), créez `.architecture-allowlist.json` à la racine du dépôt :

```json
[
  { "from": "src/presentation/hooks/use-cqrs.ts",
    "to": "@/src/infrastructure/di/container",
    "reason": "composition root côté hook — résolution des use-cases via le container DI" }
]
```

Chaque entrée silencie l'arête `(from, to)` exacte. Le `reason` est obligatoire moralement — l'exception est documentée dans le dépôt, donc auditable. À utiliser pour le wiring du container DI, pas pour un import de repo-impl depuis la présentation.

## Ajouter le checker en CI / script npm

Pour le rendre exécutable via `pnpm run arch:check` :

```bash
node -e "const p=require('./package.json');p.scripts['arch:check']='node .claude/skills/arch-check/check-arch.mjs';require('fs').writeFileSync('./package.json',JSON.stringify(p,null,2)+'\n')"
```

Puis `pnpm run arch:check` (ou en CI : `pnpm arch:check`).

## Gotchas

- **Résolution d'imports best-effort.** Le driver reproduit la résolution TS (extensions, `index.ts`) sans lire `tsconfig.json` — ça suffit pour `@/*` et les imports relatifs. Un import non résolu est **ignoré** (jamais signalé), donc un barrel manquant ne crée pas de faux positif. Conséquence : un fichier qui n'existe pas n'est pas détecté ; c'est le job de `tsc`, pas de ce linter.
- **Les `.d.ts` sont ignorés.** Fichiers de déclaration uniquement.
- **`shared` est un noyau, pas une couche métier.** Tout le monde peut l'importer ; lui n'importe rien d'autre que lui-même. Ne le gonflez pas avec de la logique métier — sinon il devient un god-module qui contourne la séparation des couches.
- **Rule B ne s'applique qu'entre composants.** Un `molecule` qui importe un `hook` ou `lib` (hors `src/presentation/components/`) n'est pas un violation de tier — ces imports-là sont valides.
- **Le driver ne lit PAS `tsconfig.json`** : l'alias `@/*` est codé en dur (racine du dépôt). Si l'alias change, mettre à jour `resolveSpec` dans `check-arch.mjs`.

## Modifier les règles

Les règles sont définies en haut de `.claude/skills/arch-check/check-arch.mjs` (`ALLOWED_LAYERS`, `TIERS`, `DOMAIN_FORBIDDEN`). Pour assouplir (ex. autoriser `presentation → infrastructure` par défaut), ajoutez `'infrastructure'` au tableau `ALLOWED_LAYERS.presentation` — mais c'est moins strict, et le projet a choisi strict. Préférez l'allowlist pour les exceptions ciblées.