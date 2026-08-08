'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ReferenceChips({
  items,
  activeId,
  onSelect,
}: {
  items: { id: string; reference: string }[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="no-scrollbar flex w-full space-x-2 overflow-x-auto px-3">
      {items.map((it) => {
        const isActive = activeId === it.id;
        return (
          <Button
            key={`chip-${it.id}`}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'm-1 h-8 flex-shrink-0 shadow-none transition-all duration-200',
              isActive && 'bg-primary text-primary-foreground',
            )}
            onClick={() => onSelect(it.id)}
          >
            {it.reference}
          </Button>
        );
      })}
    </div>
  );
}

export default ReferenceChips;