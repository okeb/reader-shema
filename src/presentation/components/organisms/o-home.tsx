'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { Link, useRouter } from '@/i18n/routing';
import { useReadingPosition } from '@/src/presentation/stores/reading-position.store';
import { useNavigationHistory } from '@/src/presentation/stores/navigation-history.store';
import { groupByDay } from '@/src/presentation/lib/date-grouping';
import { useDoodle } from '@/src/presentation/hooks/use-doodle';
import { Skeleton } from '@/src/presentation/components/atoms/a-skeleton';
import { ThemeMenu } from '@/src/presentation/components/molecules/m-theme-menu';
import { PassageLauncher } from '@/src/presentation/components/molecules/m-passage-launcher';
import { SiteFooter } from '@/src/presentation/components/molecules/m-footer';
import { ShortcutsHelp } from '@/src/presentation/components/molecules/m-shortcuts-help';
import { DoodleCard } from '@/src/presentation/components/molecules/m-doodle-card';
import { BRAND_ICON_LOGOS } from '@/src/shared/constants/brand-logos';

// DoodleRenderer importé en `dynamic({ ssr:false })` : le runtime Rive (WASM) ne se monte que côté
// client ; évite un flash/mismatch SSR (spec 18). Cf. même montage que `o-reader-topbar`.
const DoodleRenderer = dynamic(
  () => import('@/src/presentation/components/molecules/m-doodle-renderer').then((m) => m.DoodleRenderer),
  { ssr: false },
);

/** Ratio natif des fichiers icône (1254 × 1254, carré). */
const ICON_W = 1254;
const ICON_H = 1254;

/**
 * Écran d'accueil (route `/accueil`) — version brandée. La Parole accueille en premier : un bloc
 * marque centré (icône carrée themed + logotype + tagline serif), puis le hero « Reprendre » en grand
 * serif, un lanceur livre/chapitre, les chapitres récemment consultés (additif, descriptif, masqué si
 * vide) et des raccourcis Favoris/Signets. Aucun compteur, aucune streak, aucun push — conforme à la
 * doctrine (spec 00). Accessible à la demande : la racine `/` continue d'auto-reprendre vers le texte
 * (spec 04). Coque centrée, texture de fond subtile, bascule de thème.
 *
 * Porté de l'ancien `components/organisms/o-home.tsx`. `ThemeMenu` lit désormais `next-themes`
 * directement (plus de props `theme`/`onSetTheme`).
 */
