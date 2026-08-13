import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Text,
  // Section,
  Hr,
  Link,
} from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';
import { emailTailwindConfig, DARK_STYLE } from '@/lib/email/theme';
import { EmailHeaderLogo } from '@/lib/email/components/email-header-logo';
import {EmailSocialLink} from "@/lib/email/components/email-social-link";
import { env } from '@/env.mjs';
import {EmailFooterLogo} from "@/lib/email/components/email-footer-logo";

/**
 * @font-face DM Sans — servie depuis nos propres fichiers (`public/fonts/`), plus depuis le CDN
 * Google Fonts. Les clients mail nécessitent une URL **absolue** pour télécharger la web-font :
 * on bâtit donc le `src` avec `NEXT_PUBLIC_APP_URL` (prod = https://reader.shemaproject.org).
 *
 * On utilise la fonte **variable** locale (`DMSans-VariableFont_opsz,wght.woff2`, axes opsz + wght)
 * qui couvre la même plage de graisses `100 900` que l'ancien woff2 distant — mais servie depuis
 * notre domaine. Format `woff2` (compressé, ~37 Ko vs ~700 Ko pour le .ttf variable). La virgule
 * du nom de fichier est encodée `%2C` pour une compatibilité maximale des clients mail.
 */
const FONT_URL = `${env.NEXT_PUBLIC_APP_URL}/fonts/DM_Sans/DMSans-VariableFont_opsz%2Cwght.woff2`;

const FONT_FACE = `@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  mso-font-alt: 'Arial';
  src: url(${FONT_URL}) format('woff2');
}`;

export function EmailShell({
  title,
  preview,
  children,
  unsubscribeUrl,
}: {
  title: string;
  preview: string;
  children: React.ReactNode;
  /** URL signée vers `/api/email/unsubscribe?token=…`. Absent → pas de lien de désinscription. */
  unsubscribeUrl?: string;
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
        <Body className="bg-white dark:bg-dark" style={{ margin: 0 }}>
          <Container className="max-w-[560px] mx-auto pt-10 pr-6 pb-8 pl-6">
            {/* Logo en haut à gauche (modèle Skin). */}
            <EmailHeaderLogo />

            {/* Gros titre — DM Sans, weight 700. */}
            <Text className="font-title text-ink dm-fg text-5xl leading-[0.9] tracking-[-0.05em] font-bold text-left mt-3 mb-5 mx-0">
              {title}
            </Text>

            {/* Corps — les templates fournissent leurs propres <Text> / <EmailCta>. */}
            <Container className="mb-12">
              {children}
            </Container>

            {/* Footer — logo, identité, social, contact. Fond gris clair / sombre. */}
            <Hr className="px-8 w-full"/>
            <Container className="text-center pt-7 bg-neutral-300">
              <table className="w-full">
                <tbody>
                  <tr className="w-full mt-7">
                    <td align="center">
                      <EmailFooterLogo />
                    </td>
                  </tr>
                  <tr className="w-full">
                    <td align="center">
                      <Text className="mt-[4px] mb-[3px] font-bold text-[16px] font-serif text-neutral400 leading-[18px] tracking-tighter">
                        The Shema Project
                      </Text>
                    </td>
                  </tr>
                  <tr className="w-full">
                    <td align="center">
                      <Text className="w-2/3 mt-[4px] font-semibold text-[10px] font-sans text-neutral-500 leading-[10px] tracking-tighter">
                        Rendre la Parole du Mashiah Yehoshoua plus accessible pour toutes et pour tous, tout simplement et gratuitement.
                      </Text>
                    </td>
                  </tr>
                  <EmailSocialLink />
                  <tr>
                    <td align="center" className="mt-[7px]">
                      <Text className="text-[12px] mb-0 text-neutral-300 leading-[10px]">
                        Paris, FRANCE
                      </Text>
                      <Text className="mb-7 mt-0 text-[12px] text-neutral-200 leading-[10px]">
                        hello@shemaproject.org
                      </Text>
                      {unsubscribeUrl ? (
                        <Text className="mb-0 text-[11px] text-neutral-400 leading-[14px]">
                          <Link href={unsubscribeUrl} className="text-neutral-400 underline">
                            Se désinscrire
                          </Link>{' '}des e-mails ShemaProject.
                        </Text>
                      ) : null}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Container>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}