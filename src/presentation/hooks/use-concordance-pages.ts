'use client';

import { useCallback, useEffect, useState } from 'react';
import { runQuery } from '@/src/presentation/hooks/use-cqrs';
import {
  createGetStrongOccurrencesQuery,
  createGetVersesTextQuery,
  createGetStrongsForVersesQuery,
} from '@/src/application/factories/bible';
import type {
  GetStrongOccurrencesResult,
  GetVersesTextResult,
  GetStrongsForVersesResult,
} from '@/src/domain/use-cases/bible';
import type { StrongLexicon, StrongOccurrence, StrongToken } from '@/src/domain/entities';

export type ConcordanceStatus = 'loading' | 'loaded' | 'error';

/** Id stable d'une occurrence (pour le surlignage de la ligne active + la coloration du token). */
export const occId = (o: StrongOccurrence) => `${o.bookId}:${o.chapter}:${o.verse}`;

export interface UseConcordancePagesResult {
  items: StrongOccurrence[];
  total: number;
  lexicon: StrongLexicon | null;
  status: ConcordanceStatus;
  loadingMore: boolean;
  /** Tokens Strong par occurrence (coloration du mot) — best-effort, récupérés en arrière-plan. */
  tokensById: Map<string, StrongToken[]>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

/**
 * Charge les pages de concordance d'un code Strong (`/bym/strong/:code`) : lexique (page détail
 * auto-suffisante — un seul fetch porte lemme/lang/phonetique/origine/type/definition), occurrences
 * paginées, réaffichage du texte dans la version active (l'index reste `bym`), et tokens Strong en
 * arrière-plan pour colorer le mot. Réinitialise quand `code` change.
 *
 * Partagé entre le tiroir concordance (`m-strong-concordance`) et la page détail
 * (`t-strong-detail`). Cf. spec 29.
 */
export function useConcordancePages(
  code: string,
  version: string,
  pageSize = 20,
  enabled = true,
): UseConcordancePagesResult {
  const [items, setItems] = useState<StrongOccurrence[]>([]);
  const [total, setTotal] = useState(0);
  const [lexicon, setLexicon] = useState<StrongLexicon | null>(null);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<ConcordanceStatus>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [tokensById, setTokensById] = useState<Map<string, StrongToken[]>>(new Map());

  const loadPage = useCallback(
    async (next: number) => {
      try {
        const res = await runQuery<GetStrongOccurrencesResult>(
          createGetStrongOccurrencesQuery(code, next, pageSize),
        );
        setTotal(res.total);
        if (next === 1) setLexicon(res.lexicon ?? null);

        // L'index de concordance n'existe que sous `bym` → `res.items` porte le texte BYM. En LSG (ou
        // toute version ≠ bym), on réaffiche le texte des mêmes versets dans la version active (la
        // numérotation est commune). Les emplacements (livre/chap/verset) restent ceux de l'index.
        const fetchItems = res.items.map((o) => ({
          id: occId(o),
          bookId: o.bookId,
          chapter: o.chapter,
          verse: o.verse,
        }));
        let pageItems = res.items;
        if (version !== 'bym') {
          const textMap = await runQuery<GetVersesTextResult>(
            createGetVersesTextQuery(version, fetchItems),
          );
          pageItems = res.items.map((o) => ({ ...o, text: textMap[occId(o)] ?? o.text }));
        }
        setItems((prev) => (next === 1 ? pageItems : [...prev, ...pageItems]));
        setPage(next);
        setStatus('loaded');

        // Récupère les tokens de la page pour colorer le mot Strong (sans bloquer l'affichage),
        // dans la version active pour rester cohérent avec le texte affiché.
        runQuery<GetStrongsForVersesResult>(createGetStrongsForVersesQuery(version, fetchItems))
          .then((map) => {
            if (Object.keys(map).length === 0) return;
            setTokensById((prev) => {
              const merged = new Map(prev);
              for (const [k, v] of Object.entries(map)) merged.set(k, v);
              return merged;
            });
          })
          .catch(() => {});
      } catch {
        setStatus('error');
      }
    },
    [code, version, pageSize],
  );

  // (Re)charge la première page au changement de code (ou à l'activation).
  useEffect(() => {
    if (!enabled) return;
    setItems([]);
    setTotal(0);
    setPage(0);
    setLexicon(null);
    setTokensById(new Map());
    setStatus('loading');
    void loadPage(1);
  }, [enabled, code, loadPage]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    await loadPage(page + 1);
    setLoadingMore(false);
  }, [loadPage, page]);

  return {
    items,
    total,
    lexicon,
    status,
    loadingMore,
    tokensById,
    hasMore: items.length < total,
    loadMore,
  };
}