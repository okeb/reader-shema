import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { parseReference } from '@/src/presentation/lib/parse-reference';
import { SearchPage } from '@/src/presentation/components/organisms/o-search-page';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Renvoie la première valeur d'un searchParam (tableau ou chaîne). */
function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export const metadata: Metadata = {
  title: 'Rechercher un verset — ShemaProject',
  description: 'Retrouvez un passage par sa référence : Mc 1:7, Jean 3:16, Genèse 3:12-20…',
};

/**
 * Page serveur de recherche par référence libre (spec 38). Route localisée `/search` (`/fr/search`,
 * `/en/search`), pilotée par le query param `p`.
 *
 * - Si `p` résout vers un livre + chapitre valides (`parseReference`), on redirige (307) vers
 *   l'URL canonique du lecteur `/read?livre=&chap=&v=` — le verset est surligné et atteint par
 *   défilement côté client.
 * - Sinon (référence partielle, livre inconnu, ou `p` absent), on rend la page de recherche
 *   `<SearchPage>` qui pré-remplit le champ avec `p` et propose des suggestions.
 *
 * Le format accepté est `<livre> <chapitre>[:<verset(s)>]` — `:` ou espace comme séparateur
 * chapitre/verset. Ex. `/fr/search?p=Mc+1:7`.
 */
export default async function SearchRoutePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const p = first(sp.p);

  if (p) {
    const parsed = parseReference(p);
    if (parsed) {
      const qs = new URLSearchParams({ livre: parsed.bookId, chap: String(parsed.chapter) });
      if (parsed.selection) qs.set('v', parsed.selection);
      // Redirection 307 vers l'URL canonique localisée du lecteur. On utilise le `redirect` natif
      // (`next/navigation`) plutôt que celui de next-intl car ce dernier type `href` comme union de
      // chemins sans query, ce qui rejette une URL avec search params dynamiques.
      redirect(`/${locale}/read?${qs.toString()}`);
    }
  }

  return <SearchPage initialQuery={p ?? ''} />;
}