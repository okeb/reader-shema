# Spec 33 — Conformité RGPD complète (registre, conservation, effacement, droits, sous-traitants, violations)

> **Statut** : Proposé · **Priorité** : 🔴 Haute · **Effort** : M · **Dépendances** : spec 15 (socle légal
> & pages info), spec 22 (compte + sync + E2EE), spec 26 (Better Auth self-hosted + Resend), spec 28
> (déverrouillage mot de passe / clé de récupération). **Doctrine spec 00** : aucune métrique, même
> pour compter les requêtes RGPD.

## 1. Objectif

Le lecteur a maintenant un **backend runtime** (compte + sync E2EE, spec 22/26/28) : il traite des
données personnelles (adresse e-mail, sessions, blobs chiffrés, IP de session). La spec 15 a posé le
socle légal et la page confidentialité ; la spec 22 promet « export + suppression suffisent ».
**Ce n'est plus vrai** : la suppression actuelle (`DELETE /api/account`) ne purge que les blobs
`user_data` et **laisse l'identité** (tables Better Auth `user`/`session`/`account`/verification`) —
l'e-mail et l'IP persistent. L'effacement RGPD (art. 17) est donc **incomplet**.

Cette spec fait passer le projet d'une **posture de bonne foi** à une **conformité documentée et
vérifiable** : registre des traitements (art. 30), bases légales, durées de conservation, **effacement
réellement complet**, droits exercables avec canal de requête, registre des sous-traitants + DPA,
notification de violation (art. 33/34), et privacy by design/default formalisé. Le tout **sans
instrumenter** (doctrine 00) : le registre de traitements n'est pas un compteur d'usage.

## 2. Valeur utilisateur

- **Confiance preuve plutôt que promesse** : « vos données restent les vôtres » devient vérifiable —
  effacement complet, droits exerçables, conservation bornée.
- **Transparence honnête** : un lecteur peut savoir exactement *quoi* est traité, *pourquoi* (base
  légale), *où* (sous-traitants + pays), *combien de temps*, et *comment exercer ses droits*.
- **Posture doctrine 00 préservée** : la conformité n'ajoute **aucune collecte**, **aucune métrique**,
  **aucun traceur**. Le RGPD ici est un devoir de transparence et d'effacement, pas un prétexte à
  instrumenter le lecteur.
- **Lecture anonyme inchangée** : tout le périmètre RGPD porte sur le compte **facultatif**. Sans
  compte, rien ne change (100 % `localStorage`, aucune donnée serveur).

## 3. Périmètre

