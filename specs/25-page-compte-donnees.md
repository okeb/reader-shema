# Spec 25 — Page « Compte & données » (gestion dédiée)

> **Statut** : Proposé · **Priorité** : 🟠 Moyenne · **Effort** : S · **Dépendances** : spec 22 (compte & sync), spec 15 (socle légal)

## 1. Objectif
Extraire la **gestion des données du compte** (email, synchronisation, export, suppression, déconnexion) de la section encombrée du popup « Réglages de lecture » pour en faire une **page dédiée** `/account`. La modal `m-account-dialog` (spec 22) reste l'unique point d'entrée pour **se connecter** et **déverrouiller** (recovery key) ; la page devient le lieu unique pour **gérer** un compte déjà authentifié.

## 2. Valeur utilisateur
- **Lisibilité** : l'export JSON et la suppression de compte sont des actes engageants — ils méritent une page respirante, pas un sous-menu d'un popup flottant.
- **Découvrabilité** : une URL `/account` est partageable, bookmarkable, et naturelle pour un utilisateur qui cherche « mes données ».
- **Cohérence** : un seul endroit pour tout ce qui touche au compte, au lieu d'un toggle éparpillé dans les réglages de lecture + une section dans le popup + la modal.
- **Doctrine RGPD** : la page rend les droits (export, suppression) immédiatement visibles — conforme à l'esprit de la spec 15/22.

