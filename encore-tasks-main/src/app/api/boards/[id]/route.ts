import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DatabaseAdapter } from '@/lib/database-adapter';

const databaseAdapter = DatabaseAdapter.getInstance();
import { verifyAuth } from '@/lib/auth';
import { UpdateBoardDto, BoardWithStats } from '@/types/core.types';

// Схема валидации для обновления доски
const updateBoardSchema = z.object({
  name: z.string().min(1, 'Название доски обязательно').max(100, 'Название слишком длинное').optional(),
  description: z.string().max(500, 'Описание слишком длинное').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Неверный формат цвета').optional(),
  icon: z.string().min(1, 'Иконка обязательна').optional(),
  visibility: z.enum(['private', 'public']).optional(),
  settings: z.record(z.string(), z.any()).optional(),
  archived: z.boolean().optional()
});

// Проверка доступа к доске
async function checkBoardAccess(boardId: string, userId: string, requiredRole?: string) {
  // Используем метод hasProjectAccess из database adapter
  const boardResult = await databaseAdapter.query(
    `SELECT project_id, created_by FROM boards WHERE id = $1`,
    [boardId]
  );

  if (boardResult.length === 0) {
    return { hasAccess: false, board: null, role: null };
  }

  const board = boardResult[0] as any;
  const projectId = board.project_id;
  
  // Проверяем доступ к проекту
  const hasAccess = await databaseAdapter.hasProjectAccess(userId, projectId);
  
  if (!hasAccess) {
    return { hasAccess: false, board, role: null };
  }

  // Получаем роль пользователя в проекте
  const roleResult = await databaseAdapter.query(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );

  const role = roleResult.length > 0 ? roleResult[0].role : null;

  if (requiredRole && role) {
    const roleHierarchy = ['viewer', 'member', 'admin', 'owner'];
    const userRoleIndex = roleHierarchy.indexOf(role);
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
    
    if (userRoleIndex < requiredRoleIndex) {
      return { hasAccess: false, board, role };
    }
  }

  return { 
     hasAccess: true, 
     board, 
     role, 
     isBoardOwner: board.created_by === userId
   };
}