- **Inclus** :
  - **Registre des traitements** (art. 30) : document versionné au dépôt, source unique de vérité.
  - **Bases légales** formalisées par traitement (exécution contractuelle pour le compte/sync ;
    consentement explicite n'est pas requis car pas de profiling ni marketing).
  - **Durées de conservation** par catégorie de données + **purge automatique** (cron) des sessions
    expirées et `verification` obsolètes.
  - **Effacement complet (art. 17)** : `DELETE /api/account` purge **aussi** l'identité Better Auth
    (`user`, `session`, `account`, `verification`), pas seulement `user_data`.
  - **Droits exercables** : accès, rectification, effacement, opposition, limitation, portabilité —
    avec un **canal de requête** (formulaire + e-mail) et un délai de réponse (< 30 jours).
  - **Registre des sous-traitants** (art. 28) : Vercel (hébergement + compute), Neon/AWS (stockage DB
      eu-west-2), Resend (e-mail transactionnel) — avec pays, finalité, garantie de transfert.
  - **Transferts hors UE** documentés : Vercel Inc. (USA) sous **CCU/SCC**, Neon eu-west-2 (UK —
    décision d'adéquation UE), Resend (vérifier pays, sinon SCC).
  - **Notification de violation** (art. 33/34) : procédure interne (détection → évaluation →
    notification CNIL ≤ 72h → intéressés « sans retard excessif »), consignée au dépôt.
  - **Privacy by design / by default** (art. 25) : formalisé — local-first par défaut, E2EE par
    défaut, compte opt-in, sync opt-out possible, anonymat de lecture.
  - **Mise à jour des pages légales** : `/confidentialite` enrichie (droits, conservation,
    sous-traitants, transferts, violations) ; `/mentions-legales` (sous-traitants + contact RGPD).
- **Exclu (cette itération)** :
  - **Désignation d'un DPO formel** (art. 37) — non obligatoire à cette échelle (pas de suivi
    systématique à grande échelle, pas de données sensibles au sens art. 9). Un **point de contact
    RGPD** (l'e-mail éditeur) suffit. À réévaluer si l'activité change.
  - **Enregistrement / déclaration CNIL** — non requis pour ce service (pas de fichier sensible,
    pas de vidéo, pas de cookies tiers).
  - **Audit externe / certification** (ISO 27701, etc.) — non requis à ce stade.
  - **Registre des requêtes RGPD** — **explicitement exclu** (doctrine 00) : on ne stocke pas qui a
    demandé quoi ; on répond, on efface, on ne journalise pas la demande elle-même.
  - **Bandeau cookies** — toujours non requis (aucun traceur, aucun cookie non strictement
    nécessaire ; le cookie de session est « strictement nécessaire », dispensé de consentement).

## 4. Spécification fonctionnelle

### 4.1 Registre des traitements (art. 30)

Document versionné (`docs/rgpd/registre-traitements.md`) — **une source de vérité**, réutilisée par
les pages légales. Une ligne par traitement :

| Champ | Exemple |
|---|---|
| Finalité | Synchronisation multi-appareil des annotations |
| Données | Adresse e-mail, blobs E2EE (favoris/signets/notes/…), position de lecture |
| Base légale | Exécution contractuelle (art. 6 §1 b) — le compte est le contrat de service |
| Destinataires | ShemaProject (responsable) ; sous-traitants Vercel/Neon/Resend |
| Transferts hors UE | Vercel Inc. (USA, SCC) ; Neon AWS eu-west-2 (UK, adéquation) |
| Conservation | Blobs : durée du compte ; sessions : 30 j ; verification : expiration (5 min–1 h) |
| Sécurité | E2EE AES-GCM, cookie httpOnly, TLS, région UE/adéquation |

Traitements recensés : (1) création/maintien de compte (e-mail), (2) session/authentification
(e-mail + IP + user-agent), (3) synchronisation E2EE (blobs), (4) e-mail transactionnel (e-mail +
lien signé), (5) e-mail de clé de récupération (e-mail + clé). **Aucun traitement de mesure
d'audience, de marketing, de profilage ou d'agrégation** (doctrine 00).

### 4.2 Bases légales

- **Compte + sync** : **exécution contractuelle** (art. 6 §1 b) — l'utilisateur crée un compte pour
  obtenir la synchronisation. Pas de consentement à recueillir (pas de profiling).
- **E-mail transactionnel / clé de récupération** : exécution contractuelle (livraison du service
  demandé). Pas de marketing, donc pas de consentement distinct.
- **Sessions / IP de session** : exécution contractuelle (sécurité + maintien de session).
- **Données anonymes (`localStorage`)** : **hors périmètre RGPD** (ne sortent pas de l'appareil ;
  aucune responsabilité de traitement serveur).

### 4.3 Durées de conservation & purge

| Donnée | Conservation | Purge |
|---|---|---|
| `user` (e-mail, identité) | Durée du compte | Effacement complet à la demande (art. 17) |
| `session` | 30 jours glissants (`expiresAt`) | **Cron** : `DELETE FROM session WHERE expiresAt < now()` |
| `account` (credentials) | Durée du compte | Effacement complet |
| `verification` | `expiresAt` (5 min magic-link / 1 h e-mail) | **Cron** : `DELETE FROM verification WHERE expiresAt < now()` |
| `user_data` (blobs E2EE) | Durée du compte | Effacement complet |
| Logs Vercel (plateforme) | Selon politique Vercel | Non maîtrisé côté app (voir sous-traitants) |

Le cron de purge tourne **sans loguer** qui a été purgé (doctrine 00) : il supprime, point.

### 4.4 Effacement complet (art. 17) — correctif

**Aujourd'hui** : `DELETE /api/account` ne purge que `user_data`. **Après spec 33** : purge
**transactionnelle** de `user_data` + `session` + `account` + `verification` + `user` (dans cet ordre
pour respecter les dépendances logiques). L'e-mail et l'IP disparaissent. Better Auth n'expose pas de
`deleteUser` hard-delete fiable → on exécute les `DELETE` SQL directement (le route handler est déjà
le seul writer, `db/migrations/002`). La session courante est invalidée (cookie) dans la foulée.

Cas limites :
- **Requêtes croisées** : le cron de purge a déjà supprimé la `session` → l'appareil est déjà
  déconnecté, l'utilisateur relance la demande depuis une nouvelle session (magic link) → on
  supprime sur l'identité fournie par la session en cours.
- **Échec partiel** : la transaction échoue → rien n'est supprimé (atomique), 500, l'utilisateur
  réessaie. On ne laisse jamais un état mi-effacé (l'e-mail sans les blobs serait pire qu'avant).

### 4.5 Droits exerçables & canal de requête

Droits garantis :

| Droit (art.) | Voie | Délai |
|---|---|---|
| Accès (15) | « Exporter mes données » (JSON complet, déjà en place) | Immédiat (self-service) |
| Rectification (16) | Édition locale (E2EE : la donnée est à l'utilisateur) ; e-mail modifiable côté compte | Self-service |
| Effacement (17) | « Supprimer mon compte » (effacement complet, §4.4) | Immédiat (self-service) |
| Portabilité (20) | « Exporter mes données » (JSON lisible, déjà en place) | Immédiat |
| Opposition (21) | Désactiver la sync (toggle) / supprimer le compte | Self-service |
| Limitation (18) | Désactiver la sync (toggle) — on cesse de traiter sans effacer | Self-service |
| Décision automatisée (22) | N/A (aucun traitement automatisé produisant effet juridique) | — |

La plupart des droits sont **self-service** (export, suppression, toggle sync) — c'est la meilleure
conception (privacy by design : pas de friction, pas d'intermédiaire). Pour les cas résiduels
(rectification d'un e-mail bloqué, demande d'accès serveur, question), un **canal de requête** :
formulaire sur `/confidentialite` (ou `mailto:` l'éditeur) avec **e-mail + nature de la demande**.
**On ne journalise pas la demande** (doctrine 00) ; on traite, on répond, on oublie.

### 4.6 Sous-traitants (art. 28) & transferts

Registre versionné (`docs/rgpd/sous-traitants.md`) :

| Sous-traitant | Rôle | Pays | Garantie | DPA |
|---|---|---|---|---|
| Vercel Inc. | Hébergement + compute (Functions, static) | USA | SCC + CCU | À vérifier en ligne (Vercel DPA) |
| Neon (AWS eu-west-2) | Stockage DB (blobs E2EE + auth) | UK | Décision d'adéquation UE | À vérifier (Neon DPA) |
| Resend | E-mail transactionnel (magic link, reset, clé) | USA (à confirmer) | SCC | À vérifier (Resend DPA) |

**Action** : confirmer qu'un **DPA est signé / accepté** avec chacun (Vercel, Neon, Resend) — la
plupart se font en ligne (acceptation des termes). Consigner la référence dans le registre. Pour
Resend, **vérifier le pays d'hébergement** des e-mails (si USA → SCC ; si UE/UK → adéquation).

### 4.7 Notification de violation (art. 33/34)

Procédure interne documentée (`docs/rgpd/procédure-violation.md`) :
1. **Détection** : alerte (Vercel, signalement, auto) → l'éditeur évalue la nature de la violation
   (confidentialité / intégrité / disponibilité) et les données touchées.
2. **Évaluation** : la violation met-elle en risque les droits/ libertés ? Pour un compte ShemaProject,
   l'impact est **limité par construction** : les blobs sont E2EE (le serveur n'a pas la clé), l'e-mail
   est la seule donnée identifiable en clair côté serveur. Une fuite de blobs seuls = données
   illisibles (chiffrées).
3. **Notification CNIL ≤ 72h** (art. 33) si la violation présente un risque pour les personnes —
   typiquement une fuite d'e-mails en clair. Formulaire CNIL en ligne.
4. **Notification des intéressés « sans retard excessif »** (art. 34) si **risque élevé** — avec
   conseil (changer le mot de passe, recréer la clé de récupération).
5. **Consignment** : date, nature, données, effets, mesures — dans le registre des violations
   (`docs/rgpd/registre-violations.md`, initialement vide).

Note doctrine : l'E2EE est la **première ligne de défense** — une violation des blobs seuls n'est en
général **pas notifiable** (données illisibles). Cela ne dispense pas d'évaluer au cas par cas.

### 4.8 Privacy by design / by default (art. 25)

Formalisé (et donc vérifiable) dans le registre :
- **Par défaut** : lecture anonyme, 100 % `localStorage`, aucun envoi serveur, aucun traceur.
- **Compte opt-in** : jamais une porte (pas de login à l'ouverture) ; prompt dans les coins.
- **Sync opt-out** : toggle global « Synchronisation » (peut être désactivé sans perte).
- **Réglages opt-in** : la sync des préférences cosmétiques est explicite.
- **E2EE dès v1** : le serveur ne voit que du chiffré.
- **Minimisation** : on stocke l'e-mail (nécessaire au compte) + blobs chiffrés. **Rien d'autre** —
  pas de nom, pas de métadonnées de lecture, pas d'horodatages d'usage agrégés (doctrine 00).
- **Pas de journalisation de comportement** : les endpoints sync ne loguent pas *quoi* on lit.

## 5. UI / UX

### 5.1 Emplacement & déclencheurs

- **Page `/confidentialite`** : enrichie — nouvelles sections « Vos droits », « Durées de
  conservation », « Sous-traitants & transferts », « Sécurité & violations ». Liens vers le
  formulaire de requête RGPD et le contact éditeur.
- **Page `/account`** : déjà couvre export + suppression + toggle sync (self-service). On ajoute un
  **lien** « Exercer un autre droit (accès, rectification…) » → vers le formulaire / la page
  confidentialité. Pas de nouvelle action lourde — les droits self-service existent déjà.
- **Page `/mentions-legales`** : ajoute sous-traitants (Vercel/Neon/Resend) + **contact RGPD**
  (l'e-mail éditeur, portant la mention « Contact RGPD »).

### 5.2 Disposition (wireframe) — nouvelles sections `/confidentialite`

```
[ ← Retour ]   Confidentialité

  …(sections existantes : local par défaut, données appareil, compte & sync, effacer/exporter)…

  Vos droits (RGPD)
    • Accès & portabilité : « Exporter mes données » (JSON, immédiat).
    • Rectification : vos données sont éditables localement (E2EE) ; e-mail modifiable au compte.
    • Effacement : « Supprimer mon compte » (effacement complet, immédiat).
    • Opposition / limitation : désactiver la synchronisation (toggle).
    • Pour tout autre demande : [ formulaire / mailto:oliver.keb@proton.me ] — réponse < 30 j.

  Durées de conservation
    Sessions : 30 jours · Liens e-mail : 5 min–1 h · Données de compte : jusqu'à suppression.
    Aucune conservation au-delà de la vie du compte.

  Sous-traitants & transferts hors UE
    Vercel Inc. (USA, garanties SCC) · Neon/AWS eu-west-2 (UK, adéquation UE) ·
    Resend (e-mail transactionnel). DPA en place (voir registre).

  Sécurité & violations
    Chiffrement bout-en-bout (AES-GCM) ; cookie httpOnly ; TLS ; région UE/UK.
    En cas de violation de données, notification CNIL ≤ 72 h et, si risque élevé,
    communication aux intéressés sans retard excessif.
```

### 5.3 États & interactions

- **Formulaire de requête RGPD** : `mailto:` pré-rempli (objet + corps structuré) — **pas de
  stockage serveur** de la demande (doctrine 00). L'utilisateur envoie depuis son propre client
  e-mail. Alternative : un formulaire POST qui **ne persiste rien** et forward vers l'éditeur, mais
  `mailto:` est plus simple et plus honnête (pas de collecte intermédiaire).
- **Confirmation de suppression** (existant) : message inchangé, mais l'effacement est désormais
  **complet** — la micro-copy reste honnête (« vos données cloud seront supprimées définitivement »).

### 5.4 Responsive

- Pages info : colonne unique, `max-width` lecture (~65ch) — inchangé. Formulaire `mailto` :
  fonctionne partout (ouvre le client e-mail).

### 5.5 Thème clair/sombre & accessibilité

- Réutilise `a-prose-section` / `t-info-page` (Server Components purs, SEO/poids). Contraste AA,
  liens focusables, `lang="fr"`. Aucune nouveauté technique.

### 5.6 Micro-copy (FR)

- « Vos droits (RGPD) » — « Accès & portabilité », « Rectification », « Effacement »,
  « Opposition / limitation ».
- « Pour tout autre demande : écrivez-nous, nous répondons sous 30 jours. »
- Conservation : « Sessions : 30 jours · Liens e-mail : 5 min à 1 h · Données de compte : jusqu'à
  votre suppression. »
- Sous-traitants : « Vos données synchronisées sont hébergées par Vercel (USA, garanties
  contractuelles) et Neon/AWS (Royaume-Uni, décision d'adéquation UE) ; les e-mails du compte
  transitent par Resend. »
- Violations : « En cas de violation, nous notifions la CNIL sous 72 h et, le cas échéant, les
  personnes concernées sans retard excessif. »

## 6. Spécification technique

### 6.1 Fichiers (nouveaux / modifiés)

**Nouveaux**
- `docs/rgpd/registre-traitements.md` — registre art. 30 (source de vérité).
- `docs/rgpd/sous-traitants.md` — registre art. 28 (Vercel/Neon/Resend + DPA + transferts).
- `docs/rgpd/procédure-violation.md` — procédure art. 33/34.
- `docs/rgpd/registre-violations.md` — initialement vide (consignation des violations).
- `app/api/account/route.ts` — **correctif d'effacement** (voir §6.2) : transaction SQL multi-tables.
- `db/migrations/003_gdpr_cleanup.sql` — (optionnel) index sur `session.expiresAt` /
  `verification.expiresAt` pour accélérer le cron de purge.
- `lib/cron/gdpr-cleanup.ts` (ou route `app/api/cron/gdpr-cleanup/route.ts`) — purge périodique des
  sessions et `verification` expirées. Gate par un secret/header (Vercel Cron) ; ne logue rien.

**Modifiés**
- `app/[locale]/(info)/confidentialite/page.tsx` — nouvelles sections (droits, conservation,
  sous-traitants, violations) ; puise dans `src/shared/constants/legal.ts` pour éviter le hardcode.
- `app/[locale]/(info)/mentions-legales/page.tsx` — sous-traitants + contact RGPD.
- `src/shared/constants/legal.ts` — ajoute `SUBPROCESSORS` (Vercel/Neon/Resend + pays + garantie),
  `RETENTION` (durées par catégorie), `GDPR_CONTACT` (e-mail éditeur + mention « Contact RGPD »).
- `specs/README.md` — indexe la spec 33.

### 6.2 Données & persistance

- **Effacement complet** : `DELETE /api/account` devient transactionnel :
  ```sql
  BEGIN;
  DELETE FROM user_data    WHERE user_id = $1;
  DELETE FROM session       WHERE userId  = $1;
  DELETE FROM account       WHERE userId  = $1;
  DELETE FROM verification  WHERE identifier = $email;  -- valeur = e-mail pour les tokens e-mail
  DELETE FROM "user"        WHERE id      = $1;
  COMMIT;
  ```
  Le route handler récupère l'e-mail **avant** le `DELETE FROM "user"` (nécessaire pour purger
  `verification.identifier`). Si l'e-mail est absent (edge case), on purgera `verification` via une
  requête séparée optionnelle (ou on accepte que les tokens expirés soient nettoyés par le cron).
  `requireUser()` garantit l'identité ; le guard fournit `userId` et, via une lecture `user`, l'e-mail.
- **Purge cron** : `DELETE FROM session WHERE "expiresAt" < now()` ; `DELETE FROM verification WHERE
  "expiresAt" < now()`. Cadence : quotidienne (Vercel Cron). **Aucun log métier** — au plus un log
  technique de « N lignes purgées » sans identifiant (optionnel ; défaut = silencieux).
- **Aucune nouvelle table**. La conformité est surtout de la **documentation + un correctif
  d'effacement + un cron de nettoyage**.

### 6.3 API / contraintes

- **Pas d'API des droits** en tant que telle : les droits sont **self-service** (export/suppression
  existent) ou par e-mail (mailto). Aucun endpoint `/api/gdpr/request` qui stockerait des demandes
  (cela créerait un traitement de données… pour les demandes d'effacement — antinomique et doctrine 00).
- **Vercel Cron** : `0 3 * * *` → `app/api/cron/gdpr-cleanup` (gate `Authorization: Bearer
  ${CRON_SECRET}`). Région = UE (héritée du projet Vercel).
- **SSR** : pages info statiques (SEO). Aucune dépendance runtime ajoutée pour le RGPD — le cron
  est hors chemin critique de lecture.

## 7. Conformité doctrine 00 (tests décidables)

- [x] **Aucune métrique** : le registre des traitements ne compte pas l'usage ; le cron de purge ne
      logue pas qui a été purgé ; aucune requête RGPD n'est journalisée.
- [x] **Pull, pas push** : le contact RGPD est à l'initiative de l'utilisateur ; aucun e-mail de
      relance lié au RGPD.
- [x] **La Parole d'abord** : la conformité vit dans les pages info et `/account`, jamais à
      l'ouverture de l'app ; aucun modal RGPD au lancement.
- [x] **Mode non-suivi** : l'effacement est complet (art. 17) ; la sync est désactivable ; la lecture
      anonyme est préservée.

## 8. Critères d'acceptation

- [ ] **Registre des traitements** versionné (`docs/rgpd/registre-traitements.md`), couvrant les 5
      traitements, avec finalité / données / base légale / destinataires / transferts / conservation /
      sécurité.
- [ ] **Registre des sous-traitants** (Vercel, Neon, Resend) avec pays, garantie de transfert et
      mention du DPA en place (ou action ouverte si manquant).
- [ ] **Procédure de violation** documentée (détection → évaluation → CNIL ≤ 72h → intéressés).
- [ ] **Effacement complet** : `DELETE /api/account` purge `user_data` + `session` + `account` +
      `verification` + `user` en une transaction ; l'e-mail n'est plus en base après suppression.
- [ ] **Cron de purge** quotidien : sessions et `verification` expirées supprimées ; silencieux (pas
      de log identifiant) ; gate par secret.
- [ ] `/confidentialite` affiche : droits (avec délai < 30 j), durées de conservation,
      sous-traitants + transferts, sécurité + notification de violation.
- [ ] `/mentions-legales` affiche les sous-traitants + un contact RGPD.
- [ ] `mailto` de requête RGPD pré-rempli disponible depuis `/confidentialite`.
- [ ] Aucune requête RGPD n'est persistée côté serveur (doctrine 00).
- [ ] Lecture anonyme inchangée ; aucune dépendance runtime ajoutée sur le chemin de lecture.
- [ ] `tsc --noEmit` + `pnpm build` OK ; non-régression home/lecteur/favoris/compte.

## 9. Risques & questions ouvertes

- **DPA à confirmer** : Vercel, Neon, Resend proposent chacun un DPA en ligne (acceptation des
  termes). Action : les accepter/consigner. Si l'un manque → action ouverte (bloquant pour la
  conformité art. 28). Vérifier aussi le **pays d'hébergement Resend** (USA → SCC).
- **Pays de Resend** : à confirmer (si USA, nécessite SCC ; si UE/UK, adéquation). À intégrer au
  registre sous-traitants.
- **`verification.identifier`** : la colonne porte l'e-mail pour les tokens e-mail — bien la purger
  à l'effacement (ou se reposer sur le cron). Vérifier qu'il n'existe pas d'autres identifiants
  e-mail résiduels en base (ex. anciens tokens non nettoyés).
- **Vercel logs** : les logs plateforme (Vercel) peuvent contenir des IP — hors contrôle applicatif.
  Mention honnête dans le registre (« logs plateforme selon politique Vercel ») ; ne pas promettre
  ce qu'on ne maîtrise pas.
- **DPO** : non désigné (non requis à ce stade). Un point de contact RGPD (éditeur) suffit. À
  réévaluer si le service évolue (volume, données sensibles, suivi systématique).
- **Hard-delete Better Auth** : on contourne l'absence d'API `deleteUser` fiable en exécutant les
  `DELETE` SQL directs (cohérent avec `db/migrations/002`). Risque : si Better Auth ajoute une
  table à l'upgrade, le correctif d'effacement devra la couvrir. → Garder une revue de schéma à
  chaque upgrade Better Auth (déjà noté en spec 26).
- **Pas de registre des requêtes** (volontaire, doctrine 00) : on ne peut donc pas prouver *qui* a
  demandé quoi — mais ce n'est pas requis par le RGPD (l'obligation porte sur la réponse, pas sur
  la journalisation des demandes). Honnête et cohérent.
- **Séquençage** : peut être livré en un seul lot (M). Le correctif d'effacement (§4.4) peut être
  livré en premier (S) — c'est le seul point vraiment bloquant côté conformité effective ; la
  documentation et le cron suivent.