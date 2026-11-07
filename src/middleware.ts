import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

/** Clients only see /book. Everything else is the owner's and needs the sign-in cookie. */
const PUBLIC = ['/book', '/sign-in'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === '/sign-in' && signedIn) return NextResponse.redirect(new URL('/today', request.url));
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();
  if (pathname === '/') return NextResponse.redirect(new URL(signedIn ? '/today' : '/book', request.url));
  if (!signedIn) {
    const url = new URL('/sign-in', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|api/public).*)'],
};
