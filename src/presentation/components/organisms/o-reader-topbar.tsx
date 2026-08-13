'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/routing';
import { Logo } from '@/src/presentation/components/atoms/a-logo';
import { GLASS_PILL } from '@/src/presentation/components/atoms/a-floating-button';
import { BookChapterSelector } from '@/src/presentation/components/molecules/m-book-chapter-selector';
import { ReferenceChips } from '@/src/presentation/components/molecules/m-reference-chips';
import { AppearanceMenu } from '@/src/presentation/components/molecules/m-appearance-menu';
import { DoodleCard } from '@/src/presentation/components/molecules/m-doodle-card';
import { useDoodle } from '@/src/presentation/hooks/use-doodle';
import { useReaderPreferences } from '@/src/presentation/stores/reader-preferences.store';
import { appIconPath } from '@/src/shared/constants/brand-logos';
import type { BiblicalVerse } from '@/src/domain/entities';
import type { ReaderMode } from '@/src/presentation/lib/reader-helpers';
import type { LogoStyle } from '@/src/shared/constants/reader-preferences';

// Renderer Rive lourd (runtime WASM) — client-only (`ssr:false`), importé dynamiquement pour ne
// pas alourdir le bundle initial ni le SSR. La topbar est client, donc `dynamic` est autorisé.
const DoodleRenderer = dynamic(
  () => import('@/src/presentation/components/molecules/m-doodle-renderer').then((m) => m.DoodleRenderer),
  { ssr: false },
);

interface ReaderTopbarProps {
  mode: ReaderMode;
  /** Mode "refs" : cartes pour les chips de référence. */
  cards: BiblicalVerse[];
  activeId: string | null;
  /** Sélection d'une chip de référence (bascule actif + scroll). */
  onSelectChip: (id: string) => void;
  /** Mode "read" : navigation livre/chapitre. */
  bookId: string;
  chapter: number;
  canPrev: boolean;
  canNext: boolean;
  goPrev: () => void;
  goNext: () => void;
  navigate: (bookId: string, chapter: number) => void;
  /** Mode focus armé → la topbar se retire (lecture immersive). */
  focusMode: boolean;
  /** Pointeur tactile : en focus, le logo bascule sur le favicon (pas de survol). */
  coarse: boolean;
  /** Variante du logo en topbar (desktop uniquement). */
  logoStyle: LogoStyle;
  /** Ouvre l'aide des raccourcis clavier. */
  onOpenHelp: () => void;
}

/**
 * Barre supérieure du lecteur : logo (gauche), sélecteur livre/chapitre ou chips de référence
 * (centre), thème + aide (droite). Conteneur transparent aux clics ; seuls les éléments
 * interactifs les captent. En mode focus, le chrome se retire (translate-y + opacity).
 *
 * Doodles (Phase 7, spec 18) : un doodle actif remplace le logo par sa variante animée Rive. Hors
 * focus, le clic ouvre la carte d'explication (au lieu de naviguer vers `/accueil`) ; en focus, le
 * doodle est discret (pas d'animation, pas de carte), clic inchangé. Sur échec d'asset (404…),
 * repli silencieux sur le logo normal (spec §4.5).
 *
 * Porté de l'ancien `components/organisms/o-reader-topbar.tsx`.
 */
