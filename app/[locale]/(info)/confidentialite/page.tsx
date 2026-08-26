import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { InfoPage } from '@/src/presentation/components/templates/t-info-page';
import { ProseSection } from '@/src/presentation/components/atoms/a-prose-section';
import { STORAGE_KEYS, SYNC_HOSTING, EMAIL_PROVIDER } from '@/src/shared/constants/legal';

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
          (<code>localStorage</code> et, pour la clé de déverrouillage persistée,{' '}
          <code>IndexedDB</code>) de votre navigateur. Sans compte, ils n&apos;en sortent
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
          <strong>Déverrouillage par mot de passe (routine).</strong> Au quotidien, vous
          déverrouillez votre synchronisation avec votre <strong>mot de passe</strong> : une
          clé de chiffrement (DEK) est wrappée par une clé dérivée de votre mot de passe (et
          conservée sur le serveur dans une enveloppe opaque). Le serveur ne voit jamais votre
          mot de passe ni la DEK.
        </p>
        <p>
          <strong>Clé de récupération (secours d&apos;urgence).</strong> Une clé de récupération
          est générée localement à la création du compte, <strong>affichée une fois</strong> à
          l&apos;écran et <strong>envoyée par e-mail</strong> à l&apos;adresse du compte (elle
          transite donc fugacement par notre prestataire e-mail, mais n&apos;est jamais
          persistée côté serveur). Elle sert à retrouver vos données si vous perdez votre mot de
          passe, et au déverrouillage routine des comptes sans mot de passe (lien magique).{' '}
          <strong>Si vous perdez cette clé, vos données synchronisées sont irrécupérables</strong>{' '}
          — nous ne pouvons pas les réinitialiser. Conservez-la en lieu sûr.
        </p>
        <p>
          <strong>Se souvenir de cet appareil (30 jours).</strong> À l&apos;ouverture de la
          modale, vous pouvez cocher « se souvenir de cet appareil » : la clé de déverrouillage
          (DEK) est alors persistée sur cet appareil dans <code>IndexedDB</code> sous la forme
          d&apos;un handle crypto <strong>non-extractable</strong> (aucun octet brut sur disque),
          avec une expiration de 30 jours. Au rechargement, vos données se déverrouillent alors
          sans redemander votre mot de passe. Quiconque accède à cet appareil pendant cette
          fenêtre peut utiliser la sync ; c&apos;est un compromis friction/sécurité assumé et
          opt-in. Se déconnecter ou supprimer le compte oublie cette clé.
        </p>
        <p>
          <strong>Hébergement.</strong> Les blobs chiffrés sont stockés sur {SYNC_HOSTING.provider}{' '}
          ({SYNC_HOSTING.region}). {SYNC_HOSTING.adequacy} Seul le texte chiffré transite et y est
          conservé ; aucun identifiant de navigation, aucune métrique, aucun comptage, aucun e-mail
          de relance.
        </p>
        <p>
          <strong>Authentification auto-hébergée.</strong> La gestion du compte (identifiants,
          sessions, vérification e-mail) repose sur Better Auth, exécuté sur nos propres serveurs :
          les tables d&apos;authentification vivent dans la même base {SYNC_HOSTING.provider} que
          vos blobs chiffrés. Aucun service d&apos;authentification managé tiers ne traite vos
          identifiants.
        </p>
        <p>
          <strong>E-mails transactionnels.</strong> Les messages du compte (vérification de
          l&apos;adresse e-mail, réinitialisation du mot de passe, lien de connexion) sont envoyés
          via {EMAIL_PROVIDER.provider}. {EMAIL_PROVIDER.scope}{' '}
          Aucune donnée de lecture, aucun favori, aucun blob chiffré ne transite par ce canal —
          seulement l&apos;adresse e-mail et un lien signé à courte expiration.
        </p>
        <p>
          <strong>Mot de passe oublié ≠ accès aux données.</strong> Réinitialiser votre mot de
          passe restaure l&apos;accès à votre <em>compte</em> (connexion), pas à vos{' '}
          <em>données</em> : la clé de récupération reste le filet pour déchiffrer vos blobs.
          Après l&apos;avoir déverrouillée via la clé de récupération, vous pouvez re-lier votre
          nouveau mot de passe pour retrouver le déverrouillage routine.
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