import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { InfoPage } from '@/src/presentation/components/templates/t-info-page';
import { ProseSection } from '@/src/presentation/components/atoms/a-prose-section';
import { SITE } from '@/src/shared/constants/legal';

export const metadata: Metadata = {
  title: 'À propos — ShemaProject',
  description: 'Le lecteur de la Bible de Yéhoshoua ha Mashiah du projet ShemaProject.',
};

type Props = { params: Promise<{ locale: string }> };

export default async function AProposPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <InfoPage title="À propos">
      <ProseSection title="Le projet">
        <p>
          {SITE.shortName} est un lecteur en ligne de la Bible de Yéhoshoua ha Mashiah (BYM), pensé
          pour une lecture confortable et l&apos;étude : réglages typographiques, signets, notes et
          surlignages personnels, concordance Strong, et comparaison de versions.
        </p>
      </ProseSection>

      <ProseSection title="Respect de votre vie privée">
        <p>
          Tout fonctionne dans votre navigateur, sans compte ni serveur de données. Voir la page{' '}
          <Link href="/confidentialite" className="underline underline-offset-4 hover:text-primary">
            Confidentialité
          </Link>
          .
        </p>
      </ProseSection>

      <ProseSection title="En savoir plus">
        <p>
          Le projet ShemaProject :{' '}
          <a
            href={SITE.project}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-primary"
          >
            {SITE.project}
          </a>
        </p>
      </ProseSection>
    </InfoPage>
  );
}