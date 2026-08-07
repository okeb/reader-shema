# Spec 24 — Consulter une note (mode lecture)

> **Statut** : Proposé · **Priorité** : 🟠 Moyenne · **Effort** : S · **Dépendances** : spec 10 (notes & surlignages), spec 12 (dock contextuel)

## 1. Objectif
Permettre de **consulter** une note existante sans ouvrir l'éditeur. Aujourd'hui, cliquer sur l'icône note
d'un verset ouvre systématiquement l'éditeur en mode modification — il est impossible de lire une note
sans risquer de la modifier accidentellement.

## 2. Valeur utilisateur
- **Lecture sans risque** : relire ses notes sans pouvoir les altérer par mégarde (touch, effacement
  accidentel du textarea).
- **Rapidité** : consulter une note en un tap/clic, sans le poids cognitif de l'éditeur plein écran.
- **Cohérence** : l'icône en marge porte déjà le tooltip « Voir la note » — le comportement actuel
  ouvre l'éditeur, ce qui est inattendu.

## 3. Périmètre
- **Inclus** :
  - Un composant `NoteViewer` (lecture seule) affichant le texte de la note, ses versets associés et
    un bouton « Modifier ».
  - Clic sur l'icône note en marge d'un verset → `NoteViewer` (lecture seule), pas l'éditeur.
  - Si le verset porte **plusieurs notes**, le `NoteViewer` les liste (références + extrait) et l'utilisateur
    peut naviguer entre elles sans quitter la vue.
  - Depuis le `NoteViewer`, un bouton « Modifier » bascule vers le `NoteEditor` (comportement actuel).
  - Le panneau latéral « Mes notes » ouvre aussi le `NoteViewer` au lieu de juste naviguer vers le verset.
- **Exclu (itération 1)** :
  - Édition inline dans le viewer (trop complexe, l'éditeur plein écran reste le mode d'édition).
  - Mode lecture pour les surlignages (ce sont des couleurs, pas du texte — pas de problème de lecture).

## 4. Spécification fonctionnelle
- **Déclencheurs** :
  - **Icône note en marge** (`onOpenNote`) → ouvre le `NoteViewer` pour ce verset.
  - **Panneau latéral « Mes notes »** (`onSelect` dans `NotesPanel`) → navigue vers le verset **et**
    ouvre le `NoteViewer` (au lieu de juste naviguer).
  - **Action « Noter » du cluster de verset** (`onNote`) → ouvre le `NoteEditor` (inchangé — c'est une
    action intentionnelle d'écriture).
- **Comportement du `NoteViewer`** :
  - Affiche : titre (références des versets associés, joints par « · »), texte de la note, extrait du
    verset ancre en italique.
  - Si le verset porte **0 note** : ne s'ouvre pas (n'arrive pas — l'icône n'est affichée que si
    `hasNote` est vrai).
  - Si le verset porte **1 note** : affiche directement cette note.
  - Si le verset porte **2+ notes** : affiche la liste (références + extrait de chaque note) ; le tap
    sur une note la déploie en lecture.
  - Bouton « Modifier » en bas → ferme le viewer et ouvre le `NoteEditor` pré-rempli avec cette note.
  - Bouton « Fermer » (×) ou Échap → ferme le viewer.
- **Transition viewer → éditeur** : le viewer se ferme, l'éditeur s'ouvre avec `initialNoteId`,
  `initialText` et `initialVerses` de la note concernée. Aucune perte de données.

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
- Icône note en marge du verset (lecture continue) → viewer.
- Panneau latéral « Mes notes » → viewer (après navigation vers le verset).
- Cluster de verset « Note » → éditeur (inchangé).

### 5.2 Disposition (wireframe)
```
NoteViewer (1 note) :

┌─────────────────────────────────────┐
│ 📝 Jean 3:16                    [×] │
│                                    │
│   Car Dieu a tant aimé le monde…    │  ← extrait du verset ancre (italique)
│                                    │
│   Ma réflexion sur ce verset…      │  ← texte de la note
│                                    │
│                    [ Modifier ]     │
└─────────────────────────────────────┘

NoteViewer (2+ notes, liste) :

┌─────────────────────────────────────┐
│ 📝 Notes sur Jean 3:16         [×] │
│                                    │
│   Jean 3:16 · Jean 3:17            │  ← note 1 (références)
│   Ma réflexion sur ce verset…      │  ← extrait de la note 1
│                                    │
│   Jean 3:16                         │  ← note 2
│   Autre pensée…                     │  ← extrait de la note 2
│                                    │
│                    [ Modifier ]     │  ← modifie la note sélectionnée
└─────────────────────────────────────┘
```

### 5.3 États & interactions
- **Ouverture** : fondu + slide-in (comme le panneau de notes existant), 200 ms.
- **1 note** : affiche directement le contenu.
- **2+ notes** : affiche la liste ; tap/clic sur une note la déploie (les autres restent visibles,
  repliées). La note déployée est « active » (`bg-accent/60`).
