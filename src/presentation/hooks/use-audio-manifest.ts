'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAudioManifest, type AudioManifestGlobal } from '@/src/infrastructure/api/bible-api';

/**
 * Manifest audio global (`/audio/manifest`) — couverture par livre/chapitre.
 * Best-effort : en production (API non modifiée) l'endpoint 404 → `data: null`,
 * le badge du sélecteur ne s'affiche pas. `staleTime` 24 h : la couverture ne
 * change qu'au déploiement de l'API (spec 37 §4.5).
 */
export function useAudioManifest() {
  const query = useQuery<AudioManifestGlobal | null>({
    queryKey: ['bible', 'audio-manifest'],
    queryFn: () => getAudioManifest(),
    staleTime: 1000 * 60 * 60 * 24, // 24 h
    retry: false, // best-effort : on ne re-tente pas un 404.
  });

  // Map dérivée `osis → Set<numéros de chapitres avec audio>` pour le badge sélecteur.
  const chaptersByOsis = useMemo(() => {
    const map = new Map<string, Set<number>>();
    const data = query.data;
    if (!data) return map;
    for (const [osis, chapters] of Object.entries(data)) {
      if (!chapters || typeof chapters !== 'object') continue;
      const set = new Set<number>();
      for (const chap of Object.keys(chapters)) {
        const n = Number(chap);
        if (Number.isFinite(n) && n > 0) set.add(n);
      }
      if (set.size > 0) map.set(osis, set);
    }
    return map;
  }, [query.data]);

  return { manifest: query.data, chaptersByOsis, ready: query.isFetched };
}