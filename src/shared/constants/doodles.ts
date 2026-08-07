/**
 * Registre éditorial des doodles (spec 18) — logo d'occasion animé dans la topbar.
 *
 * Source éditoriale versionnée en code (comme la liste du verset du jour, spec 06) : aucune API, aucun
 * endpoint. `resolveDoodle(now)` décide, côté client, quelle occasion (le cas échéant) est active
 * pour une date donnée. Le moteur d'animation est **Rive** (cf. spec §4.4) : chaque occasion pointe
 * vers un fichier `.riv` unique sous `public/doodle/<id>.riv` (thème runtime, pas de doublon clair/
 * sombre).
 *
 * Limites honnêtes :
 * - Les `.riv` se créent dans l'éditeur `rive.app` (dessin vectoriel + state machine + variables de
 *   couleur). Ce fichier ne contient que la logique de résolution ; l'art est livré à part.
 * - Tant qu'un `.riv` manque, le renderer repli silencieusement sur le logo normal (spec §4.5) —
 *   aucune erreur visible.
 */

/** Moteur d'animation : Rive (cf. spec §4.4). */
export interface DoodleAnimation {
  /** Chemin de l'asset `.riv` (servi depuis `public/`). Ex. "/doodle/pessah.riv". */
  file: string;
  /** State machine d'entrée à jouer au montage (défaut : la 1ʳᵉ state machine du fichier). */
  stateMachine?: string;
  /** État joué au survol (desktop), optionnel. */
  hoverState?: string;
}

/** Verset lié à l'occasion — ouvre la lecture en contexte via la route `/read` existante. */
export interface DoodleVerseRef {
  /** Slug de livre (ex. "exode"), validé par `getBookById` côté UI. */
  bookId: string;
  chapter: number;
  /** Sélection de versets (ex. "1-11"), optionnelle. */
  v?: string;
}

/** Créneau temporel d'une occasion, évalué sur la date courante (côté client). */
export type DoodleWhen =
  | { kind: "fixed"; /** Jour/mois grégorien fixe (ex. { day: 25, month: 12 }). */ day: number; month: number }
  | {
      kind: "season";
      /** Plage jour/mois → jour/mois, gère le passage à cheval sur l'année (ex. hiver 01/12 → 06/01). */
      from: { day: number; month: number };
      to: { day: number; month: number };
    }
  | {
      kind: "range";
      /** Plage ponctuelle `YYYY-MM-DD → YYYY-MM-DD` (anniversaires du projet, occasions uniques). */
      from: string;
      to: string;
    }
  | {
      kind: "hebrewManual";
      /**
       * Fêtes mobiles (Pâque, Shavouot, Souccot, Roch Hachana, Yom Kippour) saisies éditorialement par
       * année grégorienne : `{ <année>: { start, end } }`. MVP sans conversion automatique (spec §8).
       */
      years: Record<number, { start: string; end: string }>;
    };

/** Une occasion de doodle. */
export interface Doodle {
  /** Slug unique (sert aussi de nom d'asset : `public/doodle/<id>.riv`). */
  id: string;
  /** Titre affiché dans la carte (ex. « Pâque (Pessah) »). */
  label: string;
  /** Description courte (1–2 phrases) affichée dans la carte. */
  description?: string;
  /** Verset lié → « Lire en contexte ». */
  verseRef?: DoodleVerseRef;
  when: DoodleWhen;
  /** Priorité : la plus haute gagne en cas de chevauchement (une fête bat une saison). */
  priority: number;
  /** Animation Rive. Si absente, le mark d'occasion reste statique (pas d'animation d'entrée). */
  animate?: DoodleAnimation;
}

/* ------------------------------------------------------------------ */
/* Registre éditorial                                                 */
/* ------------------------------------------------------------------ */

/**
 * Table des occasions. À alimenter au fur et à mesure (art `.riv` livré dans `public/doodle/`).
 *
 * Pour tester localement : ajoutez (ou modifiez) une occasion couvrant « aujourd'hui » — ex. un
 * `range` sur la date du jour, ou un `fixed` au jour courant. Le renderer tente alors de charger le
 * `.riv` ; s'il est absent, repli silencieux sur le logo normal (spéc §4.5) — sans `.riv` livré, le
 * chemin Rive n'est pas visuellement exercé.
 *
 * Cible raisonnable : ~10–15 occasions/an (cf. spec §8 — trop banalise, trop peu invisibilise).
 */
