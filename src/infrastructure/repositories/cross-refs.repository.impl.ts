import type { CrossRef, CrossRefJson, CrossRefMap } from '@/src/domain/entities';
import type { ICrossRefsRepository } from '@/src/domain/repositories/cross-refs.repository';

/**
 * Implémentation des renvois bibliques : lit les fichiers JSON statiques
 * `public/data/cross-refs/${bookId}.json` (servis tels quels par Next) et convertit la forme brute
 * `[bookId, chapter, verseStart, verseEnd?]` en `CrossRef`. Côté client uniquement (fetch relatif).
 */
export class CrossRefsRepositoryImpl implements ICrossRefsRepository {
  async getForBook(bookId: string): Promise<CrossRefMap> {
    try {
      const res = await fetch(`/data/cross-refs/${bookId}.json`, { headers: { Accept: 'application/json' } });
      if (!res.ok) return {};
      const raw = (await res.json()) as CrossRefJson;
      const out: CrossRefMap = {};
      for (const [key, refs] of Object.entries(raw)) {
        out[key] = refs.map(([refBookId, chapter, verseStart, verseEnd]) => ({
          bookId: refBookId,
          chapter,
          verseStart,
          verseEnd,
        }));
      }
      return out;
    } catch {
      return {};
    }
  }
}

/** Instance partagée (pas de DI lourd — les renvois sont un asset statique lecture seule). */
export const crossRefsRepository = new CrossRefsRepositoryImpl();