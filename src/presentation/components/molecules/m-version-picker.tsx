'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { GLASS_PILL } from '@/src/presentation/components/atoms/a-floating-button';
import { useActiveVersion } from '@/src/presentation/stores/active-version.store';
import { BIBLE_VERSIONS, otherVersions } from '@/src/shared/constants/bible-versions';

/**
 * Pastille libellée du dock : choisit la version primaire et active la vue parallèle
 * (« Comparer avec… »). Le panneau est rendu dans un portail et positionné au-dessus du bouton,
 * car le dock applique `overflow-x-auto` (qui rend `overflow-y` clipant) — un dropdown `absolute`
 * y serait rogné. Lit/écrit dans le store `useActiveVersion` (primaire + comparaison).
 *
 * Porté de l'ancien `components/molecules/m-version-picker.tsx`.
 */
export function VersionPicker() {
  const { primary, compare, setPrimary, setCompare } = useActiveVersion();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; bottom: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Ancrage à gauche du bouton : le panneau s'étend vers la droite (le bouton version est en début
      // de dock, un centrage le ferait déborder à gauche sur mobile). Garde contre le débordement
      // droit sur écran étroit : décale le panneau pour qu'il reste dans la fenêtre.
      const margin = 8;
      const panelW = Math.min(256, window.innerWidth - 2 * margin); // w-64, plafonné par le viewport
      let left = r.left;
      const maxLeft = window.innerWidth - panelW - margin;
      if (left > maxLeft) left = Math.max(margin, maxLeft);
      if (left < margin) left = margin;
      setCoords({ left, bottom: window.innerHeight - r.top + 8 });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const comparables = otherVersions(primary.id);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title="Version & comparaison"
        aria-label="Version & comparaison"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-foreground transition-colors hover:bg-primary/10 hover:text-primary',
          open && 'bg-primary/10 text-primary',
        )}
      >
        <Icon icon="hugeicons:book-02" className="h-[18px] w-[18px] shrink-0" />
        <span className="text-[13px] font-semibold">{primary.shortLabel}</span>
        {compare && (
          <span className="rounded bg-primary/10 px-1 text-[11px] font-semibold text-primary">
            +{compare.shortLabel}
          </span>
        )}
        <Icon
          icon="hugeicons:arrow-down-01"
          className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', left: coords.left, bottom: coords.bottom }}
            className={cn('z-50 w-64 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl p-1 shadow-lg', GLASS_PILL)}
          >
            {/* Version primaire */}
            <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Version
            </p>
            {BIBLE_VERSIONS.map((v) => {
              if (v.comingSoon) {
                return (
                  <div
                    key={v.id}
                    aria-disabled
                    title="Bientôt disponible"
                    className="flex w-full cursor-not-allowed items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-muted-foreground/50"
                  >
                    <span className="truncate">{v.label}</span>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                      Bientôt
                    </span>
                  </div>
                );
              }
              const active = v.id === primary.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setPrimary(v.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-primary/10',
                    active ? 'text-primary' : 'text-foreground',
                  )}
                >
                  <span className="truncate">{v.label}</span>
                  {active && <Icon icon="hugeicons:tick-02" className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}

            {/* Comparaison (vue parallèle) */}
            <div className="my-1 h-px bg-border" />
            <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Comparer avec…
            </p>
            {comparables.map((v) => {
              const active = compare?.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setCompare(active ? null : v.id);
                    if (!active) setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-primary/10',
                    active ? 'text-primary' : 'text-foreground',
                  )}
                >
                  <span className="truncate">{v.label}</span>
                  <Icon icon={active ? 'hugeicons:tick-02' : 'hugeicons:add-01'} className="h-4 w-4 shrink-0" />
                </button>
              );
            })}
            {compare && (
              <button
                type="button"
                onClick={() => {
                  setCompare(null);
                  setOpen(false);
                }}
                className="mt-0.5 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
              >
                <Icon icon="hugeicons:cancel-01" className="h-4 w-4 shrink-0" />
                Arrêter la comparaison
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

export default VersionPicker;