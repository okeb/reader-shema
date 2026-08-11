'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { GLASS_PILL } from '@/src/presentation/components/atoms/a-floating-button';
import { useReaderPreferences } from '@/src/presentation/stores/reader-preferences.store';
import { useThemeCycle } from '@/src/presentation/hooks/use-theme-cycle';
import {
  ACCENT_OPTIONS,
  LOGO_STYLE_OPTIONS,
  AVATAR_STYLE_OPTIONS,
  PLAYFUL_VARIANT_OPTIONS,
} from '@/src/shared/constants/reader-preferences';
import { useSessionIndicator } from '@/src/presentation/components/organisms/o-account-provider';
import { Avatar } from '@/src/presentation/components/atoms/a-avatar';
import type { Theme } from '@/src/shared/constants/theme';

const THEME_OPTIONS: { key: Theme; label: string }[] = [
  { key: 'light', label: 'Clair' },
  { key: 'dark', label: 'Sombre' },
  { key: 'system', label: 'Système' },
];

interface AppearanceMenuProps {
  /** Ouvre l'aide des raccourcis clavier. */
  onOpenHelp?: () => void;
  /** Classes additionnelles sur la racine. */
  className?: string;
}

/**
 * Menu « Apparence » de la topbar (roue crantée, à droite) : regroupe la personnalisation
 * cosmétique globale de l'app — thème (clair/sombre/système), couleur d'accent (7 pastilles),
 * variante du logo (desktop), réduction des animations (accessibilité), activation des questions
 * (quiz) et aide des raccourcis clavier. La mise en page du texte (police, taille, interligne,
 * fond de lecture/sépia, mode focus…) vit dans le panneau Réglages de lecture ([Aa]) du dock.
 *
 * Spec 27 : connecté, le déclencheur devient l'avatar de l'utilisateur (fond thématique, seed =
 * `user.id`) au lieu de la roue crantée ; le menu ajoute une section « Avatar » (choix du
 * générateur `minidenticons`/`playful` + variante `playful`). Déconnecté, la roue crantée reste
 * et l'entrée « Compte & synchronisation / Se connecter » ouvre la modale de compte.
 *
 * Self-contained : lit `useReaderPreferences` (accent, logoStyle, reduceMotion, quizEnabled,
 * avatarStyle, avatarVariant) et `useThemeCycle` (thème). Popover ancré à droite (sous le bouton,
 * bord droit) car le bouton vit à droite de la topbar. Ferme au clic dehors et à Échap.
 *
 * Porté de l'ancien `components/molecules/m-appearance-menu.tsx`.
 */
