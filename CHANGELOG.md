# Changelog

Toutes les versions notables du lecteur ShemaProject sont documentées ici.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/).
Seuls les changements **perceptibles par l'utilisateur** figurent ici : aucune information
d'implémentation (architecture, schéma, cryptographie, API, identifiants internes) n'est
divulguée. La cohérence est vérifiée par `pnpm changelog:check`.

## [Unreleased]

### Ajouté

- **Sélecteur de passages** : on voit d'un coup d'œil ce que contient chaque chapitre. Les numéros des chapitres disposant de l'audio s'affichent en couleur, de petits points montrent les couleurs des versets surlignés, une icône signale les chapitres où tu as écrit une note, et un signet, à la couleur de son groupe, ceux où tu as placé des signets (dans la version active). Les livres contenant des surlignages, des notes ou des signets portent aussi ces repères dans la liste, et une légende rappelle leur signification. Valable dans le sélecteur du lecteur comme dans le lanceur de l'accueil.

### Modifié

- **Synchronisation** : être connecté suffit désormais pour que tes favoris, signets, surlignages, notes et ta position de lecture se synchronisent entre tes appareils. Plus besoin de ressaisir ton mot de passe ou un code pour la « déverrouiller » : elle ne se met plus en pause sans prévenir. La page Compte indique quand la dernière synchronisation a eu lieu, ou combien de modifications attendent une connexion. Tu peux toujours la mettre en pause depuis cette page.
- **Mot de passe oublié** : un lien de réinitialisation reçu par e-mail suffit pour tout retrouver ; tes données synchronisées ne sont plus perdues.
- **Anciennes données synchronisées** : elles sont transférées automatiquement à ta prochaine connexion. Si ce n'est pas possible sur un appareil, la page Compte propose de les récupérer avec ton mot de passe (ou ton ancienne clé de récupération).
- **Confidentialité** : la page explique désormais que les données synchronisées sont enregistrées sur notre serveur, associées à ton compte, sans chiffrement de bout en bout, et que nous nous engageons à ne pas les consulter.

### Retiré

- **Clé de récupération** : elle n'est plus générée ni envoyée par e-mail, et n'est plus demandée. L'option « se souvenir de cet appareil » disparaît aussi, devenue inutile.

### Corrigé

- **Connexion sur un appareil déjà utilisé** : les favoris, signets, notes et surlignages créés sur cet appareil avant de te connecter sont désormais conservés et ajoutés à ceux de ton compte, au lieu d'être remplacés.
- **Surlignages, notes et signets** : sans compte connecté, ils sont désormais bien conservés après un rechargement de la page ; auparavant, ils disparaissaient à chaque visite.
- **Quiz des chapitres** : après avoir validé, les choix restent affichés et la correction est explicite. Ta réponse est marquée « Ta réponse », en vert si elle est juste et en rouge sinon, et la bonne réponse est signalée. Pour les questions à plusieurs réponses, les bonnes réponses non cochées apparaissent comme « Oubliée ». Pour les questions d'ordre, chaque position est corrigée et l'ordre correct est rappelé. Un bandeau « Bonne réponse ! » ou « Raté » s'affiche aussitôt, et le choix sélectionné est plus visible avant de valider.
- **Quiz de Matthieu 5** : l'explication de la question sur les béatitudes cite désormais les versets correspondant aux bonnes réponses (pauvres d'esprit, doux d'esprit, pacificateurs) et précise d'où vient « humble de cœur » (Matthieu 11:29).
- **Sélecteur de passages** : Malachie compte désormais 3 chapitres et Joël 4, conformément à la numérotation hébraïque de la BYM. Le chapitre 4 de Malachie, qui n'existe pas, n'est plus proposé ; le chapitre 4 de Joël est maintenant accessible.

## [0.7.0] : 2026-09-04

### Ajouté

- **Analyse grammaticale des mots originaux** : chaque mot grec ou hébreu affiche désormais son analyse morphologique (temps, voix, mode, personne) dans la fiche Strong. Par exemple, « aimeras » est identifié comme futur actif indicatif, « dit » comme aoriste second actif indicatif. Quand un même mot porte deux analyses distinctes, les deux lectures sont présentées (ex. : « appela » — inaccompli ou accompli).
- **Dictionnaire grec LSJ** : une section repliable « Détail (LSJ) » dans la fiche Strong propose la définition complète du Liddell-Scott-Jones pour chaque mot grec, avec attribution CC BY 4.0. Les crochets éditoriaux sont convertis en symboles ⟨⟩ lisibles.

