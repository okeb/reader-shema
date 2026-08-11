# Spec 29 — Détail Strong (champs phonetique/origine/type + page `/strong/[code]`)

> **Statut** : ✅ Implémenté · **Priorité** : 🟠 Moyenne · **Effort** : M · **Dépendances** : Spec 02
> (concordance Strong, endpoint `/bym/strong/:code`) · endpoint per-token `?strongs=1` étendu côté API.

## 1. Objectif

L'API Strong expose désormais trois champs lexicaux par token — `phonetique` (prononciation),
`origine` (étymologie, contenant des références Strong) et `type` (catégorie grammaticale). On les
affiche dans le détail inline d'une strong et on rend les références Strong de `origine` cliquables,
vers une **page détail dédiée** `/[locale]/strong/[code]` regroupant le lexique complet et les
occurrences (concordance).

## 2. Valeur utilisateur

- **Lecture enrichie** : phonétique, type grammatical et étymologie directement dans le panneau
  Strong — plus de contexte pour l'étude d'un mot.
- **Navigation étymologique** : cliquer une référence d'origine (ex. « 07218 ») mène à la fiche du
  mot racine, puis à ses occurrences — exploration naturelle de la chaîne lexicale.
- **Fiche partageable** : la page `/strong/[code]` est publique et deep-linkable (référence stable).

## 3. Périmètre

- **Inclus** :
  - Extension des entités `StrongToken` et `StrongConcordance.lexicon` (+ champs API `ApiConcordance`).
  - Parser pur `origine` → segments texte/référence Strong (normalisation H/G, plusieurs refs).
  - Affichage inline `phonetique` / `type` / `origine` cliquable dans `m-strong-verse`.
  - Nouvelle route `app/[locale]/strong/[code]/page.tsx` + template `t-strong-detail`.
  - Extraction de `m-strong-occurrence-list` (réutilisée par le tiroir concordance et la page détail).
  - Threading navigation `onNavigateStrong` (panneau Strong → `t-reader` → `router.push`).
- **Exclu** (specs ultérieures) :
  - Affichage du lexique enrichi dans le tiroir concordance (`m-strong-concordance`) — le tiroir ne
    montre aujourd'hui que titre + total ; l'extraction de la liste d'occurrences est incluse, mais
    pas l'ajout d'un bloc lexique dans l'en-tête du tiroir.
  - Pré-render statique des fiches Strong (codes non énumérables → rendu à la demande).

## 4. Spécification fonctionnelle

### 4.1 Champs sources

- Per-token `?strongs=1` : chaque `StrongToken` porte désormais `phonetique?`, `origine?`, `type?`
  (en plus de `lemma`/`translit`/`definition`/`lang`).
- Concordance `/bym/strong/:code` : `lexicon` étendu côté backend avec `phonetique?`, `origine?`,
  `type?`, `lemma?`, `lang?` (en plus de `translit`/`definition`). La page détail fait **un seul
  fetch** concordance pour obtenir le lexique complet + les occurrences.

### 4.2 Parser `origine`

- `parseOrigine(origine, lang)` produit une liste de segments `{ kind: 'text' | 'strong' }`. Les
  références Strong sont reconnues par la regex `\b([HG]\d{1,5}|0\d{4})\b` — forme préfixée
  (`H7223`/`G2316`) **ou** forme hébraïque zero-padded 5 chiffres (`07218`). Les nombres nus sans
  préfixe ni zero-padding sont ignorés (évite les faux positifs sur numéros de verset/années).
- `normalizeStrongCode(raw, lang)` : préfixe explicite sinon `lang === 'greek' ? 'G' : 'H'`, puis
  strip des zéros de tête → `H7218`. Plusieurs références dans une même `origine` → autant de liens.

### 4.3 Navigation

- Clic d'une référence `origine` (inline ou page détail) → `router.push('/[locale]/strong/[code]')`
  (navigation client, pas de full reload).
- Page détail : clic d'une occurrence → `router.push('/[locale]/read?livre=…&chap=…&v=…')` (**push**,
  le back revient à la fiche). Clic d'une référence `origine` → une autre fiche (même template).

### 4.4 Edge cases

- `origine` vide/absente → rien n'est rendu (champs optionnels, pas de trous).
- Code invalide ou inconnu (`/strong/INVALID`, `/strong/7218` sans préfixe non zero-padded) →
  `notFound()` (404).
- Lexique backend non encore déployé → bloc lexique partiellement vide (grâce, champs optionnels).

## 5. UI / UX

### 5.1 Emplacement & déclencheurs

- Détail inline : panneau Strong du lecteur (`m-strong-verse`), déjà existant — on ajoute les champs.
- Page détail : route publique `/[locale]/strong/[code]`, atteinte par clic d'une référence
  `origine` (inline ou fiche) ou par deep-link direct.

### 5.2 Disposition (wireframe)

Détail inline (bloc sous le verset actif) :
```
[translit] (lang)
[phonetique]            ← nouveau, muted italique petit
[lemma] [badge code] [type]   ← type nouveau, pastille mini
[definition]
[origine: … <lien ref> …]     ← nouveau, refs cliquables
[Voir les occurrences →]
```

