# Principes de gamification — Doctrine transverse

> **Statut** : Doctrine (transverse) · **Portée** : toute feature d'engagement/progression ·
> **Gouverne** : `05` (plans de lecture), `06` (verset du jour), future spec « séries / progression »

Ce document n'est **pas une feature** (il ne suit pas `_TEMPLATE.md`). C'est le **socle de design**
qui décide *comment* on a le droit d'encourager la lecture régulière, et *ce qui est interdit*. Chaque
spec d'engagement doit pouvoir passer les **tests décidables** de la section 5. En cas de conflit entre
une idée de feature et ce document, **ce document gagne**.

L'inspiration de départ était la mécanique de Duolingo (série, objectifs, progression). On en garde la
**structure** (rythme quotidien, progression visible, jalons) mais on **rejette son ton**, fondé sur le
mérite, la pression et la culpabilité — incompatible avec la lecture de la Parole.

---

## 1. L'axe fondateur : grâce, pas performance

Duolingo est une **économie de la performance** : tu gagnes, tu perds, tu es puni. C'est de la justice
par les œuvres transposée en UX. Le cœur de la Bible est l'inverse : la grâce. Une appli biblique qui
reproduit la logique du mérite se contredit au niveau le plus profond.

**Le piège central : la douceur n'est pas l'opposé de la culpabilité — la grâce l'est.** Entre les
deux existe la **loi douce** : une économie de performance habillée de mots gentils. Duolingo est une
loi *dure* ; un compteur culpabilisant aux mots bienveillants est une loi *douce*. **Les deux sont de
la loi.** On ne la désamorce pas en adoucissant le texte, mais en **retirant l'économie de performance
elle-même**.

> *Marc 2:27* — « Le sabbat a été fait pour l'homme, et non l'homme pour le sabbat. »
> Le rythme de lecture est fait pour la personne. Dès que la personne sert le rythme, c'est inversé.

**Pourquoi l'enjeu est plus grand ici, pas moindre.** Si une appli ordinaire te culpabilise, tu hausses
les épaules. Si une appli *biblique* te fait sentir que tu échoues, la culpabilité s'attache à ta
**relation avec Dieu**, pas à l'appli. Elle est plus lourde et plus collante. Se tromper de ton coûte
donc plus cher, pas moins.

---

## 2. Principe I — Carte, pas trophée

*(la **forme** de la mesure)*

Une mesure devient une loi **à l'instant où elle parle de toi plutôt que de l'œuvre.**