## [0.6.3] : 2026-09-01

### Corrigé

- **Sélecteur de passages** : la colonne des livres est élargie pour que les noms longs comme « 1 Thessaloniciens » s'affichent entièrement, sans troncature.

## [0.6.2] : 2026-09-01

### Modifié

- **Sélecteur de passages** : les livres sont désormais regroupés selon la tradition hébraïque — Torah, Nevi'im (Prophètes), Ketouvim (Écrits) — suivis du Testament de Yéhoshoua, en remplacement des groupes Ancien/Nouveau Testament. Valable dans le sélecteur du lecteur comme dans le lanceur de l'accueil.

## [0.6.1] : 2026-09-01

### Corrigé

- **Recherche rapide (⌘K)** : taper « 2 pi » ou « 1 co » propose désormais directement le bon livre numéroté (2 Pierre, 1 Corinthiens) au lieu d'afficher la liste de tous les livres commençant par ce chiffre.

### Modifié

- **Avatars du compte unifiés** : les avatars sont désormais tous des identicons (motifs symétriques en miroir) avec une grille fine fixe. Le sélecteur d'avatar ne propose plus plusieurs styles d'image mais cinq harmonies de couleurs : monochromatique, complémentaire, analogue, complémentaire scindée et analogue accentuée.

## [0.6.0] : 2026-09-01

### Ajouté

- **Historique de navigation enrichi** : l'historique conserve désormais 100 passages (au lieu de 25) et se souvient de tous les versets consultés dans un même chapitre, sans perdre les précédents.
- **Confirmation avant effacement de l'historique** : un dialogue demande validation avant de vider l'historique, depuis le panneau comme depuis la recherche rapide (⌘K).
- **Historique inclus dans la sauvegarde** : l'export de vos données embarque désormais l'historique de navigation ; la restauration fusionne les passages sans écraser les plus récents.

### Corrigé

- **Panneau Historique** : le bouton « Effacer » est déplacé en bas du panneau, à distance de la croix de fermeture, pour éviter les clics accidentels.
- **Historique préservé en cas de stockage saturé** : si la mémoire du navigateur est pleine, l'historique est réduit à ses passages les plus récents au lieu d'être silencieusement perdu au rechargement.

## [0.5.4] : 2026-08-26

### Ajouté

- **Recherche de verset par URL** : un lien de la forme `…/search?p=Mc+1:7` retrouve un passage à partir d'une référence libre (notation `livre chapitre:verset`) et redirige vers le lecteur ; si la référence ne résout pas, une page de recherche avec suggestions est affichée.

### Modifié

- **Avatars du compte** : les avatars sont désormais générés par un service dédié proposant six nouvelles variantes (Dégradé, Géométrique, Aléatoire, Icône, Vague, Dev), en remplacement des anciens identicons et avatars géométriques.

## [0.5.3] : 2026-08-25

### Ajouté

- **Lecture audio des versets** : bouton de lecture par verset avec mode de visibilité configurable (toujours, au survol de la sélection, jamais).
- **Indicateur de chapitres audio** : petit point coloré ou icône volume sur les chapitres disponibles en audio dans le sélecteur.

### Modifié

- **Animations d'apparition** : les versets apparaissent désormais avec un léger délai entre chacun pour une lecture fluide.

## [0.5.2] : 2026-08-24

### Ajouté

- **Panneau Strong — mots originaux sans correspondance** : cliquer sur un mot du texte original qui n'a pas de correspondance dans la traduction affiche désormais sa définition Strong (translittération, lemme, type grammatical, définition, origine, bouton concordance).

## [0.5.1] : 2026-08-15

### Corrigé

- **Texte original** : la phrase grecque ou hébraïque apparaît désormais réellement à l'activation du bouton ; un message explicite remplace le silence en cas d'indisponibilité.

## [0.5.0] : 2026-08-15

### Modifié

- **Texte original** : le panneau Strong affiche désormais la phrase source complète dans son ordre grec ou hébreu, y compris les mots sans correspondance dans la traduction.

## [0.4.3] : 2026-08-15

### Corrigé

- **Panneau Strong** : un mot original ou une concordance aux données incomplètes ne bloque plus l'affichage des autres mots Strong.

## [0.4.2] : 2026-08-15

### Modifié

- **Texte original interlinéaire** : les mots originaux et leurs traductions sont désormais alignés sur deux axes horizontaux réguliers.

