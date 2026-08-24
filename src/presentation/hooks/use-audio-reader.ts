'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBookById } from '@/src/shared/constants/bible-books';
import { getAudioManifestChapter } from '@/src/infrastructure/api/bible-api';
import { resolveAudioUrl } from '@/src/presentation/lib/audio';

/** Verset consommable par le lecteur audio (mode read ou références). */
interface AudioVerseInput {
  number: number;
  audio?: string;
}

/** Une piste de la playlist : titre narré d'introduction ou verset. */
interface AudioTrack {
  kind: 'title' | 'verse';
  /** Numéro du verset, ou null pour la piste titre. */
  verseNumber: number | null;
  url: string;
}

export interface AudioReaderState {
  /** Vrai si une piste joue. */
  isPlaying: boolean;
  /** Numéro du verset en cours (null si idle ou pendant la piste titre). */
  currentVerse: number | null;
  /** Au moins un verset du passage a de l'audio. */
  hasAudio: boolean;
  /** Lecture continue depuis le début (titre + versets). */
  playChapter: () => void;
  /** Lit un verset précis puis enchaîne les suivants (interrompt la lecture continue). */
  playVerse: (n: number) => void;
  /** Play/pause de la piste courante (démarre le chapitre si idle). */
  toggle: () => void;
  /** Arrêt + reset (currentVerse = null). */
  stop: () => void;
  /** Verset suivant qui a de l'audio. */
  next: () => void;
  /** Verset précédent qui a de l'audio. */
  prev: () => void;
}

export interface AudioReader extends AudioReaderState {
  /** Réf de l'unique élément <audio> à rendre une fois dans TReader. */
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

interface UseAudioReaderOptions {
  /** Inclut la piste titre (`title.mp3`) en tête de lecture continue. défaut : true.
   *  Mis à false en mode références (pas de lecture continue de chapitre). */
  includeTitle?: boolean;
  /** Clé de réinitialisation : quand elle change, l'audio en cours est stoppé
   *  et la playlist reconstruite. Défaut : `${bookId}:${chapter}`. */
  resetKey?: string;
}

/**
 * Hook client, source unique de l'état audio (spec 37 §4.3). Pilote un unique
 * élément `<audio>` (rendu une fois par TReader via `audioRef`) sur une playlist
 * mémoïsée dérivée des versets + du manifest chapitre (best-effort, pour le titre).
 *
 * Désactivation gracieuse : un mp3 manquant (404) déclenche l'événement `error` →
 * on zappe la piste et on passe à la suivante (même logique que `ended`). À la fin
 * du dernier verset → `stop()` (pas de boucle).
 */
export function useAudioReader(
  verses: AudioVerseInput[],
  bookId: string,
  chapter: number,
  options: UseAudioReaderOptions = {},
): AudioReader {
  const { includeTitle = true, resetKey = `${bookId}:${chapter}` } = options;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const book = getBookById(bookId);
  const osis = book?.osis;

  // Versets audio du passage (ordre du tableau d'entrée).
  const audioVerses = useMemo(() => verses.filter((v) => v.audio), [verses]);
  const hasAudio = audioVerses.length > 0;

  // Manifest chapitre (best-effort) — uniquement pour connaître la piste titre.
  const manifestQ = useQuery({
    queryKey: ['bible', 'audio-manifest-chapter', osis ?? '', chapter],
    queryFn: () => getAudioManifestChapter(osis as string, chapter),
    enabled: hasAudio && includeTitle && !!osis && chapter > 0,
    staleTime: 1000 * 60 * 60, // 1 h
    retry: false,
  });

  // Playlist finale = [title?, v1, v2, …, vN].
  const playlist = useMemo<AudioTrack[]>(() => {
    if (!hasAudio || !osis) return [];
    const tracks: AudioTrack[] = audioVerses.map((v) => ({
      kind: 'verse',
      verseNumber: v.number,
      url: resolveAudioUrl(v.audio) as string,
    }));
    if (includeTitle && manifestQ.data?.title) {
      tracks.unshift({
        kind: 'title',
        verseNumber: null,
        url: resolveAudioUrl(`/audios/${osis}.${chapter}.title.mp3`) as string,
      });
    }
    return tracks;
  }, [hasAudio, osis, audioVerses, includeTitle, manifestQ.data, chapter]);

  // Refs miroirs pour les handlers d'événements (closures stables).
  const playlistRef = useRef(playlist);
  playlistRef.current = playlist;
  const indexRef = useRef<number | null>(currentIndex);
  indexRef.current = currentIndex;

  const currentVerse =
    currentIndex != null ? (playlist[currentIndex]?.verseNumber ?? null) : null;

  // --- Contrôles ---------------------------------------------------------------

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      try {
        audio.load();
      } catch {
        /* no-op */
      }
    }
    indexRef.current = null;
    setCurrentIndex(null);
    setIsPlaying(false);
  }, []);

  const playIndex = useCallback((index: number) => {
    const audio = audioRef.current;
    const list = playlistRef.current;
    if (!audio || !list[index]) return;
    indexRef.current = index;
    setCurrentIndex(index);
    audio.src = list[index].url;
    audio.play().catch(() => {
      /* Une erreur média (404, décodage) déclenche l'événement `error` qui zappe
         la piste. Un blocage d'autoplay éventuel se résout au prochain clic. */
    });
  }, []);

  const advance = useCallback(
    (dir: 1 | -1) => {
      const idx = indexRef.current;
      const list = playlistRef.current;
      if (idx == null) return;
      const nxt = idx + dir;
      if (nxt < 0 || nxt >= list.length) {
        stop();
        return;
      }
      playIndex(nxt);
    },
    [playIndex, stop],
  );

  const next = useCallback(() => advance(1), [advance]);
  const prev = useCallback(() => advance(-1), [advance]);

  const playChapter = useCallback(() => {
    if (playlistRef.current.length === 0) return;
    playIndex(0);
  }, [playIndex]);

  const playVerse = useCallback(
    (n: number) => {
      const list = playlistRef.current;
      const idx = list.findIndex((t) => t.kind === 'verse' && t.verseNumber === n);
      if (idx >= 0) playIndex(idx);
    },
    [playIndex],
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (indexRef.current == null) {
      playChapter();
      return;
    }
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [playChapter]);

  // --- Événements de l'élément <audio> (branchés une fois) ---------------------

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => advance(1);
    const onError = () => advance(1); // mp3 manquant → on zappe et on avance.

    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [advance]);

  // --- Réinitialisation au changement de passage / de carte active -------------

  useEffect(() => {
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return {
    audioRef,
    isPlaying,
    currentVerse,
    hasAudio,
    playChapter,
    playVerse,
    toggle,
    stop,
    next,
    prev,
  };
}