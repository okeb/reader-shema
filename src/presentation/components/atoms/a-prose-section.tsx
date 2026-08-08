import { cn } from '@/lib/utils';

/**
 * Section de contenu éditorial : un sous-titre (`h2`) suivi de son contenu. Brique de base des
 * pages informationnelles (mentions légales, confidentialité, à propos, crédits, nouveautés).
 *
 * Porté verbatim de l'ancien `components/atoms/a-prose-section.tsx`.
 */
export function ProseSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-2', className)}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-foreground/80">{children}</div>
    </section>
  );
}

export default ProseSection;