## [0.4.1] : 2026-08-15

### Corrigé

- **Fiches Strong** : leur contenu et leurs occurrences se chargent de nouveau correctement.

## [0.4.0] : 2026-08-15

### Ajouté

- **E-mail de bienvenue** : un message de bienvenue vous est désormais envoyé à la création de votre compte, avec un raccourci pour reprendre la lecture.
- **Texte original interlinéaire** : un bouton dans le panneau Strong affiche le lemme ou la translittération au-dessus de chaque mot traduit, avec une sélection synchronisée et un réglage mémorisé.

### Modifié

- **E-mails transactionnels repensés** : les messages de vérification d'adresse, de réinitialisation de mot de passe, de lien de connexion et de clé de récupération adoptent un nouveau design aux couleurs de ShemaProject, avec le logo de l'app et des titres en DM Sans, qui s'adapte au thème clair ou sombre de votre application de messagerie.

## [0.3.1] : 2026-08-12

### Corrigé

- **Page « Nouveautés »** : la page ne montre plus que les changements visibles par l'utilisateur. Elle n'affichait jusqu'ici des détails d'implémentation et présentait à tort une refonte « en cours » alors qu'aucune évolution n'était engagée ; le bandeau trompeur disparaît quand aucune nouveauté n'est en cours.

## [0.3.0] : 2026-08-12

### Ajouté

- **Note rapide depuis la sélection** : l'action « note » a sa propre icône dans la bulle d'action d'un verset ; un clic ouvre directement l'éditeur de note, sans passer par le sous-menu.
- **Fiches Strong enrichies** : le détail d'un mot original affiche sa phonétique, son type grammatical et son origine, avec des liens cliquables vers les mots liés.
- **Page dédiée par mot Strong** : un clic ouvre une page complète (lexique + toutes les occurrences du mot dans la Bible, chargement progressif, retour au lecteur).
- **Déverrouillage par mot de passe** : la synchronisation peut être protégée par un mot de passe, en plus de la clé de récupération. À l'inscription, une clé de récupération vous est envoyée par e-mail pour ne jamais perdre l'accès à vos données. Option « se souvenir de cet appareil » pour un déverrouillage automatique pendant 30 jours.
- **Historique de navigation synchronisé** : vos passages et recherches récents se retrouvent sur tous vos appareils.

### Modifié

- **Bouton de connexion** mis en avant dans le menu Apparence quand vous n'êtes pas connecté.
- **Dock de lecture** : espacement vertical réduit.

### Corrigé

- **Affichage du type grammatical** : certaines fiches Strong affichaient du code HTML brut ; le texte est désormais propre et les liens cliquables.
- **Retour depuis une fiche Strong** : après consultation d'un mot, revenir au lecteur ne perdait plus votre sélection — elle est restaurée.
- **Synchronisation entre appareils** : certaines données migrées n'apparaissaient pas sur un second appareil ; corrigé.
- **Connexion et e-mails** : les liens de connexion et de vérification fonctionnent désormais sur le domaine de production.
- **Bouton « Charger plus »** : dans la liste des occurrences d'un mot, le bouton n'était plus visible ; corrigé.

## [0.2.0] : 2026-08-09

### Ajouté

- **Refonte complète de l'application** : interface entièrement repensée, plus rapide et plus lisible. La lecture continue, la concordance Strong, la vue parallèle, les notes, les surlignages, les favoris, les signets, la recherche par référence (⌘K), les renvois bibliques, le partage, le mode focus et le quiz de chapitre retrouvent leur place dans cette nouvelle interface.
- **Compte et synchronisation (facultatif)** : retrouvez vos favoris, signets, notes, surlignages et position de lecture sur tous vos appareils. Compte optionnel — la lecture reste accessible sans compte. Aucune métrique, aucun score. Vos données synchronisées sont chiffrées sur votre appareil avant tout envoi.
- **Écran d'accueil** : reprenez la lecture, retrouvez vos passages récents et lancez un passage directement.
- **Page « Compte & données »** : gérez e-mail, synchronisation, export, suppression et déconnexion sur une page dédiée.
- **Connexion par e-mail ou mot de passe** : créez votre compte via un lien magique envoyé par e-mail ou via un mot de passe ; réinitialisation du mot de passe oublié et vérification de l'adresse e-mail.
- **Avatar** : un avatar généré automatiquement (jamais depuis votre e-mail) remplace l'icône de réglages quand vous êtes connecté ; choix du style dans le menu Apparence.

