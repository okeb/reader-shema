import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/routing';

type Props = {
  params: Promise<{ locale: string }>;
};

/**
 * Racine localisée (`/fr`, `/en`) : redirige vers l'écran d'accueil (`/accueil` / `/home`).
 * La home accueille la Parole et propose de reprendre la lecture (spec 16). Le lecteur reste
 * accessible via `/read`. Cf. spec 04 — décision racine : `/` → `/accueil`.
 */
export default async function LocaleIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect({ href: '/accueil', locale });
}