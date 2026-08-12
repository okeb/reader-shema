'use client';

import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { FloatingButton, GLASS_PILL } from '@/src/presentation/components/atoms/a-floating-button';
import { ReadingSettings } from './m-reading-settings';
import { VersionPicker } from './m-version-picker';
import { DockOverflow } from './m-dock-overflow';
import { VerseActions, type VerseActionsBundle } from './m-verse-actions';
import { useCoarsePointer } from '@/src/presentation/hooks/use-coarse-pointer';
import type { ReaderMode } from '@/src/presentation/lib/reader-helpers';

interface ReaderDockProps {
  mode: ReaderMode;
  /** Pointeur tactile : le dock mute en cluster d'actions quand des versets sont sélectionnés. */
  coarse: boolean;
  selectionCount: number;
  strongsOpen: boolean;
  /** Faisceau de props du cluster d'actions (variante tactile). */
  verseActions: VerseActionsBundle;
  /** Panneau Historique ouvert → bouton Historique mis en évidence. */
  historyPanelOpen: boolean;
  toggleHistoryPanel: () => void;
  /** Panneau Signets ouvert (bouton groupé « actif »). */
  bookmarkPanelOpen: boolean;
  toggleBookmarkPanel: () => void;
  /** Panneau « Mes notes » ouvert (bouton groupé « actif »). */
  notesPanelOpen: boolean;
  toggleNotesPanel: () => void;
  /** Navigue vers la page dédiée Favoris. */
  onOpenFavorites: () => void;
}

/**
 * Dock d'outils façon dock macOS : barre horizontale centrée en bas, relief porté par le conteneur
 * (boutons plats). Sur tactile, il mute en cluster d'actions contextuel quand des versets sont
 * sélectionnés (au lieu d'une 2ᵉ pilule flottante).
 *
 * Miroir du modèle (`components/molecules/m-reader-dock.tsx`) : sélecteur de version (lecture
 * continue), historique, réglages de lecture, outils personnels regroupés (Signets / Notes /
 * Favoris), et loupe mobile. Le thème et l'aide vivent dans la topbar ; le Strong s'ouvre depuis le
 * cluster d'actions de verset ; le mode focus se règle depuis les réglages (ou `s`).
 */
export function ReaderDock({
  mode,
  coarse,
  selectionCount,
  strongsOpen,
  verseActions,
  historyPanelOpen,
  toggleHistoryPanel,
  bookmarkPanelOpen,
  toggleBookmarkPanel,
  notesPanelOpen,
  toggleNotesPanel,
  onOpenFavorites,
}: ReaderDockProps) {
  // En mode cluster (tactile + sélection), le dock héberge les actions de verset dont les popovers
  // (couleur de surlignage, sélecteur de signet) s'ouvrent vers le haut : on désactive le clipping
  // (`overflow-x-auto` rend aussi `overflow-y` clipant) sinon ils sont coupés. Le clipping ne sert
  // qu'à la barre d'outils complète (défilement horizontal).
  const clusterMode = coarse && selectionCount > 0 && !strongsOpen;

  return (
    <div
      className={cn(
        'fixed bottom-5 left-1/2 z-30 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-1 rounded-full px-1.5 py-1',
        GLASS_PILL,
        'border border-foreground/5',
        clusterMode ? 'overflow-visible' : 'overflow-x-auto',
      )}
    >
      {clusterMode ? (
        <div className="animate-fade-in-up flex items-center">
          <VerseActions bare {...verseActions} />
        </div>
      ) : (
        <>
          {/* Sélecteur de version + comparaison (vue parallèle) — lecture continue uniquement. */}
          {mode === 'read' && (
            <>
              <VersionPicker />
              <span className="mx-0.5 h-6 w-px bg-border" />
            </>
          )}
          {/* Historique — reprise manuelle (chapitres récents). Placé en tête du cluster (utile en
              premier), Favoris est déplacé en fin (page dédiée). */}
          <FloatingButton active={historyPanelOpen} title="Historique (H)" onClick={toggleHistoryPanel}>
            <Icon icon="hugeicons:clock-01" className="h-[18px] w-[18px]" />
          </FloatingButton>
          {/* Réglages de lecture : police, taille, interligne, largeur, fond, disposition,
              colonnes, renvois, mode focus — panneau unique. Disposition cachée hors lecture
              (mode refs = cartes, pas de mise en page). */}
          <ReadingSettings showLayout={mode === 'read'} />
          {/* Outils personnels regroupés (Signets + Notes + Favoris) derrière un seul déclencheur,
              sur le modèle du menu « Plus d'actions » du cluster de verset. Raccourcis B/N/F
              inchangés (gérés par useReaderShortcuts). */}
          <DockOverflow
            bookmarkPanelOpen={bookmarkPanelOpen}
            toggleBookmarkPanel={toggleBookmarkPanel}
            notesPanelOpen={notesPanelOpen}
            toggleNotesPanel={toggleNotesPanel}
            onOpenFavorites={onOpenFavorites}
          />
          {/* Recherche — bouton mobile only (la topbar garde sa pastille ⌘K sur desktop).
              Dispatche le même event `bym:open-search` que la pastille topbar, écouté par la
              command palette (o-command-palette.tsx). Placé en fin de dock : bouton très utilisé,
              accessible au pouce. */}
          <FloatingButton
            className="md:hidden"
            title="Rechercher"
            onClick={() => window.dispatchEvent(new Event('bym:open-search'))}
          >
            <Icon icon="hugeicons:search-01" className="h-[18px] w-[18px]" />
          </FloatingButton>
        </>
      )}
    </div>
  );
}

export default ReaderDock;