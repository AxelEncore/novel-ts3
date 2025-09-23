import { NextResponse } from 'next/server';
import { generateCSRFToken, getCSRFCookieOptions } from '@/lib/csrf';

export async function GET() {
  try {
    // Generate new CSRF token
    const csrfToken = generateCSRFToken();
    
    // Create response with token
    const response = NextResponse.json({ csrfToken });
    
    // Set CSRF token cookie
    const cookieOptions = getCSRFCookieOptions();
    response.cookies.set(cookieOptions.name, csrfToken, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      maxAge: cookieOptions.maxAge,
    });
    
    // Set cache headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}