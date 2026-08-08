# Spec 08 — Copier avec la référence

> **Statut** : ✅ Implémenté · **Priorité** : 🔴 Haute · **Effort** : S · **Dépendances** : —

## 1. Objectif
Copier proprement le(s) verset(s) sélectionné(s) **avec leur référence**, prêt à coller (« Jean 3:16 —
texte… »), en un clic.

## 2. Valeur utilisateur
Geste ultra-fréquent (préparer un message, des notes, un enseignement). Aujourd'hui la copie manuelle
est laborieuse. Effort minime, bénéfice quotidien immédiat — le meilleur rapport valeur/effort.

## 3. Périmètre
- **Inclus** : action « Copier » dans le cluster d'actions de sélection ; format texte propre
  multi-versets ; feedback « Copié ✓ ».
- **Exclu** : copie en image (spec 07), formats riches HTML/Markdown configurables (option future).

## 4. Spécification fonctionnelle
- Entrée : sélection courante (`useVerseSelection` → ids + textes via `selectionData`).
- **Format de sortie** (par défaut) :
  ```
  « {texte verset 1} {texte verset 2}… »
  — {Livre} {chap}:{sélection compressée}  (BYM)
  ```
  - Versets contigus → plage compressée (réutiliser `compressVerses` de `bibleApi.ts`).
  - Un seul verset → `Livre chap:verset`.
  - Mention version « BYM » / label court (cf. `lib/bible-versions.ts`).
- Copie via `navigator.clipboard.writeText` (repli `execCommand` si indisponible).
- Feedback visuel transitoire (« Copié ✓ », ~1,5 s).

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
- Bouton « Copier » (icône `hugeicons:copy-01`) dans `VerseActions`, près de favori/bookmark/partage.
- (Option) entrée aussi dans le menu d'un verset isolé au survol.

### 5.2 Disposition (wireframe)
```
Cluster d'actions (sélection active) :
[ ♥ Favori ] [ 🔖 Signet ] [ ⧉ Copier ] [ 🔗 Partager ] [ 🔤 Strong ]
                              └─ au clic → libellé devient « Copié ✓ » 1,5 s
```

### 5.3 États & interactions
- Repos → « Copier ». Au clic → « Copié ✓ » + légère animation (icône check), puis retour.
- Erreur clipboard (rare) → toast discret « Copie impossible ».

### 5.4 Responsive
- Présent aussi dans la **barre d'actions tactile** mobile (`bottom-24`) déjà utilisée pour la sélection.

### 5.5 Thème clair/sombre & accessibilité
- Tokens de couleur. `aria-label="Copier le passage"` ; état copié annoncé (`aria-live="polite"`).

### 5.6 Micro-copy (FR)
- « Copier » → « Copié ✓ ». Erreur : « Copie impossible. »

## 6. Spécification technique
### 6.1 Fichiers
- **Nouveaux** : `lib/copy-passage.ts` (`formatPassage(items, version)` + `copyPassage(...)`).
- **Modifiés** : `m-verse-actions.tsx` (bouton + état copié + prop `onCopy`) ; `o-bible-reader.tsx`
  (handler construisant le texte depuis `selectionData` + `compressVerses`).

### 6.2 Données & persistance
- Aucune persistance. (Option future : préférence de format dans `reader-preferences`.)

### 6.3 API / contraintes
- 100 % client. `navigator.clipboard` nécessite un contexte sécurisé (HTTPS) → OK en prod.

## 7. Critères d'acceptation
- [ ] Copier 1 verset → « Jean 3:16 — … (BYM) » dans le presse-papier.
- [ ] Copier plusieurs versets contigus → plage compressée (« 3:16-18 »).
- [ ] Versets non contigus → liste correcte (« 3:16,18 »).
- [ ] Feedback « Copié ✓ » visible ; disponible aussi sur la barre tactile mobile.
- [ ] `tsc` + build OK.

## 8. Risques & questions ouvertes
- Format exact à valider (guillemets français « », tiret cadratin, position de la version).
- Inclure ou non une URL canonique du passage en fin de copie ? (option recommandée, désactivable.)