- **Bouton « Modifier »** : ouvre l'éditeur plein écran (transition immédiate).
- **Fermeture** : × ou Échap → fondu sortant.
- **Note vide** : affiche « Note vide » en italique (comme dans l'éditeur actuel et le panneau).

### 5.4 Responsive
- **Mobile** : le viewer occupe le bas de l'écran (sheet, même positionnement que le dock contextuel).
- **Desktop** : le viewer flotte à droite de l'espace de lecture (même positionnement que le panneau
  Strong / les renvois).

### 5.5 Thème clair/sombre & accessibilité
- Même palette que le panneau de notes existant et le dock (`bg-background`, `text-foreground`,
  `text-muted-foreground`, accents `text-primary`).
- `role="dialog"`, `aria-label="Note — {référence}"`.
- Navigation clavier : Échap pour fermer, Tab pour parcourir les notes (si 2+).

### 5.6 Micro-copy (FR)
- Titre (1 note) : `{références}` (ex. « Jean 3:16 · Jean 3:17 »).
- Titre (2+ notes) : `Notes sur {référence ancre}`.
- Bouton modifier : « Modifier ».
- Note vide : « Note vide » (italique).
- Bouton fermer : icône ×, `title="Fermer (Échap)"`.

## 6. Spécification technique
### 6.1 Fichiers (nouveaux / modifiés)
- **Nouveaux** :
  - `components/molecules/m-note-viewer.tsx` — composant lecture seule. Même coque visuelle que
    `NoteEditor` mais sans textarea, sans gestion de versets détachables, sans « Associer un verset ».
    Affiche le texte de la note, les références, l'extrait du verset ancre, et un bouton « Modifier ».
- **Modifiés** :
  - `components/organisms/o-bible-reader.tsx` :
    - `openNoteForVerse` ouvre le `NoteViewer` (plus l'éditeur) quand le verset a une ou plusieurs notes.
    - Nouvel état `noteViewer` (semblable à `noteEditor` mais pour le viewer).
    - Ajout du composant `<NoteViewer>` dans le rendu, avec `onEdit` → bascule vers l'éditeur.
  - `components/molecules/m-notes-panel.tsx` :
    - `onSelect` appelle toujours `goToNote` (navigation vers le verset) **puis** ouvre le viewer
      au lieu de juste naviguer.
  - `components/molecules/m-note-editor.tsx` : aucun changement fonctionnel. Le bouton « Modifier »
    du viewer appellera la même machinerie que l'action « Noter » du cluster.

### 6.2 Données & persistance
- Aucune nouvelle donnée. Le viewer lit les notes existantes via `useAnnotations()` (hook existant).
- La bascule viewer → éditeur transmet `initialNoteId`, `initialVerses`, `initialText` (lus depuis
  `annotations.getNote(id)`).

### 6.3 API / contraintes
- Aucun appel API supplémentaire. Le viewer utilise les données déjà en mémoire (le verset texte
  est dans `VerseRef.text`, la note dans `Note.text`).

### 6.4 Composant `m-note-viewer.tsx` — interface
```ts
interface NoteViewerProps {
  open: boolean;
  /** Verset ancre (celui depuis lequel le viewer a été ouvert). */
  anchorVerse: VerseRef | null;
  /** Notes à afficher (1 ou plus). */
  notes: Note[];
  /** Note active (déployée) — si plusieurs notes, celle affichée en détail. */
  activeNoteId: string | null;
  /** Ouvre l'éditeur pour modifier la note active. */
  onEdit: (noteId: string) => void;
  /** Ferme le viewer. */
  onClose: () => void;
}
```

## 7. Critères d'acceptation
- [ ] Cliquer l'icône note en marge d'un verset ouvre le `NoteViewer` (lecture seule), pas l'éditeur.
- [ ] Si le verset a 1 note, le viewer affiche directement son contenu.
- [ ] Si le verset a 2+ notes, le viewer les liste et permet de sélectionner laquelle lire.
- [ ] Le bouton « Modifier » dans le viewer ouvre le `NoteEditor` pré-rempli avec la note active.
- [ ] Fermer le viewer (× ou Échap) n'altère aucune donnée.
- [ ] L'action « Noter » du cluster de verset ouvre toujours l'éditeur (comportement inchangé).
- [ ] Le panneau « Mes notes » navigue vers le verset et ouvre le viewer de la note sélectionnée.
- [ ] Le viewer respecte le thème clair/sombre et est responsive (sheet en mobile, flottant en desktop).
- [ ] `tsc --noEmit` + `pnpm build` OK ; non-régression lecteur/notes/favoris.

## 8. Risques & questions ouvertes
- **Chevauchement viewer/panneau latéral** : si le panneau « Mes notes » est ouvert et qu'on clique une
  note, le viewer s'ouvre par-dessus. Option : fermer le panneau latéral en même temps (comportement
  actuel du panneau → navigation qui ferme déjà le panneau sur mobile). À confirmer à l'implémentation.
- **Notes vides** : une note peut exister avec un texte vide (l'utilisateur a sauvegardé sans écrire).
  Le viewer affiche « Note vide » en italique, avec le bouton « Modifier » visible — cohérent avec
  l'existant.