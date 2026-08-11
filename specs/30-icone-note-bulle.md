# Spec 30 — Icône note dans la bulle d'action de sélection

> **Statut** : Proposé · **Priorité** : 🟢 Basse · **Effort** : S · **Dépendances** : Spec 12
> (bulle d'action de sélection), spec 21 (notes de verset)

## 1. Objectif
Promouvoir l'action **note** au premier niveau de la bulle d'action qui apparaît à la sélection
d'un verset, au lieu de l'enfouir dans le sous-menu « plus d'actions » (`⋯`). L'utilisateur accède
ainsi en un clic à l'éditeur de note de la sélection, sans passer par un popover intermédiaire.

## 2. Valeur utilisateur
La note est une action fréquente à la sélection d'un verset (étude, méditation). L'avoir au même
niveau que Strong, favori et envoi réduit la friction d'un clic et d'un popover. C'est aussi un
signal de découvrabilité : l'icône `sticky-note` visible indique immédiatement la possibilité de
noter, là où le menu `⋯` masque l'action. L'icône passe à `note-edit` accentué `text-primary` quand
une note existe déjà sur la sélection — retour visuel immédiat.

## 3. Périmètre
- **Inclus** : bouton note top-level dans `m-verse-actions.tsx` (desktop pilule + dock mobile `bare`) ;
  retrait du bloc note du sous-menu `⋯` ; ajustement de `hasOverflow` (la note ne gate plus le menu) ;
  micro-copy title FR.
- **Exclu** : nouvelle action, nouveau popover, raccourci clavier dédié (le `n` du lecteur ouvre le
  panneau des notes, pas l'éditeur de la sélection — inchangé), refactor du clustering/épinglage.

## 4. Spécification fonctionnelle
- Le bouton note s'affiche **entre Strong et le menu `⋯`**, seulement si `onNote` est fourni
  (comportement conditionnel identique aux autres actions).
- Au clic : `onNote()` directement (ouvre l'éditeur plein écran via `openNoteForSelection` côté
  `t-reader`). `stop()` empêche le re-basculement du verset ancre sous le cluster.
- Pas de popover : un clic suffit (contrairement au signet/surlignage qui ouvrent un picker de
  couleur/groupe).
- Icône : `hugeicons:sticky-note-01` sans note, `hugeicons:note-edit` accentué `text-primary` avec
  note (`hasNote`).
- Le menu `⋯` ne contient plus que **Signet** + **Surligner** (tous deux conditionnels).
- `hasOverflow` devient vrai si signet OU surlignage dispo — la note ne participe plus à cette
  condition. Conséquence : si seule la note est disponible (ni signet ni surlignage), le menu `⋯`
  disparaît et seul le bouton note reste.

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
Bulle d'action de sélection de verset (desktop : pilule glass au-dessus du verset ; mobile : dock
cluster `bare` en bas). Bouton note inséré entre Strong et `⋯`.

### 5.2 Disposition (wireframe)
```
[badge] [envoi] [favori] [Strong] [NOTE] [⋯]      ← avant : [⋯] contenait Note
                                    ↑ promu
```
Dock mobile `bare` : `[badge] [favori] [Strong] [NOTE] [⋯] …` (boutons 44 px).

### 5.3 États & interactions
- Sans note : `sticky-note-01`, couleur neutre (`text-foreground`/`btnCls`).
- Avec note : `note-edit`, accent `text-primary`.
- Hover : `btnCls` gère le survol (assombrissement/accent).
- Ouverture de la note : pas d'épinglage du cluster (l'éditeur est plein écran, la persistance du
  cluster est sans objet). Le `menuOpenPrev` (effet d'épinglage spec 12) n'est pas impacté car la
  note n'a plus de popover.

### 5.4 Responsive
Desktop pilule : un bouton de plus (40 px) — rentre dans la pilule existante.
Mobile `bare` (dock cluster) : un bouton 44 px supplémentaire. À 7 boutons + badge, le dock
déborde symétriquement de quelques px sur 320 px (iPhone SE 1) — accepté, vérifié visuellement. Les
cibles tactiles restent à 44 px (contrainte d'accessibilité non négociable). Pas de scroll
horizontal à 375 px.

### 5.5 Thème clair/sombre & accessibilité
Icônes `@iconify/react` (`hugeicons:*`) héritent de `currentColor` → s'adaptent au thème. Accent
`text-primary` pour la note existante (contraste vérifié par les tokens existants). `title` fournit
le libellé accessible.

### 5.6 Micro-copy (FR)
- Sans note : `title="Noter"`.
- Avec note : `title="Modifier la note"`.

## 6. Spécification technique
### 6.1 Fichiers (nouveaux / modifiés)
- **Modifier** : `src/presentation/components/molecules/m-verse-actions.tsx` (seul fichier de code).
  - `hasOverflow` (ligne ~129) : retirer `|| !!onNote`.
  - Retirer le bloc note (lignes ~334-350) du `PortalPopover` overflow.
  - Ajouter un bouton top-level entre le bloc Strong (`onStrongs`, ~262-271) et l'overflow
    (`hasOverflow`, ~273), mirant le pattern `onStrongs` :
    ```tsx
    {onNote && (
      <button type="button" className={cn(btnCls, hasNote && 'text-primary')}
        title={hasNote ? 'Modifier la note' : 'Noter'} onClick={stop(onNote!)}>
        <Icon icon={hasNote ? 'hugeicons:note-edit' : 'hugeicons:sticky-note-01'} className={iconCls} />
      </button>
    )}
    ```

### 6.2 Données & persistance
Aucune. `onNote` / `hasNote` sont déjà threadés via le bundle `verseActions` depuis `t-reader`
(`onNote: openNoteForSelection`, `hasNote: verseActions.selectionHasNote`) et spreadés par
`o-reader-content` / `m-reader-dock` (`<VerseActions bare {...verseActions} />`).

### 6.3 API / contraintes
Aucune dépendance API. `useReaderShortcuts` : la touche `n` appelle `toggleNotesPanel` (panneau des
notes), pas l'éditeur de la sélection — inchangé, aucun raccourci à modifier.

## 7. Critères d'acceptation
- [ ] Bulle de sélection : icône NOTE directe entre Strong et `⋯` (plus enfouie dans le sous-menu).
- [ ] `sticky-note-01` sans note, `note-edit` accentué `text-primary` avec note.
- [ ] Clic note → ouvre l'éditeur de note de la sélection (`openNoteForSelection`).
- [ ] `⋯` ne liste plus que Signet + Surligner ; leurs sub-popovers (BookmarkPicker, palette
      surlignage) fonctionnent et épinglent le cluster.
- [ ] `hasOverflow` vrai si signet OU surlignage dispo (la note ne gate plus le menu).
- [ ] Si seule la note est dispo (ni signet ni surlignage) : pas de menu `⋯`, juste le bouton note.
- [ ] Mobile : bouton note 44 px tappable ; pas de scroll horizontal à 375 px.
- [ ] Pas de régression sur l'épinglage du cluster (signet/surlignage).
- [ ] `tsc --noEmit` passe.

## 8. Risques & questions ouvertes
- **Débord 320 px (dock mobile)** : un bouton de plus ; accepté (quelques px symétriques), à
  vérifier visuellement sur petit écran.
- **Découvrabilité** : la note n'est plus sous `⋯` — l'annoncer dans le CHANGELOG.