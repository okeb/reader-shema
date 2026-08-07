import type { NextConfig } from 'next';
import path from 'node:path';

/**
 * next-intl 3.26.5 câble son alias Turbopack via `experimental.turbo.resolveAlias`, mais Next 16
 * a déplacé la config Turbopack au niveau racine (`turbopack.*`). L'alias du plugin n'étant plus
 * appliqué, `next-intl/config` résout vers un stub qui lance "Couldn't find next-intl config file".
 * On déclare donc l'alias manuellement à l'emplacement attendu par Next 16.
 * (Si next-intl ≥ 4 est adopté plus tard, on pourra revenir au plugin `createNextIntlPlugin`.)
 */
const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // Chemin relatif (Turbopack n'accepte pas d'import absolu type serveur ici).
      'next-intl/config': './i18n/request.ts',
    },
  },
  sassOptions: {
    includePaths: [path.join(process.cwd(), 'styles')],
  },
  // Force l'inclusion des assets de la vignette OG (polices Satori + logo) dans la
  // fonction /api/og — lus via fs depuis process.cwd() (cf. app/api/og/route.tsx).
  outputFileTracingIncludes: {
    '/api/og': ['./app/api/og/*.ttf', './app/api/og/*.png'],
  },
  // TODO(Phase 1): redirects permanents depuis l'ancienne route `/bym/*` — à valider après
  // l'interaction avec le middleware next-intl (localePrefix: 'always').
  async redirects() {
    return [];
  },
};

export default nextConfig;