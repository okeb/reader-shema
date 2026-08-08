# Spec 06 — Verset du jour

> **Statut** : Proposé · **Priorité** : 🟢 Basse · **Effort** : S · **Dépendances** : (option) endpoint / liste éditoriale

## 1. Objectif
Mettre en avant un **verset du jour** (identique pour tous, déterministe par date), avec accès direct au
passage et partage.

## 2. Valeur utilisateur
Point d'entrée quotidien léger, propice au partage (synergie avec spec 07) et au retour régulier.
Bonne « porte d'entrée » pour les visiteurs occasionnels.

## 3. Périmètre
- **Inclus** : sélection déterministe d'un verset par jour ; carte d'affichage ; « Ouvrir le passage »
  + « Partager » (réutilise spec 07/08).
- **Exclu** : notification push quotidienne (itération PWA 2) ; personnalisation par thème.

## 4. Spécification fonctionnelle
- **Source du verset** : deux options —
  1. **Liste éditoriale statique** (recommandé MVP) : tableau de ~366 références ; index = jour de
     l'année → `livre/chap/verset`. Déterministe, hors-ligne, sans API.
  2. **Endpoint** `/bym/verse-of-the-day` si l'API en expose un (à confirmer) → contenu géré côté
     serveur.
- **Affichage** : récupère le texte du verset (mode refs existant) et l'affiche en carte.
- **Actions** : « Lire en contexte » → `/bym/read?livre=&chap=&v=` ; « Partager » → spec 07 ;
  « Copier » → spec 08.

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
- Carte en tête de `/bym/read` lors d'une arrivée à froid (repliable/dismissible pour la journée), ou
  pastille dock `hugeicons:sun-03`. Ne doit **pas** gêner le lecteur régulier (dismiss mémorisé pour
  le jour).

### 5.2 Disposition (wireframe)
```
┌── Verset du jour · 25 juin ───────────────── ✕ ─┐
│ « Car Dieu a tant aimé le monde… »               │
│ — Jean 3:16                                       │
│ [ Lire en contexte ]   [ 🔗 Partager ]  [ ⧉ ]    │
└───────────────────────────────────────────────────┘
```

### 5.3 États & interactions
- `loading` (skeleton), `loaded`, `error` (masquer silencieusement la carte).
- ✕ → masque pour la journée (clé datée en `localStorage`).

### 5.4 Responsive
- Carte pleine largeur (bornée par `max-w`) ; boutons tactiles ; texte en `font-reader`.

### 5.5 Thème clair/sombre & accessibilité
- Tokens de couleur ; `role="region" aria-label="Verset du jour"`. Citation en `<blockquote>`.

### 5.6 Micro-copy (FR)
- Titre : « Verset du jour · {date} ». Boutons : « Lire en contexte », « Partager », « Copier ».

## 6. Spécification technique
### 6.1 Fichiers
- **Nouveaux** : `lib/verse-of-the-day.ts` (liste + `getVerseOfTheDay(date)` déterministe + dismiss) ;
  `components/molecules/m-verse-of-the-day.tsx`.
- **Modifiés** : `o-bible-reader.tsx` ou `app/bym/read/page.tsx` (monter la carte à froid).

### 6.2 Données & persistance
- Liste éditoriale statique (366 entrées) en repo, ou endpoint. Dismiss = clé `bym:votd-dismissed`
  (valeur = date ISO du jour masqué).
- Déterminisme : index = `dayOfYear(date)` modulo longueur de la liste.

### 6.3 API / contraintes
- MVP sans API (liste statique). Sinon endpoint à confirmer.

## 7. Critères d'acceptation
- [ ] Le verset est identique toute la journée et change à minuit (local).
- [ ] « Lire en contexte » ouvre le bon passage surligné.
- [ ] ✕ masque la carte pour la journée uniquement.
- [ ] `tsc` + build OK ; pas d'erreur d'hydratation (date calculée côté client si besoin).

## 8. Risques & questions ouvertes
- Fournir la **liste éditoriale** des 366 versets (ou confirmer un endpoint).
- Décalage de fuseau : calculer le jour côté client pour éviter un mismatch SSR/CSR.