// GET /api/boards/[id] - Получить доску по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await databaseAdapter.ensureInitialized();
    const { id: boardId } = await params;

    // Проверяем доступ к доске
    const accessCheck = await checkBoardAccess(boardId, authResult.user.userId);
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Board not found or access denied' },
        { status: 404 }
      );
    }

    // Получаем полную информацию о доске
    const boardResult = await databaseAdapter.query(
      `SELECT 
        b.*,
        p.name as project_name,
        u.name as created_by_username,
        COUNT(DISTINCT c.id) as columns_count,
        COUNT(DISTINCT t.id) as tasks_count,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks_count
      FROM boards b
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN users u ON b.created_by = u.id
      LEFT JOIN columns c ON b.id = c.board_id
      LEFT JOIN tasks t ON b.id = t.board_id
      WHERE b.id = $1
      GROUP BY b.id, p.name, u.name`,
      [boardId]
    );

    if (!boardResult.length) {
      return NextResponse.json(
        { success: false, error: 'Board not found' },
        { status: 404 }
      );
    }

    const row = boardResult[0] as any;
    const board: BoardWithStats = {
      id: row.id,
      name: row.name,
      description: row.description,
      project_id: row.project_id,
      color: row.color,
      icon: row.icon,
      position: row.position,
      visibility: row.visibility,
      is_default: row.is_default,
      settings: row.settings,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      project_name: row.project_name,
      created_by_username: row.created_by_username,
      columns_count: parseInt(row.columns_count) || 0,
      tasks_count: parseInt(row.tasks_count) || 0,
      completed_tasks_count: parseInt(row.completed_tasks_count) || 0
    };

    return NextResponse.json({
      success: true,
      data: board
    });

  } catch (error) {
    console.error('Error fetching board:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/boards/[id] - Обновить доску
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await databaseAdapter.ensureInitialized();
    const { id: boardId } = await params;
    const body = await request.json();
    
    const validationResult = updateBoardSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const updateData: UpdateBoardDto = validationResult.data;

    // Проверяем доступ к доске (требуется роль admin или владелец доски)
    const accessCheck = await checkBoardAccess(boardId, authResult.user.userId, 'admin');
    if (!accessCheck.hasAccess && !accessCheck.isBoardOwner) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Admin role or board ownership required' },
        { status: 403 }
      );
    }

    // Строим динамический запрос обновления
    const updateFields: string[] = [];
    const updateValues: (string | boolean | number)[] = [];
    let paramIndex = 1;

    if (updateData.name !== undefined) {
      updateFields.push(`name = $1`);
      updateValues.push(updateData.name);
    }

    if (updateData.description !== undefined) {
      updateFields.push(`description = $1`);
      updateValues.push(updateData.description);
    }

    if (updateData.color !== undefined) {
      updateFields.push(`color = $1`);
      updateValues.push(updateData.color);
    }

    if (updateData.icon !== undefined) {
      updateFields.push(`icon = $1`);
      updateValues.push(updateData.icon);
    }

    if (updateData.visibility !== undefined) {
      updateFields.push(`visibility = $1`);
      updateValues.push(updateData.visibility);
    }

    if (updateData.settings !== undefined) {
      updateFields.push(`settings = $1`);
      updateValues.push(JSON.stringify(updateData.settings));
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Добавляем updated_at
    updateFields.push(`updated_at = datetime('now')`);
    updateValues.push(boardId);

    const updateQuery = `
      UPDATE boards 
      SET ${updateFields.join(', ')}
      WHERE id = $1
    `;

    const updateResult = await databaseAdapter.query(updateQuery, updateValues);

    if (updateResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Board not found' },
        { status: 404 }
      );
    }

    // Получаем обновленную информацию о доске
    const boardResult = await databaseAdapter.query(
      `SELECT 
        b.*,
        p.name as project_name,
        u.name as created_by_username,
        COUNT(DISTINCT c.id) as columns_count,
        COUNT(DISTINCT t.id) as tasks_count
      FROM boards b
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN users u ON b.created_by = u.id
      LEFT JOIN columns c ON b.id = c.board_id
      LEFT JOIN tasks t ON b.id = t.board_id
      WHERE b.id = $1
      GROUP BY b.id, p.name, u.name`,
      [boardId]
    );

    const row = boardResult[0] as any;
    const updatedBoard: BoardWithStats = {
      id: row.id,
      name: row.name,
      description: row.description,
      project_id: row.project_id,
      color: row.color,
      icon: row.icon,
      position: row.position,
      visibility: row.visibility,
      is_default: row.is_default,
      settings: row.settings,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      project_name: row.project_name,
      created_by_username: row.created_by_username,
      columns_count: parseInt(row.columns_count) || 0,
      tasks_count: parseInt(row.tasks_count) || 0,
      completed_tasks_count: parseInt(row.completed_tasks_count) || 0
    };

    return NextResponse.json({
      success: true,
      data: updatedBoard,
      message: 'Доска успешно обновлена'
    });

  } catch (error) {
    console.error('Error updating board:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/boards/[id] - Удалить доску
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await databaseAdapter.ensureInitialized();
    const { id: boardId } = await params;

    // Проверяем доступ к доске (требуется роль admin, владелец доски или системный админ)
    const accessCheck = await checkBoardAccess(boardId, authResult.user.userId, 'admin');
    if (!accessCheck.hasAccess && !accessCheck.isBoardOwner && authResult.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Access denied: Admin role or board ownership required' },
        { status: 403 }
      );
    }

    // Получаем информацию о доске перед удалением
    const boardInfo = await databaseAdapter.query(
      'SELECT id, name FROM boards WHERE id = $1',
      [boardId]
    );

    if (boardInfo.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Board not found' },
        { status: 404 }
      );
    }

    // Удаляем доску (каскадное удаление обрабатывается базой данных)
    const deleteResult = await databaseAdapter.query(
      'DELETE FROM boards WHERE id = $1 RETURNING id, name',
      [boardId]
    );

    return NextResponse.json({
      success: true,
      data: {
        deleted_board: deleteResult[0]
      },
      message: 'Доска успешно удалена'
    });

  } catch (error) {
    console.error('Error deleting board:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}