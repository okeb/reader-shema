import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

// Routes protégées (backend/compte-sync) — vide pour l'instant.
// TODO(spec 22): ajouter le gating d'authentification quand le backend lands.
const protectedRoutes: string[] = [];

// Routes d'auth (interdites si connecté) — vide pour l'instant.
const authRoutes: string[] = [];

function isAuthenticated(_request: NextRequest): boolean {
  // TODO(spec 22): vérifier les cookies d'auth (whatpass-auth / session).
  return false;
}

function authMiddleware(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const authenticated = isAuthenticated(request);

  const locale = pathname.split('/')[1];
  const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';

  if (authenticated && authRoutes.some((r) => pathWithoutLocale.startsWith(r))) {
    return NextResponse.redirect(new URL(`/${locale}/accueil`, request.url));
  }

  if (
    !authenticated &&
    protectedRoutes.some((r) => pathWithoutLocale.startsWith(r))
  ) {
    return NextResponse.redirect(new URL(`/${locale}/accueil`, request.url));
  }

  return null;
}

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const authResponse = authMiddleware(request);
  if (authResponse) return authResponse;

  return intlMiddleware(request);
}

export const config = {
  // `data` et `doodle` exclus : les assets statiques `public/data/**` (cross-refs) et
  // `public/doodle/**` (animations `.riv`) doivent être servis tels quels, sans être réécrits par
  // next-intl en `/${locale}/data/…` ou `/${locale}/doodle/…` (ce qui 404).
  // `sitemap.xml` (et tout `.xml`) exclu : next-intl réécrirait `/sitemap.xml` → `/${locale}/sitemap.xml`
  // (404). Servi tel quel par `app/sitemap.ts`.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|data|doodle|.*\\.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|map|riv|xml)$).*)',
  ],
};