# Spec 10 — Notes & surlignages personnels

> **Statut** : Implémenté · **Priorité** : 🟠 Moyenne · **Effort** : M · **Dépendances** : — (s'appuie sur le système de signets)

## 1. Objectif
Permettre d'**annoter** un verset (note texte personnelle) et de le **surligner au feutre** d'une
couleur, en complément des signets existants.

## 2. Valeur utilisateur
Étude personnelle et méditation : garder ses réflexions au fil du texte, retrouver ses passages
marquants d'un coup d'œil. Prolonge naturellement le système de signets/couleurs déjà en place
(`lib/bookmarks.ts`, soulignement ondulé).

## 3. Périmètre
- **Inclus** : surlignage couleur d'un verset (fond/feutre), distinct du soulignement ondulé des
  signets ; note texte attachée à un verset ; indicateur de note dans le texte ; liste/recherche de
  ses notes.
- **Exclu** : surlignage **infra-verset** (sélection de mots précis) en MVP — verset entier d'abord ;
  partage de notes ; synchro multi-appareils.

## 4. Spécification fonctionnelle
- **Surlignage** : depuis la sélection, appliquer une couleur de feutre (palette réutilisant
  `BOOKMARK_COLORS`). Stocké par verset. Rendu = fond translucide de la couleur (à distinguer
  visuellement du soulignement ondulé des signets et de la surbrillance de sélection).
- **Note** : une note texte par verset (création/édition/suppression). Indicateur discret (petit point
  ou icône `hugeicons:sticky-note-01`) en marge du verset annoté ; clic → ouvre la note.
- **Liste des notes** : panneau listant toutes les notes (référence + extrait + aperçu de la note),
  clic → navigue vers le verset (machinerie signets). Recherche locale sur le contenu des notes.
- Coexistence : un verset peut être à la fois signet, surligné et annoté ; superposer proprement les
  indices visuels.

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
- Actions « Surligner » (avec sous-palette couleur) et « Noter » dans `VerseActions`.
- Indicateur de note en marge ; survol → tooltip/extrait, clic → éditeur.
- Panneau « Mes notes » via dock (`hugeicons:note-01`) ou réglages.

### 5.2 Disposition (wireframe)
```
Texte :
  16 ░░Car Dieu a tant aimé le monde…░░  • ← surligné + point de note
        └ clic point → ┌── Note · Jean 3:16 ──────┐
                       │ [ votre réflexion…       ]│
                       │            [Supprimer][✓] │
                       └───────────────────────────┘

Panneau « Mes notes » (liste) :
  ● Jean 3:16  « Car Dieu a tant… »   — “grâce imméritée”
  ● Romains 8:28 « Nous savons… »      — “à méditer”
```

### 5.3 États & interactions
- Surligner → applique/retire la couleur (toggle par couleur). Noter → éditeur inline (sheet mobile).
- Sauvegarde auto à la fermeture ; suppression confirmée.
- Liste : tri par date/livre ; recherche filtre en direct.

### 5.4 Responsive
- Éditeur de note = **bottom sheet** sur mobile, popover ancré desktop. Panneau notes = coque latérale
  réutilisée (`animate-slide-in-right`, voile mobile), comme le panneau signets.

### 5.5 Thème clair/sombre & accessibilité
- Surlignage : opacité adaptée en `.dark` (lisibilité du texte par-dessus). Indicateur de note avec
  `aria-label`. Éditeur = `<textarea>` accessible, focus piégé dans la sheet.

### 5.6 Micro-copy (FR)
- « Surligner », « Noter » / « Modifier la note ». Liste : « Mes notes ». Vide : « Aucune note pour
  l'instant. » Suppression : « Supprimer cette note ? »

## 6. Spécification technique
### 6.1 Fichiers
- **Nouveaux** : `lib/annotations.ts` (`useAnnotations()` : `highlights`, `notes`, setters ; clés
  `bym:highlights`, `bym:notes` ; mêmes patterns que `lib/bookmarks.ts`) ;
  `components/molecules/m-note-editor.tsx` ; `components/molecules/m-notes-panel.tsx`.
- **Modifiés** : `m-verse-actions.tsx` (actions surligner/noter) ; `o-bible-reader.tsx` (rendu du
  surlignage + indicateur de note par verset, dans les 3 layouts comme le soulignement signet ;
  ouverture éditeur/panneau ; navigation depuis la liste) ; raccourci clavier (ex. `N`) + entrée dans
  `m-shortcuts-help.tsx`.

### 6.2 Données & persistance
- `localStorage` : `highlights` = `{ verseId: color }` ; `notes` = `{ verseId: { text, updatedAt,
  reference, bookId, chapter, verse } }`. Clé verset = même schéma que favoris/bookmarks
  (`version:bookId:chapter:verse`).

### 6.3 API / contraintes
- 100 % client. Aucune dépendance API. Attention au volume `localStorage` (notes longues) — rester
  raisonnable, prévoir un export (cf. §8).

## 7. Critères d'acceptation
- [ ] Surligner un verset (couleur) → fond persistant, distinct du signet et de la sélection.
- [ ] Ajouter/modifier/supprimer une note ; indicateur visible sur le verset annoté.
- [ ] Panneau « Mes notes » liste, recherche et navigue vers le verset.
- [ ] Coexistence signet + surlignage + note lisible ; `tsc` + build OK.

## 8. Risques & questions ouvertes
- **Sauvegarde des données** : tout en local → risque de perte (effacement navigateur). Prévoir un
  **export/import JSON** (recommandé, transverse avec favoris/signets).
- Surlignage infra-verset (mots précis) : itération 2 ? (plus complexe : offsets de tokens).
- Empilement visuel des indices (signet ondulé + feutre + sélection) à designer soigneusement.
