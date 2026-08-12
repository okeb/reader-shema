# Spec 34 — Index des notes de la sélection (viewer avant l'éditeur)

> **Statut** : Proposé · **Priorité** : 🟠 Moyenne · **Effort** : S–M · **Dépendances** : spec 10
> (notes & surlignages), spec 12 (dock contextuel), spec 24 (`NoteViewer`), spec 30 (icône note
> dans la bulle de sélection)

## 1. Objectif
Quand l'utilisateur sélectionne un ou plusieurs versets et clique sur l'action **Note** de la bulle,
l'application saute aujourd'hui **directement dans un éditeur vide** (`openNoteForSelection` →
`NoteEditor` avec `initialNoteId: null`), ignorant les notes déjà existantes sur ces versets. On
introduit une étape **préalable** : un index/lecteur qui montre les notes déjà liées à la sélection
avant d'écrire — et qui, à défaut, indique clairement l'absence de note avec une action de création
explicite.

## 2. Valeur utilisateur
- **Découverte des notes existantes** : aujourd'hui, en présence d'une note, l'icône passe à
  `note-edit` et le `title` à « Modifier la note », mais le clic ouvre quand même un éditeur vierge
  — la note préexistante n'est visible que via la liste secondaire « Autres notes sur ce verset »
  dans l'éditeur, ce qui est peu découvrable. L'index la met en évidence.
- **Création explicite** : « Aucune note n'est associée à ce/ces verset(s) » + bouton « Créer une
  note » rend l'état vide lisible et désambiguïse la création.
- **Multi-notes par verset** : un même verset peut porter plusieurs notes (modèle N-à-N de spec 10).
  L'index permet de choisir laquelle consulter/modifier, et d'en créer une nouvelle à côté des
  existantes — sans passer par l'éditeur.
- **Lecture sans risque** : consulter une note ouvre le `NoteViewer` (lecture seule) ; la
  modification reste un acte intentionnel via le bouton « Modifier » (cohérent avec spec 24).

## 3. Périmètre
- **Inclus** :
  - Au clic sur l'action **Note** de la bulle de sélection (`openNoteForSelection`) : ouverture du
    `NoteViewer` (index des notes liées à la sélection) au lieu de l'éditeur plein écran.
  - Trois états du viewer selon le nombre de notes liées : **0 (vide)**, **1+ (index)**,
    **consultation d'une note (détail)**.
  - Bouton **« Créer une note »** (état vide) / **« Créer une nouvelle note »** (index) qui ouvre
    l'éditeur vierge pré-rempli avec les versets sélectionnés (comportement actuel
    `openNoteForSelection`).
  - Bouton **« Modifier »** en consultation (détail) → éditeur pré-rempli (comportement spec 24,
    `editNoteFromViewer`).
  - Micro-copy singulier/pluriel selon le nombre de versets sélectionnés.
- **Exclu (itération 1)** :
  - Modification du déclencheur **indicateur de note en marge** (`openNoteForVerse`) — son
    comportement reste celui de spec 24 (1 note → détail direct, 2+ → liste+detail inline).
  - Modification du **panneau latéral « Mes notes »** (`goToNote`).
  - Édition inline dans le viewer (l'éditeur plein écran reste le seul mode d'édition).
  - Surlignages (pas de texte, pas de problème de lecture).

## 4. Spécification fonctionnelle
- **Déclencheur** : clic sur le bouton Note de la bulle de sélection (`m-verse-actions.tsx`,
  `onNote` → `openNoteForSelection`). Comportement inchangé côté bulle (spec 30), seul le handler
  change.
- **Notion de « note liée à la sélection »** : une note est liée si **au moins un** de ses versets
  (`note.verses[].verseId`) figure parmi les versets sélectionnés (intersection). C'est l'extension
  naturelle de `notesForVerse` à un ensemble. Dédoublonnée, triée par `updatedAt` décroissant.
- **État 0 note (vide)** : page « Aucune note n'est associée à ce verset. » (singulier, 1 verset)
  ou « Aucune note n'est associée à ces versets. » (pluriel, ≥ 2 versets) + bouton primaire
  « Créer une note ». Aucune liste.
- **État 1+ note (index)** : liste cliquable des notes liées (références jointes par « · » + extrait
  sur 2 lignes) + bouton « Créer une nouvelle note » en tête. Le tap/clic sur une ligne ouvre la
  consultation (détail) de cette note.
