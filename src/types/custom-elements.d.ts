import type { DetailedHTMLProps, HTMLAttributes } from 'react';

/**
 * Déclaration du web component `playful-avatars` (cmaas/playful-avatars) — spec 27.
 *
 * Le package ne fournit pas de types (uniquement `custom-elements.json`) ; on déclare ici l'élément
 * personnalisé `<playful-avatar>` pour le moteur JSX de React 19. Les props tableau/objet (`colors`)
 * sont passées en tant que **propriétés** par React 19 (et non attributs string), ce que le composant
 * attend (champ `colors` du CE). Les props string (`name`, `variant`) deviennent des attributs.
 *
 * La déclaration ambient du module `playful-avatars` (import dynamique côté client) vit dans
 * `playful-avatars.d.ts` (fichier sans import top-level pour rester un script ambient).
 *
 * Manifeste source : `playful-avatars/custom-elements.json` (PlayfulAvatar : name/variant/title/colors).
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'playful-avatar': DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          name?: string;
          variant?: string;
          title?: boolean;
          colors?: string[];
        },
        HTMLElement
      >;
    }
  }
}