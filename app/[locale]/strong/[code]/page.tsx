import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getBibleRepository } from '@/src/infrastructure/di/container';
import { TStrongDetail } from '@/src/presentation/components/templates/t-strong-detail';

type Props = {
  params: Promise<{ locale: string; code: string }>;
};

/**
 * Code Strong accepté dans l'URL : forme préfixée (`H7218` / `G2316`) ou hébraïque zero-padded
 * (`0` + 1-5 chiffres, ex. `0433`, `07218`). Les nombres nus sans préfixe ni zero-padding
 * (ex. `7218`) et tout autre format → 404. Cf. spec 29 — détail Strong.
 */
const ROUTE_CODE = /^(H\d{1,5}|G\d{1,5}|0\d{1,5})$/;

/**
 * Canonicalise un code Strong d'URL : `07218` → `H7218`, `H07218` → `H7218`, `G2316` → `G2316`.
 * Retourne `null` si le format n'est pas reconnu (→ `notFound()`).
 */
function normalizeCode(raw: string): string | null {
  const s = raw.trim();
  if (!ROUTE_CODE.test(s)) return null;
  if (s[0] === '0') return `H${s.replace(/^0+(?=\d)/, '')}`; // zero-padded → hébreu
  const head = s[0]; // 'H' | 'G'
  return `${head}${s.slice(1).replace(/^0+(?=\d)/, '')}`;
}

/**
 * Page serveur de la fiche détail Strong (`/[locale]/strong/[code]`) : normalise le code (404 si
 * invalide), génère les métadonnées depuis le lexique concordance (un seul appel `/bym/strong/:code`)
 * et délègue le rendu au template client `<TStrongDetail>`. Cf. spec 29.
 */
export default async function StrongDetailPage({ params }: Props) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  const normalized = normalizeCode(code);
  if (!normalized) notFound();

  return <TStrongDetail code={normalized} />;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, code } = await params;
  const normalized = normalizeCode(code);
  if (!normalized) return { title: 'Strong introuvable' };

  let title = `Strong ${normalized}`;
  try {
    // Un seul appel concordance (page 1, taille 1) : seul le lexicon nous intéresse ici pour le
    // titre (translit/lemme). Le cache mémoire `concordanceCache` déduplique côté serveur.
    const data = await getBibleRepository().getStrongOccurrences(normalized, 1, 1);
    const lex = data?.lexicon;
    const head = lex?.translit || lex?.lemma;
    if (head) title = `${head} — Strong ${normalized}`;
  } catch {
    // API injoignable → titre de repli (la page gère l'état d'erreur côté client).
  }

  const description = `Fiche Strong ${normalized} — lemme, phonétique, type, origine et concordance des occurrences sur le lecteur ShemaProject.`;

  return {
    title,
    description,
    openGraph: {
      type: 'article',
      title,
      description,
      siteName: 'ShemaProject',
      locale: locale === 'en' ? 'en_US' : 'fr_FR',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}