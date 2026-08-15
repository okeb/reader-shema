import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { isAuthConfigured } from '@/lib/auth/server';
import { getSessionCookie } from 'better-auth/cookies';

const intlMiddleware = createMiddleware(routing);

// Routes protégées par auth (spec 22 → spec 26) : `/account` (gestion compte) et `/admin`
// (phase 3). Aucune ne correspond à une page du lecteur — la lecture reste ouverte (jamais
// une porte). Le compte se présente via une modal juste-à-temps aux points de sauvegarde,
// jamais à l'entrée. `/reinitialiser` (reset mot de passe) est PUBLIC : ne pas l'ajouter ici.
const protectedRoutes = ['/account', '/admin'];

function pathWithoutLocale(pathname: string): string {
  const locale = pathname.split('/')[1];
  return pathname.replace(`/${locale}`, '') || '/';
}

export default async function middleware(request: NextRequest): Promise<NextResponse> {
  const path = pathWithoutLocale(request.nextUrl.pathname);

  if (isAuthConfigured && protectedRoutes.some((r) => path.startsWith(r))) {
    // Gate par présence de cookie de session (NON vérifiée — légère, sans hit DB).
    // La vérité réelle est re-validée côté serveur dans `requireUser()` (auth.api.getSession).
    // Pas de cookie → renvoi vers l'accueil (lecture), pas vers une page de login
    // (le sign-in reste une modal).
    const sessionCookie = getSessionCookie(request.headers);
    if (!sessionCookie) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
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
  // gèrent elles-mêmes (handler Better Auth + requireUser() dans les routes sync).
  // `brand-icon` exclu (spec 32 §5.5) : la route `app/brand-icon/route.ts` sert le favicon (PNG
  // aléatoire ou variante choisie via `?icon=<key>`) depuis la racine, hors `[locale]`. Sans cette
  // exclusion, next-intl réécrirait `/brand-icon` → `/${locale}/brand-icon` (307), qui 404 car
  // aucune route n'existe sous `[locale]/brand-icon` — le favicon ne s'affichait plus.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|data|doodle|brand-icon|.*\\.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|map|riv|xml)$).*)',
  ],
};