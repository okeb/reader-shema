import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getBookById } from '@/src/shared/constants/bible-books';
import { getVersion, isSelectableId } from '@/src/shared/constants/bible-versions';
import { resolveRead, type ReadSearchParams } from '@/src/domain/services/reference-formatter.service';
import { TReader } from '@/src/presentation/components/templates/t-reader';
import type { ReaderMode } from '@/src/presentation/lib/reader-helpers';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Renvoie la première valeur d'un searchParam (tableau ou chaîne). */
function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Page serveur du lecteur. Parse les searchParams (`livre`, `chap`, `refs`, `v`, `version`,
 * `signets`) et passe le résultat au template client `<TReader>`. La présence de `refs` déclenche
 * le mode "références" (cartes) ; sinon mode "lecture" (chapitre continu).
 *
 * Cf. spec 04 — URL & partage, spec 14 — version non persistée via `?version=`.
 */
export default async function ReadPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;

  const livre = first(sp.livre);
  const refsRaw = first(sp.refs);
  const refsList = refsRaw ? refsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const mode: ReaderMode = refsList.length > 0 ? 'refs' : 'read';

  const resolvedBookId = livre && getBookById(livre) ? livre : 'jean';
  const book = getBookById(resolvedBookId)!;

  const chapRaw = first(sp.chap);
  let chapter = chapRaw ? Number.parseInt(chapRaw, 10) : 1;
  if (!Number.isFinite(chapter) || chapter < 1) chapter = 1;
  if (chapter > book.chapters) chapter = book.chapters;

  const v = first(sp.v);
  const signets = first(sp.signets);
  const version = first(sp.version);

  const explicitTarget = Boolean(livre || chapRaw || refsRaw || v);
  const initialVersionId = version && isSelectableId(version) ? version : undefined;
  const openBookmarksOnMount = signets === '1';

  return (
    <TReader
      mode={mode}
      bookId={resolvedBookId}
      chapter={chapter}
      refs={refsList}
      highlight={v}
      explicitTarget={explicitTarget}
      initialVersionId={initialVersionId}
      openBookmarksOnMount={openBookmarksOnMount}
    />
  );
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;

  // Résolution partagée avec la route OG (`/api/og`) : titre = référence du passage, sans réseau.
  const resolved = resolveRead({
    livre: first(sp.livre),
    chap: first(sp.chap),
    refs: first(sp.refs),
    v: first(sp.v),
    version: first(sp.version),
  });
  const { title } = resolved;
  const versionLabel = getVersion(resolved.version).shortLabel;

  // URL d'image : on relaie les mêmes params de lecture (résolus côté route OG) + la version. Le
  // thème de la vignette vient du client hint ou du défaut clair côté route (spec 14 §5.5). `theme`
  // n'est pas rebroadcasté ici (la page serveur ne connaît pas le thème du destinataire).
  const qs = new URLSearchParams();
  for (const key of ['livre', 'chap', 'refs', 'v', 'version'] as const) {
    const value = first(sp[key]);
    if (value) qs.set(key, value);
  }
  const ogImage = `/api/og${qs.toString() ? `?${qs}` : ''}`;
  const pageTitle = `${title} — ${getVersion(resolved.version).label}`;
  const description = `Lire ${title} (${versionLabel}) sur le lecteur ShemaProject.`;

  return {
    title: pageTitle,
    description,
    openGraph: {
      type: 'article',
      title: pageTitle,
      description,
      siteName: 'ShemaProject',
      locale: locale === 'en' ? 'en_US' : 'fr_FR',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: [ogImage],
    },
  };
}