import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth } from '@/lib/auth';
import { dbAdapter as databaseAdapter } from '@/lib/database-adapter';

// Схема валидации для создания проекта
const createProjectSchema = z.object({
  name: z.string().min(1, 'Название проекта обязательно'),
  description: z.string().optional(),
  icon: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Начало создания простого проекта');
    
    // Проверка аутентификации
    console.log('[API] Проверка аутентификации...');
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      console.log('[API] Пользователь не авторизован:', authResult.error);
      return NextResponse.json(
        { success: false, error: authResult.error || 'Не авторизован' },
        { status: 401 }
      );
    }
    const user = authResult.user;
    console.log('[API] Пользователь авторизован:', user.userId);

    // Парсинг и валидация данных
    console.log('[API] Парсинг данных запроса...');
    const body = await request.json();
    console.log('[API] Данные запроса:', body);
    
    console.log('[API] Валидация данных...');
    const validatedData = createProjectSchema.parse(body);
    console.log('[API] Валидированные данные:', validatedData);

    // Создание проекта
    console.log('[API] Вызов databaseAdapter.createProject...');
    const projectData = {
      name: validatedData.name,
      description: validatedData.description || '',
      created_by: user.userId,
      icon_url: validatedData.icon || null,
    };
    console.log('[API] Данные для создания проекта:', projectData);
    
    const project = await databaseAdapter.createProject(projectData);
    console.log('[API] Проект создан успешно:', project);

    return NextResponse.json({
      success: true,
      data: {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          creator_id: project.created_by,
          icon_url: project.icon_url,
          created_at: project.created_at,
          updated_at: project.updated_at
        }
      }
    });

  } catch (error) {
    console.error('[API] Ошибка создания проекта:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ошибка валидации данных',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}