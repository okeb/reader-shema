import Image from 'next/image';
import { Icon } from '@iconify/react';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import type { BibleVersion } from '@/src/shared/constants/bible-versions';
import { APP_VERSION, INFO_LINKS } from '@/src/shared/constants/legal';
import { buildBugReportUrl } from '@/src/shared/constants/bug-report';

export interface VersionCreditsProps {
  /** Une ou plusieurs versions (vue parallèle = deux blocs empilés). */
  versions: BibleVersion[];
  className?: string;
}

/**
 * Bloc d'attribution / crédits, affiché à la fin du texte de lecture. Un bloc par version
 * (la vue parallèle en affiche deux). Texte discret, aligné sur la colonne de lecture.
 * Suivi d'un footer de liens + version + signalement, en disposition justifiée.
 * Porté de l'ancien `components/molecules/m-version-credits.tsx`.
 */
export function VersionCredits({ versions, className }: VersionCreditsProps) {
  return (
    <div className={cn('mt-24 space-y-8 pt-6 pb-7 text-left text-foreground', className)}>
      {versions.map((version) => (
        <div key={version.id} className="mb-20">
          <p className="text-[12px] font-semibold uppercase tracking-widest text-foreground/70">
            {version.creditsLabel}
          </p>
          <p className="mt-3 max-w-[52ch] text-[12px] leading-relaxed">{version.copyright}</p>
          <a
            href={version.source}
            target="_blank"
            rel="noreferrer"
            className="mt-0 inline-block text-[12px] underline underline-offset-4 transition-colors hover:text-primary"
          >
            En savoir plus sur {version.label}
          </a>
        </div>
      ))}

      {/* Footer de fin de lecture : liens info (gauche), signalement (droite), © + version. */}
      <div className="border-t border-border/20 pt-6">
        <div className="flex flex-col gap-2">
          <Image
            src="/logo/shema_reader-favicon_light_cube.svg"
            alt="ShemaProject"
            width={31}
            height={31}
            priority
            className=""
          />
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[12px] text-foreground/50">
            <nav aria-label="Liens informationnels" className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {INFO_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href as Parameters<typeof Link>[0]['href']}
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
            <span>© {new Date().getFullYear()} ShemaProject</span>
            <Link
              href="/nouveautes"
              className="rounded-md bg-foreground/5 px-2 py-0.5 text-[11px] text-foreground/50 transition-colors hover:bg-primary/10 hover:text-primary"
            >
              v{APP_VERSION}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VersionCredits;