- **Consultation (détail)** : affiche l'extrait du verset ancre (italique) puis le texte de la note,
  avec un bouton **« Modifier »** (ouvre l'éditeur pré-rempli) et un retour à l'index. Identique au
  corps du `NoteViewer` actuel.
- **Création** : « Créer une note » / « Créer une nouvelle note » → ferme le viewer et ouvre
  `NoteEditor` avec `initialNoteId: null`, `initialVerses` = versets sélectionnés (anchor + autres),
  `anchorVerse` = ancre de la sélection. C'est l'exact comportement actuel d'`openNoteForSelection`,
  déclenché désormais depuis le viewer.
- **Modification** : « Modifier » → `editNoteFromViewer(note.id)` : ferme le viewer, ouvre
  l'éditeur avec `initialNoteId: note.id`, `initialVerses: note.verses` (versets propres à la note,
  pas la sélection), `anchorVerse: noteViewer.anchorVerse ?? note.verses[0]`. Inchangé.
- **Fermeture** : × ou Échap → ferme le viewer sans altérer les données. La sélection est préservée
  (le cluster reste en place, comme aujourd'hui).

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
- Bulle d'action de sélection (desktop : pilule glass ; mobile : dock cluster `bare`), bouton
  Note → `NoteViewer` (index). Coque visuelle existante du viewer (`fixed inset-0 z-[60]`).

### 5.2 Disposition (wireframe)
```
État VIDE (0 note liée, 2 versets sélectionnés) :

┌─────────────────────────────────────┐
│ 📝 Jean 3:16 · Jean 3:17        [×] │
│                                    │
│                                    │
│   Aucune note n'est associée       │
│   à ces versets.                   │
│                                    │
│         [ +  Créer une note ]      │
│                                    │
└─────────────────────────────────────┘

État INDEX (1+ note liée) :

┌─────────────────────────────────────┐
│ 📝 Jean 3:16 · Jean 3:17        [×] │
│                                    │
│   [ +  Créer une nouvelle note ]   │
│                                    │
│   Jean 3:16 · Jean 3:17            │  ← note 1 (cliquable)
│   Ma réflexion sur ce verset…      │
│                                    │
│   Jean 3:16                        │  ← note 2 (cliquable)
│   Autre pensée…                    │
└─────────────────────────────────────┘

État CONSULTATION (détail d'une note) :

┌─────────────────────────────────────┐
│ ← Retour   Jean 3:16 · Jean 3:17    │
│                                    │
│   Car Dieu a tant aimé le monde…    │  ← extrait du verset ancre (italique)
│                                    │
│   Ma réflexion sur ce verset…      │  ← texte de la note
│                                    │
│                       [ Modifier ] │
└─────────────────────────────────────┘
```

### 5.3 États & interactions
- **Ouverture** : fondu + slide-in (coque existante du `NoteViewer`), 200 ms. Arrivée sur l'index
  (ou l'état vide si 0 note).
- **Index** : chaque ligne est un bouton pleine largeur (`hover:bg-accent/60`). Le bouton
  « Créer une nouvelle note » est en tête (bouton « tonique »/secondaire, icône `ph:plus`).
- **Consultation** : depuis l'index, clic ligne → détail. Bouton « ← Retour » revient à l'index
  (l'état `selectedId` est conservé). « Modifier » → éditeur. × / Échap → ferme tout.
- **Cas 1 seule note** : l'index affiche une seule ligne (cliquable) + le bouton « Créer une
  nouvelle note ». Aucun détail auto-déployé — la consultation reste un clic explicite, conformément
  à la demande (« s'affiche dans une liste cliquable »).
- **Note vide** : extrait « Note vide » en italique (cohérent avec l'éditeur et le panneau).
- **Fermeture** : × ou Échap → fondu sortant. Le cluster de sélection reste affiché.

### 5.4 Responsive
- **Mobile** : le viewer occupe tout l'écran (sheet plein écran `fixed inset-0`, même coque que
  l'éditeur actuel). Cibles tactiles ≥ 44 px pour les lignes et les boutons.
- **Desktop** : plein écran `fixed inset-0` (coque actuelle du `NoteViewer`). À noter : le viewer
  existant est déjà plein écran ; on conserve ce choix pour la cohérence avec l'éditeur.

### 5.5 Thème clair/sombre & accessibilité
- Même palette que le `NoteViewer` et le dock (`bg-background`, `text-foreground`,
  `text-muted-foreground`, accents `text-primary`).
- `role="dialog"`, `aria-label="Notes de la sélection — {référence ancre}"`.
- Navigation clavier : Échap ferme ; Tab parcourt les lignes puis les boutons ; Entrée sur une
  ligne ouvre le détail. Focus piégé dans le dialog.
- Icônes `@iconify/react` (`hugeicons:sticky-note-01`, `ph:plus`, `ph:arrow-left`, `ph:x`) héritent
  de `currentColor` → s'adaptent au thème.

### 5.6 Micro-copy (FR)
- Titre (header) : références jointes par « · » de la sélection (ex. « Jean 3:16 · Jean 3:17 »),
  tronquées si nombreuses (`truncate`).
- État vide (1 verset) : « Aucune note n'est associée à ce verset. »
- État vide (≥ 2 versets) : « Aucune note n'est associée à ces versets. »
- Bouton création (vide) : « Créer une note ».
- Bouton création (index) : « Créer une nouvelle note ».
- Ligne d'index : références + extrait ; note vide → « Note vide » (italique).
- Consultation : bouton « ← Retour » (`title="Retour à la liste"`), bouton « Modifier ».
- Fermeture : icône ×, `title="Fermer (Échap)"`.

## 6. Spécification technique
### 6.1 Fichiers (nouveaux / modifiés)
- **Modifier** : `src/presentation/stores/annotations.store.ts`
  - Ajouter le sélecteur `notesForVerses(verseIds: string[]): Note[]` (intersection, dédoublonnée,
    tri `updatedAt` desc) — extension de `notesForVerse` à un ensemble :
    ```ts
    notesForVerses: (verseIds: string[]) =>
      Array.from(
        new Map(
          Object.values(get().notes)
            .filter((n) => n.verses.some((v) => verseIds.includes(v.verseId)))
            .map((n) => [n.id, n] as const),
        ).values(),
      ).sort((a, b) => b.updatedAt - a.updatedAt),
    ```
- **Modifier** : `src/presentation/components/molecules/m-note-viewer.tsx`
  - Étendre `NoteViewerProps` :
    ```ts
    export interface NoteViewerProps {
      open: boolean;
      anchorVerse: VerseRef | null;
      notes: Note[];
      activeNoteId: string | null;
      onEdit: (noteId: string) => void;
      onClose: () => void;
      /** Affiché pour ouvrir un éditeur vierge (nouvelle note). Quand fourni, active le
       *  bouton « Créer… » et l'état vide (sinon 0 note → return null, comportement spec 24). */
      onCreate?: () => void;
      /** Nb de versets de la sélection — pilotage singulier/pluriel de l'état vide. */
      selectionCount?: number;
      /** Force l'affichage de l'index (liste) même pour 1 note (flux sélection). Défaut false
       *  (flux marge spec 24 : 1 note → détail direct). */
      forceIndex?: boolean;
    }
    ```
  - Remplacer la garde `if (!open || notes.length === 0) return null;` par : si `!open` → `null` ;
    si `notes.length === 0` → rendu de l'état vide **seulement** quand `onCreate` est fourni (sinon
    `null`, comportement spec 24 inchangé pour le flux marge).
  - Ajouter un état local `view: 'index' | 'detail'` (défaut `'index'` si `forceIndex` ou
    `notes.length > 1`, sinon `'detail'`). `selectedId` pilote la note consultée.
  - Rendre le bouton « Créer… » dans l'en-tête de l'index (et dans l'état vide) → `onCreate`.
  - Rendre « ← Retour » dans l'en-tête du détail → `setView('index')`.
  - Conserver le bouton « Modifier » du détail → `onEdit(active.id)`.
- **Modifier** : `src/presentation/components/templates/t-reader.tsx`
  - `openNoteForSelection` (lignes ~561–580) : au lieu de `setNoteEditor(...)`, construire
    `selected: VerseRef[]` (déjà fait), en déduire `verseIds = selected.map(v => v.verseId)`,
    `notes = annotations.notesForVerses(verseIds)`, puis `setNoteViewer({ anchorVerse,
    notes, activeNoteId: null, selectionVerses: selected })`. Le viewer s'ouvre en index.
  - Étendre l'état `noteViewer` pour porter `selectionVerses: VerseRef[]` (les versets à associer
    à la nouvelle note) :
    ```ts
    const [noteViewer, setNoteViewer] = useState<{
      anchorVerse: VerseRef;
      notes: Note[];
      activeNoteId: string | null;
      selectionVerses: VerseRef[]; // versets de la sélection (pour onCreate)
    } | null>(null);
    ```
  - Ajouter `createNoteFromSelection` (handler `onCreate` du viewer) :
    ```ts
    const createNoteFromSelection = useCallback(() => {
      if (!noteViewer) return;
      const verses = noteViewer.selectionVerses.length > 0
        ? noteViewer.selectionVerses
        : [noteViewer.anchorVerse];
      setNoteViewer(null);
      setNoteEditor({
        anchorVerse: noteViewer.anchorVerse,
        initialVerses: verses,
        initialNoteId: null,
      });
    }, [noteViewer]);
    ```
  - Brancher `<NoteViewer>` (lignes ~915–922) avec `onCreate={createNoteFromSelection}`,
    `selectionCount={noteViewer?.selectionVerses.length ?? 1}`, `forceIndex`.
  - `editNoteFromViewer` (lignes ~607–620) : inchangé (utilise `noteViewer.anchorVerse` et
    `note.verses`). ⚠ adapter si l'état `noteViewer` change de forme (ajout de `selectionVerses`).

### 6.2 Données & persistance
- Aucune nouvelle donnée. Le viewer lit les notes via `annotations.notesForVerses(verseIds)` (nouveau
  sélecteur) ; la création/édition réutilise `saveNote` / le flux éditeur existant.
- La bascule viewer → éditeur (création ou modification) transmet `initialNoteId`, `initialVerses`,
  `anchorVerse` comme aujourd'hui. Aucune perte de données.

### 6.3 API / contraintes
- 100 % client, aucun appel API. Les `VerseRef` proviennent de `verseRefFromSelId` (depuis
  `selectionData`) ; le `verseId` est construit via `bmIdFor(bookId, chapter, verse)`.
- Pas d'impact sur `useReaderShortcuts` (la touche `n` ouvre le panneau des notes, pas l'éditeur de
  la sélection — inchangé).

## 7. Critères d'acceptation
- [ ] Cliquer l'action **Note** de la bulle de sélection ouvre le `NoteViewer` (index), pas
      l'éditeur plein écran.
- [ ] **0 note liée** : état vide avec message singulier (« ce verset ») si 1 verset sélectionné,
      pluriel (« ces versets ») si ≥ 2, et bouton « Créer une note ».
- [ ] **1 note liée** : index affichant une ligne cliquable + bouton « Créer une nouvelle note ».
- [ ] **2+ notes liées** : index affichant toutes les notes liées (intersection avec la sélection),
      triées par date de mise à jour décroissante, dédoublonnées.
- [ ] Cliquer une ligne de l'index ouvre la consultation (détail) avec l'extrait du verset ancre,
      le texte de la note et un bouton « Modifier » ; « ← Retour » revient à l'index.
- [ ] « Créer une note » / « Créer une nouvelle note » ouvre l'éditeur vierge pré-rempli avec les
      versets sélectionnés (`initialNoteId: null`).
- [ ] « Modifier » ouvre l'éditeur pré-rempli avec la note concernée (`initialNoteId`,
      `initialVerses = note.verses`).
- [ ] Fermer le viewer (× ou Échap) n'altère aucune donnée et conserve la sélection.
- [ ] L'indicateur de note en marge (`openNoteForVerse`) et le panneau « Mes notes » (`goToNote`)
      ne changent pas de comportement (non-régression spec 24).
- [ ] Le viewer respecte le thème clair/sombre et est responsive (cibles ≥ 44 px sur mobile).
- [ ] `tsc --noEmit` + `pnpm build` OK ; non-régression lecteur/notes/favoris/sélection.

## 8. Risques & questions ouvertes
- **Définition de « liée »** : on retient l'**intersection** (note touchant au moins un verset
  sélectionné). Alternative plus stricte : note dont **tous** les versets sont dans la sélection
  (inclusion). L'inclusion est contre-intuitive (une note sur Jean 3:16·3:17 ne ressortirait pas
  si on ne sélectionne que Jean 3:16) — on garde l'intersection. À valider.
