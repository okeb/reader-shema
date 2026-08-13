# Spec 32 — Refonte des e-mails transactionnels avec react.email

> **Statut** : Proposé · **Priorité** : 🟠 Moyenne · **Effort** : M · **Dépendances** : spec 26 (Better Auth + Resend), spec 28 (recovery key)

## 1. Objectif

Remplacer les templates HTML écrits à la main (`lib/email/templates.ts`, CSS inline, design neutre)
 par des composants **[react.email](https://react.email/)** rendus en HTML, afin d'obtenir un design
 moderne et cohérent avec l'identité ShemaProject (**thème adaptatif clair/sombre** — respect du
 réglage du client de messagerie via `prefers-color-scheme`, accent orange, logo apposé). Couvre les
 4 mails transactionnels existants + un nouveau mail de **bienvenue** post-inscription.

## 2. Valeur utilisateur

- **Identité assumée** : le logo et l'accent orange `#f76808` rendent les mails immédiatement
  reconnaissables comme venant de ShemaProject, là où les templates actuels sont génériques.
- **Confiance** : un design soigné renvoie une image fiable sur des flux sensibles (vérification,
  reset password, lien magique, clé de récupération E2EE).
- **Onboarding** : le nouveau mail de bienvenue félicite l'utilisateur à l'inscription et pointe
  vers la reprise de lecture / l'account — un signal de warmth sans métrique (doctrine spec 00).

## 3. Périmètre

- **Inclus** :
  - Nouvelles deps `@react-email/components`, `@react-email/render`.
  - Composants React partagés (shell **adaptatif clair/sombre**, logo, footer, bouton) + 5 templates
    (4 existants reconçus + 1 nouveau Welcome).
  - Pipeline de rendu `renderAsync` → `sendEmail({ html })` (transport Resend inchangé).
  - Câblage du mail Welcome au hook `databaseHooks.user.create.after` de Better Auth.
  - Mise à jour de `lib/email/templates.ts` (suppression du commentaire « On évite `@react-email/*` »).
  - Ligne d'index dans `specs/README.md`.
