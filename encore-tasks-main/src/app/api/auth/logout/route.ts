import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { DatabaseAdapter } from '@/lib/database-adapter';

const databaseAdapter = DatabaseAdapter.getInstance();

export async function POST(request: NextRequest) {
  try {
    // Получение токена из cookie или заголовка
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (token) {
      try {
        // Проверка и декодирование токена
        jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
        
        // Удаление сессии из базы данных
        await databaseAdapter.deleteSession(token);
      } catch (jwtError) {
        // Токен невалиден, но это не критично для выхода
        console.warn('Невалидный токен при выходе:', jwtError);
      }
    }

    // Создание ответа
    const response = NextResponse.json({
      message: 'Успешный выход из системы'
    });

    // Удаление cookie с токеном
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0 // Удаление cookie
    });

    // Удаление клиентского cookie
    response.cookies.set('auth-token-client', '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0 // Удаление cookie
    });

    return response;

  } catch (error) {
    console.error('Ошибка выхода:', error);
    
    // Даже при ошибке удаляем cookie
    const response = NextResponse.json(
      { message: 'Выход выполнен' },
      { status: 200 }
    );

    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0
    });

    response.cookies.set('auth-token-client', '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0
    });

    return response;
  }
}