# Spec 04 — Reprendre la lecture

> **Statut** : ✅ Implémenté · **Priorité** : 🟠 Moyenne · **Effort** : S · **Dépendances** : —

## 1. Objectif
Mémoriser le dernier endroit lu (livre + chapitre) et **rouvrir automatiquement** la lecture à cet
endroit au retour sur le site, sans geste de l'utilisateur, **sauf** si l'URL demande explicitement
une autre cible (lien partagé, signet, recherche…).

## 2. Valeur utilisateur
On lit la Bible par sessions. Retrouver instantanément « où j'en étais » supprime une friction
quotidienne et augmente la rétention. La reprise étant le **comportement par défaut** (et non plus un
bouton à viser), le confort est maximal et le dock reste épuré.

## 3. Périmètre
- **Inclus** : enregistrer la position courante en lecture continue (mode `read`) ; **reprise
  automatique** au montage quand aucune cible explicite n'est fournie dans l'URL.
- **Exclu** : reprise au **verset** précis (la position est au niveau chapitre) ; enregistrement du
  mode `refs` ; synchro multi-appareils (pas de compte). La **reprise manuelle** d'un emplacement
  précédent est couverte par l'**historique de navigation** (spec 13).

## 4. Spécification fonctionnelle
- En mode `read`, à chaque changement de `bookId`/`chapter`, écrire `{ bookId, chapter, reference }`
  dans `localStorage` (clé `bym:last-position`).
- Ne **pas** enregistrer le mode `refs` (références ponctuelles).
- **Reprise automatique** :
  - `app/bym/read/page.tsx` calcule `hasExplicitTarget = Boolean(livre || chap || refs || v)` et le
    transmet au lecteur via la prop `explicitTarget`.
  - Au montage, dès que la position est **hydratée**, si `!explicitTarget` **et** qu'une position
    existe **et** qu'elle diffère de la position courante → on bascule dessus (`navigate(...)`).
    Garde **une seule fois** (`resumedRef`) pour ne pas boucler après le `router.replace`.
  - Première visite (aucune position enregistrée) → repli sur le défaut `Jean 1`.
- **Cas couverts** :
  - `/bym/read` nu **ou clic sur le logo** (qui pointe `/bym/read`) → reprise auto.
  - `/bym/read?livre=…&chap=…[&v=…]`, `?refs=…` → cible explicite respectée telle quelle.

## 5. UI / UX
### 5.1 Emplacement & déclencheurs
- **Aucun élément d'UI** : la reprise est invisible (comportement par défaut au chargement).
- Le **bouton « Reprendre »** du dock a été **retiré** (faisait doublon avec l'historique, spec 13).

### 5.2 États & interactions
- Pendant la bascule, le **skeleton** du lecteur est affiché : pas de flash du chapitre par défaut
  avant le saut vers la dernière position.
- Après reprise, l'URL est réécrite (`router.replace(?livre=&chap=)`, `scroll: false`) → état
  partageable et cohérent avec l'historique du navigateur.

### 5.3 Responsive / Thème / Accessibilité
- Sans surface visible, rien de spécifique. La page reste accessible (lecture standard).

### 5.4 Micro-copy (FR)
- Aucune (pas d'élément textuel dédié).

## 6. Spécification technique
### 6.1 Fichiers
- **`lib/reading-position.ts`** — `useReadingPosition()` : `position`, `save(pos)`, `hydrated`
  (clé `bym:last-position`, pattern hydratation try/catch standard).
- **`app/bym/read/page.tsx`** — calcule `hasExplicitTarget` et le passe en prop `explicitTarget`.
- **`components/organisms/o-bible-reader.tsx`** — sauvegarde de la position à chaque chapitre lu
  (effet position + historique) ; effet de **reprise auto** gardé par `resumedRef`.

### 6.2 Données & persistance
- `localStorage` clé `bym:last-position`, objet unique `{ bookId, chapter, reference }`.
- Position au niveau **chapitre** (pas de détection du verset visible) — choix assumé : la reprise
  amène au bon chapitre sans surbrillance de verset.

### 6.3 API / contraintes
- Aucune dépendance API.

## 7. Critères d'acceptation
- [x] Naviguer dans plusieurs chapitres, quitter, revenir sur `/bym/read` (ou via le logo) → on
      rouvre directement le dernier chapitre lu.
- [x] Un lien explicite (`?livre=&chap=`, `?v=`, `?refs=`) n'est **pas** écrasé par la reprise.
- [x] Première visite (aucune position) → `Jean 1`.
- [x] Le mode `refs` ne pollue pas la position de lecture continue.
- [x] Le skeleton couvre la bascule (pas de flash du chapitre par défaut).
- [x] `tsc` + build OK.

## 8. Risques & questions ouvertes
- **Granularité verset** : la reprise est au chapitre. Si on veut reprendre au verset visible, ajouter
  un `IntersectionObserver` debouncé et stocker `verse` (puis réutiliser `highlight`/`?v=`). Non
  retenu pour cette itération.
- **Racine `/`** : `app/page.tsx` redirige vers `/bym/read` (nu) → bénéficie automatiquement de la
  reprise. Pas de redirection serveur vers la dernière position (incompatible avec `localStorage`).
- **Multi-onglets** : la dernière position écrite gagne ; pas de réconciliation (acceptable).