- **Trophée** = la mesure rend un verdict sur **toi** (« tu as une série de 365 jours » → « je suis
  quelqu'un de constant »). Interdit.
- **Carte** = la mesure décrit le **territoire / la tâche** (« Lévitique : à moitié lu »). Autorisé.

| | Trophée (loi) | Carte (outil) |
|---|---|---|
| Objet | **toi** (verdict identitaire) | **l'œuvre / le territoire** |
| Direction | en arrière (le butin amassé) | en avant (la suite, ce qui reste) |
| Forme | globale, agrégée en **1 chiffre**, brandissable | détaillée, spatiale, **irréductible** |
| Terme | sans fin (tapis roulant : se rompt ou s'étend) | bornée (s'achève → l'outil **se retire**) |
| Acte | célèbre / félicite / note | **décrit, oriente, puis se tait** |
| Conversion | non-actionnable (sauf « ne pas perdre ») | actionnable (« reprends ici / versets restants ») |

**Corollaires :**

1. **La globalité est ce qui rend une mesure flattable.** Seul un chiffre unique agrégé peut se porter
   comme un badge. Une carte de 1189 chapitres (« Lévitique 40 %, Nombres 0 % ») ne se brandit pas :
   son irréductibilité est sa protection. → **Préférer les cartes aux scores, le détail aux agrégats.**
   Se méfier même d'un grand « Bible : 34 % lue » en bandeau.

2. **Décrire, jamais célébrer.** Une barre qui dit « lu » et **se tait** = outil. Une barre qui lance
   des confettis « 🎉 +50 ! » = score. **Bâcler ne paie que s'il y a un paiement** : on retire toute
   récompense (points, fanfare, badge), on ne garde que la carte véridique. La récompense de la lecture
   reste la lecture (*Ps 1* : « son plaisir est dans la loi »).

3. **Situer dans le texte, jamais contre l'horloge.** Un plan affiche ta position *dans le territoire*
   (« tu es dans le Lévitique ») — **jamais** contre un calendrier (« tu as 13 jours de retard »), qui
   réintroduit le verdict temporel de la série.

4. **La mesure doit être convertible en utilité.** Une carte sans issue est un score déguisé. Elle doit
   toujours rendre la main : « voir les versets/chapitres qu'il reste à lire », « reprendre ici ».

---

## 3. Principe II — Mesure la porte, pas la chambre

*(l'**intériorité** : ce qu'on n'a pas le droit de mesurer)*

> *Matthieu 6* — aumône, prière, jeûne « dans le secret… et ton Père qui voit dans le secret te le
> rendra ». Charte anti-gamification de l'intériorité : la récompense existe, mais elle est **secrète**
> et **donnée par Dieu**, pas affichée par l'appli.

Deux lois convergent : *Goodhart* (« quand une mesure devient une cible, elle cesse d'être une bonne
mesure ») et *Matthieu 6*. À quoi s'ajoute l'**effet de sur-justification** : récompenser de l'extérieur
un acte déjà mû de l'intérieur (le « plaisir » du *Ps 1*) l'**érode**. Pour la méditation, la
gamification n'est donc pas seulement risquée — elle est **contre-productive**.

**Règle : on mesure le *geste observable* (venir, ralentir, revenir), jamais l'*état intérieur* (le
cœur a-t-il été touché, Dieu a-t-il été rencontré).** Et même le geste se formule en *observation*
humble (« tu es revenu sur ce verset »), pas en *note* (« +10 méditation »).

**Gradient de mesurabilité** (la mesure tolérable décroît vers l'intérieur) :

| Pratique | Mesurable ? | Posture de l'appli |
|---|---|---|
| **Lecture** (présence, régularité) | oui | tracker doucement — OK |
| **Mémorisation** (*Ps 119:11* « serrer dans le cœur ») | oui, et utilement | gamifier modérément — répétition espacée légitime (cas « de compétence », proche de l'apprentissage) |
| **Méditation / prière / rencontre** | quasi non | **inviter**, jamais scorer ; garder secret |

**Honorer l'intériorité sans la scorer** : re-rencontre douce d'un verset gardé (« tu avais serré
ceci »), invitation au silence sans minuteur compétitif, espace de réflexion **privé** non partagé, et
une **zone délibérément non mesurée** (le cœur contemplatif de la lecture reste sans tracking — cette
absence est une déclaration, pas un manque).

---

## 4. Principe III — Décrire sans contraindre

*(la mécanique douce qui **reste** grâce et ne glisse pas en loi douce)*

Même une carte bienveillante peut redevenir une accusation par sa **structure** (être vu *ne-pas-faire*).
Garde-fous décidables :

1. **Pull, pas push.** La culpabilité vient d'**être regardé** ; la réflexion vient de **choisir de
   regarder**. Le registre se laisse *ouvrir* quand la personne le veut ; il ne vient **jamais la
   trouver** pour signaler son absence (pas de notification « ça fait 4 jours »).

2. **Additif seulement.** N'enregistrer que la **présence**, jamais l'absence. Une heatmap à cases
   vides est un registre d'échecs déguisé en registre de réussites — **interdit**. Le jardin n'a pas de
   parcelles fanées : l'absence **ne laisse aucune marque**.

3. **Ne jamais instrumenter la grâce.** Les éléments de grâce (verset d'accueil au retour, messages
   doux) ne sont **pas branchés sur les métriques d'engagement** ; on ne les A/B-teste pas pour la
   rétention. Sinon c'est du growth-hacking sous couverture spirituelle.

4. **Le retour est fêté, jamais réprouvé.** *Luc 15* (fils prodigue, brebis perdue). Après une absence :
   accueil joyeux + verset, **pas** de compteur brisé. *Lamentations 3:23* : « renouvelées chaque
   matin » — l'inverse de « tu as perdu ta série de 47 jours ».

5. **Mode non-suivi, pleinement béni.** L'appli doit pouvoir **ne pas mesurer du tout**, présenté comme
   un choix complet et honoré (pas une version dégradée). Le consentement transforme un *régime* en
   *don* — mais il ne suffit pas : seule la **forme** (carte, §2) empêche la loi. On peut s'asservir
   volontairement à une série.

6. **La Parole accueille ; le chiffre attend qu'on le cherche.** Ce qui salue à l'ouverture, c'est le
   texte — jamais le compteur. Les statistiques vivent dans un coin tranquille qu'on va visiter. L'ordre
   de ce qui est *mis en avant* dit ce que l'appli croit vraiment important.

---

## 5. Tests décidables (checklist par feature)

Toute spec d'engagement doit cocher **toutes** ces cases :

- [ ] **Carte, pas trophée** : la mesure parle de l'œuvre/du territoire, pas de la personne. Pas de
      chiffre global brandissable (pas de « série de N jours » comme identité).
- [ ] **Avant, pas arrière** : l'affordance dominante est « et maintenant ? » (reprendre / ce qui
      reste), pas le butin accumulé.
- [ ] **Décrit, ne célèbre pas** : aucun point/fanfare/badge ; remplir la barre ne « paie » rien.
- [ ] **Territoire, pas calendrier** : on situe dans le texte, jamais « en retard de X jours ».
- [ ] **Porte, pas chambre** : on ne score aucun acte intérieur (méditation/prière). Geste observable
      uniquement, formulé en observation humble.
- [ ] **Pull, pas push** : aucune notification/relance qui pointe une absence.
- [ ] **Additif seulement** : aucune représentation de l'absence (pas de cases vides accusatrices).
- [ ] **Grâce non instrumentée** : les messages de grâce ne sont pas reliés aux métriques de rétention.
- [ ] **Test des 30 jours** : une personne absente 30 jours rouvre l'appli **sans la moindre
      appréhension** ni résidu de culpabilité.
- [ ] **Mode non-suivi** : on peut tout désactiver, présenté comme un choix béni.
- [ ] **La Parole d'abord** : à l'ouverture, c'est le texte qui accueille, pas les statistiques.

**Test synthétique unique :** *« Si je retirais le score, les gens le feraient-ils quand même ? »*
— Si **oui** → pas de score (il ne ferait que menacer une motivation saine) : mettre une *invitation*.
— Si **non** → pratique « de compétence » (lecture régulière, mémorisation) où la mécanique est légitime.

---

## 6. Implications par feature

- **`05` Plans de lecture** — *À corriger.* Remplacer la **série « 🔥 rompue si un jour sauté »** par
  une **carte de progression dans le territoire** (jours/chapitres lus vs restants, additive, sans
  rupture). « Marquer lu » met à jour la carte **sans félicitations** ni écran de victoire chiffré.
  Le « retard » ne s'affiche pas comme verdict : on ouvre simplement le 1ᵉʳ jour non lu. L'abandon ne
  parle pas de « perte ».
- **`06` Verset du jour** — *Conforme à condition* : reste une **invitation** (pull), dismissible,
  jamais une relance push ; n'alimente aucun score.
- **Future spec « séries / progression »** — à écrire **nativement** selon cette doctrine : carte de
  couverture de la Bible (66 livres : non-lu / partiel / lu), additive, convertible (« versets
  restants »), sans compteur-identité, sans cases vides.

---

## Le mot de la fin

> Reprendre de Duolingo la **structure** (rythme, progression visible, jalons) et la remplir d'une
> **théologie de la grâce** : une mesure qui décrit l'œuvre et jamais la personne, qui n'enregistre que
> la présence, qui fête le retour, qui se laisse éteindre — et, par-dessus tout, qui laisse **la Parole
> accueillir la première**.
>
> *Une mesure devient une loi à l'instant où elle parle de toi plutôt que de l'œuvre.*
