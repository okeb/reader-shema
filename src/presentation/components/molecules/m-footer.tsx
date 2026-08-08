'use client';

import Image from 'next/image';
import { Icon } from '@iconify/react';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { APP_VERSION, INFO_LINKS, SITE } from '@/src/shared/constants/legal';
import { buildBugReportUrl } from '@/src/shared/constants/bug-report';

/**
 * Footer du site — affiché sur les pages non immersives (favoris, pages info, accueil).
 * Le lecteur plein écran utilise son propre footer intégré (`m-version-credits`).
 * Client car `buildBugReportUrl` lit `window.location` / `navigator.userAgent`.
 */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        'mt-16 border-t border-border/60 px-4 py-10 text-muted-foreground',
        className,
      )}
    >
      <div className="mx-auto flex max-w-[68ch] flex-col gap-2">
        <Image
          src="/logo/shema_reader-favicon_light_cube.svg"
          alt="ShemaProject"
          width={29}
          height={29}
          priority
        />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[12px] text-foreground/60">
          <nav aria-label="Liens informationnels" className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {INFO_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="underline-offset-4 transition-colors hover:text-primary hover:underline"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <a
            href={buildBugReportUrl()}
            className="underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            <span className="hidden md:inline-flex">Signaler un problème</span>
            <Icon className="h-4 w-4 md:hidden" icon="hugeicons:bug-02" />
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-foreground/40">
          <span>
            © {new Date().getFullYear()} {SITE.shortName}
          </span>
          <Link
            href="/nouveautes"
            className="rounded-md bg-foreground/5 px-2 py-0.5 text-[11px] text-foreground/50 transition-colors hover:bg-primary/10 hover:text-primary"
          >
            v{APP_VERSION}
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;