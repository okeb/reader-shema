/**
 * Utilitaires de regroupement par jour, partagés entre l'écran d'accueil (`o-home`) et un futur
 * panneau d'historique. Portés verbatim de l'ancien `lib/date-grouping.ts`.
 */

/** Début de journée (minuit local) pour le timestamp donné. */
export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const dayFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });

/** Libellé de jour relatif : « Aujourd'hui » / « Hier » / « 12 juin ». */
export function dayLabel(ms: number): string {
  const today = startOfDay(Date.now());
  const day = startOfDay(ms);
  const diffDays = Math.round((today - day) / 86_400_000);
  if (diffDays <= 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  return dayFormatter.format(ms);
}

/**
 * Regroupe une liste (déjà triée du plus récent au plus ancien) par jour, en préservant l'ordre.
 * L'élément doit exposer un timestamp `at` (ms).
 */
export function groupByDay<T extends { at: number }>(items: T[]): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const label = dayLabel(item.at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}