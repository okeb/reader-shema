# Spec 02 — Concordance Strong

> **Statut** : ✅ Implémenté (local) · **Priorité** : 🔴 Haute · **Effort** : M (client) · **Dépendances** : endpoint `/bym/strong/:code` (disponible)

## 1. Objectif
Depuis un mot du panneau Strong, afficher **toutes les occurrences** dans la Bible du même numéro
Strong (même racine hébraïque/grecque), avec navigation directe vers chaque verset.

## 2. Valeur utilisateur
C'est ce qui transforme un *lecteur* en *outil d'étude*. Le panneau Strong affiche déjà la définition
d'un mot ; l'étape naturelle est « où ce mot apparaît-il ailleurs ? ». Valorise tout le travail Strong
déjà en place (`m-strong-panel.tsx`, `m-strong-verse.tsx`, `getStrongsForVerses`).

## 3. Périmètre
- **Inclus** : depuis un token Strong actif, ouvrir une liste paginée des occurrences (référence +
  extrait), clic → navigation lecture centrale (réutilise `goToBookmark`-like) ; compteur d'occurrences.
- **Exclu** : analyse sémantique, regroupement par sens, statistiques avancées.

## 4. Spécification fonctionnelle
- Déclenchement : un mot ayant un `strong` non-null dans `m-strong-verse.tsx` gagne une action
  « Voir les occurrences » (le clic actuel affiche la définition ; ajouter un second affordance).
- Requête : `getStrongOccurrences(strongNumber, { page, pageSize })` → liste
  `{ bookId, chapter, verse, reference, snippet }`.
- Affichage : liste groupée par livre, chaque entrée cliquable. Pagination ou *infinite scroll*
  (occurrences potentiellement nombreuses, ex. G2316 « Dieu »).
- Navigation : clic → charge le chapitre, surligne le verset, défile (même machinerie que les
  signets : `setBookId/setChapter/setHighlight` + `router.replace`).
- Mise en évidence : dans le verset de destination, surligner le **mot** correspondant si possible
  (sinon le verset entier).

## 4bis. Badge « Expérimental » (qualité des données BYM)
Les données Strong de la **BYM** sont encore en cours d'optimisation : l'alignement token↔lemme peut
être imparfait, contrairement à la **LSG** (plus fiable). Pour gérer l'attente de l'utilisateur, l'en-tête
du panneau Strong affiche un **badge « Expérimental »** lorsque la version active est la BYM uniquement
(`version === "bym"`). Le badge porte un `title` explicatif ; il n'altère ni les données, ni la concordance,
ni la navigation — c'est un simple repère de confiance. Il disparaît automatiquement si l'utilisateur
bascule sur la LSG.

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
- Dans le panneau Strong (volet définition), sous le lemme/translittération/définition : un bouton
  « N occurrences › ». Clic → bascule le panneau en **mode concordance** (même coque, header avec retour).

### 5.2 Disposition (wireframe)
```
┌── Strong ────────────────────────────┐      ┌── ‹ Retour   G2316 ───────────────┐
│ λόγος  (logos)                        │      │ θεός · « Dieu »      1317 occur.   │
│ translit · lang: greek                │  →   ├───────────────────────────────────┤
│ « parole, verbe, raison… »            │      │ GENÈSE                            │
│                                       │      │  1:1  Au commencement, Dieu créa… │
│ [ 1317 occurrences ›  ]               │      │  1:3  Dieu dit : Que la lumière…  │
└───────────────────────────────────────┘      │ EXODE                             │
                                                │  3:6  …le Dieu d'Abraham…         │
                                                │           [ Charger plus ]        │
                                                └───────────────────────────────────┘
```

### 5.3 États & interactions
- `loading` (skeleton de lignes), `loaded` (liste), `empty` (« Aucune occurrence »), `error`
  (« Impossible de charger la concordance »).
