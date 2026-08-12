'use client';

import { cn } from '@/lib/utils';
import { parseOrigine } from '@/src/domain/services/origine-parser.service';

/**
 * Rend un champ `origine` ou `type` (étymologie / catégorie Strong) en prose dont les références
 * Strong sont cliquables. Atome présentationnel pur : délègue le parsing à `parseOrigine` (qui gère
 * le texte brut ET le HTML de l'API `<a href="Strong-Hebreu-4139.htm">04139</a>`) et notifie le
 * parent via `onNavigate` au clic d'une référence (ex. « 04139 » → code « H4139 »).
 *
 * L'accent coloré du lien se décide depuis le code canonique du segment (`H`/`G`), pas depuis la
 * langue du mot parent : une ref hébraïque peut apparaître dans la fiche d'un mot grec (ex. G4061
 * → H4139), et le code est alors la seule source de vérité fiable.
 *
 * Cf. spec 29 — détail Strong.
 */
export function OrigineText({
  origine,
  lang,
  onNavigate,
  className,
}: {
  origine?: string | null;
  /** Langue d'origine du mot (repli pour inférer le préfixe des refs zero-padded sans code). */
  lang?: string;
  onNavigate?: (code: string) => void;
  /** Classe du conteneur (défaut `italic` pour l'`origine` ; passer `not-italic` pour le `type`). */
  className?: string;
}) {
  if (!origine) return null;
  const segments = parseOrigine(origine, lang);
  if (segments.length === 0) return null;

  return (
    <span className={className ?? 'italic'}>
      {segments.map((seg, i) => {
        if (seg.kind === 'text') return <span key={i}>{seg.text}</span>;
        const hebrew = seg.code ? seg.code.startsWith('H') : lang !== 'greek';
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