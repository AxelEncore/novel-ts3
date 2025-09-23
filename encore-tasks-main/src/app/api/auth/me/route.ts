import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { dbAdapter } from '@/lib/database-adapter';

const databaseAdapter = dbAdapter;
import { createHash } from 'crypto';

// Получение текущего пользователя
export async function GET(request: NextRequest) {
  try {
    console.log('API /auth/me: Starting authentication verification');
    const authResult = await verifyAuth(request);
    console.log('API /auth/me: Auth result:', authResult.success ? 'success' : 'failed', authResult.error || '');
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { userId } = authResult.user!;

    // Dev fallback: return user info directly from JWT without DB
    if (process.env.AUTH_JWT_ONLY === 'true') {
      const jwtUser = authResult.user!;
      const userResult = {
        id: userId,
        name: jwtUser.name || 'User',
        email: jwtUser.email,
        role: jwtUser.role || 'user',
        status: 'active',
        avatar: null,
        createdAt: null,
        updatedAt: null
      };
      const response = NextResponse.json({ user: userResult });
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    console.log('API /auth/me: Getting user by ID:', userId);
    const user = await databaseAdapter.getUserById(userId);
    console.log('API /auth/me: User found:', user ? 'yes' : 'no');
    
    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Преобразование в формат API с правильной типизацией
    const userResult = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: 'active',
      avatar: user.avatar || null,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    // Generate ETag based on user data
     const etag = createHash('md5')
       .update(JSON.stringify(userResult))
       .digest('hex');

    // Check if client has cached version
    const clientETag = request.headers.get('if-none-match');
    if (clientETag === etag) {
      return new NextResponse(null, { status: 304 });
    }

    const response = NextResponse.json({ user: userResult });
    
    // Set caching headers
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', 'private, max-age=300, must-revalidate'); // 5 minutes
    response.headers.set('Vary', 'Authorization, Cookie');
    
    return response;

  } catch (error) {
    console.error('❌ API /auth/me: Critical error occurred:', error);
    console.error('❌ API /auth/me: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ API /auth/me: Error message:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}