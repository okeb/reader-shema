import { Text } from '@react-email/components';
import { EmailShell } from '@/lib/email/components/email-shell';
import { EmailCta } from '@/lib/email/components/email-cta';
import { BODY_TEXT, MUTED_TEXT } from '@/lib/email/theme';

/**
 * Mail de bienvenue post-inscription (spec 32 — nouveau).
 *
 * Déclenché une fois par la création du user (hook Better Auth `databaseHooks.user.create.after`
 * — idempotent par construction : le hook ne se déclenche qu'une fois par user). Pas de bouton
 * critique : un CTA « Reprendre la lecture → » pointant vers `${baseUrl}/fr/read` (locale par
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
      <Text className="e-fg" style={BODY_TEXT}>
        Bienvenue sur <strong>ShemaProject</strong>{name ? `, ${name}` : ''} !
        <br />
        <br />
        Nous sommes ravis de vous compter parmi nos lecteurs. Votre compte est créé : vos notes,
        favoris et signets seront synchronisés sur vos appareils.
      </Text>
      <Text style={{ margin: '8px 0 16px' }}>
        <EmailCta href={readUrl} label="Reprendre la lecture" />
      </Text>
      <Text className="e-muted" style={MUTED_TEXT}>
        En cas de besoin, conservez précieusement votre clé de récupération (e-mailée séparément).
      </Text>
    </EmailShell>
  );
}