- **Changement de signature de `noteViewer`** : ajouter `selectionVerses` à l'état cassera
  `setNoteViewer` dans `openNoteForVerse` et `goToNote` (qui ne fournissent pas ce champ). Soit
  rendre `selectionVerses` optionnel (`?: VerseRef[]`) avec défaut `[]`, soit y passer
  `selectionVerses: [anchor]` pour ces flux. Préférer l'option `selectionVerses?: VerseRef[]` et
  ne pas rendre `onCreate` pour ces flux (comportement spec 24 préservé : pas de bouton créer,
  pas d'état vide).
- **Friction d'un clic supplémentaire** : pour 1 note, l'index impose un clic pour consulter. C'est
  volontaire (demande explicite) et cohérent avec la présence du bouton « Créer une nouvelle note ».
  Si l'UX s'avère trop lourde à l'usage, on pourra auto-déployer le détail pour 1 note (mode
  `forceIndex` + détail affiché) en itération 2.
- **Chevauchement viewer/panneau latéral** : si le panneau « Mes notes » est ouvert et qu'on clique
  l'action Note de la sélection, le viewer s'ouvre par-dessus. Comportement acceptable (déjà le cas
  pour `openNoteForVerse`), à vérifier visuellement.
- **Titre du header quand la sélection est large** : joindre toutes les références peut déborder.
  On affiche l'ancre + « · » + autres, en `truncate`. À valider à l'implémentation (peut-être
  afficher « N versets sélectionnés » au-delà de 3).