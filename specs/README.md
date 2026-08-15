# Specs — Évolutions du lecteur ShemaProject

Ce dossier regroupe les **spécifications complètes** (fonctionnelles + UI/UX + techniques) des
évolutions proposées pour le lecteur de la Bible de Yéhoshoua ha Mashiah.

Chaque fichier est autonome et suit le même gabarit (voir `_TEMPLATE.md`). Une spec « Proposé » n'est
pas engagée : elle sert de base de discussion puis de plan d'implémentation (reprise dans `PLAN.md`).

**Exception — `00` est une _doctrine transverse_, pas une feature** : il ne suit pas `_TEMPLATE.md` et
gouverne toutes les specs d'engagement (`05`, `06`, future « séries/progression »). En cas de conflit,
la doctrine gagne.

## Index & priorisation

| # | Spec | Priorité | Effort | Statut | Dépendances |
|---|------|----------|--------|--------|-------------|
| 00 | [Principes de gamification](00-principes-gamification.md) | 🟠 Moyenne | — | Doctrine | transverse (`05`, `06`) |
| 01 | [PWA / lecture hors-ligne](01-pwa-offline.md) | 🔴 Haute | L | Proposé | — |
| 02 | [Concordance Strong](02-strong-concordance.md) | 🔴 Haute | M | ✅ Implémenté | Endpoint dispo |
| 03 | [Réglages de lecture (typographie)](03-reading-settings.md) | 🔴 Haute | S–M | ✅ Implémenté | — (existant à consolider) |
| 04 | [Reprendre la lecture](04-continue-reading.md) | 🟠 Moyenne | S | ✅ Implémenté | — |
| 05 | [Plans de lecture](05-reading-plans.md) | 🟠 Moyenne | L | Proposé | — (données de plans à fournir) |
| 06 | [Verset du jour](06-verse-of-the-day.md) | 🟢 Basse | S | Proposé | (option) endpoint |
| 07 | [Partager un verset en image](07-share-verse-image.md) | 🟠 Moyenne | M | Proposé | — |
| 08 | [Copier avec la référence](08-copy-with-reference.md) | 🔴 Haute | S | ✅ Implémenté | — |
| 09 | [Vue parallèle / comparaison](09-parallel-view.md) | 🟠 Moyenne | M | ✅ Implémenté | ✅ levée (2ᵉ version `lsg`) |
| 10 | [Notes & surlignages personnels](10-notes-highlights.md) | 🟠 Moyenne | M | ✅ Implémenté | — |
| 11 | [Renvois (cross-references)](11-cross-references.md) | 🟢 Basse | M | ✅ Implémenté | dataset libre (openbible.info/TSK) — pipeline décrit |
| 12 | [Dock contextuel (mutation à la sélection)](12-contextual-dock.md) | 🟠 Moyenne | S | ✅ Implémenté | — |
| 13 | [Historique de navigation](13-navigation-history.md) | 🟠 Moyenne | S–M | ✅ Implémenté | — |
| 14 | [Vignette de partage de lien (OG dynamique)](14-og-link-preview.md) | 🟠 Moyenne | M | ✅ Implémenté | — |
| 15 | [Socle légal & informationnel](15-socle-legal-et-info.md) | 🔴 Haute | S–M | ✅ Implémenté | — |
| 16 | [Écran d'accueil](16-ecran-accueil.md) | 🟠 Moyenne | S–M | ✅ Implémenté | ✅ levée (spec 04 + 13) |
| 18 | [Doodles (logo d'occasion)](18-doodles.md) | 🟢 Basse | M | Proposé | `@rive-app/react-canvas` (lazy) ; option : conversion calendrier hébraïque |
| 19 | [Quiz « fun » de chapitre](19-bible-quiz.md) | 🟢 Basse | M | Proposé | `@rive-app/react-canvas` (optionnel, réutilise spec 18) ; doctrine spec 00 (pas de score) |
| 20 | [Couleur principale au choix](20-accent-color.md) | 🟢 Basse | M | Proposé | — (runtime CSS + `localStorage`, pattern `useTheme`) |
| 21 | [Éclairages (compléments contextuels au verset)](21-eclairages.md) | 🟠 Moyenne | M (technique) + éditorial | Proposé | doctrine 00 ; réutilise Strong (02) + Rive (18, option) ; aucune API |
| 22 | [Compte, synchronisation multi-appareil & administration](22-compte-sync-admin.md) | 🔴 Haute | L | Proposé | doctrine 00 ; **première dépendance serveur runtime** (auth + DB Vercel Marketplace) ; réutilise les hooks de persistance locaux |
| 23 | [Version du projet & signalement de bug](23-version-signalement-bug.md) | 🟠 Moyenne | S | Proposé | spec 15 (footer, `lib/legal.ts`) |
| 24 | [Consulter une note (mode lecture)](24-consulter-note-lecture-seule.md) | 🟠 Moyenne | S | Proposé | spec 10 (notes), spec 12 (dock) |
| 28 | [Déverrouillage par mot de passe (enveloppe DEK/KEK)](28-deverouillage-mdp-enveloppe.md) | 🔴 Haute | M | ✅ Implémenté | spec 22 (sync E2EE), spec 26 (Better Auth + Resend), spec 25 (page /account) |
| 29 | [Détail Strong (champs phonetique/origine/type + page /strong/[code])](29-detail-strong.md) | 🟠 Moyenne | M | ✅ Implémenté | spec 02 (concordance Strong) |
| 30 | [Icône note dans la bulle d'action de sélection](30-icone-note-bulle.md) | 🟢 Basse | S | ✅ Implémenté | spec 12 (bulle d'action), spec 21 (notes) |
| 31 | [Retour à la lecture depuis une fiche Strong : reprise sans perte](31-retour-lecture-reprise-strong.md) | 🔴 Haute | S | ✅ Implémenté | spec 29 (détail Strong, `useStrongResume`) |
| 32 | [Refonte des e-mails transactionnels avec react.email](32-refonte-mails-react-email.md) | 🟠 Moyenne | M | Proposé | spec 26 (Better Auth + Resend), spec 28 (recovery key) |
| 33 | [Conformité RGPD complète (registre, conservation, effacement, droits, sous-traitants, violations)](33-conformite-rgpd-complete.md) | 🔴 Haute | M | Proposé | spec 15 (socle légal), spec 22 (compte/sync/E2EE), spec 26 (Better Auth), spec 28 (déverrouillage) |
| 34 | [Index des notes de la sélection (viewer avant l'éditeur)](34-index-notes-selection.md) | 🟠 Moyenne | S–M | Proposé | spec 10 (notes), spec 12 (dock), spec 24 (`NoteViewer`), spec 30 (icône note) |
| 35 | [Texte original interlinéaire dans le panneau Strong](35-texte-original-interlineaire-strong.md) | 🟠 Moyenne | S–M | Proposé | spec 02 (concordance), spec 29 (détail Strong + `lemma` par token) |

**Légende effort** : S = quelques heures · M = 1–2 jours · L = 3 jours et +.

## Reste à faire (séquencement)

Déjà livré : `02`, `03`, `04`, `08`, `09`, `10`, `11`, `12`, `13`, `14`, `15`, `16`.

1. **Premier backend (compte + sync + admin)** : `22 Compte, sync & admin` (L) — résout la douleur
   multi-appareil (retrouver ses notes/sélection d'un appareil à l'autre) et outille l'équipe pour
   administrer le contenu éditorial. **Première dépendance serveur runtime** (auth + DB Vercel
   Marketplace). Compte **juste-à-temps** (jamais une porte), **aucune métrique** (doctrine 00),
   contenu éditorial toujours versionné (modèle B/C : export vers le dépôt, reader reste statique).
   Phaseable : (1) compte + sync favoris/position, (2) sync complète + export/suppression,
   (3) interface admin.
2. **Pilier produit (offline)** : `01 PWA / hors-ligne` (transforme l'usage : église, transport,
   voyage) — zéro dépendance serveur, mais gros chantier (L).
2. **Engagement / rétention** : `07 Partage image` (M), `06 Verset du jour` (S, liste éditoriale locale).
3. **Plus lourd / données** : `05 Plans de lecture` (L, attend le contenu des plans).
4. **Identité / warmth** : `18 Doodles` (M, `@rive-app/react-canvas` lazy) — logo de topbar vivant aux
   occasions (fêtes, saisons, anniversaire du projet), animation Rive (thème runtime = 1 `.riv`,
   state machine d'entrée + survol) + carte d'explication → verset.
5. **Fun pédagogique** : `19 Quiz de chapitre` (M) — encart opt-in (bouton, pas de popup auto) sur
   certains chapitres ; question à choix multiples + explication + verset d'appui, illustration
   Rive optionnelle (réutilise spec 18). Toggle on/off dans les réglages (défaut activé). **Pas de
   score** (doctrine spec 00).
6. **Personnalisation** : `20 Couleur principale` (M) — 8 teintes d'accent (orange + 7), sélecteur
   dans les réglages, persisté sans flash (script bloquant, pattern `useTheme`). Runtime CSS pur.

## Contraintes transverses (à connaître pour toutes les specs)

- **API externe REST par référence** (`services/bible/bibleApi.ts`, base `shemaproject.org`) :
  `/:version/:livre/:chap[/:selection][?strongs=1]` et `/:version/:livre/info`. Versions servies :
  `bym`, `lsg`, `darby` (Strong disponibles pour les trois ; BYM et Darby en alignement
  expérimental). **Pas** de recherche plein-texte. Concordance Strong uniquement sous `bym`
  (`/bym/strong/:code`) — la concordance affiche donc le texte BYM quelle que soit la version active.
  Toute feature qui en a besoin est marquée « dépend d'un endpoint ».
- **Persistance = `localStorage` uniquement** (pas de compte/backend applicatif). Patterns existants :
  `useFavorites` (`lib/favorites.ts`), `useReaderPreferences` (`lib/reader-preferences.ts`),
  `useBookmarks` (`lib/bookmarks.ts`), `useTheme` (`lib/theme.ts`). Toute nouvelle donnée suit le même
  modèle (hydratation try/catch + `hydrated`, validation au montage).
- **Atomic design** : `a-` atomes, `m-` molécules, `o-` organismes, `t-` templates.
- **Style** : Tailwind (`darkMode: "class"`), `cn()` (`lib/utils.ts`), icônes `@iconify/react`
  (`hugeicons:*`), animations maison (`animate-slide-in-right`, `animate-fade-in-up`).
- **Déploiement** : `vercel --prod` ; prod = `https://reader.shemaproject.org`.
