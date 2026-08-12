import {
  Html,
  Head,
  Preview,
  Tailwind,
  Body,
  Container,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import emailTailwindConfig from '@/lib/email/tailwind.config';
import { EmailLogo } from './email-logo';

/**
 * Shell partagé des 5 e-mails transactionnels (spec 32 §5.2 / §5.5) — **adaptatif clair/sombre**.
 *
 * **Technique adaptative** (§5.5) : le **clair est la base inline** (couleurs posées en attributs
 * `style="…"` sur chaque cellule — lues par tous les clients, même ceux qui stripent `<style>`).
 * Le **sombre est une surcharge** via un bloc `<style>` en `<head>` posé par `DARK_STYLE` :
 * `@media (prefers-color-scheme: dark)` surcharge les classes adaptatives `.bg-body` / `.bg-card`
 * / `.text-fg` / `.text-muted` / `.border-card` / `.bg-code` / `.logo-*` avec `!important`. Les
 * classes sont posées **en plus** des styles inline (le inline gagne sans media query ; le
 * `!important` de la media query gagne quand elle s'applique).
 *
 * On ne compte **pas** sur le `dark:` variant de Tailwind (la classe `.dark` parent n'existe pas
 * dans un mail). Outlook desktop (pas de `prefers-color-scheme`) et Gmail web (strippe `<style>`)
 * restent en thème clair — fallback acceptable et attendu (§8) : aucun client ne se retrouve avec
 * un mail illisible.
 */

const DARK_STYLE = `@media (prefers-color-scheme: dark) {
  .bg-body { background: #0a0a0a !important; }
  .bg-card { background: #1a1a1a !important; }
  .text-fg { color: #ffffff !important; }
  .text-muted { color: #a1a1aa !important; }
  .border-card { border-color: #27272a !important; }
  .bg-code { background: #1a1a1a !important; }
  .logo-dark { display: inline !important; }
  .logo-light { display: none !important; }
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
        <style dangerouslySetInnerHTML={{ __html: DARK_STYLE }} />
      </Head>
      <Preview>{preview}</Preview>
      <Tailwind config={emailTailwindConfig}>
        <Body
          className="bg-body"
          // Base claire inline (lue par tous les clients, même ceux qui stripent `<style>`).
          style={{
            margin: 0,
            background: '#f6f6f8',
            fontFamily:
              "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
            color: '#111111',
          }}
        >
          <Container
            className="bg-card border-card"
            style={{
              maxWidth: '465px',
              margin: '32px auto',
              background: '#ffffff',
              border: '1px solid #e8e8ee',
              borderRadius: '12px',
              padding: '32px 24px',
            }}
          >
            {/* Logo centré */}
            <Section style={{ textAlign: 'center', marginTop: '8px', marginBottom: '24px' }}>
              <EmailLogo />
            </Section>

            {/* Titre — 2xl, centré, font-normal */}
            <Text
              className="text-fg"
              style={{
                color: '#111111',
                fontSize: '24px',
                fontWeight: 400,
                textAlign: 'center',
                margin: '0 0 16px',
              }}
            >
              {title}
            </Text>

            {/* Corps — les templates fournissent leurs propres <Text> / <EmailButton>
                (texte 14px, aligné à gauche). Les classes `.text-fg` sont posées par les templates. */}
            {children}

            <Hr
              className="border-card"
              style={{ borderColor: '#e8e8ee', margin: '24px 0 16px' }}
            />

            {/* Footer */}
            <Text
              className="text-muted"
              style={{ color: '#888888', fontSize: '12px', lineHeight: '1.5', margin: '0' }}
            >
              ShemaProject — Lecture de la Bible.
              <br />
              Si vous n&apos;êtes pas à l&apos;origine de cet e-mail, ignorez-le sans suite.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}