export const DOODLES: Doodle[] = [
  // ── Démo (désactivé : plage passée) ──────────────────────────────────────────────────────
  // Doodle de test pour vérifier le rendu Rive en local. Pour le réactiver temporairement,
  // rebasculez `from`/`to` sur la plage couvrant aujourd'hui, puis remettez une plage passée
  // avant de committer. Priorité 0 = plus basse (une fête ou une saison l'emporterait).
  {
    id: "demo",
    label: "Doodle démo",
    description: "Occasion de test — remplacez sa plage par aujourd'hui pour vérifier le rendu.",
    verseRef: { bookId: "jean", chapter: 3, v: "16" },
    when: { kind: "range", from: "2024-01-01", to: "2024-01-02" },
    priority: 0,
    animate: { file: "/doodle/demo.riv" },
  },

  // ── Fêtes hébraïques majeures (2026 — saisie éditoriale annuelle, cf. spec §8) ─────────────
  // Dates grégorienne 2026 (les fêtes commencent la veille au coucher du soleil ; on couvre les
  // jours de fête eux-mêmes). Priorité 100 : une fête bat une saison. À mettre à jour chaque année
  // (ajouter l'année N+1 dans `years`, ou éditer les plages si passage en `range`).
  // Sources : hebcal / jcal 2026.
  {
    id: "pessah",
    label: "Pâque (Pessah)",
    description:
      "Délivrance d'Égypte : l'Agneau mis à mort préfigure la rédemption accomplie en Yéhoshoua ha Mashiah.",
    verseRef: { bookId: "exode", chapter: 12, v: "1-14" },
    when: { kind: "hebrewManual", years: { 2026: { start: "2026-04-02", end: "2026-04-09" } } },
    priority: 100,
    animate: { file: "/doodle/pessah.riv" },
  },
  {
    id: "shavouot",
    label: "Shavouot (Pentecôte)",
    description:
      "Don de la Torah au Sinaï et effusion de l'Esprit : les prémices de la moisson et la nouvelle alliance.",
    verseRef: { bookId: "exode", chapter: 20, v: "1-17" },
    when: { kind: "hebrewManual", years: { 2026: { start: "2026-05-22", end: "2026-05-23" } } },
    priority: 100,
    animate: { file: "/doodle/shavouot.riv" },
  },
  {
    id: "roch-hachana",
    label: "Roch Hachana",
    description:
      "Tête de l'année : son du shofar, mémoire de la création et appel à la repentance.",
    verseRef: { bookId: "levitique", chapter: 23, v: "23-25" },
    when: { kind: "hebrewManual", years: { 2026: { start: "2026-09-12", end: "2026-09-13" } } },
    priority: 100,
    animate: { file: "/doodle/roch-hachana.riv" },
  },
  {
    id: "yom-kippour",
    label: "Yom Kippour",
    description:
      "Le grand jour des expiations : figure du pardon accompli une fois pour toutes en Yéhoshoua ha Mashiah.",
    verseRef: { bookId: "levitique", chapter: 16, v: "29-34" },
    when: { kind: "hebrewManual", years: { 2026: { start: "2026-09-21", end: "2026-09-21" } } },
    priority: 100,
    animate: { file: "/doodle/yom-kippour.riv" },
  },
  {
    id: "souccot",
    label: "Souccot (Tentes)",
    description:
      "Les tentes : mémoire de la marche au désert et joie de la récolte — Dieu qui habite parmi nous.",
    verseRef: { bookId: "levitique", chapter: 23, v: "33-44" },
    when: { kind: "hebrewManual", years: { 2026: { start: "2026-09-26", end: "2026-10-02" } } },
    priority: 100,
    animate: { file: "/doodle/souccot.riv" },
  },
];

/* ------------------------------------------------------------------ */
/* Résolution                                                          */
/* ------------------------------------------------------------------ */

/** `YYYY-MM-DD` (heure locale) — clé de persistance `bym:doodle-seen` (spec §6.2). */
export function doodleDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sameMonthDay(d: Date, day: number, month: number): boolean {
  return d.getMonth() + 1 === month && d.getDate() === day;
}

/** `true` si `d` est dans la saison (gère le chevauchement d'année). */
function inSeason(d: Date, from: { day: number; month: number }, to: { day: number; month: number }): boolean {
  const fromTuple = [from.month, from.day] as const;
  const toTuple = [to.month, to.day] as const;
  const cur = [d.getMonth() + 1, d.getDate()] as const;
  // Comparaison lexicographique sur (month, day) — valide car 1≤month≤12, 1≤day≤31.
  const cmp = (a: readonly [number, number], b: readonly [number, number]) =>
    a[0] === b[0] ? a[1] - b[1] : a[0] - b[0];
  if (cmp(fromTuple, toTuple) <= 0) {
    // Plage dans la même année : from <= cur <= to.
    return cmp(fromTuple, cur) <= 0 && cmp(cur, toTuple) <= 0;
  }
  // Plage à cheval (ex. 12 → 01) : cur >= from OU cur <= to.
  return cmp(cur, fromTuple) >= 0 || cmp(cur, toTuple) <= 0;
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** `true` si l'occasion est active pour `now`. */
export function isDoodleActive(doodle: Doodle, now: Date): boolean {
  const w = doodle.when;
  switch (w.kind) {
    case "fixed":
      return sameMonthDay(now, w.day, w.month);
    case "season":
      return inSeason(now, w.from, w.to);
    case "range": {
      const from = parseYmd(w.from);
      const to = parseYmd(w.to);
      // Comparaison jour à jour (heure locale, 00h00) — on inclut toute la journée de `to`.
      const cur = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
      return cur >= from && cur <= end;
    }
    case "hebrewManual": {
      const entry = w.years[now.getFullYear()];
      if (!entry) return false;
      const from = parseYmd(entry.start);
      const end = parseYmd(entry.end);
      const cur = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endInclusive = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
      return cur >= from && cur <= endInclusive;
    }
  }
}

/**
 * Résout l'occasion active pour `now` (priorité la plus haute gagne ; à priorité égale, la première
 * déclarée l'emporte). Retourne `null` si aucune occasion n'est active ce jour.
 *
 * Pure: aucun effet de bord, déterministe pour une date donnée — appelable côté client après montage
 * (jamais pendant le SSR, cf. `useDoodle`).
 */
export function resolveDoodle(now: Date, doodles: Doodle[] = DOODLES): Doodle | null {
  let best: Doodle | null = null;
  for (const d of doodles) {
    if (!isDoodleActive(d, now)) continue;
    if (!best || d.priority > best.priority) best = d;
  }
  return best;
}