# Spec 12 — Dock contextuel (mutation à la sélection, tactile)

> **Statut** : ✅ Implémenté (local) · **Priorité** : 🟠 Moyenne · **Effort** : S · **Dépendances** : —

## 1. Objectif
Sur mobile/tactile, **transformer le dock** d'outils en barre d'actions de sélection quand un ou
plusieurs versets sont sélectionnés, au lieu d'afficher une **seconde pilule flottante** au-dessus du
dock. Un seul point d'ancrage en bas d'écran, qui change de rôle selon le contexte.

## 2. Valeur utilisateur
Aujourd'hui sur tactile, sélectionner un verset empile **deux pilules** (cluster d'actions à
`bottom-24` + dock à `bottom-5`) : c'est lourd visuellement et ça mange de la hauteur en bas d'écran.
La mutation contextuelle donne une sensation **native** (toolbar iOS/macOS qui devient contextuelle),
allège l'écran et offre des cibles tactiles plus grandes (44 px).

## 3. Périmètre
- **Inclus** : sur **tactile uniquement**, le dock affiche le cluster `VerseActions` (copier, favori,
  signet, Strong, effacer) à la place des outils quand `selection.count > 0`. Suppression de la barre
  flottante séparée `bottom-24`. Transition par fondu (`animate-fade-in-up`).
- **Exclu** : le **desktop** (pointeur fin) — le cluster inline au survol du verset y reste, car il est
  ancré au texte (zéro déplacement de souris, supérieur à une barre en bas). Aucune animation de
  largeur « morph » mesurée (le fondu suffit).

## 4. Spécification fonctionnelle
- Le dock a deux états mutuellement exclusifs :
  - **Outils** (défaut) : Favoris, Reprendre, Réglages, Signets, Thème, Raccourcis.
  - **Actions de sélection** : `VerseActions` (badge du nombre + copier + favori + signet + Strong +
    effacer).
- Bascule vers l'état Actions ssi `coarse && selection.count > 0 && !strongsOpen`.
  - `!strongsOpen` : quand le panneau Strong occupe l'écran, le dock reste en mode Outils (le panneau
    porte déjà ses propres actions ; cohérent avec le comportement actuel qui masquait le cluster).
- Sortie de l'état Actions : « Effacer » (`onClear`) vide la sélection → le dock revient aux outils.
- Pendant une sélection, les outils (thème/réglages) sont **temporairement indisponibles** : acceptable,
  la sélection est un mode transitoire.

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
- Même conteneur que le dock (`fixed bottom-5 left-1/2 -translate-x-1/2`, pilule `rounded-full`).
- Déclencheur : présence d'une sélection sur appareil tactile (hors panneau Strong ouvert).

### 5.2 Disposition (wireframe)
```
Repos (tactile) :          Sélection active (tactile) :
┌───────────────────────┐  ┌─────────────────────────────┐
│ ♥  ⚙  ▣  ◐            │  │ [2]  ⧉  ♥  ⛉  📖  ✕         │  ← le dock lui-même
└───────────────────────┘  └─────────────────────────────┘
  (outils du dock)            (VerseActions, bare, h-11)

Avant (à supprimer) : 2 pilules empilées
        ┌──────────────────┐
        │ [2] ⧉ ♥ ⛉ 📖 ✕ │  bottom-24
        └──────────────────┘
        ┌──────────────────┐
        │ ♥  ⚙  ▣  ◐       │  bottom-5
        └──────────────────┘
```

### 5.3 États & interactions
- `count === 0` → Outils. `count > 0` (tactile, Strong fermé) → Actions, fondu d'entrée.
- Boutons d'action en **`h-11 w-11`** (cibles 44 px) → pas de saut de hauteur du dock.
- Popover du sélecteur de signet (`BookmarkPicker`) s'ouvre **vers le haut** (inchangé).

### 5.4 Responsive
- **Tactile** : mutation du dock (cette spec).
- **Desktop** : inchangé — cluster inline au survol du verset, dock toujours en mode Outils.
- Le dock conserve `max-w-[calc(100vw-1.5rem)]` + `overflow-x-auto`.

### 5.5 Thème clair/sombre & accessibilité
- Couleurs via tokens (le dock et `VerseActions` les utilisent déjà) → suit `.dark`.
- Cibles tactiles 44 px. Titres (`title`) conservés sur chaque action.

### 5.6 Micro-copy (FR)
- Inchangée (réutilise les libellés de `VerseActions` : « Copier la sélection », « Mettre en favori »,
  « Mettre de côté (signet) », « Afficher les Strong », « Effacer la sélection »).

## 6. Spécification technique
### 6.1 Fichiers (nouveaux / modifiés)
- **Modifié** `components/molecules/m-verse-actions.tsx` : ajouter une prop **`bare?: boolean`**. En
  mode `bare`, retirer le chrome de pilule (`border/bg/shadow/rounded-full/p-1` → `inline-flex
  items-center gap-0.5`) et agrandir les boutons (`h-11 w-11 rounded-xl`, icônes `h-5 w-5`, façon
  `FLOATING_BTN`) pour s'intégrer au dock et offrir des cibles 44 px.
- **Modifié** `components/organisms/o-bible-reader.tsx` :
  - Supprimer le bloc cluster flottant `bottom-24` (l. ~1170-1189).
  - Dans le conteneur du dock (l. ~1192), brancher : si `coarse && selection.count > 0 &&
    !strongsOpen` → rendre `<VerseActions bare … />` (mêmes props que le cluster supprimé) enveloppé
    d'un `div.animate-fade-in-up` ; sinon → rendre les outils existants.
  - **Exclusivité tactile** : les **trois** clusters inline doivent être gatés `!coarse` pour ne pas
    s'afficher en double avec le dock muté : layout `verses` (déjà `isAnchor && !coarse`), layout
    `flowing/plain` (`showCluster = !coarse && isSel && hoverId === id`), et le mode refs via
    `VerseCard` (passer `coarse` + gate `isAnchor && !coarse`).
- **Modifié** `components/molecules/m-verse-card.tsx` : prop `coarse?: boolean` ; cluster inline gaté
  `isAnchor && !coarse`.

### 6.2 Données & persistance
- Aucune. Pur présentationnel ; réutilise l'état `selection` existant.

### 6.3 API / contraintes
- Aucune. Respecte atomic design (`a-`/`m-`/`o-`), Tailwind class-based dark mode, `cn()`.

## 7. Critères d'acceptation
- [ ] Tactile : sélectionner un verset → le **dock** affiche les actions (plus de 2e pilule).
- [ ] Le badge du nombre, copier, favori, signet, Strong, effacer fonctionnent comme avant.
- [ ] Pas de saut de hauteur perceptible du dock entre les deux états ; fondu d'entrée propre.
- [ ] Panneau Strong ouvert → le dock reste en mode Outils.
- [ ] « Effacer » revient aux outils.
- [ ] **Desktop inchangé** : cluster inline au survol, dock toujours en outils.
- [ ] `npx tsc --noEmit` propre ; thème clair/sombre OK.

## 8. Risques & questions ouvertes
- Pendant la sélection, les réglages/thème sont inaccessibles depuis le dock — choix assumé (mode
  transitoire). Si gênant, itération 2 : un bouton « réglages » persistant à côté des actions.
- Largeur du dock non animée (fondu seulement) : si un « morph » de largeur est souhaité, il faudra
  mesurer les largeurs des deux états — hors périmètre.
