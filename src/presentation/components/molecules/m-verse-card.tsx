'use client';

import { forwardRef, useState, type MouseEvent } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { VerseNumber } from '@/src/presentation/components/atoms/a-verse-number';
import { DEFAULT_FONT_SIZE } from '@/src/shared/constants/reader-preferences';
import type { BiblicalVerse } from '@/src/domain/entities';

interface VerseCardProps {
  verse: BiblicalVerse;
  isActive?: boolean;
  index?: number;
  /** Taille du texte de lecture en pixels. */
  fontSize?: number;
  /** Active la sélection au clic sur la carte (mode interactif). */
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

/**
 * Carte d'une référence (mode "références"), inspirée du modèle racine.
 *
 * Version Phase 3 : le cluster d'actions (favori/signet/Strong, Phase 4-5) n'est pas encore
 * branché — la carte expose la sélection + copie + lien vers le chapitre.
 * Porté de l'ancien `components/molecules/m-verse-card.tsx`.
 */
export const VerseCard = forwardRef<HTMLDivElement, VerseCardProps>(
  ({ verse, isActive, index = 0, fontSize = DEFAULT_FONT_SIZE, selectable = false, isSelected = false, onToggleSelect }, ref) => {
    const [cardCopied, setCardCopied] = useState(false);

    const copyCard = (e: MouseEvent) => {
      e.stopPropagation();
      const text = verse.verses.map((v) => `${v.number} ${v.text}`).join(' ') + ` — ${verse.reference}`;
      void navigator.clipboard.writeText(text);
      setCardCopied(true);
      setTimeout(() => setCardCopied(false), 2000);
    };

    const handleClick = () => {
      if (!selectable) return;
      // On ignore le clic si l'utilisateur est en train de sélectionner du texte.
      if (window.getSelection()?.toString()) return;
      onToggleSelect?.();
    };

    return (
      <div
        ref={ref}
        id={`verse-card-${verse.id}`}
        onClick={handleClick}
        className={cn(
          'group relative mx-auto max-w-[60ch] scroll-mt-24 animate-fade-in-up break-inside-avoid border-b border-dotted border-input/50 py-7 transition-colors duration-300 last:border-b-0',
          isActive && 'border-primary/20',
          selectable && 'cursor-pointer',
          isSelected && 'rounded-md bg-primary/5',
        )}
        style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'backwards' }}
      >
        <div className="flex items-center justify-between px-2">
          <span
            className={cn(
              'text-[12px] font-semibold uppercase tracking-wide transition-colors duration-300 group-hover:text-foreground',
              isActive ? 'text-primary group-hover:text-primary/90' : 'text-foreground/80',
            )}
          >
            {verse.reference}
          </span>

          <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:bg-primary/10 hover:text-primary"
              title="Copier le verset"
              onClick={copyCard}
            >
              <Icon
                icon={cardCopied ? 'hugeicons:checkmark-square-03' : 'hugeicons:copy-02'}
                className={cn('h-3 w-3', cardCopied && 'text-green-500')}
              />
            </Button>

            {verse.bookId && verse.chapter && (
              <Link
                href={{ pathname: '/read', query: { livre: verse.bookId, chap: String(verse.chapter) } }}
                title="Lire le chapitre"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <Icon icon="hugeicons:book-open-01" className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-[60ch] px-6 pt-5">
          <p
            style={{ fontSize: `${fontSize}px` }}
            className="select-text font-reader leading-loose text-black antialiased dark:text-white"
          >
            {verse.verses.map((v) => (
              <span key={v.number}>
                <VerseNumber value={v.number} /> {v.text}{' '}
              </span>
            ))}
          </p>
        </div>
      </div>
    );
  },
);
VerseCard.displayName = 'VerseCard';

export default VerseCard;