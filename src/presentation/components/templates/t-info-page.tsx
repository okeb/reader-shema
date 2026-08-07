import { Link } from '@/i18n/routing';
import { SiteFooter } from '@/src/presentation/components/molecules/m-footer';

/**
 * Gabarit des pages informationnelles : lien « retour » discret, colonne de lecture confortable
 * (titre `h1` + contenu en prose), puis footer du site. Les pages se contentent de fournir un
 * `title` et leurs `ProseSection`.
 *
 * Porté de l'ancien `components/templates/t-info-page.tsx`. `Link` vient de `@/i18n/routing`
 * (localisé) — « Retour à la lecture » mène vers `/read` dans la locale courante.
 */
export function InfoPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-[68ch] px-4 pt-10">
        <Link
          href="/read"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Retour à la lecture
        </Link>
      </header>
      <main className="mx-auto max-w-[68ch] px-4 py-10">
        <article className="space-y-8">
          <h1 className="font-serif text-3xl font-bold tracking-tight">{title}</h1>
          {children}
        </article>
      </main>
      <SiteFooter className="mx-auto max-w-[68ch]" />
    </div>
  );
}

export default InfoPage;