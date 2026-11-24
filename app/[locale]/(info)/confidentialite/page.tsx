import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { InfoPage } from '@/src/presentation/components/templates/t-info-page';
import { ProseSection } from '@/src/presentation/components/atoms/a-prose-section';
import { STORAGE_KEYS, SYNC_HOSTING, EMAIL_PROVIDER } from '@/src/shared/constants/legal';

export const metadata: Metadata = {
  title: 'Confidentialité — ShemaProject',
  description:
    "Aucune donnée personnelle n'est collectée. Par défaut tout est local ; un compte facultatif permet de synchroniser vos données entre vos appareils.",
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
          également enregistrées sur notre serveur, associées à votre compte (voir « Compte
          &amp; synchronisation ») :
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
          <strong>Où sont vos données.</strong> Dès que vous êtes connecté, les données
          synchronisées sont enregistrées sur notre serveur, associées à votre compte : seul
          votre compte connecté y accède. Elles sont chiffrées pendant le transfert (HTTPS) et
          stockées chez {SYNC_HOSTING.provider} ({SYNC_HOSTING.region}), qui les chiffre sur ses
          disques. {SYNC_HOSTING.adequacy} Aucun identifiant de navigation, aucune métrique,
          aucun comptage, aucun e-mail de relance.
        </p>
        <p>
          <strong>Pas de chiffrement de bout en bout.</strong> Ces données (favoris, signets,
          surlignages, notes, position de lecture) ne sont pas chiffrées de bout en bout :
          l&apos;équipe technique pourrait techniquement y accéder. Nous nous engageons à ne pas
          les consulter, sauf à votre demande (support) ou sur obligation légale. En contrepartie,
          vous ne pouvez plus les perdre : aucune clé à conserver, et un mot de passe oublié se
          réinitialise par e-mail sans perte de données.
        </p>
        <p>
          <strong>Anciennes données chiffrées.</strong> Jusqu&apos;en novembre 2026, la
          synchronisation était chiffrée de bout en bout. Une copie chiffrée de ces données est
          conservée, le temps qu&apos;elles soient transférées automatiquement (ou à votre demande
          depuis la page Compte), et au plus tard jusqu&apos;au 1ᵉʳ juin 2027, date à laquelle
          elle est effacée.
        </p>
        <p>
          <strong>Authentification auto-hébergée.</strong> La gestion du compte (identifiants,
          sessions, vérification e-mail) repose sur Better Auth, exécuté sur nos propres serveurs :
          les tables d&apos;authentification vivent dans la même base {SYNC_HOSTING.provider} que
          vos données synchronisées. Aucun service d&apos;authentification managé tiers ne traite vos
          identifiants.
        </p>
        <p>
          <strong>E-mails transactionnels.</strong> Les messages du compte (vérification de
          l&apos;adresse e-mail, réinitialisation du mot de passe, bienvenue) sont envoyés via{' '}
          {EMAIL_PROVIDER.provider}. {EMAIL_PROVIDER.scope}{' '}
          Aucune donnée de lecture, aucun favori, aucune note ne transite par ce canal.
        </p>
        <p>
          <strong>Lecture anonyme préservée.</strong> Le compte ne ferme jamais le lecteur :
          aucune authentification n&apos;est exigée pour lire, et les pages de lecture ne
          passent pas par le middleware d&apos;authentification.
        </p>
        <p>
          <strong>Avatar.</strong> Une fois connecté, l&apos;avatar affiché en haut à droite est
          généré à la demande par notre service d&apos;avatars à partir de votre identifiant de
          compte interne (<strong>jamais depuis votre adresse e-mail</strong>). Cet
          identifiant, opaque et non personnel, transite vers ce service pour produire
          l&apos;image ; il n&apos;est pas stocké — l&apos;avatar est déterministe (ne dépend que de
          cet identifiant et de l&apos;harmonie de couleurs choisie), régénéré à chaque affichage et
          mis en cache côté CDN. Le choix de l&apos;harmonie est une préférence cosmétique,
          synchronisée avec vos réglages si l&apos;opt-in est actif.
        </p>
        <p>
          <strong>Vos droits : export et suppression.</strong> Vous pouvez exporter vos
          données à tout moment, et supprimer votre compte à tout moment — ce qui efface
          immédiatement toutes vos données synchronisées, copie chiffrée comprise. La
          suppression est définitive ; les données locales (sur l&apos;appareil) sont
          conservées.
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