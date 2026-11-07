import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

/** Clients only see /book. Everything else is the owner's and needs the sign-in cookie. */
const PUBLIC = ['/book', '/sign-in'];
/** The owner's screens. After sign-in, only these are safe to return to. */
const OWNER_ROUTES = ['/today', '/schedule', '/clients', '/money'];
/** Addresses people guess for the owner's side; they all mean "take me to the app". */
const ALIASES = ['/admin', '/dashboard', '/login', '/owner', '/app'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === '/sign-in' && signedIn) return NextResponse.redirect(new URL('/today', request.url));
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();
  if (pathname === '/') return NextResponse.redirect(new URL(signedIn ? '/today' : '/book', request.url));
  if (ALIASES.includes(pathname)) return NextResponse.redirect(new URL(signedIn ? '/today' : '/sign-in', request.url));
  if (!signedIn) {
    const url = new URL('/sign-in', request.url);
    if (OWNER_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|api/public).*)'],
};
