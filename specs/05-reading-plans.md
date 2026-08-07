# Spec 05 — Plans de lecture

> **Statut** : Proposé · **Priorité** : 🟠 Moyenne · **Effort** : L · **Dépendances** : — (données de plans à fournir)
>
> **Gouverné par [`00` Principes de gamification](00-principes-gamification.md)** : la progression est une
> **carte** (où tu en es / ce qu'il reste), jamais un **trophée**. Pas de série, pas de rupture, pas de
> célébration chiffrée, pas de « retard ». La doctrine prime en cas de conflit.

## 1. Objectif
Proposer des **plans de lecture** (annuel, thématique, « évangiles en 30 jours »…) avec **suivi de
progression** (carte du parcours), pour structurer une lecture régulière.

## 2. Valeur utilisateur
Levier d'engagement récurrent : on revient pour avancer dans le parcours. La progression visible et la
reprise au bon endroit entretiennent l'habitude. Différencie le lecteur d'un simple afficheur de texte.

## 3. Périmètre
- **Inclus** : catalogue de plans (données statiques) ; inscription à un plan ; vue du jour (références
  à lire) ; marquer comme lu ; progression (carte : lus / restants) ; reprise du jour courant.
- **Exclu** : plans collaboratifs/partagés, rappels push (cf. spec 06/PWA itération 2), création de
  plans personnalisés (itération future).

## 4. Spécification fonctionnelle
- **Catalogue** : liste de `ReadingPlan` (id, titre, description, durée, liste ordonnée de jours,
  chaque jour = tableau de références au format slug `livre/chap[/sélection]`, réutilisable tel quel
  par le mode `refs` existant).
- **Inscription** : choisir un plan → crée une progression `{ planId, startDate, completedDays: number[] }`.
  Un seul plan actif à la fois en MVP (extensible).
- **Jour courant** : on reprend toujours au **1ᵉʳ jour non complété** (position dans le territoire, pas
  contre le calendrier). Aucune notion de « retard » n'est affichée : un jour non lu n'est pas un échec,
  juste la prochaine étape. `startDate` ne sert qu'à l'ordre, pas à juger un rythme.
- **Lecture** : « Lire » ouvre les références du jour via le mode `refs` (`?refs=...`) déjà supporté.
- **Marquer lu** : coche le jour → met à jour `completedDays` et la carte de progression (lus / restants).
  Geste sobre, sans fanfare ni score.
- **Progression** : **carte additive** du parcours (jours/références lus vs restants). On n'enregistre
  que la présence ; l'absence ne laisse **aucune marque**. Pas de série de jours consécutifs.

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
- Nouvelle route `/bym/plans` (catalogue + plan actif). Entrée depuis le dock (icône
  `hugeicons:calendar-03`) et/ou un lien dans Réglages.

### 5.2 Disposition (wireframe)
```
/bym/plans
┌── Plan actif ─────────────────────────────────┐
│ Les Évangiles en 30 jours                      │
│ ███████████░░░░░░░░  11 / 30 jours · reste 19   │
│ Jour 11 · Luc 9–10        [ Lire ]  [ ✓ Lu ]   │
└────────────────────────────────────────────────┘
┌── Catalogue ──────────────────────────────────┐
│ • Bible en 1 an            365 j   [ Commencer ]│
│ • Nouveau Testament 90 j    90 j   [ Commencer ]│
│ • Psaumes & Proverbes       62 j   [ Commencer ]│
└────────────────────────────────────────────────┘
```

### 5.3 États & interactions
- Sans plan actif → seul le catalogue. Avec plan → carte de progression en tête.
- « Lire » → `/bym/read?refs=...`. « ✓ Lu » → coche + mise à jour sobre de la carte (avancée de la
  barre). Au dernier jour : mention discrète « Plan parcouru » — **sans écran de victoire ni score**.
- Changer/abandonner un plan → confirmation neutre (« repartir d'un autre plan »), sans langage de perte.

### 5.4 Responsive
- Cartes empilées sur mobile ; barre de progression et boutons tactiles ≥ 44 px.

### 5.5 Thème clair/sombre & accessibilité
- Barre de progression `role="progressbar"` (`aria-valuenow/min/max`), avec libellé texte « {n} / {total}
  jours · reste {r} ». Couleurs via tokens.

### 5.6 Micro-copy (FR)
- « Jour {n} · {référence} ». Progression : « {n} / {total} jours · reste {r} ».
- Fin : « Plan parcouru » (sobre, sans « bravo ! »).
- Abandon : « Repartir d'un autre plan ? Le parcours en cours sera mis de côté. »

## 6. Spécification technique
### 6.1 Fichiers
- **Nouveaux** : `lib/reading-plans-data.ts` (catalogue statique) ; `lib/reading-plans.ts`
  (`useReadingPlan()` : `activePlan`, `progress` (lus / total / restants), `currentDay` (1ᵉʳ non lu),
  `enroll(id)`, `markDay(n)`, `abandon()`, clés `bym:plan-active`, `bym:plan-progress`) ;
  `app/bym/plans/page.tsx` ; `components/molecules/m-plan-card.tsx`,
  `components/molecules/m-plan-progress.tsx`.
- **Modifiés** : `o-bible-reader.tsx` (entrée dock) ; navigation/template si on ajoute un header global.

### 6.2 Données & persistance
- Plans = données statiques versionnées (pas d'API). Progression en `localStorage`.
- Calcul de progression (lus / total / restants) pur côté client, **additif** (on ne stocke que les
  jours complétés). Dates en ISO (jour local) uniquement pour l'ordre ; convertir les durées relatives.

### 6.3 API / contraintes
- Réutilise l'endpoint refs existant pour la lecture. Aucune nouvelle dépendance API.
- **Contenu** : la liste exacte des plans/jours doit être fournie/validée (donnée éditoriale).

## 7. Critères d'acceptation
- [ ] S'inscrire à un plan, lire le jour courant via le mode refs, marquer comme lu.
- [ ] Progression (lus / total / restants) exacte après plusieurs jours (test avec dates simulées).
- [ ] Reprise au 1ᵉʳ jour non lu après absence, **sans affichage de retard ni rupture** ; abandon confirmé.
- [ ] Aucune mécanique de trophée : pas de série, pas de cases vides, pas d'écran de victoire chiffré.
- [ ] `tsc` + build OK ; pages SSR sans erreur d'hydratation.

## 8. Risques & questions ouvertes
- Source des **données de plans** (éditorial) à définir.
- Un seul plan actif (MVP) vs plusieurs en parallèle → trancher.
- Gestion du retard (rattrapage) : afficher le 1ᵉʳ jour non lu vs le jour calendaire ? (recommandé :
  1ᵉʳ non lu).
