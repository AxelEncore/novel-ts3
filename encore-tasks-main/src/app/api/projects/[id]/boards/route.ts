import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth } from '@/lib/auth';
import { DatabaseAdapter } from '@/lib/database-adapter';

const databaseAdapter = DatabaseAdapter.getInstance();

// Схема валидации для получения досок проекта
const getBoardsSchema = z.object({
  includeColumns: z.boolean().optional().default(false),
  includeTasks: z.boolean().optional().default(false),
});

// GET /api/projects/[id]/boards - получить доски проекта
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Проверка аутентификации
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Необходима аутентификация' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    await databaseAdapter.initialize();

    // Парсинг query параметров
    const { searchParams } = new URL(request.url);
    const queryData = {
      includeColumns: searchParams.get('includeColumns') === 'true',
      includeTasks: searchParams.get('includeTasks') === 'true',
    };

    const validatedQuery = getBoardsSchema.parse(queryData);

    // Проверка доступа к проекту
    const project = await databaseAdapter.getProjectById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      );
    }

    // Проверяем права доступа (владелец проекта)
    const isOwner = project.created_by === authResult.user.userId || project.creator_id === authResult.user.userId;
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Доступ к проекту запрещен' },
        { status: 403 }
      );
    }

    // Получение досок проекта
    const boards = await databaseAdapter.getProjectBoards(projectId);
    
    // Если нужны колонки и задачи, получаем их отдельно
    let enrichedBoards = boards;
    if (validatedQuery.includeColumns && boards.length > 0) {
      enrichedBoards = await Promise.all(boards.map(async (board) => {
        const columns = await databaseAdapter.getBoardColumns(board.id);
        let enrichedColumns = columns;
        
        if (validatedQuery.includeTasks && columns.length > 0) {
          enrichedColumns = await Promise.all(columns.map(async (column) => {
            const tasks = await databaseAdapter.getColumnTasks(column.id);
            return { ...column, tasks };
          }));
        }
        
        return { ...board, columns: enrichedColumns };
      }));
    }

    return NextResponse.json({
      success: true,
      data: enrichedBoards,
    });
  } catch (error) {
    console.error('Ошибка при получении досок проекта:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Неверные параметры запроса',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/boards - создать новую доску в проекте
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Проверка аутентификации
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Необходима аутентификация' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    await databaseAdapter.initialize();

    const body = await request.json();
    const boardData = {
      name: body.name,
      description: body.description || '',
      color: body.color || '#3B82F6',
    };

    // Валидация данных доски
    if (!boardData.name || boardData.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Название доски обязательно' },
        { status: 400 }
      );
    }

    // Проверка доступа к проекту
    const project = await databaseAdapter.getProjectById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      );
    }

    // Проверяем права доступа (владелец проекта)
    const isOwner = project.created_by === authResult.user.userId || project.creator_id === authResult.user.userId;
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Доступ к проекту запрещен' },
        { status: 403 }
      );
    }

    // Создание доски
    const board = await databaseAdapter.createBoard({
      name: boardData.name.trim(),
      description: boardData.description.trim(),
      color: boardData.color,
      project_id: projectId,
      createdBy: authResult.user.userId,
    });

    const result = {
      ...board,
      columns: [],
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Ошибка при создании доски:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}