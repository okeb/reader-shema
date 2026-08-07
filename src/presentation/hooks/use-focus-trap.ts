'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Piège le focus tabulaire à l'intérieur d'un conteneur tant qu'il est ouvert —
 * spec 22 §7 (focus trap maison, sans lib). Au montage : focalise le premier
 * élément tabbable, restaure le focus précédent au démontage, et boucle Tab /
 * Maj-Tab aux bornes. S'active via `useFocusTrap(open, ref)`.
 */

const TABBABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useFocusTrap<T extends HTMLElement>(
  open: boolean,
  containerRef: RefObject<T | null>,
): void {
  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus initial sur le premier élément tabbable (ou le conteneur lui-même).
    const first = container.querySelector<HTMLElement>(TABBABLE) ?? container;
    first.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !container) return;
      const tabbables = Array.from(
        container.querySelectorAll<HTMLElement>(TABBABLE),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (tabbables.length === 0) return;
      const firstEl = tabbables[0];
      const lastEl = tabbables[tabbables.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, containerRef]);
}