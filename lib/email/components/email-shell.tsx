import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Text,
  Section,
  Row,
  Column,
  Img,
  Link,
} from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';
import { emailTailwindConfig, DARK_STYLE } from '@/lib/email/theme';
import { EmailLogo } from './email-logo';
import { EmailFooterLogo } from '@/lib/email/components/email-footer-logo';

/**
 * Shell partagé des 5 e-mails transactionnels (spec 32 §5.2 / §5.5) — **adaptatif clair/sombre**.
 *
 * Reprise du modèle « Skin » (reset-password) : layout à plat, logo en haut à gauche, gros titre
 * en **DM Sans**, corps en stack système, CTA lien-texte orange, footer séparé par une bordure.
 * Le fond bordeaux du modèle est retiré → le mail pose le **fond du projet** en clair comme en sombre.
 *
 * **Technique adaptative** (§5.5) — hybride Tailwind :
 *  - **Clair** = classes Tailwind inlinées par `<Tailwind>` en `style="…"` (lues par tous les
 *    clients, même ceux qui stripent `<style>`).
 *  - **Sombre** = surcharge `DARK_STYLE` (`@media (prefers-color-scheme: dark)` + classes `dm-*` +
 *    `!important`) posée en `<head>`. On n'utilise pas les variantes `dark:` de Tailwind :
 *    `@react-email/tailwind@2.0.7` les inline comme base (bug — voir `theme.ts`).
 *
 * **Fix dark mode** : `<meta name="color-scheme" content="light dark">` — sans ce meta, Apple
 * Mail / iOS ne basculent pas en sombre. `supported-color-schemes` couvre les clients plus anciens.
 * Le `<td>` interne d'`<Body>` (qui reçoit le `style` mais pas le `className`) est ciblé
 * structurellement par `DARK_STYLE` pour que le fond bascule aussi (cf. `theme.ts`).
 *
 * Outlook desktop (pas de `prefers-color-scheme`) et Gmail web (strippe `<style>`) restent en
 * thème clair — fallback acceptable et attendu (§8) : aucun client ne se retrouve illisible.
 *
 * **Logo** : la bascule dual-`<img>` (`.logo-light` / `.logo-dark`) est pilotée par `DARK_STYLE`
 * (display toggling avec `!important` — le `display` doit battre l'inline de base).
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
    <Tailwind config={emailTailwindConfig}>
      <Html lang="fr">
        <Head>
          <meta name="color-scheme" content="light dark" />
          <meta name="supported-color-schemes" content="light dark" />
          <style dangerouslySetInnerHTML={{ __html: `${FONT_FACE}\n${DARK_STYLE}` }} />
        </Head>
        <Preview>{preview}</Preview>
        <Body className="bg-paper font-body" style={{ margin: 0 }}>
          <Container className="max-w-[560px] mx-auto pt-10 pr-6 pb-8 pl-6">
            {/* Logo en haut à gauche (modèle Skin). */}
            <EmailLogo />

            {/* Gros titre — DM Sans, weight 700. */}
            <Text className="font-title text-ink dm-fg text-[28px] leading-[1.25] tracking-[-0.05em] font-bold text-left mt-7 mb-5 mx-0">
              {title}
            </Text>

            {/* Corps — les templates fournissent leurs propres <Text> / <EmailCta>. */}
            {children}

            {/* Footer — logo, identité, social, contact. Fond gris clair / sombre. */}

              {/*<Section>*/}
              {/*  <Row>*/}
              {/*    <Column colSpan={4}>*/}
              {/*      <EmailFooterLogo />*/}
              {/*      <Text className="text-ink dm-fg mt-2 mb-2 text-base leading-6 font-semibold">*/}
              {/*        Shema Project*/}
              {/*      </Text>*/}
              {/*      <Text className="text-muted dm-muted mt-1 mb-0 text-base leading-6">*/}
              {/*        Shema different*/}
              {/*      </Text>*/}
              {/*    </Column>*/}
              {/*    <Column*/}
              {/*      align="left"*/}
              {/*      style={{ display: 'table-cell', verticalAlign: 'bottom' }}*/}
              {/*    >*/}
              {/*      <Row*/}
              {/*        style={{*/}
              {/*          display: 'table-cell',*/}
              {/*          height: 44,*/}
              {/*          width: 56,*/}
              {/*          verticalAlign: 'bottom',*/}
              {/*        }}*/}
              {/*      >*/}
              {/*        <Column style={{ paddingRight: 8 }}>*/}
              {/*          <Link href="#">*/}
              {/*            <Img*/}
              {/*              alt="Facebook"*/}
              {/*              height="36"*/}
              {/*              src="https://react.email/static/facebook-logo.png"*/}
              {/*              width="36"*/}
              {/*            />*/}
              {/*          </Link>*/}
              {/*        </Column>*/}
              {/*        <Column>*/}
              {/*          <Link href="#">*/}
              {/*            <Img*/}
              {/*              alt="Instagram"*/}
              {/*              height="36"*/}
              {/*              src="https://react.email/static/instagram-logo.png"*/}
              {/*              width="36"*/}
              {/*            />*/}
              {/*          </Link>*/}
              {/*        </Column>*/}
              {/*      </Row>*/}
              {/*      <Row>*/}
              {/*        <Text className="text-muted dm-muted mt-2 mb-2 text-base leading-6 font-semibold">*/}
              {/*          Paris, FRANCE*/}
              {/*        </Text>*/}
              {/*        <Text className="text-muted dm-muted mt-1 mb-0 text-base leading-6 font-semibold">*/}
              {/*          hello@shemaproject.org*/}
              {/*        </Text>*/}
              {/*      </Row>*/}
              {/*    </Column>*/}
              {/*  </Row>*/}
              {/*</Section>*/}
            <Section className="text-center">
              <table className="w-full">
                <tr className="w-full">
                  <td align="center">
                    <Img
                      alt="React Email logo"
                      height="42"
                      src="https://react.email/static/logo-without-background.png"
                      width="42"
                    />
                  </td>
                </tr>
                <tr className="w-full">
                  <td align="center">
                    <Text className="my-[8px] font-semibold text-[16px] text-black leading-[24px]">
                      The Shema Project
                    </Text>
                    <Text className="mt-[4px] mb-0 text-[16px] text-gray-500 leading-[24px]">
                      Shema different
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <Row className="table-cell h-[44px] w-[56px] align-bottom">
                      <Column className="pr-[8px]">
                        <Link href="#">
                          <Img
                            alt="Facebook"
                            height="36"
                            src="https://api.iconify.design/hugeicons:facebook-01.svg?color=%23918f88"
                            width="36"
                          />
                        </Link>
                      </Column>

                      <Column>
                        <Link href="#">

                          <Img
                            alt="Instagram"
                            height="36"
                            src="https://api.iconify.design/hugeicons:instagram.svg?color=%23918f88"
                            width="36"
                          />
                        </Link>
                      </Column>
                    </Row>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <Text className="my-[8px] font-semibold text-[13px] text-black leading-[13px]">
                      Paris, FRANCE
                    </Text>
                    <Text className="mt-[4px] mb-0 font-semibold text-[13px] text-black leading-[13px]">
                      mail@example.com +123456789
                    </Text>
                  </td>
                </tr>
              </table>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}