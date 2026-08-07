export type QuizChoice = { id: string; text: string };

export type QuizType = "single" | "multiple" | "order";

export interface Quiz {
  id: string;
  bookId: string;
  chapter: number;
  prompt: string;
  type: QuizType;
  choices: QuizChoice[];
  /** Réponse correcte : id du choix pour "single", tableau d'ids pour "multiple", tableau d'ids dans l'ordre pour "order". */
  answer: string | string[];
  explanation: string;
  verseRef: { bookId: string; chapter: number; verse: string };
  /** Icône Iconify affichée sur la carte (ex. "fluent-emoji:green-apple"). */
  icon?: string;
}

const QUIZZES: Quiz[] = [
  {
    id: "genese:2",
    bookId: "genese",
    chapter: 2,
    type: "single",
    prompt: "Quel était le fruit défendu dans le jardin d'Éden ?",
    choices: [
      { id: "a", text: "Une pomme, symbole traditionnel du péché" },
      { id: "b", text: "Le fruit de l'arbre de vie" },
      { id: "c", text: "Le texte ne précise pas l'espèce du fruit" },
    ],
    answer: "c",
    explanation:
      "Le texte biblique ne nomme jamais le fruit de l'arbre de la connaissance du bien et du mal. L'idée d'une pomme vient d'un jeu de mots latin (malus = pommier / malus = mauvais). L'interdit n'est pas le fruit lui-même, mais la désobéissance à l'ordre d'Elohîm.",
    verseRef: { bookId: "genese", chapter: 2, verse: "16-17" },
    icon: "fluent-emoji:green-apple",
  },
  {
    id: "genese:3",
    bookId: "genese",
    chapter: 3,
    type: "single",
    prompt: "Qui a tenté Havah dans le jardin d'Éden ?",
    choices: [
      { id: "a", text: "Satan, l'adversaire, sous forme de serpent" },
      { id: "b", text: "Le serpent, un des animaux du champ" },
      { id: "c", text: "Un démon envoyé par Elohîm pour éprouver Havah" },
    ],
    answer: "b",
    explanation:
      "Le texte de Genèse 3 présente le serpent comme le plus rusé des animaux du champ ; il n'est pas identifié à Satan dans ce passage. L'identification viendra plus tard dans la révélation biblique (Apocalypse 12:9). Beaucoup hésitent entre le serpent simplement et Satan déguisé.",
    verseRef: { bookId: "genese", chapter: 3, verse: "1" },
    icon: "fluent-emoji:snake",
  },
  {
    id: "genese:4",
    bookId: "genese",
    chapter: 4,
    type: "single",
    prompt: "Pourquoi Elohîm a-t-Il agréé l'offrande de Hevel et non celle de Qayin ?",
    choices: [
      { id: "a", text: "Parce que Qayin a offert des fruits au lieu d'un animal" },
      { id: "b", text: "Parce que Hevel a offert les prémices, les meilleurs, avec foi" },
      { id: "c", text: "Parce que les offrandes animales sont toujours supérieures" },
      { id: "d", text: "Le texte ne donne aucune raison" },
    ],
    answer: "b",
    explanation:
      "Le texte souligne que Hevel a offert des prémiers-nés de son troupeau, c'est-à-dire le meilleur, tandis que Qayin a simplement offert des fruits du sol. La différence n'est pas végétal vs animal, mais l'attitude du cœur et la qualité de ce qui est donné.",
    verseRef: { bookId: "genese", chapter: 4, verse: "4-5" },
    icon: "fluent-emoji:ram",
  },
  {
    id: "exode:3",
    bookId: "exode",
    chapter: 3,
    type: "single",
    prompt: "Quel nom Elohîm déclare-t-Il à Moshé au buisson ardent ?",
    choices: [
      { id: "a", text: "Adonaï" },
      { id: "b", text: "l'Elohîm d'Abraham, de Yitzhak et de Yaacov" },
      { id: "c", text: "Je suis" },
      { id: "d", text: "El Shaddaï" },
    ],
    answer: "c",
    explanation:
      "Elohîm se révèle sous le nom YHWH, lié au verbe « être » : « Je suis celui qui suis ». Ce nom exprime l'être même d'Elohîm, sa présence fidèle. Adonaï est un titre de respect, El Shaddaï était connu des patriarches ; mais YHWH est le nom de l'alliance.",
    verseRef: { bookId: "exode", chapter: 3, verse: "14" },
    icon: "fluent-emoji:fire",
  },
  {
    id: "exode:20",
    bookId: "exode",
    chapter: 20,
    type: "single",
    prompt: "Quel est le premier commandement du Décalogue ?",
    choices: [
      { id: "a", text: "Tu ne tueras point" },
      { id: "b", text: "Tu n'auras pas d'autres élohîm contre mes faces" },
      { id: "c", text: "Aime ton prochain comme toi-même" },
      { id: "d", text: "Tu ne prendras pas en vain le nom de YHWH ton Elohîm" },
    ],
    answer: "b",
    explanation:
      "Le premier commandement fonde tous les autres : l'exclusivité de l'alliance avec YHWH. « Aime ton prochain » est un résumé de la Loi (Lévitique 19:18), pas un commandement du Décalogue. « Tu ne tueras point » est le sixième.",
    verseRef: { bookId: "exode", chapter: 20, verse: "2-3" },
    icon: "fluent-emoji:stone-tablet",
  },
  {
    id: "psaumes:23",
    bookId: "psaumes",
    chapter: 23,
    type: "single",
    prompt: "Que signifie « YHWH est mon berger » dans le Psaume 23 ?",
    choices: [
      { id: "a", text: "YHWH est un roi qui gouverne avec autorité" },
      { id: "b", text: "YHWH pourvoit, guide et protège comme un berger son troupeau" },
      { id: "c", text: "Dawid était berger, donc il compare sa vie à celle d'Elohîm" },
    ],
    answer: "b",
    explanation:
      "L'image du berger en Israël évoque la provision, la guidance et la protection. Dawid, lui-même berger, utilise cette métaphore pour dire : YHWH me fait manquer de rien, Il me conduit, Il me garde même dans la vallée de l'ombre de la mort. C'est bien plus qu'un roi ou qu'un simple parallèle autobiographique.",
    verseRef: { bookId: "psaumes", chapter: 23, verse: "1" },
    icon: "fluent-emoji:person-shepherd",
  },
  {
    id: "psaumes:1",
    bookId: "psaumes",
    chapter: 1,
    type: "single",
    prompt: "Que dit le Psaume 1 de l'homme bienheureux ?",
    choices: [
      { id: "a", text: "Il médite la Torah jour et nuit" },
      { id: "b", text: "Il offre des sacrifices réguliers au temple" },
      { id: "c", text: "Il ne marche pas selon le conseil des méchants" },
    ],
    answer: "c",
    explanation:
      "Le Psaume 1 commence par ce que l'homme bienheureux refuse : le conseil des méchants, le chemin des pécheurs, l'assemblée des moqueurs. La méditation de la Torah en est la conséquence, mais le bonheur commence par ce que l'on refuse avant ce que l'on choisit.",
    verseRef: { bookId: "psaumes", chapter: 1, verse: "1-2" },
    icon: "fluent-emoji:tree",
  },
  {
    id: "matthieu:5",
    bookId: "matthieu",
    chapter: 5,
    type: "multiple",
    prompt: "Lesquelles de ces béatitudes se trouvent dans le Sermon sur la montagne ?",
    choices: [
      { id: "a", text: "Bénis, les pauvres d'esprit" },
      { id: "b", text: "Bénis, les pacificateurs" },
      { id: "c", text: "Bénis, les humbles de cœur" },
      { id: "d", text: "Bénis, les doux d'esprit" },
    ],
    answer: ["a", "b", "d"],
    explanation:
      "Les béatitudes (Matthieu 5:3-12) incluent les pauvres d'esprit, les miséricordieux et les persécutés. En revanche, «  Bénis, les humbles de cœur » n'est pas cité ; Yéhoshoua enseigne plutôt le jeûne doit se faire dans le secret (Matthieu 6).",
    verseRef: { bookId: "matthieu", chapter: 5, verse: "3-12" },
    icon: "fluent-emoji:mountain",
  },
  {
    id: "matthieu:11",
    bookId: "matthieu",
    chapter: 11,
    type: "single",
    prompt: "Selon Yéhoshoua, qui est le plus grand parmi ceux nés de femme ?",
    choices: [
      { id: "a", text: "Abraham, Le père de la foi" },
      { id: "b", text: "Yohanan le Baptiseur" },
      { id: "c", text: "Éliyah, le prophète" },
      { id: "d", text: "Moshé" },
    ],
    answer: "b",
    explanation:
      "Yéhoshoua déclare : « Parmi ceux qui sont nés de femme, il ne s'en est pas levé de plus grand que Yohanan le Baptiseur » (Mt 11:11). Moshé et Éliyah sont des géants de la foi, Abraham est le père des croyants, mais c'est Yohanan qui a été choisi pour préparer directement le chemin du Mashiah.",
    verseRef: { bookId: "matthieu", chapter: 11, verse: "11" },
    icon: "fluent-emoji:crown",
  },
  {
    id: "matthieu:7",
    bookId: "matthieu",
    chapter: 7,
    type: "single",
    prompt: "Sur quoi l'homme sage bâtit-il sa maison, selon Yéhoshoua ?",
    choices: [
      { id: "a", text: "Sur la prière fervente et la dévotion" },
      { id: "b", text: "Sur le roc, en écoutant et pratiquant les paroles de Yéhoshoua" },
      { id: "c", text: "Sur la tradition des anciens" },
    ],
    answer: "b",
    explanation:
      "Yéhoshoua compare celui qui écoute et met en pratique ses paroles à un homme prudent qui bâtit sur le roc. La prière est essentielle, mais ce n'est pas la fondation ; c'est l'écoute et la mise en pratique qui font la différence entre la maison qui tient et celle qui s'effondre.",
    verseRef: { bookId: "matthieu", chapter: 7, verse: "24-27" },
    icon: "fluent-emoji:house-with-garden",
  },
  {
    id: "jean:3",
    bookId: "jean",
    chapter: 3,
    type: "single",
    prompt: "Que signifie « naître de nouveau » selon Yohanân 3 ?",
    choices: [
      { id: "a", text: "Se réincarner dans un nouveau corps pour une nouvelle vie" },
      { id: "b", text: "Être régénéré par l'Esprit d'Elohîm" },
      { id: "c", text: "Se faire immerger dans l'eau du mikveh (baptême)" },
      { id: "d", text: "Devenir membre de la communauté d'Israël" },
    ],
    answer: "b",
    explanation:
      "Yéhoshoua explique à Nikodemos que cette nouvelle naissance est l'œuvre de l'Esprit, comme le vent qui souffle où il veut. L'eau du baptême en est le signe visible (v.5), mais ce n'est pas l'eau qui régénère ; c'est l'Esprit qui donne une vie nouvelle à celui qui croit.",
    verseRef: { bookId: "jean", chapter: 3, verse: "5-8" },
    icon: "fluent-emoji:dove",
  },
  {
    id: "romains:8",
    bookId: "romains",
    chapter: 8,
    type: "single",
    prompt: "Qui n'est plus sous aucune condamnation ?",
    choices: [
      { id: "a", text: "Tous les hommes" },
      { id: "b", text: "Ceux qui sont en Mashiah Yéhoshoua" },
      { id: "c", text: "Ceux qui n'ont jamais péché" },
    ],
    answer: "b",
    explanation:
      "Paulos enseigne que ceux qui sont unis à Mashiah Yéhoshoua ne sont plus sous la condamnation du péché.",
    verseRef: { bookId: "romains", chapter: 8, verse: "1" },
    icon: "fluent-emoji:dove",
  },
  {
    id: "romains:8-28",
    bookId: "romains",
    chapter: 8,
    type: "single",
    prompt: "Pour qui toutes choses concourent-elles au bien ?",
    choices: [
      { id: "a", text: "Pour tous les hommes" },
      { id: "b", text: "Pour ceux qui aiment Elohîm et sont appelés selon Son dessein" },
      { id: "c", text: "Pour ceux qui sont riches" },
    ],
    answer: "b",
    explanation:
      "Cette promesse concerne ceux qui aiment Elohîm et répondent à Son appel.",
    verseRef: { bookId: "romains", chapter: 8, verse: "28" },
    icon: "fluent-emoji:heart-on-fire",
  },
  {
    id: "jacques:1",
    bookId: "jacques",
    chapter: 1,
    type: "single",
    prompt: "Que risque celui qui écoute la Parole sans la mettre en pratique ?",
    choices: [
      { id: "a", text: "Il s'abuse lui-même" },
      { id: "b", text: "Il perd automatiquement son salut" },
      { id: "c", text: "Il oublie la Torah" },
    ],
    answer: "a",
    explanation:
      "Jacques avertit que le simple fait d'écouter sans obéir revient à se tromper soi-même.",
    verseRef: { bookId: "jacques", chapter: 1, verse: "22" },
    icon: "fluent-emoji:mirror",
  },
  {
    id: "hebreux:11",
    bookId: "hebreux",
    chapter: 11,
    type: "single",
    prompt: "Sans quoi est-il impossible de plaire à Elohîm ?",
    choices: [
      { id: "a", text: "Sans la foi" },
      { id: "b", text: "Sans les sacrifices" },
      { id: "c", text: "Sans le jeûne" },
    ],
    answer: "a",
    explanation:
      "La foi est indispensable pour s'approcher d'Elohîm et Lui être agréable.",
    verseRef: { bookId: "hebreux", chapter: 11, verse: "6" },
    icon: "fluent-emoji:sparkles",
  },
  {
    id: "1corinthiens:13",
    bookId: "1corinthiens",
    chapter: 13,
    type: "single",
    prompt: "Quelle est la plus grande de la foi, de l'espérance et de l'amour ?",
    choices: [
      { id: "a", text: "La foi" },
      { id: "b", text: "L'espérance" },
      { id: "c", text: "L'amour" },
    ],
    answer: "c",
    explanation:
      "Paulos conclut que l'amour est supérieur à la foi et à l'espérance.",
    verseRef: { bookId: "1corinthiens", chapter: 13, verse: "13" },
    icon: "fluent-emoji:red-heart",
  },
  {
    id: "romains:10",
    bookId: "romains",
    chapter: 10,
    type: "single",
    prompt: "Qu'est-ce qui fait naître la foi ?",
    choices: [
      { id: "a", text: "Les miracles" },
      { id: "b", text: "L'écoute de la parole de Mashiah" },
      { id: "c", text: "Les bonnes œuvres" },
    ],
    answer: "b",
    explanation:
      "La foi vient de ce que l'on entend, c'est-à-dire de la parole concernant Mashiah.",
    verseRef: { bookId: "romains", chapter: 10, verse: "17" },
    icon: "fluent-emoji:loudspeaker",
  },
  {
    id: "romains:14",
    bookId: "romains",
    chapter: 14,
    type: "single",
    prompt: "De quoi est principalement composé le royaume d'Elohîm ?",
    choices: [
      { id: "a", text: "De nourriture et de boissons" },
      { id: "b", text: "De justice, de paix et de joie par l'Esprit Saint" },
      { id: "c", text: "De sacrifices et de fêtes" },
    ],
    answer: "b",
    explanation:
      "Le royaume d'Elohîm ne se limite pas à des prescriptions alimentaires mais se manifeste par la justice, la paix et la joie produites par l'Esprit.",
    verseRef: { bookId: "romains", chapter: 14, verse: "17" },
    icon: "fluent-emoji:rainbow",
  },
  {
    id: "romains:8",
    bookId: "romains",
    chapter: 8,
    type: "single",
    prompt: "Que déclare Romains 8:28 ?",
    choices: [
      { id: "a", text: "Tout concourt au bien de ceux qui aiment Elohîm" },
      { id: "b", text: "Les croyants ne souffriront plus après leur conversion" },
      { id: "d", text: "Elohîm préserve les justes de toute épreuve" },
    ],
    answer: "a",
    explanation:
      "Paulos ne dit pas que tout est bon en soi, ni que les croyants seront épargnés. Il affirme qu'Elohîm fait concourir toutes choses, même la souffrance, au bien de ceux qui L'aiment. Le contexte parle de gémissements et d'espérance, pas d'une vie sans épreuve.",
    verseRef: { bookId: "romains", chapter: 8, verse: "28" },
    icon: "fluent-emoji:chains",
  },
  {
    id: "romains:12",
    bookId: "romains",
    chapter: 12,
    type: "single",
    prompt: "Que demande Romains 12:2, « ne vous conformez pas à ce siècle » ?",
    choices: [
      { id: "a", text: "Se retirer du monde pour vivre en isolation" },
      { id: "b", text: "Laisser Elohîm transformer votre pensée pour discerner Sa volonté" },
      { id: "c", text: "Suivre les règles religieuses plus strictement" },
    ],
    answer: "b",
    explanation:
      "Paulos oppose la conformité au monde à la transformation par le renouvellement de l'intelligence. Ce n'est pas le retrait du monde, ni un légalisme accru, mais un changement de perspective : discerner la volonté d'Elohîm, non copier les schémas du siècle présent.",
    verseRef: { bookId: "romains", chapter: 12, verse: "2" },
    icon: "fluent-emoji:brain",
  },

  {
    id: "apocalypse:21",
    bookId: "apocalypse",
    chapter: 21,
    type: "single",
    prompt: "Que dit Apocalypse 21:4 sur les larmes ?",
    choices: [
      { id: "a", text: "Elles seront récompensées par une joie éternelle" },
      { id: "b", text: "Elohîm Lui-même essuiera toute larme de leurs yeux" },
      { id: "c", text: "Il n'y aura plus de mémoire du passé" },
      { id: "d", text: "Les saints prieront pour consoler ceux qui pleurent" },
    ],
    answer: "b",
    explanation:
      "Elohîm Lui-même essuiera les larmes ; la promesse est intime et personnelle. Ce n'est pas une récompense pour avoir pleuré, ni un effacement du passé. La mort, le deuil, la douleur auront disparu : les anciennes choses sont passées, toutes choses sont devenues nouvelles.",
    verseRef: { bookId: "apocalypse", chapter: 21, verse: "4" },
    icon: "fluent-emoji:cityscape",
  },
  {
    id: "genese:12",
    bookId: "genese",
    chapter: 12,
    type: "order",
    prompt: "Replacez les événements dans l'ordre chronologique :",
    choices: [
      { id: "a", text: "Elohîm appelle Avraham à sortir de Haran" },
      { id: "b", text: "Avraham descend en Égypte à cause de la famine" },
      { id: "c", text: "Lot se sépare d'Avraham et va vers Sodome" },
      { id: "d", text: "Elohîm renouvelle l'alliance avec Avraham" },
    ],
    answer: ["a", "b", "c", "d"],
    explanation:
      "Genèse 12 suit l'ordre : appel à sortir (v.1), descente en Égypte (v.10), puis au chapitre 13 Lot se sépare, et au chapitre 15 l'alliance est renouvelée. L'histoire d'Avraham progresse par étapes de foi.",
    verseRef: { bookId: "genese", chapter: 12, verse: "1-10" },
    icon: "fluent-emoji:old-man-medium",
  },
  {
    id: "genese:22",
    bookId: "genese",
    chapter: 22,
    type: "order",
    prompt: "Replacez les événements du sacrifice d'Isaac dans l'ordre chronologique :",
    choices: [
      { id: "a", text: "Avraham prend le couteau pour immoler son fils" },
      { id: "b", text: "L'ange de YHWH arrête Avraham" },
      { id: "c", text: "Avraham aperçoit un bélier retenu dans un buisson" },
      { id: "d", text: "Avraham offre le bélier en holocauste" },
    ],
    answer: ["a", "b", "c", "d"],
    explanation:
      "Avraham est prêt à sacrifier Isaac, l'ange intervient, un bélier est ensuite fourni par Elohîm, puis il est offert à la place d'Isaac.",
    verseRef: { bookId: "genese", chapter: 22, verse: "10-13" },
    icon: "fluent-emoji:ram",
  },
  {
    id: "exode:14",
    bookId: "exode",
    chapter: 14,
    type: "order",
    prompt: "Replacez les événements de la traversée de la mer Rouge dans l'ordre chronologique :",
    choices: [
      { id: "a", text: "Moshé étend sa main sur la mer" },
      { id: "b", text: "Les Israélites traversent à pied sec" },
      { id: "c", text: "Les Égyptiens poursuivent Israël" },
      { id: "d", text: "Les eaux reviennent sur l'armée égyptienne" },
    ],
    answer: ["a", "b", "c", "d"],
    explanation:
      "Moshé ouvre la mer, Israël traverse, les Égyptiens les poursuivent, puis les eaux se referment sur eux.",
    verseRef: { bookId: "exode", chapter: 14, verse: "21-28" },
    icon: "fluent-emoji:water-wave",
  },
  {
    id: "josue:6",
    bookId: "josue",
    chapter: 6,
    type: "order",
    prompt: "Replacez les événements de la prise de Jéricho dans l'ordre chronologique :",
    choices: [
      { id: "a", text: "Les prêtres sonnent de la trompette" },
      { id: "b", text: "Le peuple pousse un grand cri" },
      { id: "c", text: "Les murailles s'écroulent" },
      { id: "d", text: "Israël entre dans la ville" },
    ],
    answer: ["a", "b", "c", "d"],
    explanation:
      "Après le son des trompettes, le peuple crie, les murailles tombent puis Israël prend la ville.",
    verseRef: { bookId: "josue", chapter: 6, verse: "20" },
    icon: "fluent-emoji:castle",
  },
  {
    id: "1samuel:17",
    bookId: "1samuel",
    chapter: 17,
    type: "order",
    prompt: "Replacez les événements du combat entre Dawid et Goliath dans l'ordre chronologique :",
    choices: [
      { id: "a", text: "Dawid lance une pierre avec sa fronde" },
      { id: "b", text: "Goliath tombe face contre terre" },
      { id: "c", text: "Dawid prend l'épée de Goliath" },
      { id: "d", text: "Dawid coupe la tête de Goliath" },
    ],
    answer: ["a", "b", "c", "d"],
    explanation:
      "La pierre atteint Goliath, il tombe, Dawid prend ensuite son épée et lui tranche la tête.",
    verseRef: { bookId: "1samuel", chapter: 17, verse: "49-51" },
    icon: "fluent-emoji:rock",
  },
  {
    id: "luc:15",
    bookId: "luc",
    chapter: 15,
    type: "order",
    prompt: "Replacez les événements de la parabole du fils prodigue dans l'ordre chronologique :",
    choices: [
      { id: "a", text: "Le fils quitte la maison de son père" },
      { id: "b", text: "Il dépense tout son héritage" },
      { id: "c", text: "Il décide de retourner vers son père" },
      { id: "d", text: "Son père l'accueille avec joie" },
    ],
    answer: ["a", "b", "c", "d"],
    explanation:
      "Le fils part, gaspille son héritage, se repent puis est accueilli avec joie par son père.",
    verseRef: { bookId: "luc", chapter: 15, verse: "13-24" },
    icon: "fluent-emoji:house-with-garden",
  },
  {
    id: "jean:20",
    bookId: "jean",
    chapter: 20,
    type: "order",
    prompt: "Replacez les événements du matin de la résurrection dans l'ordre chronologique :",
    choices: [
      { id: "a", text: "Miryam de Magdala découvre le tombeau ouvert" },
      { id: "b", text: "Petros et le disciple bien-aimé courent au tombeau" },
      { id: "c", text: "Les disciples repartent chez eux" },
      { id: "d", text: "Yéhoshoua apparaît à Miryam" },
    ],
    answer: ["a", "b", "c", "d"],
    explanation:
      "Miryam découvre le tombeau vide, avertit les disciples, ceux-ci repartent ensuite, puis Yéhoshoua se révèle à elle.",
    verseRef: { bookId: "jean", chapter: 20, verse: "1-18" },
    icon: "fluent-emoji:sunrise",
  },
  {
    id: "actes:9",
    bookId: "actes",
    chapter: 9,
    type: "order",
    prompt: "Replacez les événements de la conversion de Paulos dans l'ordre chronologique :",
    choices: [
      { id: "a", text: "Une lumière venue du ciel l'enveloppe" },
      { id: "b", text: "Paulos tombe à terre" },
      { id: "c", text: "Il entend la voix de Yéhoshoua" },
      { id: "d", text: "Il entre aveugle dans Damas" },
    ],
    answer: ["a", "b", "c", "d"],
    explanation:
      "Une lumière éclaire Paulos, il tombe à terre, entend la voix de Yéhoshoua puis entre aveugle dans Damas.",
    verseRef: { bookId: "actes", chapter: 9, verse: "3-8" },
    icon: "fluent-emoji:high-voltage",
  }
];

export function getQuiz(bookId: string, chapter: number): Quiz | null {
  return QUIZZES.find((q) => q.bookId === bookId && q.chapter === chapter) ?? null;
}

export function getQuizzes(bookId: string, chapter: number): Quiz[] {
  return QUIZZES.filter((q) => q.bookId === bookId && q.chapter === chapter);
}