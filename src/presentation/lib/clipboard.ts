'use client';

/**
 * Issue d'un partage : `shared` (feuille native ouverte à terme), `copied` (repli presse-papier,
 * typiquement desktop sans Web Share), `cancelled` (l'utilisateur a fermé la feuille — ne pas
 * afficher de feedback de succès).
 */
export type ShareOutcome = 'shared' | 'copied' | 'cancelled';

/**
 * Copie un texte dans le presse-papier. Repli sur `document.execCommand` si l'API Clipboard
 * n'est pas disponible (contexte non sécurisé / vieux navigateur). Retourne `true` si la copie a
 * vraisemblablement réussi.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* on tente le repli ci-dessous */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Partage un texte (+ URL optionnelle) via la **feuille de partage native** (`navigator.share`).
 * Repli sur presse-papier (`copyText`) quand l'API est absente (la plupart des navigateurs desktop) :
 * on y copie alors `texte` + `url`. `navigator.share` requiert un contexte sécurisé et un geste
 * utilisateur (fourni par le clic du bouton appelant). Une `AbortError` (annulation de la feuille)
 * renvoie `cancelled` sans lever.
 *
 * Centralise la logique Web Share texte (spec 07 / partage de versets). Porté de l'ancien
 * `lib/share.ts`.
 */
export async function shareOrCopy(data: { title?: string; text: string; url?: string }): Promise<ShareOutcome> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'cancelled';
      /* autre erreur → on tente le repli ci-dessous */
    }
  }
  await copyText(data.url ? `${data.text}\n${data.url}` : data.text);
  return 'copied';
}