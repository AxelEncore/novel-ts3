import { NextRequest } from 'next/server';

// CSRF token configuration
const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf-token';

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  // Check if we're in Node.js environment
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      // Use dynamic import for Node.js crypto
      const crypto = eval('require("crypto")');
      if (crypto && typeof crypto.randomBytes === 'function') {
        return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
      }
    } catch (e) {
      // Fall through to Web Crypto API
    }
  }
  
  // Use Web Crypto API (browser/edge runtime)
  const array = new Uint8Array(CSRF_TOKEN_LENGTH);
  globalThis.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify CSRF token from request
 */
export function verifyCSRFToken(request: NextRequest): boolean {
  // Skip CSRF check for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  
  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  // Both tokens must exist and match
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return false;
  }

  return true;
}

/**
 * Create CSRF cookie options
 */
export function getCSRFCookieOptions() {
  return {
    name: CSRF_COOKIE_NAME,
    httpOnly: false, // Must be accessible to JavaScript for header inclusion
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  };
}

/**
 * Get CSRF token from request cookies
 */
export function getCSRFTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value || null;
}

export { CSRF_HEADER_NAME, CSRF_COOKIE_NAME };