export function HomeScreen() {
  const router = useRouter();
  const position = useReadingPosition((s) => s.position);
  const posHydrated = useReadingPosition((s) => s.hydrated);
  const history = useNavigationHistory((s) => s.history);
  const histHydrated = useNavigationHistory((s) => s.hydrated);
  const [helpOpen, setHelpOpen] = useState(false);
  // Accordéon « Récemment consultés » — ouvert par défaut (descriptif, jamais accusateur) ;
  // repliable à la demande. Pas de persistance (spec 16 : aucune nouvelle écriture).
  const [historyOpen, setHistoryOpen] = useState(true);

  // Icône marque aléatoire (spec 32 §5.5) : un logo coloré (or, laine, pelouse, plume, sable) est
  // tiré au hasard côté client après hydratation. L'icône n'est rendue qu'après le montage — le
  // rendu SSR et le premier rendu client renvoient tous deux `null` (pas de mismatch d'hydratation,
  // pas de flash d'un logo déterministe), puis l'icône apparaît dans la tuile `h-28 w-28` qui réserve
  // déjà l'espace (pas de layout shift). Miroir du favicon dynamique (`app/brand-icon/route.ts`).
  const [logoIdx, setLogoIdx] = useState<number | null>(null);
  useEffect(() => {
    setLogoIdx(Math.floor(Math.random() * BRAND_ICON_LOGOS.length));
  }, []);

  // Doodle (spec 18) : un doodle actif remplace l'icône du bloc marque par sa variante animée Rive.
  // Même montage que la topbar (`o-reader-topbar`) : résolution client (`useDoodle`), repli sur
  // l'icône normale si l'asset `.riv` échoue, carte d'explication au clic (fermée par clic extérieur).
  const { doodle } = useDoodle();
  const [cardOpen, setCardOpen] = useState(false);
  const [doodleFailed, setDoodleFailed] = useState(false);
  const logoWrapRef = useRef<HTMLSpanElement>(null);
  const showDoodle = !!(doodle?.animate) && !doodleFailed;

  // (Re)joue le doodle quand l'occasion change : réarme l'affichage et ferme la carte.
  useEffect(() => {
    setDoodleFailed(false);
    setCardOpen(false);
  }, [doodle?.id]);

  // Ferme la carte au clic extérieur (le bouton doodle + la carte sont dans `logoWrapRef`).
  useEffect(() => {
    if (!cardOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!logoWrapRef.current?.contains(e.target as Node)) setCardOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [cardOpen]);

  // Raccourcis : « Échap » reprend la lecture (auto-reprise), « ? » affiche l'aide (miroir favoris).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        router.push('/read');
      } else if (e.key === '?') {
        e.preventDefault();
        setHelpOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  const hasPosition = posHydrated && position != null;
  const heroHref = hasPosition
    ? { pathname: '/read' as const, query: { livre: position!.bookId, chap: String(position!.chapter) } }
    : { pathname: '/read' as const, query: { livre: 'jean', chap: '1' } };
  const heroLabel = hasPosition ? 'Reprendre la lecture' : 'Commencer la lecture';
  const heroRef = hasPosition ? position!.reference : 'Jean 1';

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Texture de fond subtile en haut — teinte de `foreground` (contrastée dans chaque thème). */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[55vh] bg-gradient-to-b from-foreground/[5%] to-transparent" />

      <div className="relative mx-auto max-w-[68ch] px-4 py-16">
        {/* Paramètres — discret, en haut à droite (le bloc marque porte le logo). Menu déroulant
            avec les trois choix explicites de thème (Clair / Sombre / Système). */}
        <div className="flex justify-end pt-6">
          <ThemeMenu />
        </div>

        {/* Bloc marque — icône carrée themed sur tuile, logotype, tagline serif. Un doodle actif
            (spec 18) remplace l'icône par sa variante animée Rive ; clic → carte d'explication. */}
        <header className="flex flex-col items-center pt-16 text-center">
          {showDoodle ? (
            <span ref={logoWrapRef} className="relative inline-block">
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
                  className="h-28"
                  onError={() => {
                    setDoodleFailed(true);
                    setCardOpen(false);
                  }}
                />
              </button>
              {cardOpen && <DoodleCard doodle={doodle!} onClose={() => setCardOpen(false)} />}
            </span>
          ) : (
            <div className="flex h-28 w-28 items-center justify-center">
              {/* Icône carrée colorée aléatoire (cf. favicon `/brand-icon`) : un logo parmi les 5
                  déclinaisons (or, laine, pelouse, plume, sable), tiré au hasard après hydratation. */}
              {logoIdx !== null && (
                <Image
                  src={BRAND_ICON_LOGOS[logoIdx]}
                  alt=""
                  width={ICON_W}
                  height={ICON_H}
                  priority
                  className="h-19 w-19 md:h-21 md:w-21"
                />
              )}
            </div>
          )}
          <h1 className="mt-6 font-serif text-3xl font-semibold tracking-tighter">Shema&nbsp;Reader</h1>
          <p className="mt-1.5 font-reader text-base text-muted-foreground">
            La Parole du Seigneur Yehoshoua tout simplement
          </p>
        </header>

        {/* Hero — la Parole accueille (référence en grand serif). Squelette tant que la position
            n'est pas hydratée, pour ne jamais afficher un mauvais contenu (pas de flash « Commencer »
            pour un lecteur qui a une position). */}
        {posHydrated ? (
          <Link
            href={heroHref}
            aria-label={`${heroLabel} — ${heroRef}`}
            className="group mt-12 block w-full animate-fade-in-up rounded-3xl bg-gradient-to-br from-foreground/[5%] to-foreground/[1%] p-8 text-center transition-all duration-500 hover:from-foreground/[7%] hover:to-foreground/[2%] hover:ring-foreground/20"
          >
            <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
              {heroLabel}
            </span>
            <span className="mt-3 block font-reader text-5xl font-medium tracking-tight text-foreground transition-all group-hover:text-primary sm:text-6xl">
              {heroRef}
            </span>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-all group-hover:text-primary">
              continuer
              <Icon icon="hugeicons:arrow-right-01" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ) : (
          <Skeleton className="mx-auto mt-12 h-[148px] w-full max-w-xl rounded-3xl" />
        )}

        {/* Lanceur de passage — point d'entrée pour choisir où lire. Bloc large : le panneau
            s'étale sur toute la largeur (max-w-2xl), le déclencheur est centré au-dessus. */}
        <div className="mx-auto mt-8 w-full max-w-2xl">
          <PassageLauncher onSelect={(b, c) => router.push({ pathname: '/read', query: { livre: b, chap: String(c) } })} />
        </div>

        {/* « Mes passages » — carte secondaire unifiée : fil de lecture récent (accordéon repliable)
            au-dessus, séparateur, puis Favoris et Signets en deux cellules intégrées. Pas d'état vide
            accusateur : si l'historique est vide, seule la rangée Favoris/Signets reste (aucun message
            « vous n'avez rien lu »). Doctrine : additif, descriptif, pull pas push (spec 00). */}
        <section
          aria-label="Mes passages"
          className="mx-auto mt-14 w-full max-w-2xl animate-fade-in-up overflow-hidden rounded-3xl border border-input bg-background/60 backdrop-blur-md"
        >
          {/* Accordéon : Récemment consultés (masqué si vide). */}
          {histHydrated && history.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setHistoryOpen((o) => !o)}
                aria-expanded={historyOpen}
                aria-controls="home-recent-list"
                className="flex w-full items-center gap-2 px-5 py-4 text-left transition-colors hover:bg-foreground/[3%]"
              >
                <Icon icon="hugeicons:clock-01" className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Récemment consultés</span>
                <Icon
                  icon="hugeicons:arrow-down-01"
                  className={cn(
                    'ml-auto h-4 w-4 text-muted-foreground/60 transition-transform duration-300',
                    historyOpen && 'rotate-180',
                  )}
                />
              </button>
              {/* Hauteur animée via la grille 0fr → 1fr (pas de mesure, pas de flash). */}
              <div
                id="home-recent-list"
                className={cn(
                  'grid transition-all duration-300 ease-out',
                  historyOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
              >
                <div className="overflow-hidden">
                  <div className="space-y-5 px-5 pb-6 pt-1 text-center">
                    {groupByDay(history.slice(0, 8)).map((group) => (
                      <div key={group.label}>
                        <div className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
                          {group.label}
                        </div>
                        <ul className="flex flex-wrap justify-center gap-2">
                          {group.items.map((entry) => {
                            const u = new URL(entry.url, 'http://l');
                            return (
                            <li key={entry.id}>
                              <Link
                                href={{ pathname: '/read', query: Object.fromEntries(u.searchParams) }}
                                aria-label={`Revenir à ${entry.reference}`}
                                className="inline-flex items-center rounded-full border border-input bg-background px-3 py-1.5 text-sm text-foreground/90 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                              >
                                {entry.reference}
                              </Link>
                            </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mx-5 h-px bg-foreground/10" />
            </>
          )}

          {/* Favoris + Signets — deux cellules intégrées à la même carte (page Favoris / panneau
              Signets ouvert au montage). */}
          <div className="grid grid-cols-2">
            <Link
              href="/favoris"
              className="flex items-center justify-center gap-2 border-r border-foreground/10 px-4 py-4 text-sm text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
            >
              <Icon icon="hugeicons:heart-check" className="h-4 w-4" />
              Favoris
            </Link>
            <Link
              href={{ pathname: '/read', query: { signets: '1' } }}
              className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
            >
              <Icon icon="hugeicons:all-bookmark" className="h-4 w-4" />
              Signets
            </Link>
          </div>
        </section>
      </div>
      <SiteFooter className="mx-auto max-w-[68ch]" />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

export default HomeScreen;