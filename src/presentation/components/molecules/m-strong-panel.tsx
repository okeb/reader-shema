'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/src/presentation/components/atoms/a-skeleton';
import { StrongPanelSkeleton } from '@/src/presentation/components/molecules/m-strong-skeleton';
import { StrongVerse, type StrongVerseView } from '@/src/presentation/components/molecules/m-strong-verse';
import { BIBLE_VERSIONS, isSelectable, type BibleVersion } from '@/src/shared/constants/bible-versions';
import type { StrongToken } from '@/src/domain/entities';
import { useReaderPreferences } from '@/src/presentation/stores/reader-preferences.store';

export type { StrongVerseView };

/** Versions proposées dans le sélecteur du panneau Strong : sélectionnables + exposant les Strong. */
const STRONG_VERSIONS = BIBLE_VERSIONS.filter((v) => isSelectable(v) && v.hasStrongs !== false);

/**
 * Mini-sélecteur de version de l'en-tête du panneau Strong : affiche la version active (shortLabel)
 * et, au clic, liste les versions exposant les Strong. Changer de version appelle `onVersion` → la
 * version primaire du lecteur change (le texte + les Strong se rechargent). Dropdown ancré à gauche
 * sous la pastille ; ferme au clic dehors et à Échap.
 */
function StrongVersionSwitcher({
  version,
  onVersion,
}: {
  version: BibleVersion;
  onVersion: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={`Version : ${version.label}`}
        aria-label={`Version : ${version.label} (changer)`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-foreground/10"
      >
        <Icon icon="hugeicons:book-02" className="h-3.5 w-3.5 text-primary" />
        {version.shortLabel}
        <Icon
          icon="hugeicons:arrow-down-01"
          className={cn('h-3 w-3 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Version Strong"
          className="absolute left-0 top-full z-10 mt-2 w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-popover p-1 shadow-2xl animate-fade-in-up"
        >
          <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Version
          </p>
          {STRONG_VERSIONS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="menuitemradio"
              aria-checked={v.id === version.id}
              onClick={() => {
                onVersion(v.id);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-accent',
                v.id === version.id ? 'text-primary' : 'text-foreground',
              )}
            >
              <span className="truncate">{v.label}</span>
              {v.id === version.id && <Icon icon="hugeicons:tick-02" className="h-4 w-4 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface StrongPanelProps {
  open: boolean;
  loading: boolean;
  verses: StrongVerseView[];
  /** Nombre de rangées du skeleton = nombre de versets sélectionnés (le skeleton est fidèle à la
   *  sélection, pas à un nombre fixe). Pendant le chargement, `verses` est vide → on s'appuie
   *  dessus. Défaut 1. */
  skeletonRows?: number;
  /** Vrai si les Strong de la version active sont expérimentaux (alignement perfectible) → badge. */
  experimental?: boolean;
  /** Version active (affichée + modifiable via le sélecteur de l'en-tête). */
  version: BibleVersion;
  /** Change la version active (recharge le texte + les Strong). */
  onVersion: (id: string) => void;
  /** Ouvre la concordance d'un token Strong (relayé à chaque verset). */
  onSeeOccurrences?: (token: StrongToken) => void;
  /** Navigue vers la fiche détail d'un code Strong (depuis une référence d'`origine`, relayé).
   *  Transmet le token source pour mémoriser le contexte de reprise (spec 29). */
  onNavigateStrong?: (targetCode: string, source: { verseId: string; strongCode?: string }) => void;
  /** Token à réactiver au montage (reprise après retour d'une fiche /strong/[code]). */
  initialActiveStrong?: { verseId: string; strongCode: string };
  /** Vrai quand la concordance recouvre ce panneau : le rend inerte (sinon, sur iOS, le geste sur la
   *  concordance défile cette définition en arrière-plan au lieu de la liste d'occurrences). */
  covered?: boolean;
  onClose: () => void;
}

/**
 * Panneau latéral droit : affiche les versets sélectionnés tokenisés, où chaque mot
 * possédant une référence Strong est une bulle cliquable. Au clic sur une bulle, la définition
 * Strong apparaît dans l'espace en dessous du verset (cf. `StrongVerse`).
 */
export function StrongPanel({
  open,
  loading,
  verses,
  skeletonRows = 1,
  experimental = false,
  version,
  onVersion,
  onSeeOccurrences,
  onNavigateStrong,
  initialActiveStrong,
  covered = false,
  onClose,
}: StrongPanelProps) {
  const strongOriginalText = useReaderPreferences((s) => s.strongOriginalText);
  const setStrongOriginalText = useReaderPreferences((s) => s.setStrongOriginalText);

  if (!open) return null;

  return (
    <>
      {/* Voile semi-transparent (mobile uniquement) — au-dessus de la topbar (z-40) pour la griser. */}
      <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onClose} aria-hidden />

      <aside
        className={cn(
          // Mobile : plein écran, au-dessus de la topbar (z-50 > z-40) pour la recouvrir comme les
          // signets/notes. Desktop : tiroir droit sous la topbar (md:top-20, z-30).
          'animate-slide-in-right fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col bg-background md:top-20 md:z-30 md:w-[440px] md:max-w-[440px]',
          // Recouvert par la concordance : inerte, pour ne pas capter le geste tactile à sa place.
          covered && 'pointer-events-none overflow-hidden',
        )}
      >
        {/* En-tête — padding haut renforcé sur mobile (panneau plein écran collé au bord). Le sélecteur
            de version affiche la version active (et permet de la changer → recharge les Strong). */}
        <div className="flex items-center justify-between gap-2 px-8 pt-6 pb-3 md:py-3">
          <div className="flex min-w-0 items-center gap-2">
            {loading ? (
              <Skeleton className="h-3.5 w-16 rounded-md" />
            ) : (
              <StrongVersionSwitcher version={version} onVersion={onVersion} />
            )}
            <span className="text-[11px] text-muted-foreground">
              {verses.length} verset{verses.length > 1 ? 's' : ''}
            </span>
            {experimental && (
              <span
                title="Données Strong expérimentales pour cette version : l'alignement peut être imparfait."
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[13px] font-medium leading-none text-amber-600 dark:text-amber-400 animate-fade-in-up"
              >
                <Icon icon="hugeicons:test-tube-01" className="h-3 w-3" />
                Expérimental
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setStrongOriginalText(!strongOriginalText)}
              title={strongOriginalText ? 'Masquer le texte original' : 'Afficher le texte original'}
              aria-label={strongOriginalText ? 'Masquer le texte original' : 'Afficher le texte original'}
              aria-pressed={strongOriginalText}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-primary/10 hover:text-primary',
                strongOriginalText ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon icon="hugeicons:language-skill" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Fermer"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <Icon icon="hugeicons:cancel-01" className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {loading ? (
            <StrongPanelSkeleton rows={skeletonRows} />
          ) : verses.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucune donnée Strong disponible pour cette sélection.
            </p>
          ) : (
            <div className="space-y-6">
              {verses.map((verse) => (
                <StrongVerse
                  key={verse.id}
                  verse={verse}
                  showOriginal={strongOriginalText}
                  onSeeOccurrences={onSeeOccurrences}
                  onNavigateStrong={onNavigateStrong}
                  initialActiveStrong={
                    initialActiveStrong && initialActiveStrong.verseId === verse.id
                      ? initialActiveStrong.strongCode
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default StrongPanel;
