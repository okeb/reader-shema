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
  /** Segments complets du texte source, conservés dans l'ordre grec/hébreu. */
  originalTokens?: StrongToken[];
}

/** Couleur de la bulle selon la langue d'origine. */
function bubbleColor(lang?: string) {
  if (lang === 'hebrew')
    return 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/30 dark:text-amber-300';
  return 'bg-purple-500/15 text-purple-700 hover:bg-purple-500/30 dark:text-purple-300'; // grec par défaut
}

/** Un code grammatical brut (V-AAI-2P, G5656…) ne doit jamais s'afficher tel quel. */
function isRawMorphCode(label: string) {
  return /^[HG]?\d+$/.test(label) || /^V-/.test(label);
}

function StrongDefinitionCard({
  token,
  verseId,
  onSeeOccurrences,
  onNavigateStrong,
}: {
  token: StrongToken;
  verseId: string;
  onSeeOccurrences?: (token: StrongToken) => void;
  onNavigateStrong?: (targetCode: string, source: { verseId: string; strongCode?: string }) => void;
}) {
  const strong = token.strong!;
  return (
    <div className="mt-7 animate-slide-in-up rounded-[12px] bg-foreground/[2%] p-2 py-3 text-[13px] leading-relaxed">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <p className="flex w-full items-baseline justify-start">
          {token.translit && (
            <span className="text-[20px] font-semibold tracking-tight text-foreground">
              {token.translit.split('').map((char, i) => (
                <span key={i} className={cn(i === 0 ? 'uppercase' : '')}>
                  {char}
                </span>
              ))}
            </span>
          )}
          {token.lang && (
            <span className="my-0 ml-1 text-[13px] italic text-muted-foreground">
              ({token.lang})
            </span>
          )}
        </p>
        <div className="-mt-3 mb-3 flex flex-wrap items-center gap-2 transition-all duration-500">
          {token.lemma && (
            <span className="font-serif text-[20px] font-semibold text-foreground/80">
              {token.lemma}
            </span>
          )}
          <span
            className={cn(
              'rounded px-1 py-0 text-[10px] font-bold',
              token.lang === 'hebrew'
                ? 'bg-primary/15 text-primary'
                : 'bg-purple-500/15 text-purple-500',
            )}
          >
            {strong.replace('H', '').replace('G', '')}
          </span>
          {token.type && (
            <span className="rounded bg-foreground/5 px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <OrigineText
                origine={token.type}
                lang={token.lang}
                className="not-italic"
                onNavigate={(target) =>
                  onNavigateStrong?.(target, { verseId, strongCode: strong ?? undefined })
                }
              />
            </span>
          )}
          {token.morph_fr && !isRawMorphCode(token.morph_fr) && (
            <span className="rounded bg-purple-500/10 px-1.5 py-0 text-[10px] font-medium text-purple-600 dark:text-purple-300">
              {token.morph_fr}
            </span>
          )}
          {token.phonetique && (
            <p className="-mt-1.5 w-full font-mono text-[12px] text-muted-foreground">
              {token.phonetique}
            </p>
          )}
        </div>
      </div>

      {token.definition && (
        <p className="animate-fade-in whitespace-pre-line text-foreground/85">
          {token.definition}
        </p>
      )}

      {token.origine && (
        <p className="mt-2 text-[12px] italic leading-relaxed text-muted-foreground">
          <OrigineText
            origine={token.origine}
            lang={token.lang}
            onNavigate={(target) =>
              onNavigateStrong?.(target, { verseId, strongCode: strong ?? undefined })
            }
          />
        </p>
      )}

      {onSeeOccurrences && (
        <button
          type="button"
          onClick={() => onSeeOccurrences(token)}
          className="mt-3 flex items-center gap-1.5 rounded-full bg-foreground/[4%] px-3 py-1.5 text-[12px] font-medium text-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Icon icon="hugeicons:search-list-02" className="h-3.5 w-3.5" />
          Voir les occurrences
          <Icon icon="hugeicons:arrow-right-01" className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
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
  const [activeOriginalIdx, setActiveOriginalIdx] = useState<number | null>(null);
  const [activeUnmatchedIdx, setActiveUnmatchedIdx] = useState<number | null>(null);
  const activeToken = activeIdx != null ? verse.tokens[activeIdx] : null;
  const activeUnmatched = activeUnmatchedIdx != null ? verse.originalTokens?.[activeUnmatchedIdx] : null;

  const findOriginalIndex = (translatedIndex: number) => {
    const strong = verse.tokens[translatedIndex]?.strong;
    if (!strong) return -1;
    const occurrence = verse.tokens
      .slice(0, translatedIndex)
      .filter((token) => token.strong === strong).length;
    return (verse.originalTokens ?? []).reduce(
      (match, token, index) => {
        if (match.found >= 0 || token.strong !== strong) return match;
        return match.seen === occurrence
          ? { seen: match.seen, found: index }
          : { seen: match.seen + 1, found: -1 };
      },
      { seen: 0, found: -1 },
    ).found;
  };

  const findTranslatedIndex = (originalIndex: number) => {
    const strong = verse.originalTokens?.[originalIndex]?.strong;
    if (!strong) return -1;
    const occurrence = (verse.originalTokens ?? [])
      .slice(0, originalIndex)
      .filter((token) => token.strong === strong).length;
    return verse.tokens.reduce(
      (match, token, index) => {
        if (match.found >= 0 || token.strong !== strong) return match;
        return match.seen === occurrence
          ? { seen: match.seen, found: index }
          : { seen: match.seen + 1, found: -1 };
      },
      { seen: 0, found: -1 },
    ).found;
  };

  const activateTranslation = (index: number) => {
    setActiveIdx(index);
    const originalIndex = findOriginalIndex(index);
    setActiveOriginalIdx(originalIndex >= 0 ? originalIndex : null);
    setActiveUnmatchedIdx(null);
  };

  const activateOriginal = (originalIndex: number, translatedIndex: number) => {
    setActiveOriginalIdx(originalIndex);
    setActiveIdx(translatedIndex);
    setActiveUnmatchedIdx(null);
  };

  const activateUnmatched = (originalIndex: number) => {
    setActiveUnmatchedIdx(originalIndex);
    setActiveIdx(null);
    setActiveOriginalIdx(null);
  };

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

      {showOriginal && verse.originalTokens === undefined && (
        <p className="mb-3 text-[12px] text-muted-foreground animate-pulse">
          Chargement du texte original…
        </p>
      )}

      {showOriginal && verse.originalTokens?.length === 0 && (
        <p className="mb-3 text-[12px] text-muted-foreground">
          Texte original indisponible pour ce verset.
        </p>
      )}

      {showOriginal && verse.originalTokens && verse.originalTokens.length > 0 && (
        <div
          className="mb-3 flex flex-wrap items-baseline gap-x-1 gap-y-1 font-serif text-[16px] leading-relaxed"
          dir={verse.originalTokens.some((token) => token.lang === 'hebrew') ? 'rtl' : 'ltr'}
          aria-label="Texte original complet"
        >
          {verse.originalTokens.map((token, originalIndex) => {
            const text = typeof token.text === 'string' ? token.text.trim() : '';
            if (!text) return null;
            const translatedIndex = findTranslatedIndex(originalIndex);
            const matched = translatedIndex >= 0;
            const active = activeOriginalIdx === originalIndex;
            if (!matched) {
              const isUnmatchedActive = activeUnmatchedIdx === originalIndex;
              return (
                <button
                  key={`${verse.id}-original-${originalIndex}`}
                  type="button"
                  onClick={() => activateUnmatched(originalIndex)}
                  className={cn(
                    'rounded px-1 py-0.5 transition-colors italic',
                    isUnmatchedActive
                      ? 'bg-foreground/10 font-semibold text-foreground'
                      : 'text-muted-foreground/55 hover:bg-foreground/5 hover:text-muted-foreground',
                  )}
                  title={token.strong ? `${token.strong} — ${token.translit ?? token.lemma ?? text}` : `${text} — aucune correspondance`}
                >
                  {text}
                </button>
              );
            }
            return (
              <button
                key={`${verse.id}-original-${originalIndex}`}
                type="button"
                onClick={() => activateOriginal(originalIndex, translatedIndex)}
                className={cn(
                  'rounded px-1 py-0.5 transition-colors',
                  active && token.lang === 'hebrew'
                    ? 'bg-primary/15 font-semibold text-primary'
                    : active
                      ? 'bg-purple-500/15 font-semibold text-purple-500'
                      : 'text-foreground/80 hover:bg-foreground/5',
                )}
                title={`${token.strong} — ${token.translit ?? token.lemma ?? text}`}
              >
                {text}
              </button>
            );
          })}
        </div>
      )}

      {/* Traduction tokenisée : les mots avec Strong sont des bulles cliquables. */}
      <div className="font-reader text-[15px] leading-loose">
        {verse.tokens.map((tok, i) => {
          const key = `${verse.id}-${i}`;
          const tokenText = typeof tok.text === 'string' ? tok.text : '';
          const strong = typeof tok.strong === 'string' && /^[HG]\d{1,5}$/.test(tok.strong)
            ? tok.strong
            : null;
          if (!strong) return <span key={key}>{tokenText}</span>;
          const isActive = activeIdx === i;
          const lemma = typeof tok.lemma === 'string' ? tok.lemma : '';
          const translit = typeof tok.translit === 'string' ? tok.translit : '';
          return (
            <button
              key={key}
              type="button"
              onClick={() => activateTranslation(i)}
              className={cn(
                'mx-0.5 my-0.5 inline-block rounded-2xl px-2 font-medium transition-all duration-400',
                isActive && tok.lang === 'greek'
                  ? 'bg-purple-500 text-white'
                  : isActive && tok.lang === 'hebrew'
                    ? 'bg-primary text-white'
                    : bubbleColor(tok.lang),
              )}
              title={`${strong} — ${lemma}`.trim()}
            >
              {tokenText}
            </button>
          );
        })}
      </div>

      {/* Définition Strong du mot actif — en dessous du verset. */}
      {(activeToken && activeToken.strong) && (
        <StrongDefinitionCard
          token={activeToken}
          verseId={verse.id}
          onSeeOccurrences={onSeeOccurrences}
          onNavigateStrong={onNavigateStrong}
        />
      )}

      {/* Définition Strong d'un mot original sans correspondance dans la traduction. */}
      {activeUnmatched && activeUnmatched.strong && (
        <div className="mt-7 animate-slide-in-up rounded-[12px] bg-foreground/[2%] p-2 py-3 text-[13px] leading-relaxed">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-foreground/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Texte original — sans correspondance
            </span>
          </div>
          <StrongDefinitionCard
            token={activeUnmatched}
            verseId={verse.id}
            onSeeOccurrences={onSeeOccurrences}
            onNavigateStrong={onNavigateStrong}
          />
        </div>
      )}
    </section>
  );
}

export default StrongVerse;
