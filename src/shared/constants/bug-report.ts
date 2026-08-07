import { APP_VERSION, BUG_EMAIL } from '@/src/shared/constants/legal';

/**
 * Construit l'URL mailto: pré-remplie pour le signalement de bug.
 * À appeler côté client uniquement (utilise window.location et navigator.userAgent).
 */
export function buildBugReportUrl(): string {
  const subject = encodeURIComponent(`[ShemaProject] Problème sur v${APP_VERSION}`);
  const body = encodeURIComponent(
    `URL : ${typeof window !== 'undefined' ? window.location.href : ''}\n` +
      `Version : v${APP_VERSION}\n` +
      `Navigateur : ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}\n\n` +
      `Description du problème :\n`,
  );
  return `mailto:${BUG_EMAIL}?subject=${subject}&body=${body}`;
}