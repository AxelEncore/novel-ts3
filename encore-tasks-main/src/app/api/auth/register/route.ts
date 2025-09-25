import { NextRequest, NextResponse } from 'next/server';
import { dbAdapter } from '@/lib/database-adapter';

const databaseAdapter = dbAdapter;

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Валидация
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Все поля обязательны' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен содержать минимум 6 символов' },
        { status: 400 }
      );
    }

    // Email валидация
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Некорректный формат email' },
        { status: 400 }
      );
    }

    // Проверка существования пользователя
    const existingUser = await databaseAdapter.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 409 }
      );
    }

    // Создание пользователя (хеширование выполняется в адаптере БД)
    const user = await databaseAdapter.createUser({
      email,
      password,
      name,
      role: 'user'
    });

    // Возврат данных пользователя (без пароля) с правильной типизацией
    const isApproved = Boolean(user.isApproved ?? user.is_approved ?? (user.approval_status === 'approved'));
    const userResult = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      approval_status: isApproved ? 'approved' : 'pending',
      isApproved,
      avatar: user.avatar,
      createdAt: user.created_at
    };

    // НЕ создаем сессию для неподтвержденных пользователей
    // Пользователь должен быть одобрен администратором перед входом в систему
    const response = NextResponse.json({
      message: 'Пользователь успешно зарегистрирован. Ожидайте подтверждения от администратора.',
      user: userResult,
      requiresApproval: true
    }, { status: 201 });

    return response;

  } catch (error) {
    console.error('Ошибка регистрации:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}