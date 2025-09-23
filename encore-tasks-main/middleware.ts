import { NextRequest, NextResponse } from 'next/server';
import { verifyCSRFToken } from '@/lib/csrf';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // CSRF Protection for API routes (except GET, HEAD, OPTIONS and CSRF endpoint)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/csrf')) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      if (!verifyCSRFToken(request)) {
        return NextResponse.json(
          { error: 'CSRF token validation failed' },
          { status: 403 }
        );
      }
    }
  }
  
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);

  // Cache control for different types of requests

  // API routes - no cache for dynamic content
  if (pathname.startsWith('/api/')) {
    if (pathname.includes('/auth/') || pathname.includes('/users/') || pathname.includes('/tasks/')) {
      // Dynamic content - no cache
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    } else {
      // Semi-static content - short cache
      response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    }
  }

  // Static assets - long cache
  if (pathname.startsWith('/_next/static/') || 
      pathname.startsWith('/favicon.ico') ||
      pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // HTML pages - short cache with revalidation
  if (pathname === '/' || (!pathname.startsWith('/api/') && !pathname.startsWith('/_next/'))) {
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  }

  return response;
}

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