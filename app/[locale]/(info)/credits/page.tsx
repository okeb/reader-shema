import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { InfoPage } from '@/src/presentation/components/templates/t-info-page';
import { ProseSection } from '@/src/presentation/components/atoms/a-prose-section';
import { BIBLE_VERSIONS } from '@/src/shared/constants/bible-versions';
import { CREDITS, CROSS_REFS_CREDIT } from '@/src/shared/constants/legal';

export const metadata: Metadata = {
  title: 'Crédits — ShemaProject',
  description: 'Crédits des versions bibliques, polices, icônes et hébergement.',
};

type Props = { params: Promise<{ locale: string }> };

export default async function CreditsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <InfoPage title="Crédits">
      <ProseSection title="Versions bibliques">
        <ul className="space-y-4">
          {BIBLE_VERSIONS.map((v) => (
            <li key={v.id}>
              <p className="font-medium">
                {v.label}
                {v.comingSoon && (
                  <span className="ml-2 align-middle text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                    à venir
                  </span>
                )}
              </p>
              <p className="text-foreground/70">{v.copyright}</p>
              <a
                href={v.source}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] underline underline-offset-4 hover:text-primary"
              >
                En savoir plus
              </a>
            </li>
          ))}
        </ul>
      </ProseSection>

      <ProseSection title="Polices & icônes">
        <p>{CREDITS.fonts}</p>
        <p>{CREDITS.icons}</p>
      </ProseSection>

      <ProseSection title="Renvois bibliques">
        <p>{CROSS_REFS_CREDIT.text}</p>
        <p className="text-[13px]">
          <a
            href={CROSS_REFS_CREDIT.source}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-primary"
          >
            openbible.info
          </a>
          {' · '}
          <a
            href={CROSS_REFS_CREDIT.license}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-primary"
          >
            Licence CC-BY 4.0
          </a>
        </p>
      </ProseSection>

      <ProseSection title="Hébergement">
        <p>{CREDITS.hosting}</p>
      </ProseSection>
    </InfoPage>
  );
}