### Corrigé

- **Fichiers statiques et sitemap** : les assets statiques et le sitemap sont désormais correctement servis (certains renvoyaient une page d'erreur par défaut).

## [0.1.12] : 2026-07-30

### Modifié

- **Quiz — validation** : après avoir cliqué « Valider », les choix et le bouton disparaissent pour laisser la place à l'explication (transition 600 ms).
- **Quiz — choix** : style affiné (arrondi `rounded-xl`, léger zoom au survol, fond coloré sur sélection).
- **Changelog** : entrées détaillées ajoutées pour les versions v0.1.0 à v0.1.11 ; titres en gras pour v0.1.0.

## [0.1.11] : 2026-07-30

### Ajouté

- **Carte Question/Réponse (morph)** : animation fluide entre état replié et développé, icône qui grandit, label qui change.
- **Bouton retour (quiz)** : icône `arrow-turn-backward`, positionné en absolu en haut à droite.

## [0.1.10] : 2026-07-30

### Modifié

- **Carte Question/Réponse** : design inline (pas de popup), icône à droite, carte empilée pour les questions multiples.

## [0.1.9] : 2026-07-30

### Modifié

- **Renommage** : « Quiz » devient « Question/Réponse » dans toute l'interface.
- **Bouton quiz retiré du dock et de la barre supérieure** : le toggle est déplacé dans le menu Apparence (engrenage).

## [0.1.8] : 2026-07-30

### Modifié

- **Bouton raccourcis clavier retiré de la barre supérieure** : déplacé dans le menu Apparence (engrenage).

## [0.1.7] : 2026-07-30

### Modifié

- **Bouton raccourcis clavier retiré du dock** : déplacé dans le panneau Réglages de lecture.

## [0.1.6] : 2026-07-30

### Ajouté

- **Boutons Quiz et raccourcis clavier** : ajoutés dans la barre supérieure (côté droit).

## [0.1.5] : 2026-07-30

### Ajouté

- **Quiz popup** : questions bibliques interactives sur l'en-tête du chapitre, toggle dans les réglages, 3 questions exemples.

## [0.1.4] : 2026-07-30

### Ajouté

- **Visualiseur de notes (lecture seule)** : cliquer l'icône note ouvre un visualiseur au lieu de l'éditeur. Le bouton « Modifier » bascule vers l'éditeur complet.

## [0.1.3] : 2026-07-30

### Modifié

- **Séparateur de version** : le parser du changelog accepte maintenant le deux-points (`:`) en plus du tiret long (`—`).

## [0.1.2] : 2026-07-29

### Modifié

- **Footer redesigné** : liens info à gauche, signalement à droite ; copyright à gauche, version à droite.
- **Dock raccourci** : le bouton raccourcis clavier est retiré du dock (déplacé dans les réglages).

## [0.1.1] : 2026-07-29

### Ajouté

- **Signalement de problème** : lien « Signaler un problème » dans le footer (mailto:bug@shemaproject.org, pré-rempli avec version, URL et navigateur).
- **Version affichée** : la version de l'app est visible dans le footer et les crédits de lecture, sous forme de bouton cliquable menant au changelog.
- **Page Changelog** : `/nouveautes` liste les changements par version.

## [0.1.0] : 2026-07-28

### Ajouté

- **Première version publique** du lecteur ShemaProject : lecture de la Bible de Yéhoshoua ha Mashiah (BYM), Darby et Louis Segond 1910, avec outils d'étude intégrés.
- **Lecture continue** avec réglages typographiques (police, taille, interligne, colonnes, thème clair/sombre).
- **Concordance Strong** : exploration des mots originaux (hébreu, grec) depuis chaque verset BYM.
- **Vue parallèle** : comparaison de deux versions côte à côte.
- **Notes & surlignages** : annotations personnelles multi-versets, surlignage en couleur, stockage local.
- **Favoris & signets** : versets favoris, groupes de signets thématiques, reprise automatique de la lecture.
- **Recherche par référence** : raccourci ⌘K (Ctrl+K).
- **Renvois bibliques** : liens contextuels vers d'autres passages (données openbible.info, licence CC-BY).
- **Partage** : copie avec référence, vignette OG dynamique.
- **Mode focus** : lecture immersive, tout le chrome disparaît.
- **Données 100 % locales** : aucun compte, aucun traceur.
