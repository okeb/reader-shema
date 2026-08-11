'use client';

import { cn } from '@/lib/utils';
import { parseOrigine } from '@/src/domain/services/origine-parser.service';

/**
 * Rend le champ `origine` (étymologie Strong) en prose dont les références Strong sont cliquables.
 * Atome présentationnel pur : délègue le parsing à `parseOrigine` et notifie le parent via
 * `onNavigate` au clic d'une référence (ex. « 07218 » → code « H7218 »).
 *
 * Cf. spec 29 — détail Strong.
 */
export function OrigineText({
  origine,
  lang,
  onNavigate,
}: {
  origine?: string | null;
  /** Langue d'origine du mot (détermine l'accent et infère le préfixe des refs zero-padded). */
  lang?: string;
  onNavigate?: (code: string) => void;
}) {
  if (!origine) return null;
  const segments = parseOrigine(origine, lang);
  if (segments.length === 0) return null;

  return (
    <span className="italic">
      {segments.map((seg, i) => {
        if (seg.kind === 'text') return <span key={i}>{seg.text}</span>;
        const hebrew = lang !== 'greek'; // hébreu par défaut (convention zero-padded)
        if (!onNavigate) {
          return (
            <span key={i} className={cn('font-semibold not-italic', hebrew ? 'text-primary' : 'text-purple-600 dark:text-purple-300')}>
              {seg.text}
            </span>
          );
        }
        return (
          <button
            key={i}
            type="button"
            onClick={() => onNavigate(seg.code!)}
            title={`Voir la fiche Strong ${seg.code}`}
            className={cn(
              'font-semibold not-italic underline-offset-2 transition-colors hover:underline',
              hebrew ? 'text-primary hover:text-primary/80' : 'text-purple-600 hover:text-purple-500 dark:text-purple-300',
            )}
          >
            {seg.text}
          </button>
        );
      })}
    </span>
  );
}

export default OrigineText;