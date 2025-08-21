import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/login'];
  
  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  // If it's a public route, allow access
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Check for Firebase token in cookies
  const token = request.cookies.get('firebase-token');
  
  // If no token, redirect to login
  if (!token) {
    console.log('Middleware: No token found, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Token exists, allow access
  console.log('Middleware: Token found, allowing access to', pathname);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 