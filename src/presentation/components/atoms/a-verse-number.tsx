import { cn } from '@/lib/utils';

/**
 * Numéro de verset en exposant, qui s'intègre dans le flux du texte (multi-colonnes friendly).
 * Porté verbatim de l'ancien `components/atoms/a-verse-number.tsx`.
 */
export function VerseNumber({ value, className }: { value: number; className?: string }) {
  return (
    <sup
      className={cn(
        'mr-0.5 select-none align-super font-reader text-[0.6em] font-bold text-primary/90',
        className,
      )}
    >
      {value}
    </sup>
  );
}

export default VerseNumber;