- **Exclu** (pour cette itération) :
  - Refonte de `lib/email/transport.ts` (Resend, FROM, no-op dev inchangés).
  - i18n des mails (copie FR en dur conservée — l'app utilise `next-intl` côté UI, pas côté mail).
  - Version PNG dédiée du logo pour Outlook (voir §8 — fallback SVG + alt text dans un premier temps).
  - Prévisualisation locale via le CLI `react-email` (studio) — optionnel, non bloquant.
  - Mail de notification/digest/newsletter (hors périmètre transactionnel).

## 4. Spécification fonctionnelle

- **Même contrat transport** : chaque template produit une chaîne HTML passée à
  `sendEmail({ to, subject, html })`. Les sujets et destinataires ne changent pas.
- **Mêmes URLs** : les `url` pré-construites par Better Auth (déjà tokenisées) sont réutilisées
  telles quelles dans les boutons — aucun rebuilding d'URL.
- **Rendu serveur** : `renderAsync` d'`@react-email/render` (React 19 / react-dom/server) depuis
  les callbacks Better Auth et la route `/api/email/recovery-key`. Aucune exécution client.
- **Welcome** : déclenché une fois à la création du user (hook Better Auth), pas de bouton
  critique — un CTA « Reprendre la lecture » pointant vers `${baseURL}/${locale}/read`.
- **Comportement dev inchangé** : `RESEND_API_KEY` absent → `sendEmail` no-op + `console.warn`
  (les templates sont quand même rendus, sans effet de bord).
- **Cas limites** : lien expiré (vérification 1 h, magic link 5 min, reset à usage unique) — la
  copie rappelle l'expiration, comme aujourd'hui. Clé de récupération : bloc `<code>` monospace
  sur fond clair (`#f2f2f5`) par défaut, fond sombre (`#1a1a1a`) en dark mode, `word-break: break-all`,
  aucun bouton (code à conserver, pas à cliquer).

## 5. UI / UX

### 5.1 Emplacement & déclencheurs

| Mail | Déclencheur | Caller |
|------|-----------|--------|
| Vérification e-mail | `emailVerification.sendVerificationEmail` | `lib/auth/server.ts` |
| Reset password | `emailAndPassword.sendResetPassword` | `lib/auth/server.ts` |
| Lien magique | `magicLink().sendMagicLink` | `lib/auth/server.ts` |
| Clé de récupération | `POST /api/email/recovery-key` | `app/api/email/recovery-key/route.ts` |
| **Welcome** (nouveau) | `databaseHooks.user.create.after` | `lib/auth/server.ts` |

### 5.2 Disposition (wireframe)

Layout unique (shell **adaptatif**) partagé par les 5 mails, dérivé du modèle react.email fourni.
**Clair par défaut**, **sombre si le client mail est en dark mode** (`prefers-color-scheme: dark`) :

```
┌──────────────────────── max-w 465px, mx-auto ─────────────────────┐
│                          [ LOGO ShemaProject 56×56 ]               │  ← Section centrée, mt-10
│                                                                     │
│              TITRE — texte 2xl, centré, font-normal                 │
│                                                                     │
│  Bonjour {prénom},                                                  │  ← texte 14px
│  Paragraphe de contexte (expire dans X / usage unique / etc.)       │
│                                                                     │
│                  ┌──────────────────────────┐                       │
│                  │   BOUTON CTA (orange)    │                       │  ← Section centrée, py-2.5 px-5
│                  └──────────────────────────┘                       │
│   texte fallback URL (12px, muted) pour les clients sans HTML       │
│                                                                     │
│  ShemaProject — Lecture de la Bible.                                │  ← footer
│  Si vous n'êtes pas à l'origine de cet e-mail, ignorez-le.          │
└────────────────────────────────────────────────────────────────────┘
  Clair (défaut)   : bg #f6f6f8 · carte #fff · texte #111 · muted #888 · accent #f76808
  Sombre (dark mq) : bg #0a0a0a · carte #1a1a1a · texte #fff · muted #a1a1aa · accent #f76808
```

Le mail **Welcome** remplace le bouton « Vérifier » par « Reprendre la lecture » ; le mail
**Clé de récupération** remplace la zone bouton par un bloc `<code>` monospace (cf. 4.3).

### 5.3 États & interactions

- **Bouton** : `<Button href={url}>` react.email — style `bg-[#f76808] text-white font-semibold
  rounded-md py-2.5 px-5 text-sm no-underline`. Rendu `<a>` inline-block. L'accent orange est
  **identique dans les deux thèmes** (il a un contraste suffisant sur blanc comme sur noir) — pas
  d'override `prefers-color-scheme` sur le bouton.
- **Couleurs adaptatives** : les couleurs de structure (fond body, carte, texte, muted, bordure)
  sont portées par des **classes** (`.bg-body`, `.bg-card`, `.text-fg`, `.text-muted`, `.border-card`)
  définies dans un `<style>` inline en `<head>`. Le **clair est la base** (inline par défaut, lu par
  tous les clients) ; le **sombre est posé via `@media (prefers-color-scheme: dark)`** qui surcharge
  ces classes. Les clients qui ne supportent pas la media query (Outlook desktop, Gmail partiel)
  restent sur le thème clair — **fallback acceptable et attendu** (§8).
- **Fallback texte** : sous chaque bouton, lien URL brut en `text-xs text-muted break-all` (lecteurs
  mail sans HTML / bouton masqué). `.text-muted` = `#888` en clair, `#a1a1aa` en sombre.
- **Clé de récupération** : `<code>` dans un conteneur `.bg-code .border-card rounded-lg p-4
  font-mono text-sm break-all` — `bg-code` = `#f2f2f5` en clair, `#1a1a1a` en sombre ; pas de bouton.

### 5.4 Responsive

- `Container max-w-[465px] mx-auto` — largeur fixe sûre pour tous les clients mail.
- Texte aligné à gauche (`text-start`), titres centrés. Pas de grille complexe (robuste mobile).

### 5.5 Thème adaptatif clair/sombre & accessibilité

- **Adaptatif, pas sombre figé** (révision) : le mail suit le réglage du client de messagerie.
  **Clair par défaut** (fond `#f6f6f8`, carte `#fff`, texte `#111`) ; **sombre via
  `@media (prefers-color-scheme: dark)`** (fond `#0a0a0a`, carte `#1a1a1a`, texte `#fff`, muted
  `#a1a1aa`, bordure `#27272a`). Un lecteur en dark mode ne reçoit donc plus un mail « qui reste
  sombre » hors contexte : il bascule avec son interface ; un lecteur en light mode reçoit un mail
  clair lisible.
- **Technique** : le **clair est la base inline** (couleurs posées en attributs `style="…"` sur chaque
  cellule — lu par tous les clients, même ceux qui stripent `<style>`). Le **sombre est une
  surcharge** via un bloc `<style>` en `<head>` :
  ```html
  <style>
    @media (prefers-color-scheme: dark) {
      .bg-body { background: #0a0a0a !important; }
      .bg-card { background: #1a1a1a !important; }
      .text-fg { color: #ffffff !important; }
      .text-muted { color: #a1a1aa !important; }
      .border-card { border-color: #27272a !important; }
      .bg-code { background: #1a1a1a !important; }
      .logo-dark { display: inline !important; }
      .logo-light { display: none !important; }
    }
  </style>
  ```
  Les classes sont posées **en plus** des styles inline (le inline gagne en absence de media query ;
  le `!important` de la media query gagne quand elle s'applique). Ne **pas** compter sur le
  `dark:` variant de Tailwind (la classe `.dark` parent n'existe pas dans un mail).
- **Logo** : deux `<img>` empilés — une variante claire (`.logo-light`, encre sombre, visible sur
  carte blanche) et une variante sombre (`.logo-dark`, encre claire, visible sur carte noire) — la
  media query bascule `display`. Si l'on préfère un seul asset, utiliser l'icône **orange** qui
  reste lisible sur les deux fonds (§8 — compromis à trancher à l'implémentation).
- **Contraste** :
  - Clair : texte `#111` sur `#fff` ≈ 17:1 ; muted `#888` sur `#fff` ≈ 4.6:1 (AA texte normal
    limite, OK pour mentions secondaires) ; accent `#f76808` sur `#fff` ≈ 3.4:1 (AA pour texte
    large/gras du bouton uniquement).
  - Sombre : texte `#fff` sur `#0a0a0a` ≈ 20:1 ; muted `#a1a1aa` sur `#0a0a0a` ≈ 7:1 ; accent
    `#f76808` sur `#0a0a0a` ≈ 5.2:1 (AA bouton).
- **Alt** : `alt="ShemaProject"` sur les `<Img>` logo.
- **Fallback** : Outlook desktop (pas de `prefers-color-scheme`) reste en thème clair — acceptable.

### 5.6 Micro-copy (FR)

Sujets (inchangés) :
- `Vérifiez votre e-mail — ShemaProject`
- `Réinitialisation de votre mot de passe — ShemaProject`
- `Votre lien de connexion — ShemaProject`
- `Votre clé de récupération — ShemaProject`
- **`Bienvenue sur ShemaProject — Lecture de la Bible`** (nouveau)

Corps (extrait Welcome) :
> Bienvenue sur **ShemaProject**, {prénom} !
> Nous sommes ravis de vous compter parmi nos lecteurs. Votre compte est créé : vos notes,
> favoris et signets seront synchronisés sur vos appareils.
> [ Bouton : Reprendre la lecture ]
> En cas de besoin, conservez précieusement votre clé de récupération (e-mailée séparément).
> — ShemaProject, Lecture de la Bible de Yéhoshoua Ha Mashiah.

## 6. Spécification technique

### 6.1 Fichiers (nouveaux / modifiés)

**Nouveaux** :
- `lib/email/components/email-shell.tsx` — `<EmailShell>` (Html/Head/Preview/Tailwind/Body +
  Container + logo + footer), props `{ title, preview, children }`. Réutilise `<Tailwind>` avec
  config dédiée (cf. ci-dessous). **Injecte le bloc `<style>` de surcharge sombre** (media query
  `prefers-color-scheme: dark`, cf. §5.5) en `<head>`, et pose les classes adaptatives
  (`.bg-body`/`.bg-card`/`.text-fg`/`.text-muted`/`.border-card`/`.bg-code`) sur les cellules — en
  **doublon** des styles inline (le inline = base clair, la media query = sombre).
- `lib/email/components/email-footer-logo.tsx` — `<EmailFooterLogo>` : **deux `<Img>` empilés** —
  `.logo-light` (`shema_reader-icon_light.svg`, encre sombre, visible sur carte blanche) et
  `.logo-dark` (`shema_reader-icon_dark.svg`, encre claire, visible sur carte noire) — la media
  query bascule `display` (cf. §5.5). `alt="ShemaProject"`, `width="56" height="56" className="mx-auto"`.
  Variante acceptable : un seul `<Img>` de l'icône **orange** si elle se révèle lisible sur les deux
  fonds (compromis à trancher à l'implémentation, §8).
- `lib/email/components/email-button.tsx` — `<EmailButton href label>` (wrapper `<Button>` orange
  + fallback URL texte).
- `lib/email/templates/verification.tsx` — `<VerificationEmail url>`.
- `lib/email/templates/reset-password.tsx` — `<ResetPasswordEmail url>`.
- `lib/email/templates/magic-link.tsx` — `<MagicLinkEmail email url>`.
- `lib/email/templates/recovery-key.tsx` — `<RecoveryKeyEmail recoveryKey>` (bloc `<code>` adaptatif).
- `lib/email/templates/welcome.tsx` — `<WelcomeEmail name baseUrl>`.
- `lib/email/render.ts` — `renderEmail(component, props): Promise<string>` via `renderAsync`
  d'`@react-email/render`. Point d'extension unique si on ajoute des templates plus tard.
- `lib/email/tailwind.config.ts` — **config Tailwind dédiée aux mails** (statique, SANS variables
  CSS — `@react-email/tailwind` rend au serveur, les `hsl(var(--…))` du projet ne résoudraient pas).
  Couleurs **clair par défaut** : `background #f6f6f8`, `card #ffffff`, `foreground #111111`,
  `muted #888888`, `border #e8e8ee`, `code #f2f2f5`, `accent #f76808`. **Le sombre n'est pas géré
  par un `dark:` Tailwind** (la classe `.dark` n'existe pas dans un mail) mais par le bloc `<style>`
  media-query de `<EmailShell>` (§5.5) qui surcharge les classes adaptatives. Passage à
  `<Tailwind config={…}>`.

**Modifiés** :
- `lib/email/templates.ts` — **remplacé** par un barrel qui ré-exporte les composants + fonctions
  async `verificationEmailHtml(url)` (etc.) qui appellent `renderEmail(...)`. Signatures
  `string` → `Promise<string>` (async). Suppression du commentaire « On évite `@react-email/*` »
  (décision inverse assumée : les déps sont désormais acceptées, cf. §8).
- `lib/auth/server.ts` (lignes ~76–105) — `await` devant `verificationEmailHtml(url)`,
  `resetPasswordEmailHtml(url)`, `magicLinkEmailHtml(email, url)` (déjà en fonctions async).
  Ajout du hook welcome (ci-dessous).
- `app/api/email/recovery-key/route.ts` (ligne ~59) — `await recoveryKeyEmailHtml(body.recoveryKey)`.
- `package.json` — ajout de `@react-email/components` et `@react-email/render` en deps.
- `specs/README.md` — ligne d'index `32`.

**Inchangés** :
- `lib/email/transport.ts` (Resend, `FROM`, no-op dev, `OutgoingEmail`).
- Endpoints/URLs Better Auth (tokens, expirations).

**Câblage Welcome** (dans `lib/auth/server.ts`, option `betterAuth({ databaseHooks: { user: {
create: { after: async (user) => { await sendEmail({ to: user.email, subject: 'Bienvenue sur
ShemaProject — Lecture de la Bible', html: await welcomeEmailHtml(user.name ?? '',
env.NEXT_PUBLIC_APP_URL ?? 'https://reader.shemaproject.org') }); } } } } })`)).
> ⚠️ Vérifier l'API `databaseHooks.user.create.after` contre **better-auth@1.4.18 installé** avant
> câblage (cf. AGENTS.md : ne pas se fier à la mémoire, lire le package). Si l'hook n'expose pas
> l'user créé, fallback : envoyer depuis le callback `emailAndPassword` côté signup client→server,
> ou au retour de `/api/auth/signup`.

### 6.2 Données & persistance

- **Aucune nouvelle persistance**. Les mails sont stateless (rendus à la volée depuis les props).
- **Pas de localStorage** (serveur-only). Le throttle de la route recovery-key (Map en mémoire,
  60 s/user) est inchangé.
- **Welcome** : aucun stockage « déjà envoyé » — le hook `user.create.after` ne se déclenche
  qu'une fois par user, donc idempotent par construction.

### 6.3 API / contraintes

- **Next.js 16 / React 19** (AGENTS.md : « This is NOT the Next.js you know ») — vérifier dans
  `node_modules/next/dist/docs/` que `renderAsync` (react-dom/server) s'exécute sans friction dans
  le runtime des route handlers / callbacks Better Auth. A priori OK (Node runtime, `force-dynamic`).
- **`@react-email/render`** exporte `renderAsync` (prefer async à `render` sync pour ne pas bloquer).
- **`@react-email/tailwind`** via `<Tailwind config={…}>` — la config est **indépendante** de
  `tailwind.config.ts` du projet (variables CSS inutilisables au rendu serveur).
- **SVG dans emails** : Gmail/webmail rendent `<img src="*.svg">` ; **Outlook ne le fait pas**
  (fallback `alt="ShemaProject"`). Accepté pour cette itération (cf. §8 pour un PNG futur).
- **Resend** : contenu HTML inchangé côté transport ; pas de templates Resend (tout est rendu côté app).

## 7. Critères d'acceptation

- [ ] `@react-email/components` et `@react-email/render` installés ; `pnpm build` passe.
- [ ] `tsc --noEmit` passe (types react.email OK sous React 19 / Next 16).
- [ ] Les 5 templates rendent un HTML valide (un test ou un log `console.log(await …EmailHtml(…))`
  produit une sortie avec logo, titre, bouton/clé, footer).
- [ ] Les logos pointent vers `https://reader.shemaproject.org/logo/shema_reader-icon_light.svg`
  (clair) et `…/shema_reader-icon_dark.svg` (sombre) et s'affichent (vérifié dans Gmail / client
  web au moins). Variante mono-asset orange acceptée si contrast OK sur les deux fonds (§8).
- [ ] Le mail est **clair par défaut** (fond `#f6f6f8`, carte `#fff`, texte `#111`) et **bascule en
  sombre** quand le client mail est en dark mode (`#0a0a0a` / `#1a1a1a` / `#fff`) — vérifié dans
  Apple Mail ou iOS Mail (qui supportent `prefers-color-scheme`).
- [ ] Le bouton CTA est orange `#f76808` (identique dans les deux thèmes), avec fallback URL texte
  en dessous.
- [ ] Le mail « Clé de récupération » affiche la clé en bloc `<code>` monospace (`#f2f2f5` en clair,
  `#1a1a1a` en sombre), sans bouton.
- [ ] `lib/email/transport.ts` est inchangé (diff vide sur ce fichier).
- [ ] Les sujets et destinataires des 4 mails existants sont identiques à avant.
- [ ] Le mail Welcome est déclenché à l'inscription (vérifié en dev via le `console.warn` du no-op
  transport, ou en envoyant un vrai mail en preview).
- [ ] En dev (`RESEND_API_KEY` absent), aucun flux d'auth ne casse (no-op transport préservé).
- [ ] Ligne `32` ajoutée à `specs/README.md` (Statut: Proposé, Effort: M, Dépendances: spec 26, 28).

## 8. Risques & questions ouvertes

- **Outlook + SVG** : Outlook desktop ne rend pas les SVG dans `<img>`. Mitigation : alt text
  informatif « ShemaProject ». Si dégradé trop visible, générer un PNG de l'icône (ex. 112×112)
  hébergé sous `/logo/shema_reader-icon-dark.png` et l'utiliser comme `src`. → **Question ouverte** :
  prévoir le PNG dès maintenant ou attendre un retour utilisateur ?
- **Support `prefers-color-scheme`** : la bascule clair/sombre ne marche pas partout. Apple Mail
  (macOS/iOS), Thunderbird et Outlook.com/mac la supportent ; **Outlook desktop non** (reste en
  clair — fallback acceptable) ; **Gmail web partiel** (strippe souvent le `<style>` de `<head>`,
  peut rester en clair). Comme le **clair est la base inline**, aucun client ne se retrouve avec un
  mail illisible — au pire il reste en thème clair. C'est la raison pour laquelle le sombre est une
  **surcharge**, jamais la base. → **Décision** : assumer le fallback clair pour Outlook/Gmail web ;
  ne pas chercher à forcer le sombre (les hacks `color-scheme` sont fragiles et contraires à
  l'esprit « s'adapter au réglage du lecteur »).
- **Logo deux-assets vs un** : empiler deux `<img>` basculés par media query est robuste mais
  double le poids et complique Outlook (SVG). Alternative : un seul `<img>` de l'icône **orange**
  (lisible sur blanc comme sur noir). → **Question ouverte** à trancher à l'implémentation selon le
  rendu réel de l'icône orange sur carte blanche.
- **Déps transitive `@react-email/*`** : la spec 26 évitait ces deps par prudence. On inverse la
  décision : lockfile à surveiller (lockfile `pnpm-lock.yaml` stable après install). Si une dep
  casse le build, retomber sur les styles inline react.email (sans `<Tailwind>`) — les composants
  `@react-email/components` restent utilisables sans `@react-email/tailwind`.
- **API `databaseHooks` Better Auth** : à vérifier contre `better-auth@1.4.18` installé. Si le hook
  `user.create.after` n'existe pas sous cette forme, fallback = envoi côté serveur après signup
  réussi (route wrapper ou callback `emailAndPassword`). → **Question ouverte**.
- **Welcome pour comptes magic-link** : un user peut ne jamais avoir de mot de passe (magic link
  uniquement). Le hook `user.create` se déclenche quand même à la première utilisation magic link
  (création de user). À confirmer : envoie-t-on Welcome à la création du user Better Auth, ou
  seulement après vérification e-mail ? Sachant que `requireEmailVerification: false`, la création
  peut précéder la vérification. → **Question ouverte** (gating Welcome sur vérification ?).
- **`renderAsync` + Next 16** : vérifier qu'aucune erreur « TextEncoder is not defined » /
  react-dom/server en edge ne surgit (les callbacks Better Auth tournent en Node runtime, OK a
  priori, mais à confirmer au build).
- **i18n** : copie FR en dur. Si on veut plus tard des mails EN, extraire dans `lib/email/copy.ts`
  (hors périmètre ici).