import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { InfoPage } from '@/src/presentation/components/templates/t-info-page';
import { ProseSection } from '@/src/presentation/components/atoms/a-prose-section';
import { STORAGE_KEYS, SYNC_HOSTING } from '@/src/shared/constants/legal';

export const metadata: Metadata = {
  title: 'Confidentialité — ShemaProject',
  description:
    "Aucune donnée personnelle n'est collectée. Par défaut tout est local ; un compte facultatif permet une synchronisation chiffrée bout-en-bout.",
};

type Props = { params: Promise<{ locale: string }> };

export default async function ConfidentialitePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <InfoPage title="Confidentialité">
      <ProseSection title="Par défaut, aucune collecte côté serveur">
        <p>
          {"Par défaut, ShemaProject ne crée pas de compte et n'envoie aucune donnée personnelle à un "}
          {"serveur. Le lecteur fonctionne entièrement dans votre navigateur. Aucun traceur publicitaire "}
          {"ni outil de mesure d'audience n'est utilisé : c'est pourquoi aucun bandeau de consentement "}
          {"aux cookies n'est nécessaire, et la lecture reste totalement anonyme — même si vous activez "}
          {"ensuite un compte (voir ci-dessous)."}
        </p>
      </ProseSection>

      <ProseSection title="Données stockées sur votre appareil">
        <p>
          Vos réglages et contenus personnels sont enregistrés dans le stockage local
          (<code>localStorage</code>) de votre navigateur. Sans compte, ils n&apos;en sortent
          jamais. Avec un compte (facultatif), les données marquées <em>(sync)</em> sont
          chiffrées bout-en-bout sur votre appareil puis synchronisées sous forme de blobs
          opaques (voir « Compte &amp; synchronisation ») :
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

      <ProseSection title="Compte & synchronisation (facultatif)">
        <p>
          La création d&apos;un compte est <strong>facultative</strong>. Le lecteur reste
          pleinement utilisable sans compte. Le compte ne sert qu&apos;à synchroniser vos
          favoris, signets, notes, surlignages, position de lecture et — si vous l&apos;activez
          explicitement — vos réglages de lecture entre vos appareils.
        </p>
        <p>
          <strong>Chiffrement bout-en-bout.</strong> Toutes les données synchronisées sont
          chiffrées sur votre appareil (AES-GCM 256) <em>avant</em> de quitter celui-ci. Le
          serveur ne stocke que des blobs opaques (texte chiffré + nonce) : il n&apos;a jamais
          accès à votre clé, ni au contenu en clair, ni à votre clé de récupération. Si vous
          ouvrez les requêtes réseau dans DevTools, vous ne verrez que du chiffré.
        </p>
        <p>
          <strong>Clé de récupération.</strong> Elle est générée localement et affichée{' '}
          <strong>une seule fois</strong> à la création du compte. Elle reste{' '}
          <strong>purement sur vos appareils</strong> : nous ne la stockons jamais. Elle est
          nécessaire pour déchiffrer vos données sur un nouvel appareil.{' '}
          <strong>Si vous la perdez, vos données synchronisées sont irrécupérables</strong> —
          nous ne pouvons pas les réinitialiser. Notez-la hors ligne, sans la perdre.
        </p>
        <p>
          <strong>Hébergement.</strong> Les blobs chiffrés sont stockés sur {SYNC_HOSTING.provider}{' '}
          ({SYNC_HOSTING.region}). Seul le texte chiffré transite et y est conservé ; aucun
          identifiant de navigation, aucune métrique, aucun comptage, aucun e-mail de relance.
        </p>
        <p>
          <strong>Lecture anonyme préservée.</strong> Le compte ne ferme jamais le lecteur :
          aucune authentification n&apos;est exigée pour lire, et les pages de lecture ne
          passent pas par le middleware d&apos;authentification.
        </p>
        <p>
          <strong>Vos droits : export et suppression.</strong> Vous pouvez exporter vos
          données à tout moment, et supprimer votre compte à tout moment — ce qui purge
          immédiatement tous les blobs cloud. La suppression est définitive et immédiate ;
          les données locales (sur l&apos;appareil) sont conservées.
        </p>
      </ProseSection>

      <ProseSection title="Effacer ou exporter vos données">
        <p>
          Vous gardez le contrôle total. Vous pouvez exporter et réimporter vos données
          (favoris, signets, notes) au format JSON depuis la page{' '}
          <Link href="/favoris" className="underline underline-offset-4 hover:text-primary">
            Favoris
          </Link>{' '}
          — ou, avec un compte, depuis « Vos données » dans les réglages de lecture.
        </p>
        <p>
          Pour tout effacer sans compte, videz les données du site dans les réglages de votre
          navigateur. Avec un compte, « Supprimer mon compte » purge les données cloud ;
          « Exporter mes données » télécharge une sauvegarde JSON locale indépendante.
        </p>
      </ProseSection>
    </InfoPage>
  );
}