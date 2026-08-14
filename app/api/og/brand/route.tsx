import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { BRAND_ICONS } from '@/src/shared/constants/brand-logos';

/**
 * Vignette Open Graph **par défaut** (spec 35) — la carte de marque du lecteur, servie quand une
 * page ne définit pas sa propre image OG (page d'accueil, strong, etc.). Les pages `/read` gardent
 * leur vignette contextuelle (`/api/og`) via `openGraph.images` explicite dans `generateMetadata`.
 *
 * Composition : fond sombre (palette « parchemin sombre » partagée avec `/api/og`), un logo marque
 * **tiré au hasard** parmi les 5 déclinaisons colorées (or, laine, pelouse, plume, sable — cf.
 * `BRAND_ICONS`), puis en bas le titre « Shema Reader » en Noto Serif et la tagline
 * « lire, comprendre, méditer ».
 *
 * Le tirage aléatoire suit la même philosophie que la route `/brand-icon` (favicon aléatoire,
 * spec 32 §5.5) : `force-dynamic` + `Cache-Control: no-store` → un logo différent à chaque requête
 * du scraper. Les plateformes sociales cachent l'image de leur côté après première fetch, donc
 * chaque partage affiche potentiellement une variante différente — c'est voulu.
 *
 * Runtime Node (Fluid) — pas d'Edge. Polices Noto Serif co-localisées avec `/api/og` (réutilisées
 * via `outputFileTracingIncludes`).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WIDTH = 1200;
const HEIGHT = 630;

// Palette « parchemin sombre » identique à la vignette `/api/og` (contraste AA).
const DARK = {
  bg: '#1c1814',
  text: '#f2ead9',
  muted: '#a99e88',
  accent: '#fb7d18', // primary sombre (hsl(24 94% 53%))
  rule: '#3a332a',
} as const;

const OG_DIR = join(process.cwd(), 'app/api/og');

/**
 * Polices + 5 logos marques lus une seule fois au chargement du module (immutables). Les logos sont
 * des PNG carrés 1254 × 1254 ; on en tire un au hasard par requête.
 */
const [regular, bold, ...logos] = await Promise.all([
  readFile(join(OG_DIR, 'NotoSerif-Regular.ttf')),
  readFile(join(OG_DIR, 'NotoSerif-Bold.ttf')),
  ...BRAND_ICONS.map((b) => readFile(join(process.cwd(), 'public', b.path.slice(1)))),
]);

const LOGOS: Buffer[] = logos;

export async function GET(): Promise<Response> {
  const logo = LOGOS[Math.floor(Math.random() * LOGOS.length)]!;
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: DARK.bg,
          padding: '64px',
          fontFamily: 'Noto Serif',
        }}
      >
        {/* Logo aléatoire centré dans la zone supérieure */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={240} height={240} alt="" />
        </div>

        {/* Pied : filet d'accent + titre « Shema Reader » + tagline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '6px',
              backgroundColor: DARK.accent,
              borderRadius: '3px',
              marginBottom: '28px',
            }}
          />
          <div
            style={{
              fontSize: '76px',
              fontWeight: 700,
              color: DARK.text,
              letterSpacing: '2px',
              lineHeight: 1,
            }}
          >
            Shema Reader
          </div>
          <div
            style={{
              fontSize: '34px',
              fontWeight: 400,
              color: DARK.muted,
              marginTop: '18px',
              fontStyle: 'italic',
            }}
          >
            lire, comprendre, méditer
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: 'Noto Serif', data: regular, weight: 400, style: 'normal' },
        { name: 'Noto Serif', data: bold, weight: 700, style: 'normal' },
      ],
    },
  );

  // `no-store` : un logo différent à chaque requête du scraper (cf. /brand-icon).
  image.headers.set('Cache-Control', 'no-store, max-age=0');
  return image;
}