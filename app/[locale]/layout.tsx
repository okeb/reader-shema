import type { Metadata } from 'next';
import {
  Inter,
  Noto_Serif,
  Lora,
  Atkinson_Hyperlegible,
  DM_Sans,
  Merriweather,
  Germania_One,
  Bebas_Neue,
  Lilita_One,
} from 'next/font/google';
import { setRequestLocale, getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';

import { routing } from '@/i18n/routing';
import { ThemeProvider } from '@/src/presentation/providers/theme-provider';
import { QueryProvider } from '@/src/presentation/providers/query-client-provider';
import { StoreHydrationProvider } from '@/src/presentation/providers/store-hydration-provider';
import { CommandPalette } from '@/src/presentation/components/organisms/o-command-palette';
import { ACCENT_INIT_SCRIPT } from '@/src/shared/constants/reader-preferences';

import '@/app/styles/base/globals.scss';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const notoSerif = Noto_Serif({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-noto-serif', display: 'swap' });
const lora = Lora({ subsets: ['latin'], variable: '--font-lora', display: 'swap' });
const atkinson = Atkinson_Hyperlegible({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-atkinson', display: 'swap' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const merriweather = Merriweather({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-merriweather', display: 'swap' });
// Polices d'affichage (poids unique 400) réservées au titre du livre (cf. --font-book).
const germaniaOne = Germania_One({ subsets: ['latin'], weight: '400', variable: '--font-germania-one', display: 'swap' });
const bebasNeue = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-bebas-neue', display: 'swap' });
const lilitaOne = Lilita_One({ subsets: ['latin'], weight: '400', variable: '--font-lilita-one', display: 'swap' });

const fontVariables = [
  inter.variable,
  notoSerif.variable,
  lora.variable,
  atkinson.variable,
  dmSans.variable,
  merriweather.variable,
  germaniaOne.variable,
  bebasNeue.variable,
  lilitaOne.variable,
].join(' ');

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL('https://reader.shemaproject.org'),
    title: 'ShemaProject — Lecture de la Bible',
    description: 'Lecteur de la Bible de Yéhoshoua Ha Mashiah',
    // Favicon thématique basculé par prefers-color-scheme (cf. ancien app/layout.tsx).
    icons: {
      icon: [
        { url: '/logo/shema_reader-icon_light.svg', media: '(prefers-color-scheme: light)' },
        { url: '/logo/shema_reader-icon_dark.svg', media: '(prefers-color-scheme: dark)' },
      ],
    },
    openGraph: { locale: locale === 'en' ? 'en_US' : 'fr_FR' },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <body style={{ fontFamily: 'var(--font-inter)' }}>
        {/* Applique l'accent + sépia + reduce-motion avant le premier paint (évite le flash). */}
        <script dangerouslySetInnerHTML={{ __html: ACCENT_INIT_SCRIPT }} />
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <QueryProvider>
              <StoreHydrationProvider>
                {children}
                {/* Palette de recherche globale (⌘/Ctrl + K) — montée en permanence, présente sur
                    toutes les pages (lecteur, accueil, favoris). Cf. spec 19. */}
                <CommandPalette />
              </StoreHydrationProvider>
            </QueryProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}