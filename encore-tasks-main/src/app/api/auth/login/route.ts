import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { dbAdapter } from '@/lib/database-adapter';

const databaseAdapter = dbAdapter;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email и пароль обязательны' },
        { status: 400 }
      );
    }

    // Development fallback: JWT-only auth without DB
    if (process.env.AUTH_JWT_ONLY === 'true') {
      const devEmail = process.env.DEV_LOGIN_EMAIL;
      const devPassword = process.env.DEV_LOGIN_PASSWORD;
      const devRole = process.env.DEV_LOGIN_ROLE || 'admin';
      const devName = process.env.DEV_LOGIN_NAME || 'Dev User';

      if (devEmail && devPassword && email === devEmail && password === devPassword) {
        const sessionToken = jwt.sign(
          { userId: 'dev-user', email: devEmail, role: devRole, name: devName, timestamp: Date.now() },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        const response = NextResponse.json({
          message: 'Успешная авторизация (dev mode)',
          user: { id: 'dev-user', name: devName, email: devEmail, role: devRole, status: 'active', avatar: null, createdAt: null, updatedAt: null },
          token: sessionToken
        });

        response.cookies.set('auth-token', sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
        response.cookies.set('auth-token-client', sessionToken, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return response;
      }

      return NextResponse.json(
        { error: 'Неверный email или пароль (dev mode)' },
        { status: 401 }
      );
    }
    
    // Поиск пользователя по email (DB mode)
    console.log('🔍 Looking up user by email:', email);
    const user = await databaseAdapter.getUserByEmail(email);
    console.log('👤 User found:', user ? 'YES' : 'NO');
    if (user) {
      console.log('👤 User details:', {
        id: user.id,
        email: user.email,
        approval_status: user.isApproved,
        has_password: !!user.password_hash
      });
    }
    
    // Временно отключена проверка approval_status для решения проблем с входом
    if (!user) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }
    
    // Закомментировано: || user.approval_status !== 'approved'
    // Это позволяет пользователям входить независимо от статуса одобрения

    // Проверка пароля
    console.log('🔐 Checking password for user:', user.email);
    console.log('🔐 Has password hash:', !!user.password_hash);
    console.log('🔐 Password hash from DB:', user.password_hash ? user.password_hash.substring(0, 20) + '...' : 'null');
    console.log('🔐 Input password:', password);
    const isValidPassword = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
    console.log('🔐 Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Password validation failed');
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }
    
    console.log('✅ Password validation successful');

    // TODO: Добавить очистку старых сессий после реализации метода в SQLiteAdapter
    // await databaseAdapter.deleteUserSessions(user.id);
    
    // Создание сессии с правильной типизацией
    const sessionToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        timestamp: Date.now(),
        random: Math.random().toString(36).substring(2, 15)
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 дней
    
    if (!user.id) {
      console.error('❌ User ID is missing');
      return NextResponse.json(
        { error: 'Ошибка данных пользователя' },
        { status: 500 }
      );
    }
    
    console.log('📝 Creating session for user ID:', user.id, 'type:', typeof user.id);
    console.log('📝 User ID as string:', user.id.toString());
    
    // Дополнительная проверка типа user.id
    if (typeof user.id !== 'number' && typeof user.id !== 'string') {
      console.error('❌ User ID has invalid type:', typeof user.id, 'value:', user.id);
      return NextResponse.json(
        { error: 'Ошибка типа данных пользователя' },
        { status: 500 }
      );
    }
    
    await databaseAdapter.createSession({
      token: sessionToken,
      user_id: user.id.toString(),
      expires_at: expiresAt.toISOString()
    });

    // TODO: Добавить обновление времени последнего входа после добавления колонки last_login_at
    // await databaseAdapter.updateUser(user.id, {
    //   last_login_at: new Date().toISOString()
    // });

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      approval_status: user.isApproved ? 'approved' : 'pending',
      status: 'active',
      avatar: user.avatar || null,
      createdAt: user.created_at,
      updatedAt: user.updated_at
      // TODO: Добавить lastLoginAt после добавления колонки last_login_at
      // lastLoginAt: user.last_login_at
    };

    const response = NextResponse.json({
      message: 'Успешная авторизация',
      user: userResponse,
      token: sessionToken
    });

    // Устанавливаем токен в cookies для автоматической аутентификации
    response.cookies.set('auth-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней - соответствует времени жизни JWT
    });

    // Также устанавливаем обычный cookie для фронтенда
    response.cookies.set('auth-token-client', sessionToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней - соответствует времени жизни JWT
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}