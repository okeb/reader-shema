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
 * Les blobs synchronisés sont chiffrés bout-en-bout côté client (AES-GCM) ; le serveur
 * ne stocke que des blobs opaques (jamais la clé de chiffrement DEK, jamais le clair).
 * Depuis la spec 28, la clé de récupération d'urgence est e-mailée à l'adresse du compte
 * (à l'inscription et au re-keying) : elle est vue fugacement par le serveur pour la passer
 * à Resend, mais n'est jamais persistée côté serveur. Région réelle confirmée en console
 * Neon au provisionnement — ne pas promettre une localisation non effectivement sélectionnée.
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
 * Better Auth raw appelle `sendEmail` (vérification e-mail, reset mot de passe, magic-link) ;
 * l'envoi est délégué à Resend. Aucune donnée de lecture ni blob chiffré ne transite par ce canal —
 * uniquement l'adresse e-mail de l'utilisateur et le lien signé. No-op en dev si la clé absente.
 */
export const EMAIL_PROVIDER = {
  provider: "Resend",
  url: "https://resend.com",
  /** Ce qui transite par ce canal : l'adresse e-mail, des liens signés à courte expiration, et (spec 28)
   *  la clé de récupération d'urgence e-mailée à l'inscription / au re-keying (jamais persistée serveur). */
  scope:
    "L'adresse e-mail, des liens signés à courte expiration (vérification, reset, magic-link) et la clé de récupération d'urgence (e-mailée à l'adresse du compte, jamais persistée).",
} as const;

/** Liens des pages informationnelles (footer + sitemap). */
export const INFO_LINKS = [
  { href: "/a-propos", label: "À propos" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/credits", label: "Crédits" },
] as const;

/**
 * Clés `localStorage` (et un store `IndexedDB`) utilisées par l'application — listées sur la page
 * Confidentialité pour la transparence RGPD. Par défaut, aucune ne quitte l'appareil. Si vous
 * activez un compte (facultatif), les données marquées « (sync) » sont chiffrées bout-en-bout puis
 * envoyées sous forme de blobs opaques au serveur — jamais en clair (cf. section « Compte &
 * synchronisation »).
 */
export const STORAGE_KEYS: { key: string; label: string }[] = [
  { key: "bymFavorites", label: "Versets favoris (sync)" },
  { key: "bymBookmarkGroups / bymBookmarks", label: "Signets et groupes de signets (sync)" },
  { key: "bymHighlights / bymNotes", label: "Surlignages et notes personnelles (sync)" },
  { key: "bym:version / bym:compare-version", label: "Version de lecture active et comparaison" },
  { key: "reader-preferences", label: "Réglages de lecture (police, taille, thème, disposition) (sync opt-in)" },
  { key: "reading-position", label: "Dernière position de lecture, reprise (sync)" },
  { key: "bym:account", label: "Préférences de synchronisation (sync activée, opt-in réglages)" },
  { key: "bym:sync-meta / bym:sync-queue", label: "Horloges et file d'attente de synchronisation locales" },
  {
    key: "bym:device-keys (IndexedDB)",
    label:
      "Clé de déverrouillage persistée « se souvenir de cet appareil » (30 jours, opt-in — spec 28) : handle crypto non-extractable, pas d'octets bruts sur disque",
  },
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
