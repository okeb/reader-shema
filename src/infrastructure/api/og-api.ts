import { getChapter, getReferences } from '@/src/infrastructure/api/bible-api';
import { truncateBody, type ResolvedRead } from '@/src/domain/services/reference-formatter.service';
import { parseSelection } from '@/src/domain/value-objects/verse-selection.vo';

/**
 * Récupère le **texte** (corps) de la carte OG dans la version résolue (`resolved.version`, défaut
 * BYM). Retourne `null` (→ carte de repli) si : params invalides, sélection `v` sans correspondance,
 * chapitre/référence introuvable, ou échec réseau. Ne lève jamais.
 *
 * Partie infrastructure du calcul OG (la résolution du titre, pure, vit dans
 * `domain/services/reference-formatter.service.ts`). Porté de l'ancien `lib/og-passage.ts`
 * (`fetchOgBody`), remappé vers le client axios `infrastructure/api/bible-api`.
 */
export async function fetchOgBody(resolved: ResolvedRead): Promise<string | null> {
  try {
    if (resolved.mode === 'refs') {
      const cards = await getReferences(resolved.version, resolved.refs);
      const first = cards[0];
      if (!first || first.verses.length === 0) return null;
      return truncateBody(first.verses.map((v) => v.text).join(' '));
    }

    const verses = await getChapter(resolved.version, resolved.bookId, resolved.chapter);
    if (verses.length === 0) return null;

    if (resolved.highlight) {
      const wanted = new Set(parseSelection(resolved.highlight));
      const picked = verses.filter((v) => wanted.has(v.number));
      if (picked.length === 0) return null; // `v` ne correspond à aucun verset → repli
      return truncateBody(picked.map((v) => v.text).join(' '));
    }

    return truncateBody(verses[0].text); // chapitre entier → amorce (1ᵉʳ verset)
  } catch {
    return null; // échec réseau → repli (jamais d'erreur visible dans un dépliage de lien)
  }
}