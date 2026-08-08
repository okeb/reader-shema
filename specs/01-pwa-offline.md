# Spec 01 — PWA / Lecture hors-ligne

> **Statut** : Proposé · **Priorité** : 🔴 Haute · **Effort** : L · **Dépendances** : —

## 1. Objectif
Rendre le lecteur **installable** (écran d'accueil, plein écran) et **lisible sans connexion** : tout
chapitre déjà consulté reste accessible hors-ligne, et l'app se lance instantanément au retour.

## 2. Valeur utilisateur
C'est l'ajout le plus structurant pour un lecteur biblique : lecture à l'église (réseau saturé), dans
les transports, en voyage à l'étranger sans data. Bonus : icône d'app, démarrage instantané, sensation
« application native ».

## 3. Périmètre
- **Inclus** : manifest web + icônes ; service worker (SW) ; cache de l'app shell (HTML/JS/CSS/fonts) ;
  cache runtime des réponses API de chapitres (`/bym/:livre/:chap...`) en *stale-while-revalidate* ;
  indicateur hors-ligne ; invite d'installation discrète.
- **Exclu** : téléchargement proactif de **toute** la Bible (« mode hors-ligne complet ») — proposé en
  itération 2 ; notifications push (cf. spec 06).

## 4. Spécification fonctionnelle
- **App shell** : pré-cache au `install` du SW (pages `/`, `/bym/read`, bundles, polices Google déjà
  `display:swap`). Stratégie *cache-first* avec mise à jour en arrière-plan.
- **Données de chapitre** : intercepter les `GET` vers `API_BASE` (`/bym/...`). Stratégie
  *stale-while-revalidate* : servir le cache immédiatement, revalider en réseau, mettre à jour le cache.
  ⚠️ L'API est appelée avec `cache: "no-store"` (cf. `bibleApi.ts`) — le SW gère le cache, pas le
  navigateur ; cohérent.
- **Hors-ligne, chapitre non visité** : afficher un état vide « Chapitre non disponible hors-ligne »
  (au lieu de la liste vide actuelle) quand `getChapter` échoue **et** `navigator.onLine === false`.
- **Mise à jour de l'app** : quand un nouveau SW est prêt, afficher un toast « Nouvelle version
  disponible — Rafraîchir ».
- **Installation** : capter `beforeinstallprompt`, proposer un bouton « Installer l'app » discret
  (dock ou réglages). Sur iOS (pas de prompt natif), afficher une aide « Partager → Sur l'écran
  d'accueil ».

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
- **Bandeau hors-ligne** : fin liseré en haut quand `offline`, non bloquant.
- **Toast de mise à jour** : bas-centre, au-dessus du dock, auto-dismiss 8 s + action « Rafraîchir ».
- **Bouton d'installation** : item dans le futur panneau Réglages (spec 03) ou pastille temporaire.

### 5.2 Disposition (wireframe)
```
┌───────────────────────────────────────────────┐
│ ⚠ Hors-ligne — lecture des chapitres en cache  │  ← liseré 28px, bg ambre/10
├───────────────────────────────────────────────┤
│                  (lecteur)                      │
│                                                 │
│        ┌─────────────────────────────┐          │
│        │ ⟳ Nouvelle version  [Rafraîchir]│ ← toast│
│        └─────────────────────────────┘          │
└───────────────────────────────────────────────┘
```

### 5.3 États & interactions
- `online` → rien. `offline` → liseré + (si chapitre absent) état vide dédié.
- `update-available` → toast ; clic « Rafraîchir » → `skipWaiting` + reload.
- `installable` → bouton visible ; après install → bouton masqué.

### 5.4 Responsive
- Liseré et toast pleinement responsives ; sur mobile le toast se place au-dessus du dock
  (`bottom-24`), comme la barre d'actions tactile existante.

### 5.5 Thème clair/sombre & accessibilité
- Couleurs via tokens (`bg-background`, `text-muted-foreground`, ambre pour l'alerte) → suit `.dark`.
- Liseré avec `role="status"`, `aria-live="polite"`. Toast focelable au clavier, bouton accessible.

### 5.6 Micro-copy (FR)
- Liseré : « Hors-ligne — seuls les chapitres déjà ouverts sont disponibles. »
- État vide : « Ce chapitre n'a pas encore été chargé. Reconnectez-vous pour le lire. »
- Toast : « Une nouvelle version est disponible. » / bouton « Rafraîchir ».
- Install (iOS) : « Pour installer : Partager → “Sur l'écran d'accueil”. »

## 6. Spécification technique
### 6.1 Fichiers
- **Nouveaux** : `public/manifest.webmanifest` ; icônes `public/icons/icon-192.png`, `icon-512.png`,
  `icon-maskable-512.png` (dérivables du logo) ; `public/sw.js` (ou via plugin) ;
  `components/molecules/m-offline-banner.tsx` ; `components/molecules/m-sw-update-toast.tsx` ;
  `lib/pwa.ts` (enregistrement SW + hooks `useOnlineStatus`, `useInstallPrompt`, `useSwUpdate`).
- **Modifiés** : `app/layout.tsx` (lien manifest dans `metadata`/`<head>` via Next Metadata API,
  `themeColor`, enregistrement SW côté client) ; `components/organisms/o-bible-reader.tsx` (monter
  bannière + toast ; brancher l'état vide hors-ligne sur l'échec de `getChapter`).
- **Recommandé** : utiliser `next-pwa`/`@ducanh2912/next-pwa` (Workbox) plutôt qu'un SW manuel, pour
  *precaching* + *stale-while-revalidate* prêts à l'emploi (Next 14 App Router compatible).

### 6.2 Données & persistance
- Caches nommés (`app-shell-v1`, `api-chapters-v1`) versionnés ; purge des anciens au `activate`.
- Quota : limiter le cache API (ex. LRU ~200 chapitres) pour rester sous les limites navigateur.

### 6.3 API / contraintes
- Origine API différente (`shemaproject.org`) → CORS déjà OK (l'app fetch déjà). Le SW cache des
  requêtes *cross-origin* opaques/normales : vérifier les en-têtes CORS pour un cache lisible.
- iOS Safari : pas de `beforeinstallprompt` → prévoir l'aide manuelle.

## 7. Critères d'acceptation
- [ ] L'app est installable (Chrome/Edge/Android) ; icône + splash corrects.
- [ ] Après visite d'un chapitre, passage en avion → ce chapitre se relit hors-ligne.
- [ ] Chapitre jamais visité hors-ligne → état vide explicite (pas d'écran blanc).
- [ ] Nouveau déploiement → toast « Rafraîchir » qui met bien à jour.
- [ ] Lighthouse PWA : installable, SW enregistré, manifest valide.
- [ ] `npx tsc --noEmit` propre + `npm run build` OK ; pas de FOUC, pas de régression thème.

## 8. Risques & questions ouvertes
- SW + Next App Router : bien gérer le scope et l'invalidation (ne pas « bloquer » les utilisateurs sur
  une vieille version). Tester la stratégie de mise à jour.
- Faut-il un **mode hors-ligne complet** (télécharger un livre entier) en itération 2 ? (recommandé.)
