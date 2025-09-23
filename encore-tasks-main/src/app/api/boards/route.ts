import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbAdapter } from '@/lib/database-adapter';

const databaseAdapter = dbAdapter;
import { verifyAuth } from '@/lib/auth';
import { Board, BoardWithStats, CreateBoardDto } from '@/types/core.types';

// Схема валидации для создания доски
const createBoardSchema = z.object({
  name: z.string().min(1, 'Название доски обязательно').max(100, 'Название слишком длинное'),
  description: z.string().max(500, 'Описание слишком длинное').optional(),
  project_id: z.union([
    z.string().min(1, 'ID проекта обязателен'),
    z.number().int().positive('ID проекта должен быть положительным числом')
  ]).transform(val => String(val)), // Преобразуем в строку для совместимости
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Неверный формат цвета').optional(),
  icon: z.string().min(1, 'Иконка обязательна').optional(),
  visibility: z.enum(['private', 'public']).default('private'),
  settings: z.record(z.string(), z.any()).optional()
});

async function checkProjectAccess(projectId: string, userId: string): Promise<boolean> {
  try {
    console.log('🔍 Checking project access:', { projectId, userId });
    
    // Используем метод адаптера для проверки доступа к проекту
    const hasAccess = await databaseAdapter.hasProjectAccess(userId, projectId);
    console.log('✅ Project access result:', hasAccess);
    return hasAccess;
  } catch (error) {
    console.error('Error checking project access:', error);
    return false;
  }
}

// GET /api/boards - Получить доски
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await databaseAdapter.initialize();
    const { searchParams } = new URL(request.url);
    
    // Параметры запроса
    const projectId = searchParams.get('project_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search');
    const visibility = searchParams.get('visibility');
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    
    const offset = (page - 1) * limit;

    let boards: any[] = [];
    
    if (projectId) {
      // Проверяем доступ к проекту
      const hasAccess = await checkProjectAccess(projectId, authResult.user.userId);
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: 'Project not found or access denied' },
          { status: 404 }
        );
      }
      
      // Получаем доски конкретного проекта
      boards = await databaseAdapter.getProjectBoards(projectId);
    } else {
      // Получаем проекты пользователя и их доски
      const userProjects = await databaseAdapter.getUserProjects(authResult.user.userId);
      const allBoards = await Promise.all(
        userProjects.map(project => databaseAdapter.getProjectBoards(project.id))
      );
      boards = allBoards.flat();
    }
    
    // Применяем фильтры
    let filteredBoards = boards;
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredBoards = filteredBoards.filter(board => 
        board.name.toLowerCase().includes(searchLower) ||
        (board.description && board.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Сортировка
    const allowedSortFields = ['name', 'created_at', 'updated_at'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';
    
    filteredBoards.sort((a, b) => {
      const aValue = (a as any)[validSortBy];
      const bValue = (b as any)[validSortBy];
      
      if (validSortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    // Пагинация
    const total = filteredBoards.length;
    const paginatedBoards = filteredBoards.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: {
        boards: paginatedBoards,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching boards:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/boards - Создать доску
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await databaseAdapter.initialize();
    const body = await request.json();
    console.log('📋 Board creation request body:', JSON.stringify(body, null, 2));
    
    const validationResult = createBoardSchema.safeParse(body);
    console.log('📋 Validation result:', validationResult);

    if (!validationResult.success) {
      console.log('❌ Validation failed:', validationResult.error.issues);
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const boardData = validationResult.data;

    // Проверяем доступ к проекту
    const hasAccess = await checkProjectAccess(boardData.project_id, authResult.user.userId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Project not found or insufficient permissions' },
        { status: 403 }
      );
    }

    // Проверяем существование проекта
    const project = await databaseAdapter.getProjectById(boardData.project_id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    try {
      // Добавляем created_by к данным доски
      const boardDataWithCreator = {
        ...boardData,
        created_by: authResult.user.userId
      };
      
      // Создаем доску
      const newBoard = await databaseAdapter.createBoard(boardDataWithCreator);

      // Создаем колонки по умолчанию с цветами для темной темы
      // Названия колонок соответствуют статусам задач в фильтрации
      const defaultColumns = [
        { name: 'Беклог', color: '#F59E0B', position: 0, status: 'backlog' }, // оранжевый - для идей
        { name: 'К выполнению', color: '#6B7280', position: 1, status: 'todo' }, // серый нейтральный
        { name: 'В работе', color: '#3B82F6', position: 2, status: 'in_progress' }, // синий
        { name: 'На проверке', color: '#8B5CF6', position: 3, status: 'review' }, // фиолетовый
        { name: 'Выполнено', color: '#10B981', position: 4, status: 'done' } // зеленый
      ];

      // Создаем колонки
      for (const col of defaultColumns) {
        await databaseAdapter.createColumn({
          name: col.name,
          boardId: newBoard.id,
          position: col.position,
          color: col.color,
          created_by: authResult.user.userId,
          // Добавляем status для соответствия с фильтрацией
          status: col.status
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          id: newBoard.id,
          name: newBoard.name,
          description: newBoard.description,
          project_id: newBoard.project_id,
          created_at: newBoard.created_at,
          updated_at: newBoard.updated_at
        },
        message: 'Доска успешно создана'
      }, { status: 201 });

    } catch (error) {
      throw error;
    }

  } catch (error) {
    console.error('Error creating board:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/boards - Удалить доску
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await databaseAdapter.initialize();
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('id');

    if (!boardId) {
      return NextResponse.json(
        { success: false, error: 'Board ID is required' },
        { status: 400 }
      );
    }

    // Получаем доску
    const board = await databaseAdapter.getBoardById(boardId) as Board | null;
    
    if (!board) {
      return NextResponse.json(
        { success: false, error: 'Board not found' },
        { status: 404 }
      );
    }

    // Получаем проект для проверки прав
    const project = await databaseAdapter.getProjectById(board.project_id);
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Проверяем права доступа (создатель доски или создатель проекта)
    if (board.created_by !== authResult.user.userId && project.created_by !== authResult.user.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Удаляем доску
    await databaseAdapter.deleteBoard(boardId);

    return NextResponse.json({
      success: true,
      message: 'Board deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting board:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}