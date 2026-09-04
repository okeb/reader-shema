'use client';

import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import type { StrongLexicon } from '@/src/domain/entities';
import { OrigineText } from '@/src/presentation/components/atoms/a-origine-text';

/**
 * Carte lexique d'un code Strong : lemme (script d'origine), translittération, phonétique, langue,
 * type grammatical, origine (cliquable si `onNavigate` fourni) et définition. Tout provient du fetch
 * `/bym/strong/:code` (page détail auto-suffisante : un seul appel par code).
 *
 * Partagée entre le tiroir concordance (`m-strong-concordance`, sans `onNavigate` → origine brute)
 * et la page détail (`t-strong-detail`, avec `onNavigate` → refs cliquables). Cf. spec 29.
 */
export function StrongLexiconCard({
  lexicon,
  code,
  accent,
  onNavigate,
}: {
  lexicon: StrongLexicon;
  code: string;
  /** Classe d'accent (text-primary / text-purple-500) selon la langue. */
  accent: string;
  /** Si fourni, les références Strong de l'`origine` deviennent cliquables vers une fiche. */
  onNavigate?: (code: string) => void;
}) {
  const hebrew = lexicon.lang === 'hebrew';
  return (
    <section className="mb-5 rounded-[12px] bg-foreground/[2%] p-3 text-[13px] leading-relaxed">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {lexicon.lemma && (
          <span className={cn('font-serif text-[22px] font-semibold leading-none', accent)}>{lexicon.lemma}</span>
        )}
        {lexicon.translit && (
          <span className="text-[14px] font-semibold text-foreground/80">{lexicon.translit}</span>
        )}
        <span
          className={cn(
            'rounded px-1 py-0 text-[10px] font-bold',
            hebrew ? 'bg-primary/15 text-primary' : 'bg-purple-500/15 text-purple-500',
          )}
        >
          {code.replace('H', '').replace('G', '')}
        </span>
      </div>

      {lexicon.phonetique && (
        <p className="mb-2 font-mono text-[12px] text-muted-foreground">{lexicon.phonetique}</p>
      )}

      {lexicon.type && (
        <div className="mb-2 text-[12px] text-muted-foreground">
          <span className="font-semibold text-foreground/70">Type : </span>
          <OrigineText origine={lexicon.type} onNavigate={onNavigate} className="not-italic" />
        </div>
      )}

      {lexicon.definition && (
        <p className="whitespace-pre-line text-foreground/85">{lexicon.definition}</p>
      )}

      {lexicon.origine && (
        <div className="mt-2 text-[12px] text-muted-foreground">
          <span className="font-semibold text-foreground/70">Origine : </span>
          <OrigineText origine={lexicon.origine} lang={lexicon.lang} onNavigate={onNavigate} />
        </div>
      )}

      {lexicon.wikt?.meaning ? (
        <details className="group mt-3 border-t border-input/50 pt-2">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12px] font-semibold text-foreground/70 transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
            <Icon
              icon="hugeicons:arrow-right-01"
              className="h-3 w-3 transition-transform group-open:rotate-90"
            />
            Détail
          </summary>
          <p className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-muted-foreground">
            {lexicon.wikt.meaning}
          </p>
          <p className="mt-2 text-[10px] italic text-muted-foreground/70">
            Wiktionnaire, CC BY-SA 3.0.
          </p>
        </details>
      ) : lexicon.lsj?.meaning && (
        <details className="group mt-3 border-t border-input/50 pt-2">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12px] font-semibold text-foreground/70 transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
            <Icon
              icon="hugeicons:arrow-right-01"
              className="h-3 w-3 transition-transform group-open:rotate-90"
            />
            Détail (LSJ)
          </summary>
          <p className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-muted-foreground">
            {lexicon.lsj.meaning}
          </p>
          <p className="mt-2 text-[10px] italic text-muted-foreground/70">
            Liddell-Scott-Jones (STEPBible / Tyndale House Cambridge), CC BY 4.0 — texte anglais.
          </p>
        </details>
      )}
    </section>
  );
}

export default StrongLexiconCard;