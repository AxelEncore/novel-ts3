import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth } from '@/lib/auth';
import { databaseAdapter } from '@/lib/database-adapter';

// Схема валидации для создания проекта
const createProjectSchema = z.object({
  name: z.string().min(1, 'Название проекта обязательно').max(100, 'Название слишком длинное'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Неверный формат цвета').optional(),
  members: z.array(z.string()).optional(),
  boards: z.array(z.object({
    name: z.string().min(1, 'Название доски обязательно').max(100, 'Название слишком длинное'),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Неверный формат цвета').optional(),
    columns: z.array(z.object({
      name: z.string().min(1, 'Название колонки обязательно'),
      status: z.string().min(1, 'Статус колонки обязателен'),
      order: z.number().int().min(0)
    })).optional()
  })).optional()
});

export async function POST(request: NextRequest) {
  try {
    console.log('API /projects/create-with-token: Starting request');
    
    // Проверка аутентификации с помощью Bearer токена
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      console.log('API /projects/create-with-token: Authentication failed:', authResult.error);
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      );
    }

    console.log('API /projects/create-with-token: User authenticated:', authResult.user.email);

    // Получение и валидация данных
    const body = await request.json();
    console.log('API /projects/create-with-token: Request body:', JSON.stringify(body, null, 2));
    
    const validatedData = createProjectSchema.parse(body);
    const { name, description, color, members = [], boards = [] } = validatedData;

    // Получение пользователя
    const user = await databaseAdapter.getUserByEmail(authResult.user.email);
    if (!user) {
      console.log('API /projects/create-with-token: User not found in database');
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    console.log('API /projects/create-with-token: Creating project for user:', user.id);

    // Создание проекта
    const project = await databaseAdapter.createProject({
      name,
      description: description || '',
      color: color || '#3B82F6',
      created_by: user.id,
      icon_url: null
    });

    // Создание доски по умолчанию
    const board = await databaseAdapter.createBoard({
      name: 'Основная доска',
      description: 'Доска по умолчанию для проекта',
      project_id: project.id,
      created_by: user.id,
      color: '#3B82F6'
    });

    // Создание колонок по умолчанию
    const columns = await Promise.all([
      databaseAdapter.createColumn('К выполнению', board.id, 0, '#EF4444', user.id),
      databaseAdapter.createColumn('В работе', board.id, 1, '#F59E0B', user.id),
      databaseAdapter.createColumn('Выполнено', board.id, 2, '#10B981', user.id)
    ]);

    const result = {
      project,
      board,
      columns
    };

    console.log('API /projects/create-with-token: Success, returning result');

    // Возврат успешного результата
    return NextResponse.json({
      success: true,
      data: {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          color: project.color,
          creator_id: project.creator_id,
          created_at: project.created_at,
          updated_at: project.updated_at
        },
        board: {
          id: board.id,
          name: board.name,
          description: board.description,
          color: board.color,
          project_id: board.project_id,
          created_at: board.created_at,
          updated_at: board.updated_at
        },
        columns: columns.map(column => ({
          id: column.id,
          name: column.name,
          board_id: column.board_id,
          position: column.position,
          color: column.color,
          created_at: column.created_at,
          updated_at: column.updated_at
        }))
      }
    });

  } catch (error) {
    console.error('API /projects/create-with-token: Error:', error);
    
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