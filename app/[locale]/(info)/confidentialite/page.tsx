import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { InfoPage } from '@/src/presentation/components/templates/t-info-page';
import { ProseSection } from '@/src/presentation/components/atoms/a-prose-section';
import { STORAGE_KEYS } from '@/src/shared/constants/legal';

export const metadata: Metadata = {
  title: 'Confidentialité — ShemaProject',
  description:
    "Aucune donnée personnelle n'est collectée. Tout est stocké localement dans votre navigateur.",
};

type Props = { params: Promise<{ locale: string }> };

export default async function ConfidentialitePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <InfoPage title="Confidentialité">
      <ProseSection title="Aucune collecte côté serveur">
        <p>
          {"ShemaProject ne crée pas de compte et n'envoie aucune donnée personnelle à un serveur. "}
          {"Le site fonctionne entièrement dans votre navigateur. Aucun traceur publicitaire ni outil "}
          {"de mesure d'audience n'est utilisé : c'est pourquoi aucun bandeau de consentement aux "}
          cookies n&apos;est nécessaire.
        </p>
      </ProseSection>

      <ProseSection title="Données stockées sur votre appareil">
        <p>
          Vos réglages et contenus personnels sont enregistrés dans le stockage local
          (<code>localStorage</code>) de votre navigateur, et n&apos;en sortent jamais :
        </p>
        <ul className="list-disc space-y-1 pl-5">
          {STORAGE_KEYS.map((s) => (
            <li key={s.key}>
              <span className="font-medium">{s.label}</span>{' '}
              <span className="text-foreground/50">({s.key})</span>
            </li>
          ))}
        </ul>
      </ProseSection>

      <ProseSection title="Effacer ou exporter vos données">
        <p>
          Vous gardez le contrôle total : vous pouvez exporter et réimporter vos données (favoris,
          signets, notes) au format JSON depuis la page{' '}
          <Link href="/favoris" className="underline underline-offset-4 hover:text-primary">
            Favoris
          </Link>
          . Pour tout effacer, videz les données du site dans les réglages de votre navigateur.
        </p>
      </ProseSection>
    </InfoPage>
  );
}