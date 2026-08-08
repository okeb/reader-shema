/**
 * Déclaration ambient du package `playful-avatars` (cmaas/playful-avatars) — spec 27.
 *
 * Le package ne fournit aucun type (uniquement `custom-elements.json`) : on déclare un module
 * ambient vide afin que l'import dynamique côté client (`await import('playful-avatars')`) passe
 * `tsc`. Le side-effect de l'import est d'enregistrer le web component `<playful-avatar>` (déclaré
 * pour le JSX dans `custom-elements.d.ts`). On ne consomme aucun export du module ici.
 */
declare module 'playful-avatars';