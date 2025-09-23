import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth } from '@/lib/auth';
import { dbAdapter } from '@/lib/database-adapter';

const databaseAdapter = dbAdapter;

// Схема валидации для создания проекта
const createProjectSchema = z.object({
  name: z.string().min(1, 'Название проекта обязательно').max(100, 'Название слишком длинное'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Неверный формат цвета').optional(),
  members: z.array(z.string()).optional(),
  telegramIntegration: z.object({
    enabled: z.boolean(),
    chatId: z.string().optional(),
    botToken: z.string().optional()
  }).optional()
});

// Схема валидации для создания доски
const createBoardSchema = z.object({
  name: z.string().min(1, 'Название доски обязательно').max(100, 'Название слишком длинное'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Неверный формат цвета').optional(),
  columns: z.array(z.object({
    name: z.string().min(1, 'Название колонки обязательно'),
    status: z.string().min(1, 'Статус колонки обязателен'),
    order: z.number().int().min(0)
  })).optional()
});

// Полная схема для создания проекта с досками
const fullProjectSchema = z.object({
  project: createProjectSchema,
  boards: z.array(createBoardSchema).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Проверка аутентификации
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      );
    }

    // Получение и валидация данных
    const body = await request.json();
    const validatedData = fullProjectSchema.parse(body);
    
    const { project: projectData, boards: boardsData = [] } = validatedData;

    // Инициализация базы данных
    await databaseAdapter.initialize();

    // Получение пользователя по ID (уже есть в authResult)
    const user = await databaseAdapter.getUserById(authResult.user.userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Создание проекта
    const project = await databaseAdapter.createProject({
      name: projectData.name,
      description: projectData.description || '',
      color: projectData.color || '#3B82F6',
      created_by: user.id,
      icon_url: null
    });

    // Добавление других участников если указаны
    if (projectData.members && projectData.members.length > 0) {
      const memberUsers = await databaseAdapter.getUsersByEmails(projectData.members);
      
      for (const memberUser of memberUsers) {
        await databaseAdapter.addProjectMember(project.id, memberUser.id, 'MEMBER');
      }
    }

    // Создание досок если указаны
    const createdBoards = [];
    if (boardsData.length > 0) {
      for (let i = 0; i < boardsData.length; i++) {
        const boardData = boardsData[i];
        
        // Создание колонок для доски
        const defaultColumns = boardData.columns || [
          { name: 'К выполнению', status: 'TODO', order: 0 },
          { name: 'В работе', status: 'IN_PROGRESS', order: 1 },
          { name: 'На проверке', status: 'REVIEW', order: 2 },
          { name: 'Выполнено', status: 'DONE', order: 3 }
        ];

        const board = await databaseAdapter.createBoardWithColumns({
          name: boardData.name,
          description: boardData.description || '',
          color: boardData.color || '#10B981',
          projectId: project.id
        }, defaultColumns);

        createdBoards.push(board);
      }
    }

    const result = {
      project,
      boards: createdBoards
    };

    // Возврат успешного результата
    return NextResponse.json({
      success: true,
      data: {
        project: {
          id: result.project.id,
          name: result.project.name,
          description: result.project.description,
          color: result.project.color,
          ownerId: result.project.ownerId,
          createdAt: result.project.createdAt,
          updatedAt: result.project.updatedAt
        },
        boards: result.boards.map(board => ({
          id: board.id,
          name: board.name,
          description: board.description,
          color: board.color,
          projectId: board.projectId,
          columns: board.columns,
          createdAt: board.createdAt,
          updatedAt: board.updatedAt
        }))
      }
    });

  } catch (error) {
    console.error('Ошибка создания проекта:', error);
    
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