## 3. Périmètre
- **Inclus** :
  - Nouvelle route localisée `/account` (chemin identique `fr`/`en` pour préserver le gating proxy).
  - Page client `app/[locale]/account/page.tsx` : email, toggle « Synchroniser sur mes appareils », opt-in « Synchroniser mes réglages », export JSON, suppression de compte (deux temps), déconnexion, déverrouillage si master key absente.
  - `m-reading-settings.tsx` : retirer `AccountDataSection` et le toggle opt-in. **Aucune** entrée compte n'y figure — l'entrée compte reste uniquement dans le menu Apparence (top-left), qui ouvre la modal (décision utilisateur : l'entrée compte vit « pour le moment » uniquement dans le dropdown du menu en haut à gauche).
  - `m-account-dialog.tsx` : simplifier l'étape `done` (email + lien « Gérer mes données » → `/account` + déconnexion) ; retirer le toggle de sync inline (source unique = la page).
  - `i18n/routing.ts` : ajouter `'/account': { en: '/account', fr: '/account' }` aux `pathnames`.
  - Inscription dans `INFO_LINKS` (footer) **optionnelle** — la page n'est pas une page info publique (gated) ; on ne l'ajoute pas au footer par défaut (voir §8).
- **Exclu (pour cette itération)** :
  - Gestion du mot de passe (changement, reset) — non couvert par le wrapper Neon managé exposé actuellement.
  - Vue « appareils connectés » / révocation de sessions — pas d'API exposée.
  - Ré-affichage de la recovery key (jamais stockée — spec 22 ; perte = irrécupérable, assumé).
  - Page d'administration éditoriale (phase 3, spec 22 — hors scope).

## 4. Spécification fonctionnelle

### 4.1 Gating & accès
- `/account` est une route **protégée** : `proxy.ts` (`protectedRoutes = ['/account', '/admin']`) invoque `auth.middleware({ loginUrl: '/' })`. Un utilisateur non authentifié est **redirigé vers la racine** (`/`) — pas vers une page de login (le sign-in reste une modal, spec 22 §4.1).
- Le chemin est **identique dans les deux locales** (`/account`) : le proxy matche `pathWithoutLocale(pathname).startsWith('/account')`. Toute traduction du chemin (ex. `/compte`) **casserait le gating** — à ne jamais faire.
- Entrées vers `/account` :
  - Entrée « Compte » dans le menu Apparence (top-left) — ouvre la modal (sign-in / déverrouillage), connecté ou non. Le popup « Réglages de lecture » ne porte **plus aucune** entrée compte.
  - Lien « Gérer mes données » dans l'étape `done` de la modal compte.
  - Entrées « Retrouver sur tous vos appareils » (empty-states notes/signets/favoris) **restent** ouvrir la modal (sign-in), pas la page — la page suppose une session.

### 4.2 États de la page
La page est un composant client (`'use client'`) qui combine `authClient.useSession()` et `useCryptoSession` :
1. **Non authentifié** (défensif — la proxy aurait dû rediriger) : CTA « Se connecter » ouvrant la modal (`bym:open-account`). N'arrive normalement pas.
2. **Authentifié + master key déverrouillée** : gestion complète (§4.3). La sync est active.
3. **Authentifié + master key verrouillée** (session cookie valide, mais crypto session vide — p.ex. retour sur l'appareil après fermeture du navigateur) : on montre l'email, un bouton **« Déverrouiller la synchronisation »** (ouvre la modal → étape `recovery-entry`), l'export (local, fonctionne), la suppression (serveur, fonctionne), la déconnexion. Un encart note : *« Saisissez votre clé de récupération pour synchroniser. »* Les toggles de sync restent réglables mais n'ont d'effet qu'après déverrouillage.

### 4.3 Contenu (état authentifié)
- **Carte email** : `session.user.email`, discret, non éditable.
- **Toggle « Synchroniser sur mes appareils »** (`syncEnabled`) : active/désactive la sync globale. Désactivé = mode local-only (la file offline ne pousse plus).
- **Toggle opt-in « Synchroniser mes réglages »** (`settingsSyncOptIn`) : affiché **seulement si `syncEnabled`**. Active la sync du kind `readerPrefs` (opt-in, spec 22 §4.2).
- **« Exporter mes données »** : réutilise `downloadBackup()` (`src/presentation/lib/data-transfer.ts`) — sauvegarde JSON **locale**, indépendante du compte. Fonctionne même verrouillé.
- **« Supprimer mon compte »** : confirmation en **deux temps** (bouton → encart de confirmation). Action : `deleteAccount()` (`DELETE /api/account` → purge des blobs cloud) + `authClient.signOut()` + `resetAccount()` (reset du store `account`). **Définitif et immédiat** ; les données locales (appareil) sont conservées. La page revient ensuite à l'état non authentifié (la session est levée).
- **« Se déconnecter »** : `authClient.signOut()` + `useCryptoSession.lock()`. Retour à l'état non authentifié. Les données locales restent.

### 4.4 Source unique des toggles
- Le toggle `syncEnabled` et l'opt-in `settingsSyncOptIn` ne vivent **que** sur `/account`. La modal `done` et le popup réglages n'affichent plus de toggle (ils pointent vers la page). Évite la triplication et les états divergents.

## 5. UI / UX

### 5.1 Emplacement & déenclencheurs
- Page `/account` (locale-prefixed : `/fr/account`, `/en/account`).
- CTA depuis le popup réglages : `{authEnabled && (session.active ? <Link to /account> : <bouton ouvre modal>)}`.
- CTA depuis la modal `done` : lien « Gérer mes données ».

### 5.2 Disposition (wireframe)
```
┌─ /account ──────────────────────────────────────┐
│  Compte & données                          [← Lecteur] │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ◉ vous@exemple.com                              │   │
│  └─────────────────────────────────────────────────┘   │
│  (si verrouillé : encart « Déverrouiller la sync »)     │
│                                                         │
│  Synchroniser sur mes appareils            [⦿——]       │
│    Synchroniser mes réglages               [——⦿]       │
│                                                         │
│  ───────────────────────────────────────────────────   │
│  ⤓  Exporter mes données                                │
│  🗑  Supprimer mon compte                               │
│  ⎋  Se déconnecter                                      │
└─────────────────────────────────────────────────────────┘
```

### 5.3 États & interactions
- Toggles : même composant que le popup actuel (`role="switch"`, `aria-checked`), reflet du store `account`.
- Suppression : 1ᵉʳ click → encart rouge « Vos données cloud seront supprimées… » + [Supprimer] / [Annuler]. 2ᵉ click (Supprimer) → busy spinner → signOut + reset. Désactivé pendant l'action.
- Déverrouillage : bouton → `window.dispatchEvent(new Event('bym:open-account'))` ; la modal détecte `session && !unlocked` → `recovery-entry`.
- Export : déclenche directement `downloadBackup()` (pas de confirmation).

### 5.4 Responsive
- Même conteneur que les pages info (`max-w-md` centré) ; padding mobile/desktop via les breakpoints existants. Les toggles et boutons full-width sur mobile.

### 5.5 Thème clair/sombre & accessibilité
- Tokens `bg-popover`/`border`/`text-foreground` existants (cohérent avec la modal).
- `role="dialog"` non requis (c'est une page). Hiérarchie de titres : un `h1` « Compte & données ».
- Toggles `role="switch"` + `aria-checked` + `aria-label`. Bouton suppression `aria-label` explicite. Focus visible (rings existants).

### 5.6 Micro-copy (FR)
- Titre : « Compte & données »
- Sous-titre / intro : « Gérez votre compte, la synchronisation et vos données. »
- Carte email : libellé implicite (l'email suffit).
- Toggle 1 : « Synchroniser sur mes appareils »
- Toggle 2 : « Synchroniser mes réglages » (sous-titre : « Police, thème, disposition… »)
- Verrouillé : « Synchronisation verrouillée — saisissez votre clé de récupération pour reprendre la sync. » + bouton « Déverrouiller »
- Export : « Exporter mes données » (sous-titre : « Sauvegarde JSON locale, sans compte requis. »)
- Suppression : « Supprimer mon compte » → confirm « Vos données cloud seront supprimées définitivement. Les données locales sont conservées. Confirmer ? » → [Supprimer] / [Annuler]
- Déconnexion : « Se déconnecter »
- Lien retour : « Retour au lecteur »
- Pas de score, pas de statistique (mention discrète facultative, déjà dans la modal).

## 6. Spécification technique

### 6.1 Fichiers (nouveaux / modifiés)
- **Nouveau** `app/[locale]/account/page.tsx` (`'use client'`) : page de gestion. Réutilise `useAccount`, `useAccountAvailability`/`useSessionIndicator`, `useCryptoSession`, `deleteAccount`, `downloadBackup`, `authClient`.
- **Modifié** `src/presentation/components/molecules/m-reading-settings.tsx` : retirer `AccountDataSection` et le bloc opt-in toggle. Aucune entrée compte (l'entrée reste dans le menu Apparence top-left).
- **Modifié** `src/presentation/components/molecules/m-account-dialog.tsx` : étape `done` simplifiée (email + lien « Gérer mes données » → `/account` + « Se déconnecter ») ; retirer le toggle `syncEnabled` inline et l'import devenu inutile.
- **Modifié** `i18n/routing.ts` : `pathnames['/account'] = { en: '/account', fr: '/account' }`.
- **Non modifié** `proxy.ts` : `/account` déjà dans `protectedRoutes` (spec 22).
- **Non modifié** `src/shared/constants/legal.ts` : la page n'est pas une page info publique (pas dans `INFO_LINKS` par défaut — voir §8).

### 6.2 Données & persistance
- Aucune nouvelle persistance. La page lit/écrit le store `account` (`syncEnabled`, `settingsSyncOptIn`) déjà persisté (`bym:account`).
- Aucune master key requise pour : export (local), suppression (`DELETE /api/account` est auth-gated par session, pas par crypto), toggles (état local). Seule la sync effective (push/pull) exige la master key (cas « verrouillé » → déverrouiller via modal).

### 6.3 API / contraintes
- `GET /api/sync` (spec 22) : non appelé par la page (la page ne synchronise pas, elle configure).
- `DELETE /api/account` : appelé par `deleteAccount()` (déjà implémenté, spec 22).
- La page ne touche pas aux blobs ; pas de chiffrement/déchiffrement ici.
- `proxy.ts` garantit la session avant rendu (redirect `/` si absent) ; la page reste défensive (CTA modal si session absente malgré tout).

## 7. Critères d'acceptation
- [ ] `/fr/account` et `/en/account` existent et sont localisés (préfixe locale).
- [ ] Un utilisateur non authentifié accédant à `/account` est redirigé vers `/` (proxy).
- [ ] Connecté + déverrouillé : la page affiche l'email, les deux toggles, export, suppression, déconnexion.
- [ ] Le toggle « Synchroniser sur mes appareils » bascule `syncEnabled` (effet sur la sync réelle).
- [ ] L'opt-in « Synchroniser mes réglages » n'apparaît que si `syncEnabled` ; bascule `settingsSyncOptIn`.
- [ ] « Exporter mes données » télécharge un JSON local (réutilise `downloadBackup`).
- [ ] « Supprimer mon compte » exige deux clicks ; purge les blobs cloud (vérifiable en SQL), lève la session, reset le store, sans toucher aux données locales.
- [ ] « Se déconnecter » lève la session et verrouille la crypto ; la page repasse à l'état non authentifié.
- [ ] Connecté + verrouillé : « Déverrouiller la synchronisation » ouvre la modal à l'étape `recovery-entry`.
- [ ] Le popup « Réglages de lecture » ne contient plus `AccountDataSection`, ni le toggle opt-in, ni aucune entrée compte (l'entrée reste dans le menu Apparence top-left).
- [ ] La modal `done` ne contient plus de toggle de sync ; elle propose « Gérer mes données » → `/account`.
- [ ] Aucun toggle de sync n'est dupliqué (source unique = `/account`).
- [ ] `npx tsc --noEmit` + `pnpm build` verts ; non-régression lecture/panneaux existants.
- [ ] Doctrine : `/account` est la seule nouvelle route protégée ; le lecteur reste ouvert sans compte.

## 8. Risques & questions ouvertes
- **Footer / discoverabilité** : la page est gated (non publique). Faut-il l'ajouter à `INFO_LINKS` (footer) ? Recommandation : **non** par défaut (une page gated dans un footer public est trompeuse — un clic hors-session redirige). À la place, le footer reste inchangé ; l'entrée se fait via le popup réglages + la modal. À valider avec l'utilisateur.
- **Verrouillé par défaut au retour** : un utilisateur reconnecté par cookie mais avec crypto verrouillée voit la sync inactive jusqu'à déverrouillage. C'est conforme à la spec 22 (recovery key purement client), mais peut surprendre. La micro-copy « Déverrouiller » l'explique.
- **Opt-in déplacé** : l'opt-in « Synchroniser mes réglages » quitte le popup réglages (où il était contextuel). C'est un trade-off découvrabilité vs. source unique. Accepté ici.
- **Changement de mot de passe** : non couvert (wrapper Neon managé non exposé). Suivi.
- **`next-env.d.ts`** : churn `dev`/`build` (hors scope, fichier auto-généré — ne pas commiter).