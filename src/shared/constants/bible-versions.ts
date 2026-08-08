/**
 * Registre des versions de Bible et source des mentions de crédits. L'`id` sert aussi de segment
 * d'URL côté API (`/{id}/:livre/:chap`, cf. `services/bible/bibleApi.ts`) et de namespace pour les
 * favoris/signets (`${id}:…`).
 */
export interface BibleVersion {
  /** Identifiant court — sert de segment d'URL API, ex. "bym" → `/bym/...`. */
  id: string;
  /** Libellé affiché, ex. "Bible de Yéhoshoua ha Mashiah". */
  label: string;
  /** Libellé court (pastille du sélecteur, en-tête de colonne), ex. "BYM". */
  shortLabel: string;
  /** Nom affiché en majuscules dans le bloc crédits. */
  creditsLabel: string;
  /** Texte des mentions / crédits. */
  copyright: string;
  /** URL « En savoir plus ». */
  source: string;
  /**
   * Version à venir : affichée grisée et non sélectionnable dans le sélecteur (teaser roadmap).
   * Tant que le flag est présent, la version est exclue des versions utilisables (`isSelectable`,
   * `otherVersions`, OG, persistance). Retirer le flag = activation immédiate dès que l'API l'expose.
   */
  comingSoon?: boolean;
  /**
   * Vrai si l'API expose les tokens Strong (`?strongs=1`) pour cette version. Défaut `true` (BYM, LSG,
   * Darby). `false` → le bouton Strong et la pilule focus se masquent (pas de panneau Strong vide).
   */
  hasStrongs?: boolean;
  /**
   * Données Strong expérimentales (alignement encore perfectible) → badge « Expérimental » dans le
   * panneau Strong. BYM et Darby ; la LSG est plus fiable (pas de badge).
   */
  strongsExperimental?: boolean;
}

export const BIBLE_VERSIONS: BibleVersion[] = [
  {
    id: "bym",
    label: "Bible de Yéhoshoua ha Mashiah",
    shortLabel: "BYM",
    creditsLabel: "BIBLE DE YÉHOSHOUA HA MASHIAH",
    copyright:
      "Traduction par ANJC Production. Diffusion libre et gratuite " +
      "« Vous avez reçu gratuitement, donnez gratuitement » (Matthieu 10.8).",
    source: "https://www.bibledeyehoshouahamashiah.org/",
    strongsExperimental: true,
  },
  {
    id: "lsg",
    label: "Louis Segond 1910",
    shortLabel: "LSG",
    creditsLabel: "LOUIS SEGOND 1910",
    copyright:
      "Version Louis Segond (1910). Texte du domaine public, diffusion libre.",
    source: "https://fr.wikipedia.org/wiki/Bible_Segond",
  },
  {
    id: "darby",
    label: "Darby 1885",
    shortLabel: "DARBY",
    creditsLabel: "DARBY 1885",
    copyright:
      "Traduction de John Nelson Darby (1885). Texte du domaine public, " +
      "diffusion libre.",
    source: "https://fr.wikipedia.org/wiki/Bible_Darby",
    // Strong désormais servies par l'API, mais en alignement expérimental → badge « Expérimental ».
    strongsExperimental: true,
  },
];

/** Version par défaut (BYM). */
export const DEFAULT_BIBLE_VERSION: BibleVersion = BIBLE_VERSIONS[0];

/** Vrai si la version est sélectionnable (i.e. pas `comingSoon`). */
export function isSelectable(v: BibleVersion): boolean {
  return !v.comingSoon;
}

/** Versions réellement utilisables : tout le registre sauf les `comingSoon`. */
export const SELECTABLE_VERSIONS: BibleVersion[] = BIBLE_VERSIONS.filter(isSelectable);

/** Retourne la version correspondant à l'id, ou la version par défaut. */
export function getVersion(id: string): BibleVersion {
  return BIBLE_VERSIONS.find((v) => v.id === id) ?? DEFAULT_BIBLE_VERSION;
}

/** Vrai si l'id correspond à une version sélectionnable (utilisé pour valider la persistance). */
export function isSelectableId(id: string): boolean {
  return SELECTABLE_VERSIONS.some((v) => v.id === id);
}

/** Toutes les versions sélectionnables sauf celle indiquée (pour proposer « comparer avec… »). */
export function otherVersions(id: string): BibleVersion[] {
  return SELECTABLE_VERSIONS.filter((v) => v.id !== id);
}