- Survol d'une ligne → fond `accent` ; clic → navigation + le panneau **reste ouvert** (enchaîner les
  versets). Le verset courant est surligné dans la liste s'il y est.
- Bouton retour → revient à la définition du mot.

### 5.4 Responsive
- Réutilise la coque `m-strong-panel` : `fixed right-0 top-20 bottom-0`, voile mobile, plein écran au
  doigt. Liste scrollable, header collant.

### 5.5 Thème clair/sombre & accessibilité
- Tokens de couleur → suit `.dark`. Liste = `role="list"`, entrées focusables, `Enter` = naviguer.
- Compteur annoncé (`aria-live`) au chargement.

### 5.6 Micro-copy (FR)
- Bouton : « {n} occurrences ». En-tête concordance : « {n} occurrences de {lemme} ».
- Vides/erreurs : « Aucune occurrence trouvée. » / « Concordance indisponible pour le moment. »
- Badge BYM : « Expérimental » (icône `hugeicons:test-tube-01`, teinte ambre), `title` :
  « Données Strong en cours d'optimisation pour la BYM : l'alignement peut être imparfait. La LSG est plus fiable. »

### 5.7 Badge « Expérimental »
- Affiché dans l'en-tête du panneau Strong, à côté du compteur de versets, **uniquement** quand
  `version === "bym"`. Pastille arrondie ambre (`bg-amber-500/20`, texte `text-amber-600 dark:text-amber-400`)
  avec icône éprouvette, animation d'entrée `animate-fade-in-up`.

## 6. Spécification technique
### 6.1 Fichiers
- **Nouveaux** : `components/molecules/m-strong-concordance.tsx` ; `lib/strong-history.ts` (optionnel,
  pour un fil d'Ariane des mots consultés).
- **Modifiés** : `services/bible/bibleApi.ts` (ajouter `getStrongOccurrences`) ;
  `components/molecules/m-strong-panel.tsx` (mode concordance + bouton ; **prop `version`** + badge
  « Expérimental » BYM) ; `m-strong-verse.tsx` (affordance « occurrences ») ; `o-bible-reader.tsx`
  (handler de navigation vers une occurrence, calqué sur la navigation signet ; **passe `version`** au panneau).

### 6.2 Données & persistance
- Pas de persistance requise. Cache mémoire optionnel par numéro Strong (Map) pour éviter de refetch.

### 6.3 API / contraintes — ⚠️ bloquant principal
- **Aucun endpoint d'index Strong n'existe** côté API actuelle. Deux options :
  1. **Recommandé** : ajouter côté API Express un endpoint `/bym/strong/:num[?page=&size=]` renvoyant
     `{ total, items: [{ livre, chapitre, verset, ecrit }] }` (l'index Strong → versets doit exister
     côté serveur où les tokens sont déjà produits).
  2. **Repli client** (déconseillé) : indexation au fil de l'eau des chapitres déjà chargés
     uniquement → concordance *partielle*, utile mais incomplète. À n'utiliser que comme MVP.
- La spec front est prête dès que l'endpoint existe ; côté serveur = tâche séparée.

## 7. Critères d'acceptation
- [ ] Depuis un mot Strong, « N occurrences » ouvre la liste groupée par livre.
- [ ] Clic sur une occurrence → lecture centrale charge le bon chapitre + surligne le verset.
- [ ] Pagination / charger plus fonctionne sur un Strong très fréquent.
- [ ] Le panneau reste ouvert ; bouton retour vers la définition.
- [ ] États loading/empty/error gérés ; `tsc` + build OK.
- [ ] Badge « Expérimental » visible dans l'en-tête Strong en BYM, absent en LSG ; se met à jour au
      changement de version. `title` explicatif présent.

## 8. Risques & questions ouvertes
- Dépend de la disponibilité d'un index Strong côté API (à confirmer avec le backend).
- Surligner le **mot exact** dans le verset de destination peut être imprécis si l'alignement
  token↔texte n'est pas fiable → repli : surligner le verset entier.
