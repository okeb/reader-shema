# reader_shema

Lecteur de la Bible (BYM, Louis Segond 1910, Darby 1885) — refonte du projet
`shema_project_bible_site` selon les conventions de `whatpass_web`.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** strict
- **pnpm** + ESM (`"type": "module"`)
- **Tailwind CSS** + **shadcn/ui** (new-york, slate) + SCSS globals
- **next-intl** (locales `fr`/`en`, défaut `fr`, `localePrefix: 'always'`)
- **TanStack React Query** (état serveur) + **Zustand** + immer (état client, persisté localStorage)
- **react-hook-form** + **zod** (formulaires & validation)
- **@t3-oss/env-nextjs** (env typé)
- **@iconify/react**, **@rive-app/react-canvas**, **framer-motion**, **sonner**, **next-themes**

## Architecture (Clean Architecture + CQRS)

```
src/
├── domain/          entités, value-objects, interfaces repositories/services/use-cases
├── application/     commands, queries, handlers, factories, cqrs/ (bus + container)
├── infrastructure/  api/, repositories/.impl.ts, services/.impl.ts, di/container.ts
├── presentation/    components/ (atomic design), hooks/, providers/, schemas/, stores/
└── shared/          errors, types, constants (bible-books, bible-versions, quiz, doodles…)
```

L'alias `@/*` pointe vers la racine du dépôt, donc `@/src/domain/...` et `@/lib/utils`
coexistent.

## Développement

```bash
pnpm install
pnpm dev      # http://localhost:3000 → /fr (via middleware next-intl)
pnpm build
pnpm start
```

Variables d'env (`.env.local`) : `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_BASE_URL`.

## Documentation

- `specs/` — 24 spécifications numérotées qui pilotent le développement.
- `CHANGELOG.md` — historique des versions (Keep a Changelog, FR).
- `PLAN.md` — suivi de portage.

> `messages/en.json` est un scaffold partiel — l'UI chrome est traduite, le contenu
> éditorial (texte biblique, quiz, noms de livres) reste en français en v1.