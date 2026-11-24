/**
 * Constantes légales & informationnelles (mentions légales, confidentialité, crédits).
 * Source unique de vérité réutilisée par les pages `app/(info)/*` et le footer.
 * Cf. spec 15 — socle légal & informationnel.
 */

import pkg from "@/package.json";

/** Version de l'application — lue au build time. Priorité : NEXT_PUBLIC_APP_VERSION > package.json. */
export const APP_VERSION: string =
  process.env.NEXT_PUBLIC_APP_VERSION ?? pkg.version;

/** Adresse e-mail pour le signalement de bug. */
export const BUG_EMAIL = "bug@shemaproject.org";

/** Entrée de changelog (version + liste de sections avec leurs items). */
export interface ChangelogEntry {
  version: string;
  date: string | null;
  sections: { title: string; items: string[] }[];
}

/**
 * Parse le CHANGELOG.md et retourne les entrées structurées.
 * Format attendu : ## [X.Y.Z] : DATE (ou — DATE) suivie de ### Titre + listes d'items.
 */
export function parseChangelog(raw: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;

  for (const line of raw.split("\n")) {
    const heading = line.match(/^## \[([^\]]+)\]\s*(?:[:：—–-]\s*(.+))?$/);
    if (heading) {
      current = { version: heading[1], date: heading[2]?.trim() ?? null, sections: [] };
      entries.push(current);
      continue;
    }
    if (!current) continue;

    const sub = line.match(/^### (.+)$/);
    if (sub) {
      current.sections.push({ title: sub[1].trim(), items: [] });
      continue;
    }

    const item = line.match(/^- (.+)$/);
    if (item && current.sections.length > 0) {
      current.sections[current.sections.length - 1].items.push(item[1].trim());
    }
  }

  return entries;
}

export const SITE = {
  name: "ShemaProject — Lecture de la Bible",
  shortName: "ShemaProject",
  url: "https://reader.shemaproject.org",
  project: "https://shemaproject.org",
} as const;

/** Éditeur du site (particulier). Pour un particulier non-professionnel, l'e-mail de contact suffit. */
export const EDITOR = {
  name: "Olivier K.E.BILE",
  email: "oliver.keb@proton.me",
  role: "Directeur de la publication",
} as const;

/** Hébergeur (LCEN art. 6 — mention obligatoire). */
export const HOST = {
  name: "Vercel Inc.",
  address: "340 S Lemon Ave #4133, Walnut, CA 91789, USA",
  url: "https://vercel.com",
} as const;

/**
 * Hébergement des données de synchronisation (compte facultatif) — spec 22 §8, spec 26.
 *
 * Depuis la spec 39, les données synchronisées ne sont plus chiffrées de bout en bout : elles
 * sont stockées en clair (table `user_sync`), associées au compte, chiffrées au repos par Neon et
 * en transit (TLS). L'archive chiffrée d'avant la spec 39 (`user_data`) est conservée au plus tard
 * jusqu'au 2027-06-01, le temps de sa conversion. Région réelle confirmée en console Neon au
 * provisionnement — ne pas promettre une localisation non effectivement sélectionnée.
 *
 * Région active : `eu-west-2` (AWS Londres, Royaume-Uni). Le Royaume-Uni n'est pas dans
 * l'Union européenne (Brexit) mais bénéficie d'une décision d'adéquation RGPD de l'UE :
 * les transferts UE → UK sont autorisés sans garantie additionnelle.
 *
 * Depuis la spec 26, l'authentification est **self-hosted Better Auth** (tables applicatives
 * `user/session/account/verification` dans le schéma `public`, même base Neon eu-west-2, même
 * `DATABASE_URL` pooled). Aucun service d'authentification managé tiers ne traite les identifiants.
 */
export const SYNC_HOSTING = {
  provider: "Neon Postgres",
  region: "eu-west-2 — AWS Londres, Royaume-Uni",
  /** Décision d'adéquation RGPD de l'UE : transferts UE → UK autorisés sans garantie additionnelle. */
  adequacy:
    "Le Royaume-Uni bénéficie d'une décision d'adéquation RGPD de l'Union européenne.",
} as const;

/**
 * E-mails transactionnels du compte (spec 26) — sous-traitement à mentionner (RGPD art. 28).
 *
 * Better Auth raw appelle `sendEmail` (vérification e-mail, reset mot de passe) ;
 * l'envoi est délégué à Resend. Aucune donnée de lecture ne transite par ce canal — uniquement
 * l'adresse e-mail de l'utilisateur et le lien signé. No-op en dev si la clé absente.
 */
export const EMAIL_PROVIDER = {
  provider: "Resend",
  url: "https://resend.com",
  /** Ce qui transite par ce canal : l'adresse e-mail et des liens signés à courte expiration. */
  scope:
    "Seuls transitent l'adresse e-mail et des liens signés à courte expiration (vérification, réinitialisation).",
} as const;

/** Liens des pages informationnelles (footer + sitemap). */
export const INFO_LINKS = [
  { href: "/a-propos", label: "À propos" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/credits", label: "Crédits" },
] as const;

/**
 * Clés `localStorage` utilisées par l'application — listées sur la page Confidentialité pour la
 * transparence RGPD. Par défaut, aucune ne quitte l'appareil. Avec un compte (facultatif), les
 * données marquées « (sync) » sont aussi enregistrées sur le serveur, associées au compte
 * (cf. section « Compte & synchronisation », spec 39).
 */
export const STORAGE_KEYS: { key: string; label: string }[] = [
  { key: "bymFavorites", label: "Versets favoris (sync)" },
  { key: "bymBookmarkGroups / bymBookmarks", label: "Signets et groupes de signets (sync)" },
  { key: "bymHighlights / bymNotes", label: "Surlignages et notes personnelles (sync)" },
  { key: "bym:version / bym:compare-version", label: "Version de lecture active et comparaison" },
  { key: "reader-preferences", label: "Réglages de lecture (police, taille, thème, disposition) (sync opt-in)" },
  { key: "reading-position", label: "Dernière position de lecture, reprise (sync)" },
  { key: "bym:nav-history", label: "Historique de navigation / recherches récentes (sync)" },
  { key: "bym:account", label: "Préférences de synchronisation (pause, opt-in réglages)" },
  { key: "bym:sync-meta / bym:sync-queue", label: "Horloges et file d'attente de synchronisation locales" },
];

/** Crédits divers (les versions de Bible sont créditées via `lib/bible-versions.ts`). */
export const CREDITS = {
  fonts: "Inter, Noto Serif, Lora, Atkinson Hyperlegible — Google Fonts (licence OFL/Apache).",
  icons: "Icônes Hugeicons via Iconify.",
  hosting: "Hébergé sur Vercel.",
} as const;

/** Renvois (cross-references) — openbible.info, licence CC-BY (attribution obligatoire). */
export const CROSS_REFS_CREDIT = {
  text: "Renvois bibliques dérivés du Treasury of Scripture Knowledge, compilés par openbible.info — licence CC-BY.",
  source: "https://www.openbible.info/labs/cross-references/",
  license: "https://creativecommons.org/licenses/by/4.0/",
} as const;
