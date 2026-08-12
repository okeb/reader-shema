import { Text, Section } from '@react-email/components';
import { EmailShell } from '@/lib/email/components/email-shell';
import { EmailButton } from '@/lib/email/components/email-button';

/**
 * Mail de bienvenue post-inscription (spec 32 — nouveau).
 *
 * Déclenché une fois par la création du user (hook Better Auth `databaseHooks.user.create.after`
 * — idempotent par construction : le hook ne se déclenche qu'une fois par user). Pas de bouton
 * critique : un CTA « Reprendre la lecture » pointant vers `${baseUrl}/fr/read` (locale par
 * défaut de l'app — le user n'a pas encore de locale connue à la création du compte).
 *
 * Rappelle de conserver la clé de récupération (e-mailée séparément) — signal de warmth sans
 * métrique (doctrine spec 00).
 */
export function WelcomeEmail({ name, baseUrl }: { name: string; baseUrl: string }) {
  const readUrl = `${baseUrl.replace(/\/$/, '')}/fr/read`;
  return (
    <EmailShell
      title="Bienvenue sur ShemaProject"
      preview="Nous sommes ravis de vous compter parmi nos lecteurs."
    >
      <Text className="text-fg" style={{ color: '#111111', fontSize: '14px', lineHeight: '1.5', margin: '0 0 16px' }}>
        Bienvenue sur <strong>ShemaProject</strong>{name ? `, ${name}` : ''} !
        <br />
        <br />
        Nous sommes ravis de vous compter parmi nos lecteurs. Votre compte est créé : vos notes,
        favoris et signets seront synchronisés sur vos appareils.
      </Text>
      <Section style={{ textAlign: 'center', margin: '8px 0 16px' }}>
        <EmailButton href={readUrl} label="Reprendre la lecture" />
      </Section>
      <Text className="text-muted" style={{ color: '#888888', fontSize: '12px', lineHeight: '1.5', margin: '0' }}>
        En cas de besoin, conservez précieusement votre clé de récupération (e-mailée séparément).
      </Text>
    </EmailShell>
  );
}