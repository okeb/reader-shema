import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Text,
  Hr,
} from '@react-email/components';
import { EMAIL } from '@/lib/email/theme';
import { EmailLogo } from './email-logo';

/**
 * Shell partagé des 5 e-mails transactionnels (spec 32 §5.2 / §5.5) — **adaptatif clair/sombre**.
 *
 * Reprise du modèle « Skin » (reset-password) : layout à plat, logo en haut à gauche, gros titre
 * en **DM Sans**, corps en stack système, CTA lien-texte orange, footer séparé par une bordure.
 * Le fond bordeaux du modèle est retiré → le mail pose le **fond du projet** (`EMAIL.bg`) en
 * clair comme en sombre.
 *
 * **Technique adaptative** (§5.5) : le **clair est la base inline** (couleurs posées en attributs
 * `style="…"` sur chaque élément — lues par tous les clients, même ceux qui stripent `<style>`).
 * Le **sombre est une surcharge** via un bloc `<style>` en `<head>` : `@media (prefers-color-scheme:
 * dark)` inverse les classes adaptatives `.e-*` et les `.logo-*` avec `!important`. Les `!important`
 * gagnent quand la media query s’applique ; sans elle, l’inline clair reste lu partout.
 *
 * **Fix dark mode** : `<meta name="color-scheme" content="light dark">` — sans ce meta, Apple
 * Mail / iOS ne basculent pas en sombre (cause racine du bug « reste clair » de l’itération
 * précédente). `supported-color-schemes` couvre les clients plus anciens.
 *
 * Outlook desktop (pas de `prefers-color-scheme`) et Gmail web (strippe `<style>`) restent en
 * thème clair — fallback acceptable et attendu (§8) : aucun client ne se retrouve illisible.
 *
 * DM Sans est une **web-font variable** (un seul woff2 couvre tous les weights) — `@font-face` +
 * `mso-font-alt` : Apple Mail/iOS rendent la police ; Outlook utilise le fallback `mso-font-alt`
 * (Arial) ; Gmail web/Android ignorent `@font-face` et tombent sur la font-family chain.
 */

const FONT_FACE = `@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  mso-font-alt: 'Arial';
  src: url(https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K6z9mXg.woff2) format('woff2');
}`;

const DARK_STYLE = `@media (prefers-color-scheme: dark) {
  .e-body { background: #090909 !important; }
  .e-fg { color: #d8d3c5 !important; }
  .e-muted { color: #98a1ad !important; }
  .e-border { border-color: #1f2937 !important; }
  .e-code { background: #161616 !important; border-color: #1f2937 !important; }
  .logo-light { display: none !important; }
  .logo-dark { display: inline !important; }
}`;

export function EmailShell({
  title,
  preview,
  children,
}: {
  title: string;
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="fr">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style dangerouslySetInnerHTML={{ __html: `${FONT_FACE}\n${DARK_STYLE}` }} />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        className="e-body"
        style={{ margin: 0, background: EMAIL.bg, fontFamily: EMAIL.bodyFont, color: EMAIL.fg }}
      >
        <Container
          style={{
            maxWidth: '560px',
            margin: '0 auto',
            padding: '40px 24px 32px',
          }}
        >
          {/* Logo en haut à gauche (modèle Skin). */}
          <EmailLogo />

          {/* Gros titre — DM Sans, weight 600. */}
          <Text
            className="e-fg"
            style={{
              fontFamily: EMAIL.titleFont,
              color: EMAIL.fg,
              fontSize: '26px',
              lineHeight: '1.25',
              fontWeight: 600,
              textAlign: 'left',
              margin: '28px 0 20px',
            }}
          >
            {title}
          </Text>

          {/* Corps — les templates fournissent leurs propres <Text> / <EmailCta>. */}
          {children}

          <Hr className="e-border" style={{ borderColor: EMAIL.border, margin: '32px 0 16px' }} />

          {/* Footer — tagline + avis d’ignore. */}
          <Text
            className="e-muted"
            style={{ color: EMAIL.muted, fontSize: '12px', lineHeight: '1.5', margin: '0' }}
          >
            ShemaProject — Lecture de la Bible.
            <br />
            Si vous n&apos;êtes pas à l&apos;origine de cet e-mail, ignorez-le sans suite.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}