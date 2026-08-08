import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { InfoPage } from '@/src/presentation/components/templates/t-info-page';
import { ProseSection } from '@/src/presentation/components/atoms/a-prose-section';
import { EDITOR, HOST, SITE } from '@/src/shared/constants/legal';

export const metadata: Metadata = {
  title: 'Mentions légales — ShemaProject',
  description: 'Informations légales du site : éditeur et hébergeur.',
};

type Props = { params: Promise<{ locale: string }> };

export default async function MentionsLegalesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <InfoPage title="Mentions légales">
      <ProseSection title="Éditeur">
        <p>
          {EDITOR.name} — {EDITOR.role}.
        </p>
        <p>
          Contact :{' '}
          <a href={`mailto:${EDITOR.email}`} className="underline underline-offset-4 hover:text-primary">
            {EDITOR.email}
          </a>
        </p>
      </ProseSection>

      <ProseSection title="Hébergeur">
        <p>
          {HOST.name}
          <br />
          {HOST.address}
          <br />
          <a
            href={HOST.url}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-primary"
          >
            {HOST.url}
          </a>
        </p>
      </ProseSection>

      <ProseSection title="Propriété & contenu">
        <p>
          Les textes bibliques sont diffusés selon les licences de leurs versions respectives (voir la
          page{' '}
          <Link href="/credits" className="underline underline-offset-4 hover:text-primary">
            Crédits
          </Link>
          ). Le site {SITE.shortName} est un projet de diffusion libre et gratuite.
        </p>
      </ProseSection>
    </InfoPage>
  );
}