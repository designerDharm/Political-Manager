import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/super-admin', '/campaigns', '/agent'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!isProtected) {
    return NextResponse.next();
  }

  // Session token presence check (deep validation occurs in server component / API guard)
  const sessionCookie = req.cookies.get('campaignops_session')?.value;

  if (!sessionCookie) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/super-admin/:path*', '/campaigns/:path*', '/agent/:path*'],
};
