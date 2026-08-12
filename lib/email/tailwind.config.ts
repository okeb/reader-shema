import type { Config } from 'tailwindcss';

/**
 * Config Tailwind dédiée aux e-mails (spec 32) — **indépendante** de `tailwind.config.ts`
 * du projet. Raisons :
 *  - `@react-email/tailwind` rend au serveur via `<Tailwind config={…}>` ; les `hsl(var(--…))`
 *    du projet (variables CSS posées par `next-themes` sur `<html>`) ne résoudraient pas hors
 *    navigateur → on fige des valeurs statiques.
 *  - Le sombre n'est **pas** géré par un `dark:` Tailwind (la classe `.dark` parent n'existe pas
 *    dans un mail) mais par le bloc `<style>` media-query de `<EmailShell>` (§5.5) qui surcharge
 *    les classes adaptatives `.bg-body` / `.bg-card` / `.text-fg` / `.text-muted` / `.border-card`
 *    / `.bg-code`. Les couleurs ci-dessous sont donc les **clair par défaut**.
 *
 * `content` est omis : `@react-email/tailwind` type `TailwindConfig = Omit<Config, 'content'>`
 * (les classes sont scannées dans le JSX rendu, pas dans des fichiers).
 */
const emailTailwindConfig: Omit<Config, 'content'> = {
  theme: {
    extend: {
      colors: {
        // Structure (clair = base inline, lu par tous les clients).
        background: '#f6f6f8',
        card: '#ffffff',
        foreground: '#111111',
        muted: '#888888',
        border: '#e8e8ee',
        code: '#f2f2f5',
        // Accent orange ShemaProject — identique dans les deux thèmes (contraste OK sur blanc
        // comme sur noir, §5.5). Aucune surcharge media-query sur le bouton.
        accent: '#f76808',
      },
      // Robuste mobile : on reste sur des utilitaires simples, pas de grille complexe.
    },
  },
};

export default emailTailwindConfig;