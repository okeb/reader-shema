import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAuthConfigured } from '@/lib/auth/server';

const intlMiddleware = createMiddleware(routing);

// Routes protégées par auth (spec 22) : `/account` (gestion compte) et `/admin` (phase 3).
// Aucune ne correspond à une page du lecteur — la lecture reste ouverte (jamais une porte).
// Le compte se présente via une modal juste-à-temps aux points de sauvegarde, jamais à l'entrée.
const protectedRoutes = ['/account', '/admin'];

// Middleware Neon (uniquement si provisionné). loginUrl = racine → l'utilisateur non authentifié
// est renvoyé vers l'accueil (lecture), pas vers une page de login (le sign-in est une modal).
const neonAuthMiddleware = isAuthConfigured ? auth!.middleware({ loginUrl: '/' }) : null;

function pathWithoutLocale(pathname: string): string {
  const locale = pathname.split('/')[1];
  return pathname.replace(`/${locale}`, '') || '/';
}

export default async function middleware(request: NextRequest): Promise<NextResponse> {
  const path = pathWithoutLocale(request.nextUrl.pathname);

  if (neonAuthMiddleware && protectedRoutes.some((r) => path.startsWith(r))) {
    const authResponse = await neonAuthMiddleware(request);
    // On honore uniquement la redirection (non authentifié) ; sinon on retombe sur next-intl.
    if (authResponse && authResponse.status >= 300 && authResponse.status < 400) {
      return authResponse;
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // `data` et `doodle` exclus : les assets statiques `public/data/**` (cross-refs) et
  // `public/doodle/**` (animations `.riv`) doivent être servis tels quels, sans être réécrits par
  // next-intl en `/${locale}/data/…` ou `/${locale}/doodle/…` (ce qui 404).
  // `sitemap.xml` (et tout `.xml`) exclu : next-intl réécrirait `/sitemap.xml` → `/${locale}/sitemap.xml`
  // (404). Servi tel quel par `app/sitemap.ts`. `api` exclu : les routes `app/api/*` (auth, sync) se
  // gèrent elles-mêmes (handler Neon + auth.getSession() dans les routes sync).
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|data|doodle|.*\\.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|map|riv|xml)$).*)',
  ],
};