import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { getVersion } from '@/src/shared/constants/bible-versions';
import {
  resolveRead,
  OG_FALLBACK,
  type ReadSearchParams,
} from '@/src/domain/services/reference-formatter.service';
import { fetchOgBody } from '@/src/infrastructure/api/og-api';

/**
 * Vignette de partage Open Graph (spec 14) — image 1200×630 rendue à la volée par `next/og`.
 * Lit `livre/chap/v/refs/version`, valide, récupère le texte dans la version demandée (défaut BYM)
 * et compose la carte. En cas de params invalides ou d'échec API : carte de repli (branding), toujours
 * HTTP 200.
 *
 * Runtime Node (Fluid) : pas besoin d'Edge. La réponse image est mise en cache côté CDN (le texte
 * d'un verset est immuable), ce qui rend les dépliages de lien quasi gratuits.
 *
 * Porté verbatim de l'ancien `app/api/og/route.tsx` (imports remappés vers les services/domaine).
 */
export const runtime = 'nodejs';

const WIDTH = 1200;
const HEIGHT = 630;

// Deux palettes « parchemin » (clair / sombre), contraste AA. Les vignettes OG sont fetchées par
// les crawlers des plateformes (pas le navigateur du lecteur) → le thème du lecteur n'est pas
// observable côté serveur. On l'encode donc dans l'URL (`?theme=`) relayé par `generateMetadata`,
// avec repli best-effort sur le client hint `Sec-CH-Prefers-Color-Scheme` (rarement envoyé).
type Palette = { bg: string; text: string; muted: string; accent: string; rule: string };
const LIGHT: Palette = {
  bg: '#f7f3e9',
  text: '#2b2620',
  muted: '#6f675a',
  accent: '#f76808', // primary clair (hsl(24 94% 50%))
  rule: '#e0d7c3',
};
const DARK: Palette = {
  bg: '#1c1814',
  text: '#f2ead9',
  muted: '#a99e88',
  accent: '#fb7d18', // primary sombre (hsl(24 94% 53%))
  rule: '#3a332a',
};

const CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

/**
 * Charge les assets co-localisés (polices/logo) depuis `process.cwd()`. Leur inclusion dans la
 * fonction serverless est forcée via `experimental.outputFileTracingIncludes` (next.config.ts) —
 * une lecture `fs` depuis la racine du projet, robuste sur Vercel (le runtime Node de `fetch` ne gère
 * pas le protocole `file:`, et `new URL(asset, import.meta.url)` est réécrit par webpack).
 */
const OG_DIR = join(process.cwd(), 'app/api/og');

function loadAssets(): Promise<[Buffer, Buffer, Buffer, Buffer]> {
  return Promise.all([
    readFile(join(OG_DIR, 'NotoSerif-Regular.ttf')),
    readFile(join(OG_DIR, 'NotoSerif-Bold.ttf')),
    readFile(join(OG_DIR, 'logo.png')), // encre sombre → carte claire
    readFile(join(OG_DIR, 'logo-light.png')), // encre claire → carte sombre
  ]);
}

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const sp: ReadSearchParams = {
    livre: searchParams.get('livre') ?? undefined,
    chap: searchParams.get('chap') ?? undefined,
    refs: searchParams.get('refs') ?? undefined,
    v: searchParams.get('v') ?? undefined,
    version: searchParams.get('version') ?? undefined,
  };

  // Résolution du thème : param `theme` explicite → client hint → défaut clair.
  const explicit = searchParams.get('theme');
  const hint = req.headers.get('sec-ch-prefers-color-scheme');
  const theme: 'light' | 'dark' =
    explicit === 'dark' || explicit === 'light' ? explicit : hint === 'dark' ? 'dark' : 'light';
  const C = theme === 'dark' ? DARK : LIGHT;

  const [regular, bold, logoDark, logoLight] = await loadAssets();
  const logo = theme === 'dark' ? logoLight : logoDark;
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;

  const resolved = resolveRead(sp);
  const body = await fetchOgBody(resolved);
  const isFallback = body === null;

  const title = isFallback ? OG_FALLBACK.title : resolved.title;
  const text = isFallback ? OG_FALLBACK.subtitle : `« ${body} »`;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: C.bg,
          padding: '64px',
          fontFamily: 'Noto Serif',
        }}
      >
        {/* En-tête : logo */}
        <div style={{ display: 'flex' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} height={72} width={Math.round((72 * 2000) / 933)} alt="" />
        </div>

        {/* Corps : référence + texte */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Filet d'accent au-dessus de la référence */}
          <div
            style={{
              width: '72px',
              height: '6px',
              backgroundColor: C.accent,
              borderRadius: '3px',
              marginBottom: '24px',
            }}
          />
          <div
            style={{
              fontSize: '54px',
              fontWeight: 700,
              color: C.text,
              lineHeight: 1.1,
              marginBottom: '28px',
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '40px',
              fontWeight: 400,
              color: isFallback ? C.muted : C.text,
              lineHeight: 1.45,
              maxWidth: '1040px',
              maxHeight: '180px',
              overflow: 'hidden',
              // Garde-fou visuel : ne jamais dépasser 3 lignes (la troncature texte vise déjà ~3).
              lineClamp: 3,
            }}
          >
            {text}
          </div>
        </div>

        {/* Pied : filet + domaine + mention version */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{ width: '100%', height: '2px', backgroundColor: C.rule, marginBottom: '20px' }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '26px',
            }}
          >
            <div style={{ color: C.muted }}>reader.shemaproject.org</div>
            <div style={{ color: C.accent, fontWeight: 700, letterSpacing: '1px' }}>
              {getVersion(resolved.version).shortLabel}
            </div>
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

  // `ImageResponse` pose un `Cache-Control` par défaut ; on l'écrase pour maîtriser le cache CDN. Le
  // `Vary` sépare les variantes par client hint (quand le thème vient du hint plutôt que de l'URL).
  image.headers.set('Cache-Control', CACHE_CONTROL);
  image.headers.set('Vary', 'Sec-CH-Prefers-Color-Scheme');
  return image;
}