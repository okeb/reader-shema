import { Link } from '@/i18n/routing';
import { Logo } from '@/src/presentation/components/atoms/a-logo';
import { ThemeMenu } from '@/src/presentation/components/molecules/m-theme-menu';
import { SiteFooter } from '@/src/presentation/components/molecules/m-footer';

/**
 * Coquille applicative des pages non immersives : header (logo + menu thème) + main + footer.
 * Server component — les sous-composants client (`ThemeMenu`, `SiteFooter`) marquent leur propre
 * boundary `"use client"`. Remplacée/étendue quand la topbar du lecteur arrive (Phase 3).
 */
export function AppShell({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <Link href="/accueil" aria-label="ShemaProject" className="inline-flex h-8 items-center">
          <Logo className="h-7" />
        </Link>
        <ThemeMenu />
      </header>

      <main className="flex-1" lang={locale}>
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}

export default AppShell;