export function ReaderTopbar({
  mode,
  cards,
  activeId,
  onSelectChip,
  bookId,
  chapter,
  canPrev,
  canNext,
  goPrev,
  goNext,
  navigate,
  focusMode,
  coarse,
  logoStyle,
  onOpenHelp,
}: ReaderTopbarProps) {
  const { doodle } = useDoodle();
  // Icône-app choisie (spec 32 §5.5) : une variante nommée remplace le logo SVG themed de la
  // topbar ; `'auto'` conserve le `<Logo>` habituel. Les doodles restent prioritaires (plus bas).
  const appIcon = useReaderPreferences((s) => s.appIcon);
  const brandIconSrc = appIconPath(appIcon);
  const [cardOpen, setCardOpen] = useState(false);
  const [doodleFailed, setDoodleFailed] = useState(false);
  const logoWrapRef = useRef<HTMLSpanElement>(null);

  // Un doodle ne s'affiche que s'il a une animation (asset `.riv`) et n'a pas échoué à charger.
  const showDoodle = !!(doodle?.animate) && !doodleFailed;

  // Réinitialise l'état local quand l'occasion change (changement de jour au passage minuit).
  useEffect(() => {
    setDoodleFailed(false);
    setCardOpen(false);
  }, [doodle?.id]);

  // Ferme la carte au clic extérieur (le bouton logo + la carte sont dans `logoWrapRef`).
  useEffect(() => {
    if (!cardOpen) return;
    const onDocClick = (e: globalThis.MouseEvent) => {
      if (!logoWrapRef.current?.contains(e.target as Node)) setCardOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [cardOpen]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-40 px-4">
      <div className="relative mx-auto flex max-w-[1600px] items-center justify-between">
        {/* Logo du projet — mène à `/accueil`. En mode focus, persiste sans dim et bascule sur le
            mark discret. Doodle actif : variante animée Rive (hors focus, clic → carte ; en focus,
            discret). Sur échec d'asset, repli sur le logo normal. */}
        {showDoodle && !focusMode ? (
          <span ref={logoWrapRef} className="pointer-events-auto relative inline-block">
            <button
              type="button"
              title={`${doodle!.label} — en savoir plus`}
              aria-label={`${doodle!.label} — en savoir plus`}
              onClick={() => setCardOpen((o) => !o)}
              className="inline-block"
            >
              <DoodleRenderer
                id={doodle!.id}
                animate={doodle!.animate!}
                label={doodle!.label}
                className="h-18 md:h-20"
                onError={() => {
                  setDoodleFailed(true);
                  setCardOpen(false);
                }}
              />
            </button>
            {cardOpen && <DoodleCard doodle={doodle!} onClose={() => setCardOpen(false)} />}
          </span>
        ) : showDoodle && focusMode ? (
          // Focus : doodle discret (autoplay=false), pas de carte, clic inchangé (spec §4.5).
          <Link href="/accueil" title="Accueil" className="pointer-events-auto inline-block">
            <DoodleRenderer
              id={doodle!.id}
              animate={doodle!.animate!}
              label={doodle!.label}
              focus
              className="h-18 md:h-20"
              onError={() => setDoodleFailed(true)}
            />
          </Link>
        ) : (
          <Link
            href="/accueil"
            title="Accueil"
            className={cn(
              'pointer-events-auto inline-block transition-opacity duration-200',
              !focusMode && 'hover:opacity-80',
            )}
          >
            {brandIconSrc ? (
              // Variante d'icône-app choisie (spec 32 §5.5) : PNG coloré à la place du logo themed.
              <Image
                src={brandIconSrc}
                alt=""
                width={1254}
                height={1254}
                className="h-9 w-9 md:h-10 md:w-10"
              />
            ) : (
              <Logo className="h-9 md:h-10" logoStyle={logoStyle} focus={focusMode} coarse={coarse} />
            )}
          </Link>
        )}

        {/* Sélecteur / chips — centré. La retraite (translate-y + opacity) vit sur la pilule interne. */}
        <div className="pointer-events-auto absolute left-1/2 top-1/2 flex max-w-[92vw] -translate-x-1/2 -translate-y-1/2 justify-center">
          <div
            className={cn(
              'glass flex items-center rounded-full bg-foreground/[0.02] p-1 backdrop-blur-xl transition-[opacity,transform] duration-200 ease-out',
              focusMode && '-translate-y-2 opacity-0',
            )}
          >
            {mode === 'refs' ? (
              <div className="max-w-[86vw] overflow-hidden">
                <ReferenceChips
                  items={cards.map((c) => ({ id: c.id, reference: c.reference }))}
                  activeId={activeId}
                  onSelect={onSelectChip}
                />
              </div>
            ) : (
              <BookChapterSelector
                bookId={bookId}
                chapter={chapter}
                canPrev={canPrev}
                canNext={canNext}
                onPrev={goPrev}
                onNext={goNext}
                onSelect={navigate}
              />
            )}
          </div>
        </div>

        {/* Réglages à droite : recherche (desktop) + menu Apparence (couleur d'accent, variante du
            logo, thème, réduire les animations, questions, raccourcis clavier). En focus, se
            retirent (translate-y + opacity) ; l'indicateur + sortie vivent dans m-focus-control. */}
        <div
          className={cn(
            'flex items-center gap-2 transition-[opacity,transform] duration-200 ease-out',
            focusMode && '-translate-y-2 opacity-0',
          )}
        >
          {/* Recherche — desktop only (sur mobile, la loupe vit en fin de dock, plus accessible
              au pouce). Pastille glass avec libellé + raccourci ⌘K. Dispatche l'event
              `bym:open-search` écouté par la command palette (o-command-palette.tsx). */}
          <button
            type="button"
            title="Rechercher (⌘K)"
            aria-label="Rechercher"
            onClick={() => window.dispatchEvent(new Event('bym:open-search'))}
            className={cn(
              GLASS_PILL,
              'pointer-events-auto hidden items-center justify-center gap-2 rounded-full text-muted-foreground transition-colors hover:text-foreground md:inline-flex',
              'md:justify-start md:py-2 md:pl-3 md:pr-2.5 md:text-sm',
            )}
          >
            <Icon icon="hugeicons:search-01" className="h-5 w-5 text-primary md:h-4 md:w-4" />
            <span className="hidden md:inline">Rechercher…</span>
            <kbd className="pointer-events-none ml-1 hidden h-5 select-none items-center gap-0.5 rounded-full border border-input bg-foreground/15 px-1.5 font-mono text-[10px] font-medium text-foreground md:inline-flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
          <div className="pointer-events-auto">
            <AppearanceMenu onOpenHelp={onOpenHelp} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReaderTopbar;