import * as React from 'react';
import { cn } from '@/lib/utils';

/** Bloc placeholder animé (pulse). Porté verbatim de l'ancien `components/atoms/a-skeleton.tsx`. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export default Skeleton;