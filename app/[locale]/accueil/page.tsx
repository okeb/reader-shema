import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { HomeScreen } from '@/src/presentation/components/organisms/o-home';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata: Metadata = {
  title: 'Accueil — ShemaProject',
  description: 'La Parole du Seigneur Yehoshoua, tout simplement.',
};

/**
 * Page serveur de l'écran d'accueil (route localisée `/accueil` / `/home`). Délègue tout le rendu
 * au composant client `<HomeScreen>` — la home est interactive (raccourcis, doodle, stores
 * persistés). Cf. spec 16 — écran d'accueil.
 */
export default async function AccueilPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeScreen />;
}