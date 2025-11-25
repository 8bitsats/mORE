import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/setup', '/api/auth/login', '/api/auth/check'];

  // Check if the path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check authentication cookie
  const authCookie = request.cookies.get('dashboard_auth');
  const isAuthenticated = authCookie?.value === 'authenticated';

  // If not authenticated, check if password is required
  // We'll let the /api/auth/check endpoint handle this logic
  // For now, redirect unauthenticated users to login
  if (!isAuthenticated && !pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