Page détail (mobile-first, `max-w-[68ch]`) :
```
← Retour à la lecture
[translit grand] [phonetique] (lang) [badge code]
[type] [lemma serif]
[definition whitespace-pre-line]
[origine: … <lien ref> …]
─── Occurrences (N) ───
LIVRE
3:1  texte avec <mot coloré>
…
[Charger plus ↓]
```

### 5.3 États & interactions

- Inline : bulles Strong cliquables (inchangé) ; nouvelle sous-section `origine` avec liens.
- Page : loading → `ConcordanceSkeleton` ; `total===0 && !lexicon.translit` → « Aucune donnée Strong
  pour {code}. » ; erreur → « Concordance indisponible. » ; « Charger plus » pagine (PAGE_SIZE 20).

### 5.4 Responsive

Page détail mobile-first une colonne. Tiroir concordance (refactoré) inchangé : plein écran mobile,
tiroir droit 440px desktop.

### 5.5 Thème clair/sombre & accessibilité

Couleurs d'accent selon `lang` (hébreu = `primary`, grec = `purple`) — réutilisation de la logique
`bubbleColor`. Liens `origine` : même accent + soulignement au survol. Cibles tactiles ≥ 44px sur la
liste d'occurrences (boutons pleine largeur).

### 5.6 Micro-copy (FR)

- Lien retour page détail : « Retour à la lecture ».
- Fiche vide : « Aucune donnée Strong pour {code}. »
- Erreur : « Concordance indisponible pour le moment. »
- Pagination : « Charger plus ».

## 6. Spécification technique

### 6.1 Fichiers (nouveaux / modifiés)

- **Nouveaux** : `src/domain/services/origine-parser.service.ts` ·
  `src/presentation/components/atoms/a-origine-text.tsx` ·
  `src/presentation/components/molecules/m-strong-occurrence-list.tsx` ·
  `src/presentation/components/templates/t-strong-detail.tsx` ·
  `app/[locale]/strong/[code]/page.tsx`.
- **Modifiés** : `src/domain/entities/strong-token.entity.ts` ·
  `src/domain/entities/strong-concordance.entity.ts` · `src/infrastructure/api/bible-api.ts` ·
  `src/presentation/components/molecules/m-strong-verse.tsx` ·
  `src/presentation/components/molecules/m-strong-panel.tsx` ·
  `src/presentation/components/molecules/m-strong-concordance.tsx` (refactor extraction liste) ·
  `src/presentation/components/templates/t-reader.tsx` · `i18n/routing.ts` (pathname
  `/strong/[code]`).
- **Inchangés** : repository/CQRS/handlers (pass-through) · `proxy.ts` (`/strong` public).

### 6.2 Données & persistance

Aucune nouvelle persistance. Cache mémoire `concordanceCache` (`bible-api.ts`) mémoise la forme
enrichie du lexique. React Query `use-strong-occurrences` inchangé (clé par code/page/size).

### 6.3 API / contraintes

- Per-token `?strongs=1` : champs déjà live (vérifié BYM Genèse 1:1).
- Concordance `/bym/strong/:code` : suppose le `lexicon` enrichi (backend à déployer). Champs
  optionnels → gracieux si absents. `generateMetadata` appelle `getStrongOccurrences` (cache mémoire
  déduplique avec le fetch client suivant).

## 7. Critères d'acceptation

- [ ] Un token avec `phonetique`/`origine`/`type` les affiche dans le détail inline (ordre :
      phonetique → type → definition → origine cliquable).
- [ ] `origine` à plusieurs refs → chaque ref est un lien distinct ; les nombres non-Strong ne le
      sont pas.
- [ ] Clic d'une ref origine inline → navigation client vers `/[locale]/strong/[code]`.
- [ ] Page détail charge lexique + 1re page d'occurrences en un seul fetch concordance ;
      « Charger plus » pagine.
- [ ] Clic occurrence page détail → reader au bon verset ; back revient à la fiche.
- [ ] Clic ref origine page détail → autre fiche (même template, code différent).
- [ ] Code invalide/inconnu → 404 (`notFound`).
- [ ] `generateMetadata` produit un titre `translit — Strong H7218`.
- [ ] `tsc --noEmit` passe.
- [ ] Tiroir concordance (refactoré) fonctionne à l'identique.

## 8. Risques & questions ouvertes

- **Dépendance backend** : le lexique concordance enrichi doit être déployé pour que la page détail
  montre `phonetique`/`origine`/`type`. Grâce si absent (champs optionnels).
- **Faux positifs `origine`** : la regex matche tout 5-chiffres zero-padded ; spécificité Strong
  assumée. Resserrer plus tard avec lookbehind sur mot-clé si besoin.
- **Refactor tiroir** : extraire `m-strong-occurrence-list` touche l'existant — garder
  comportement-preserving (pagination, active-row, background fetch) et re-tester.
- **Cache** : page détail (React Query) et tiroir (`runQuery` impératif) ne partagent pas le cache
  React Query ; le cache mémoire `concordanceCache` atténue pour un même `{code,page,size}`.