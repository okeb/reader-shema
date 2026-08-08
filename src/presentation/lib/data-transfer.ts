'use client';

import { z } from 'zod';

/**
 * Export / import des données personnelles (100 % local) : favoris, signets (groupes + items) et
 * annotations (surlignages + notes). Permet une sauvegarde JSON et sa restauration — garde-fou
 * contre la perte de données en cas d'effacement du navigateur (cf. spec 10 §8).
 *
 * Porté de l'ancien `lib/data-transfer.ts` : touche directement les clés `localStorage` (les mêmes
 * que les stores Zustand, cf. `src/presentation/stores/*.store.ts`). La validation d'import passe par
 * un schéma zod (rebuild « plus correctement ») : on rejette les sauvegardes malformées avant
 * d'écrire dans le `localStorage`, avec un message explicite. Les stores filtrent eux-mêmes les
 * items invalides à la réhydratation (`isValid` dans `onRehydrateStorage`) — double défense.
 *
 * Scope : uniquement les **stores de contenu** (favoris, signets, surlignages, notes). Les réglages
 * de lecture, position, version, historique et flags « déjà vu » (quiz/doodle) sont volontairement
 * exclus — ce sont des préférences/état éphémère, pas du contenu à ne pas perdre.
 */

/** Clés `localStorage` incluses dans une sauvegarde, regroupées sous une étiquette stable. */
const KEYS = {
  favorites: 'bymFavorites',
  bookmarkGroups: 'bymBookmarkGroups',
  bookmarks: 'bymBookmarks',
  highlights: 'bymHighlights',
  notes: 'bymNotes',
} as const;

type DataKey = keyof typeof KEYS;

const BACKUP_APP = 'shema-reader';
const BACKUP_VERSION = 1;

// --- Schéma zod de la sauvegarde -----------------------------------------------------------

// Items de liste : objets opaques (les stores valident chaque item à la réhydratation). On valide
// seulement la forme top-level (tableau d'objets) pour rejeter les structures manifestement erronées
// tout en restant tolérant aux évolutions des entités (champs additionnels autorisés via passthrough).
const listItem = z.object({}).passthrough();
const favoritesSchema = z.array(listItem);
const bookmarkGroupsSchema = z.array(listItem);
const bookmarksSchema = z.array(listItem);

// Maps (surlignages/notes) : enregistrement `id → valeur`. On valide seulement que c'est un objet
// (les stores valident chaque entrée à la réhydratation).
const highlightsSchema = z.record(z.string(), z.unknown());
const notesSchema = z.record(z.string(), z.unknown());

const dataSchema = z
  .object({
    favorites: favoritesSchema.optional(),
    bookmarkGroups: bookmarkGroupsSchema.optional(),
    bookmarks: bookmarksSchema.optional(),
    highlights: highlightsSchema.optional(),
    notes: notesSchema.optional(),
  })
  .passthrough(); // tolère des clés futures / inconnues dans `data`

const backupSchema = z.object({
  app: z.literal(BACKUP_APP),
  type: z.literal('backup'),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.number(),
  data: dataSchema,
});

/** Enveloppe de sauvegarde, versionnée pour les évolutions futures du format. */
export interface Backup {
  app: 'shema-reader';
  type: 'backup';
  version: 1;
  exportedAt: number;
  data: Partial<Record<DataKey, unknown>>;
}

/** Lit une clé `localStorage` et la parse en JSON (null si absente/illisible). */
function readKey(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Construit l'objet de sauvegarde à partir de l'état courant du `localStorage`. */
export function buildBackup(): Backup {
  const data: Partial<Record<DataKey, unknown>> = {};
  for (const [label, key] of Object.entries(KEYS) as [DataKey, string][]) {
    const value = readKey(key);
    if (value != null) data[label] = value;
  }
  return { app: BACKUP_APP, type: 'backup', version: BACKUP_VERSION, exportedAt: Date.now(), data };
}

/** Nom de fichier horodaté, ex. `shema-sauvegarde-2026-06-26.json`. */
export function backupFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `shema-sauvegarde-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

/** Déclenche le téléchargement de la sauvegarde au format JSON. */
export function downloadBackup(): void {
  const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFilename();
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Vrai si l'objet a la forme d'une sauvegarde valide de l'application (validation zod). */
export function isBackup(x: unknown): x is Backup {
  return backupSchema.safeParse(x).success;
}

/** Parse + valide (zod) un texte JSON de sauvegarde. Lève une erreur explicite si invalide. */
export function parseBackup(text: string): Backup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Fichier illisible : JSON invalide.');
  }
  const result = backupSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("Ce fichier n'est pas une sauvegarde Shema valide.");
  }
  return result.data as Backup;
}

/** Mode de restauration : compléter l'existant, ou tout remplacer. */
export type ImportMode = 'merge' | 'replace';

/** Union de deux tableaux d'objets par `id` ; en cas de conflit, l'existant l'emporte. */
function mergeById(existing: unknown, incoming: unknown): unknown[] {
  const a = Array.isArray(existing) ? existing : [];
  const b = Array.isArray(incoming) ? incoming : [];
  const seen = new Set(a.map((x) => (x as { id?: string })?.id).filter(Boolean));
  const out = [...a];
  for (const item of b) {
    const id = (item as { id?: string })?.id;
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    out.push(item);
  }
  return out;
}

/** Compte total d'éléments d'une sauvegarde (pour le retour utilisateur). */
export function countBackup(b: Backup): number {
  let n = 0;
  for (const v of Object.values(b.data)) {
    if (Array.isArray(v)) n += v.length;
    else if (v && typeof v === 'object') n += Object.keys(v).length;
  }
  return n;
}

/**
 * Applique une sauvegarde au `localStorage`. En mode « merge », complète l'existant (les données
 * locales l'emportent en cas de conflit) ; en mode « replace », écrase les clés présentes dans la
 * sauvegarde. Le rechargement de la page (à la charge de l'appelant) réhydrate les hooks.
 */
export function applyBackup(backup: Backup, mode: ImportMode): void {
  for (const [label, key] of Object.entries(KEYS) as [DataKey, string][]) {
    const incoming = backup.data[label];
    if (incoming == null) continue;

    let next: unknown = incoming;
    if (mode === 'merge') {
      const existing = readKey(key);
      if (Array.isArray(incoming)) {
        next = mergeById(existing, incoming);
      } else if (incoming && typeof incoming === 'object') {
        // Maps (highlights/notes) : l'existant l'emporte sur les clés en conflit.
        next = { ...(incoming as object), ...((existing as object) ?? {}) };
      }
    }

    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* stockage indisponible — on ignore cette clé */
    }
  }
}