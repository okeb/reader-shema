import Image from 'next/image';
import { cn } from '@/lib/utils';
import { type LogoStyle } from '@/src/shared/constants/reader-preferences';

/** Ratio natif des fichiers logotype (2000 × 933). */
const LOGO_W = 2000;
const LOGO_H = 933;
/** Ratio natif des fichiers icône (734 × 734, carré) — sert aussi de favicon. */
const ICON_W = 734;
const ICON_H = 734;

/**
 * Logo du projet. Deux variantes clair/sombre superposées : la bascule suit la classe `.dark`
 * sur `<html>` via les utilitaires `dark:` — pas de JS, pas de flash.
 *
 * En responsive (< md) on affiche toujours l'icône carrée. Sur desktop (≥ md), la variante dépend
 * de `logoStyle` : "logotype" (défaut) = logo complet, "icon" = icône carrée seulement.
 *
 * `focus` (mode focus) : mark carré sur tous les breakpoints, sans dim (spec 17).
 * NB : la convention de nommage des icônes (`icon_light` = mode clair) est l'inverse de celle des
 * logos (`logo_dark` = mode clair) — d'où l'attribution distincte.
 */
export function Logo({
  className,
  logoStyle = 'logotype',
  focus = false,
  coarse = false,
}: {
  className?: string;
  logoStyle?: LogoStyle;
  focus?: boolean;
  coarse?: boolean;
}) {
  const desktopIcon = logoStyle === 'icon';

  if (focus) {
    if (coarse) {
      return (
        <span className={cn('relative inline-block', className)}>
          <span className="inline-block h-full">
            <Image src="/logo/shema_reader-favicon_light.svg" alt="ShemaProject" width={ICON_W} height={ICON_H} priority className="h-full w-auto dark:hidden" />
            <Image src="/logo/shema_reader-favicon_dark.svg" alt="ShemaProject" width={ICON_W} height={ICON_H} priority className="hidden h-full w-auto dark:block" />
          </span>
        </span>
      );
    }
    return (
      <span className={cn('group relative inline-block', className)}>
        <span className="inline-block h-full group-hover:hidden">
          <Image src="/logo/shema_reader-favicon_light.svg" alt="ShemaProject" width={ICON_W} height={ICON_H} priority className="h-full w-auto dark:hidden" />
          <Image src="/logo/shema_reader-favicon_dark.svg" alt="ShemaProject" width={ICON_W} height={ICON_H} priority className="hidden h-full w-auto dark:block" />
        </span>
        <span className="hidden h-full group-hover:inline-block">
          <Image src="/logo/shema_reader-icon_light.svg" alt="ShemaProject" width={ICON_W} height={ICON_H} priority className="h-full w-auto dark:hidden" />
          <Image src="/logo/shema_reader-icon_dark.svg" alt="ShemaProject" width={ICON_W} height={ICON_H} priority className="hidden h-full w-auto dark:block" />
        </span>
      </span>
    );
  }

  return (
    <span className={cn('relative inline-block', className)}>
      <span className={cn('inline-block h-full', desktopIcon ? 'md:inline-block' : 'md:hidden')}>
        <Image src="/logo/shema_reader-icon_light.svg" alt="ShemaProject" width={ICON_W} height={ICON_H} priority className="h-full w-auto dark:hidden" />
        <Image src="/logo/shema_reader-icon_dark.svg" alt="ShemaProject" width={ICON_W} height={ICON_H} priority className="hidden h-full w-auto dark:block" />
      </span>
      <span className={cn('hidden h-full', desktopIcon ? 'md:hidden' : 'md:inline-block')}>
        <Image src="/logo/shema_reader-logo_dark.webp" alt="ShemaProject" width={LOGO_W} height={LOGO_H} priority className="h-full w-auto dark:hidden" />
        <Image src="/logo/shema_reader-logo_light.webp" alt="ShemaProject" width={LOGO_W} height={LOGO_H} priority className="hidden h-full w-auto dark:block" />
      </span>
    </span>
  );
}

export default Logo;