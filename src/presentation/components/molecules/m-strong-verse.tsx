'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import type { StrongToken } from '@/src/domain/entities';
import { OrigineText } from '@/src/presentation/components/atoms/a-origine-text';

export interface StrongVerseView {
  /** Id logique du verset (ex. "jean:3:16"). */
  id: string;
  /** Référence affichée (ex. "Jean 3:16"). */
  reference: string;
  /** Tokens Strong reconstruisant le verset dans l'ordre. */
  tokens: StrongToken[];
}

/** Couleur de la bulle selon la langue d'origine. */
function bubbleColor(lang?: string) {
  if (lang === 'hebrew')
    return 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/30 dark:text-amber-300';
  return 'bg-purple-500/15 text-purple-700 hover:bg-purple-500/30 dark:text-purple-300'; // grec par défaut
}

/**
 * Rendu d'un verset tokenisé : chaque mot avec référence Strong est une bulle cliquable ;
 * au clic, la définition Strong apparaît sous le verset. Composant partagé entre le panneau
 * Strong (sélection) et le panneau des signets (maître-détail).
 */
export function StrongVerse({
  verse,
  onSeeOccurrences,
  onNavigateStrong,
  initialActiveStrong,
  showOriginal = false,
}: {
  verse: StrongVerseView;
  /** Ouvre la concordance du token (toutes les occurrences du même Strong). */
  onSeeOccurrences?: (token: StrongToken) => void;
  /** Navigue vers la fiche détail d'un code Strong (depuis une référence d'`origine`). Transmet
   *  le token source (verset + code Strong actif) pour mémoriser le contexte de reprise. */
  onNavigateStrong?: (targetCode: string, source: { verseId: string; strongCode?: string }) => void;
  /** Code Strong du token à activer au montage (reprise après retour d'une fiche /strong/[code]). */
  initialActiveStrong?: string;
  /** Affiche une paire interlinéaire [lemme/translittération, traduction] par token Strong. */
  showOriginal?: boolean;
}) {
  // Indice du token actif (dernier clic).
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const activeToken = activeIdx != null ? verse.tokens[activeIdx] : null;

  // Reprise : active le token dont le code Strong correspond à `initialActiveStrong` au montage
  // (one-shot) — restaure le mot sélectionné après un retour depuis une fiche Strong. Spec 29.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || !initialActiveStrong) return;
    restoredRef.current = true;
    const idx = verse.tokens.findIndex((t) => t.strong === initialActiveStrong);
    if (idx >= 0) setActiveIdx(idx);
  }, [initialActiveStrong, verse.tokens]);

  return (
    <section className="border-t border-input/50 px-4 py-7">
      <div className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-primary">
        {verse.reference}
      </div>

      {/* Verset tokenisé : les mots avec Strong sont des bulles cliquables. */}
      <div className={cn('font-reader text-[15px]', showOriginal ? 'flex flex-wrap items-end gap-y-1 leading-normal' : 'leading-loose')}>
        {verse.tokens.map((tok, i) => {
          const key = `${verse.id}-${i}`;
          if (!tok.strong) {
            return <span key={key}>{tok.text}</span>;
          }
          const isActive = activeIdx === i;
          const original = tok.lemma || tok.translit || tok.strong.replace(/^[HG]/, '');
          return showOriginal ? (
            <button
              key={key}
              type="button"
              onClick={() => setActiveIdx(i)}
              aria-label={`${tok.text.trim()} — ${original}`}
              title={`${tok.strong} — ${original}`}
              className="mx-0.5 my-0.5 inline-flex min-h-11 flex-col items-center justify-end rounded-xl transition-colors"
            >
              <span
                lang={tok.lang === 'hebrew' ? 'he' : tok.lang === 'greek' ? 'el' : undefined}
                dir={tok.lang === 'hebrew' ? 'rtl' : undefined}
                className={cn(
                  'rounded-md px-2 py-0.5 font-serif text-[12px] text-muted-foreground transition-colors',
                  isActive && tok.lang === 'hebrew' && 'bg-primary/10 font-semibold text-primary',
                  isActive && tok.lang !== 'hebrew' && 'bg-purple-500/10 font-semibold text-purple-500',
                )}
              >
                {original}
              </span>
              <span
                className={cn(
                  'rounded-2xl px-2 py-1 font-medium transition-all duration-400',
                  isActive && tok.lang === 'greek'
                    ? 'bg-purple-500 text-white'
                    : isActive && tok.lang === 'hebrew'
                      ? 'bg-primary text-white'
                      : bubbleColor(tok.lang),
                )}
              >
                {tok.text}
              </span>
            </button>
          ) : (
            <button
              key={key}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={cn(
                'mx-0.5 my-0.5 inline-block rounded-2xl px-2 font-medium transition-all duration-400',
                isActive && tok.lang === 'greek'
                  ? 'bg-purple-500 text-white'
                  : isActive && tok.lang === 'hebrew'
                    ? 'bg-primary text-white'
                    : bubbleColor(tok.lang),
              )}
              title={`${tok.strong} — ${tok.lemma ?? ''}`.trim()}
            >
              {tok.text}
            </button>
          );
        })}
      </div>

      {/* Définition Strong du mot actif — en dessous du verset. */}
      {activeToken && activeToken.strong && (
        <div className="mt-7 animate-slide-in-up rounded-[12px] bg-foreground/[2%] p-2 py-3 text-[13px] leading-relaxed">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <p className="flex w-full items-baseline justify-start">
              {activeToken.translit && (
                <span className="text-[20px] font-semibold tracking-tight text-foreground">
                  {activeToken.translit.split('').map((char, i) => (
                    <span key={i} className={cn(i === 0 ? 'uppercase' : '')}>
                      {char}
                    </span>
                  ))}
                </span>
              )}
              {activeToken.lang && (
                <span className="my-0 ml-1 text-[13px] italic text-muted-foreground">
                  ({activeToken.lang})
                </span>
              )}
            </p>
            <div className="-mt-3 mb-3 flex flex-wrap items-center gap-2 transition-all duration-500">
              {activeToken.lemma && (
                <span className="font-serif text-[20px] font-semibold text-foreground/80">
                  {activeToken.lemma}
                </span>
              )}
              <span
                className={cn(
                  'rounded px-1 py-0 text-[10px] font-bold',
                  activeToken.lang === 'hebrew'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-purple-500/15 text-purple-500',
                )}
              >
                {activeToken.strong.replace('H', '').replace('G', '')}
              </span>
              {activeToken.type && (
                <span className="rounded bg-foreground/5 px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <OrigineText
                    origine={activeToken.type}
                    lang={activeToken.lang}
                    className="not-italic"
                    onNavigate={(target) =>
                      onNavigateStrong?.(target, { verseId: verse.id, strongCode: activeToken.strong ?? undefined })
                    }
                  />
                </span>
              )}
              {activeToken.phonetique && (
                <p className="-mt-1.5 w-full font-mono text-[12px] text-muted-foreground">
                  {activeToken.phonetique}
                </p>
              )}
            </div>
          </div>

          {activeToken.definition && (
            <p className="animate-fade-in whitespace-pre-line text-foreground/85">
              {activeToken.definition}
            </p>
          )}

          {/* Origine étymologique — les références Strong qu'elle contient sont cliquables (spec 29). */}
          {activeToken.origine && (
            <p className="mt-2 text-[12px] italic leading-relaxed text-muted-foreground">
              <OrigineText
                origine={activeToken.origine}
                lang={activeToken.lang}
                onNavigate={(target) =>
                  onNavigateStrong?.(target, { verseId: verse.id, strongCode: activeToken.strong ?? undefined })
                }
              />
            </p>
          )}

          {/* Concordance : ouvre toutes les occurrences du même numéro Strong. */}
          {onSeeOccurrences && (
            <button
              type="button"
              onClick={() => onSeeOccurrences(activeToken)}
              className="mt-3 flex items-center gap-1.5 rounded-full bg-foreground/[4%] px-3 py-1.5 text-[12px] font-medium text-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <Icon icon="hugeicons:search-list-02" className="h-3.5 w-3.5" />
              Voir les occurrences
              <Icon icon="hugeicons:arrow-right-01" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default StrongVerse;