export function AppearanceMenu({ onOpenHelp, className }: AppearanceMenuProps) {
  const prefs = useReaderPreferences();
  const { theme, setTheme, mounted } = useThemeCycle();
  const session = useSessionIndicator();
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
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const current: Theme = theme;

  // Spec 27 : connecté → le déclencheur devient l'avatar (fond thématique) au lieu de la roue crantée.
  const showAvatar = session.active === true && session.userId !== null;
  const avatarSeed = session.userId ?? '';

  return (
    <div ref={ref} className={cn('relative inline-flex items-center', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={showAvatar ? (session.email ?? 'Compte') : 'Apparence'}
        aria-label={showAvatar ? 'Compte et apparence' : 'Apparence (couleur, logo, fond de lecture, animations)'}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'pointer-events-auto relative inline-flex h-9 w-9 items-center justify-center rounded-full transition',
          showAvatar
            ? 'ring-1 ring-transparent hover:scale-105 hover:ring-border'
            : cn(GLASS_PILL, 'text-muted-foreground hover:text-foreground', open && 'text-foreground'),
        )}
      >
        {showAvatar ? (
          <Avatar seed={avatarSeed} style={prefs.avatarStyle} variant={prefs.avatarVariant} className="h-9 w-9" />
        ) : (
          <Icon icon="hugeicons:settings-02" className={cn('h-[18px] w-[18px]', open ? 'text-primary' : 'text-current')} />
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Apparence"
          className={cn(
            'pointer-events-auto absolute right-0 top-full mt-2 w-72 origin-top-right overflow-hidden rounded-xl shadow-2xl animate-fade-in-up',
            GLASS_PILL,
          )}
        >
          {/* Compte & synchronisation — spec 22. Discret, hors champ de lecture. */}
          {/* Déconnecté : bouton « Se connecter » mis en avant (CTA primaire, sans libellé
              « Compte & synchronisation » devant). Connecté : ligne e-mail discrète. */}
          {session.active === false ? (
            <div className="p-3">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  window.dispatchEvent(new Event('bym:open-account'));
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <Icon icon="hugeicons:user-circle" className="h-4 w-4 shrink-0" />
                Se connecter
              </button>
            </div>
          ) : session.active === true ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new Event('bym:open-account'));
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-foreground/5"
            >
              <Icon
                icon="hugeicons:user-check-02"
                className="h-4 w-4 shrink-0 text-muted-foreground"
              />
              <span className="flex-1 truncate text-foreground">
                {session.email ?? 'Compte'}
              </span>
            </button>
          ) : null}
          {session.active !== null && <div className="mx-3 h-px bg-border" />}

          {/* Avatar — spec 27. Uniquement connecté (seed = user.id). Choix du générateur +,
              pour `playful`, de la variante. Préférence cosmétique locale, synchronisée. */}
          {showAvatar && (
            <>
              <p className="px-3 pb-1 pt-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Avatar
              </p>
              <div className="mx-3 mb-2 flex gap-0.5 rounded-lg bg-input p-0.5">
                {AVATAR_STYLE_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={o.key === prefs.avatarStyle}
                    onClick={() => prefs.setAvatarStyle(o.key)}
                    className={cn(
                      'flex-1 rounded-md px-1.5 py-1 text-[10.5px] font-medium leading-tight transition-colors',
                      o.key === prefs.avatarStyle
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-foreground/70 hover:text-foreground',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {prefs.avatarStyle === 'playful' && (
                <div className="grid grid-cols-6 gap-1.5 px-3 pb-3">
                  {PLAYFUL_VARIANT_OPTIONS.map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      role="menuitemradio"
                      aria-checked={o.key === prefs.avatarVariant}
                      title={o.label}
                      aria-label={o.label}
                      onClick={() => prefs.setAvatarVariant(o.key)}
                      className={cn(
                        'aspect-square overflow-hidden rounded-full transition-transform hover:scale-110',
                        o.key === prefs.avatarVariant
                          ? 'ring-2 ring-foreground ring-offset-1 ring-offset-background'
                          : 'ring-1 ring-border',
                      )}
                    >
                      <Avatar seed={avatarSeed} style="playful" variant={o.key} className="h-full w-full" />
                    </button>
                  ))}
                </div>
              )}
              <div className="mx-3 h-px bg-border" />
            </>
          )}

          {/* Thème (clair / sombre / système) — on attend le montage (next-themes) pour cocher. */}
          <p className="px-3 pb-1 pt-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Thème
          </p>
          <div className="mx-3 mb-3 flex gap-0.5 rounded-lg bg-input p-0.5">
            {THEME_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                role="menuitemradio"
                aria-checked={mounted && o.key === current}
                onClick={() => {
                  setTheme(o.key);
                  setOpen(false);
                }}
                className={cn(
                  'flex-1 rounded-md px-1.5 py-1 text-[10.5px] font-medium leading-tight transition-colors',
                  mounted && o.key === current
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-foreground/70 hover:text-foreground',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* Couleur d'accent */}
          <div className="mx-3 h-px bg-border" />
          <p className="px-3 pb-1 pt-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Couleur d&apos;accent
          </p>
          <div className="flex justify-between px-3 pb-3 pt-0.5">
            {ACCENT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                role="menuitemradio"
                aria-checked={opt.key === prefs.accent}
                title={opt.label}
                aria-label={opt.label}
                onClick={() => {
                  prefs.setAccent(opt.key);
                  setOpen(false);
                }}
                style={{ backgroundColor: `hsl(${opt.light})` }}
                className={cn(
                  'h-7 w-7 rounded-full transition-transform hover:scale-110',
                  opt.key === prefs.accent
                    ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                    : 'ring-1 ring-black/10 dark:ring-white/15',
                )}
              />
            ))}
          </div>

          {/* Variante du logo — desktop uniquement (sur mobile l'icône carrée est toujours affichée). */}
          <div className="hidden md:block">
            <div className="mx-3 h-px bg-border" />
            <p className="px-3 pb-1 pt-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Logo
            </p>
            <div className="mx-3 mb-3 flex gap-0.5 rounded-lg bg-input p-0.5">
              {LOGO_STYLE_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={o.key === prefs.logoStyle}
                  onClick={() => {
                    prefs.setLogoStyle(o.key);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex-1 rounded-md px-1.5 py-1 text-[10.5px] font-medium leading-tight transition-colors',
                    o.key === prefs.logoStyle
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-foreground/70 hover:text-foreground',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Réduire les animations */}
          <div className="mx-3 h-px bg-border" />
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={prefs.reduceMotion}
            onClick={() => prefs.setReduceMotion(!prefs.reduceMotion)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-foreground/5"
          >
            <span className="flex items-center gap-2.5">
              <Icon icon="hugeicons:pause-01" className="h-4 w-4 shrink-0 text-muted-foreground" />
              Réduire les animations
            </span>
            <span className={cn('relative h-4 w-7 rounded-full transition-colors', prefs.reduceMotion ? 'bg-primary' : 'bg-input')}>
              <span
                className={cn(
                  'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all',
                  prefs.reduceMotion ? 'left-[14px]' : 'left-0.5',
                )}
              />
            </span>
          </button>

          {/* Questions (quiz) */}
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={prefs.quizEnabled}
            onClick={prefs.toggleQuiz}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-foreground/5"
          >
            <span className="flex items-center gap-2.5">
              <Icon icon="hugeicons:help-circle" className="h-4 w-4 shrink-0 text-muted-foreground" />
              Questions
            </span>
            <span className={cn('relative h-4 w-7 rounded-full transition-colors', prefs.quizEnabled ? 'bg-primary' : 'bg-input')}>
              <span
                className={cn(
                  'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all',
                  prefs.quizEnabled ? 'left-[14px]' : 'left-0.5',
                )}
              />
            </span>
          </button>

          {/* Raccourcis clavier — desktop only */}
          {onOpenHelp && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenHelp();
              }}
              className="hidden w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-foreground/5 sm:flex"
            >
              <Icon icon="hugeicons:keyboard" className="h-4 w-4 shrink-0 text-muted-foreground" />
              Raccourcis clavier
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default AppearanceMenu;