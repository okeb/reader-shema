'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface HoverCluster {
  /** Id du verset dont le cluster d'actions est visible, ou null. */
  hoverId: string | null;
  /** Démarre le minuteur d'apparition (1 s) du cluster ancré au verset `id`. */
  startHoverCluster: (id: string) => void;
  /** Programme la fermeture (250 ms) — sauf si un menu du cluster est épinglé. */
  endHoverCluster: () => void;
  /** Annule une fermeture programmée (survol du cluster lui-même : franchit le « trou »). */
  cancelHide: () => void;
  /** Épingle/relâche le cluster quand un menu déroulant (sélecteur de signet) s'ouvre/se ferme. */
  handleClusterMenu: (open: boolean) => void;
}

/**
 * Gère l'affichage différé du cluster d'actions au survol prolongé d'un verset sélectionné
 * (vue paragraphe). Apparition après 1 s, fermeture temporisée (250 ms) pour franchir le « trou »
 * entre le texte et le cluster ; épinglé tant qu'un menu déroulant du cluster est ouvert.
 *
 * @param isSelected Prédicat de sélection : si le verset survolé n'est plus sélectionné, on masque.
 */
export function useHoverCluster(isSelected: (id: string) => boolean): HoverCluster {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuOpenRef = useRef(false);

  const startHoverCluster = useCallback((id: string) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    showTimerRef.current = setTimeout(() => setHoverId(id), 1000);
  }, []);

  const endHoverCluster = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (menuOpenRef.current) return; // épinglé tant qu'un menu du cluster est ouvert
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setHoverId(null), 250);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const handleClusterMenu = useCallback(
    (open: boolean) => {
      menuOpenRef.current = open;
      if (open) {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
      } else {
        endHoverCluster();
      }
    },
    [endHoverCluster],
  );

  // Masque le menu si le verset survolé n'est plus sélectionné.
  useEffect(() => {
    if (hoverId && !isSelected(hoverId)) setHoverId(null);
  }, [hoverId, isSelected]);

  // Nettoie les minuteurs au démontage.
  useEffect(
    () => () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    },
    [],
  );

  return { hoverId, startHoverCluster, endHoverCluster, cancelHide, handleClusterMenu };
}