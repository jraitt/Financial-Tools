import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/profile', '/settings'];

// Routes that require admin role
const adminRoutes = ['/admin'];

// Routes that should redirect to dashboard if already logged in
const authRoutes = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get session from cookie
  const sessionCookie = request.cookies.get('better-auth.session_token');
  const isAuthenticated = !!sessionCookie?.value;
  
  // Note: We don't redirect authenticated users away from auth pages here
  // because middleware can only check cookie existence, not session validity.
  // Invalid/expired cookies would cause redirect loops between /login and /dashboard.
  
  // Check protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route)) && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Check admin routes - requires server-side session validation
  // For admin routes, we need to verify the role server-side
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Note: Full role verification happens in the admin page/layout
    // Middleware can only check if session exists
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
