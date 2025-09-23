import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DatabaseAdapter } from '@/lib/database-adapter';
import { verifyAuth } from '@/lib/auth';
import { UpdateColumnDto, ColumnWithTasks } from '@/types/core.types';
import { isValidUUID } from '@/lib/uuid-validation';

const databaseAdapter = DatabaseAdapter.getInstance();

// Схема валидации для обновления колонки
const updateColumnSchema = z.object({
  name: z.string().min(1, 'Название колонки обязательно').max(100, 'Название слишком длинное').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Неверный формат цвета').optional(),
  position: z.number().min(0).optional(),
  settings: z.record(z.string(), z.any()).optional()
});

// Проверка доступа к колонке
async function checkColumnAccess(userId: string, columnId: string) {
  const query = `
    SELECT 
      c.id,
      c.created_by,
      c.board_id,
      pm.role,
      b.created_by as board_creator,
      p.name as project_name
    FROM columns c
    JOIN boards b ON c.board_id = b.id
    JOIN projects p ON b.project_id = p.id
    LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
    WHERE c.id = $2
  `;
  
  const result = await databaseAdapter.query(query, [userId, columnId]);
  
  if (result.length === 0) {
    return { hasAccess: false, column: null, role: null };
  }
  
  const row = result[0] as any;
  const isColumnCreator = row.created_by === userId;
  const isBoardCreator = row.board_creator === userId;
  const isMember = row.role !== null;
  const isAdmin = row.role === 'admin' || row.role === 'owner';
  
  return {
    hasAccess: isColumnCreator || isBoardCreator || isMember,
    canEdit: isColumnCreator || isBoardCreator || isAdmin,
    canDelete: isColumnCreator || isBoardCreator || isAdmin,
    column: row,
    role: row.role
  };
}

// GET /api/columns/[id] - Получение колонки по ID
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

    await databaseAdapter.initialize();
    const { id: columnId } = await params;
    
    // Проверка валидности UUID
    if (!isValidUUID(columnId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid column ID format' },
        { status: 400 }
      );
    }

    // Проверка доступа
    const accessCheck = await checkColumnAccess(authResult.user.userId, columnId);
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Получаем полную информацию о колонке
    const columnQuery = `
      SELECT 
        c.*,
        b.name as board_name,
        p.name as project_name,
        creator.username as created_by_username,
        COUNT(t.id) as tasks_count
      FROM columns c
      JOIN boards b ON c.board_id = b.id
      JOIN projects p ON b.project_id = p.id
      LEFT JOIN users creator ON FALSE
      LEFT JOIN tasks t ON c.id = t.column_id
      WHERE c.id = $1
      GROUP BY c.id, b.name, p.name, creator.username
    `;

    const result = await databaseAdapter.query(columnQuery, [columnId]);
    
    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Column not found' },
        { status: 404 }
      );
    }

    const row = result[0] as any;
    const column: ColumnWithTasks = {
      id: row.id,
      board_id: row.board_id,
      name: row.name,
      color: row.color,
      position: row.position,
      task_limit: row.task_limit,
      is_done_column: row.is_done_column,
      settings: row.settings,
      created_at: row.created_at,
      updated_at: row.updated_at,
      tasks: [],
      task_count: parseInt(row.tasks_count)
    };

    return NextResponse.json({
      success: true,
      data: column
    });

  } catch (error) {
    console.error('Error fetching column:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/columns/[id] - Обновление колонки
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

    await databaseAdapter.initialize();
    const { id: columnId } = await params;
    
    // Проверка валидности UUID
    if (!isValidUUID(columnId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid column ID format' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    const validationResult = updateColumnSchema.safeParse(body);
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

    const updateData: UpdateColumnDto = validationResult.data;

    // Проверка доступа
    const accessCheck = await checkColumnAccess(authResult.user.userId, columnId);
    if (!accessCheck.canEdit) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Cannot edit this column' },
        { status: 403 }
      );
    }

    // Формируем запрос на обновление
    const updateFields: string[] = [];
    const updateValues: (string | number)[] = [];
    let paramIndex = 1;

    if (updateData.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(updateData.name);
      paramIndex++;
    }

    if (updateData.color !== undefined) {
      updateFields.push(`color = $${paramIndex}`);
      updateValues.push(updateData.color);
      paramIndex++;
    }

    if (updateData.position !== undefined) {
      updateFields.push(`position = $${paramIndex}`);
      updateValues.push(updateData.position);
      paramIndex++;
    }

    if (updateData.settings !== undefined) {
      updateFields.push(`settings = $${paramIndex}`);
      updateValues.push(JSON.stringify(updateData.settings));
      paramIndex++;
    }

    // Добавляем updated_at
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(columnId);

    if (updateFields.length === 1) { // Только updated_at
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Обновляем колонку
    const updateQuery = `
      UPDATE columns 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await databaseAdapter.query(updateQuery, updateValues);

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Column not found' },
        { status: 404 }
      );
    }

    // Получаем обновленную колонку с полной информацией
    const fullColumnResult = await databaseAdapter.query(
      `SELECT 
        c.*,
        b.name as board_name,
        p.name as project_name,
        creator.username as created_by_username,
        COUNT(t.id) as tasks_count
      FROM columns c
      JOIN boards b ON c.board_id = b.id
      JOIN projects p ON b.project_id = p.id
      LEFT JOIN users creator ON FALSE
      LEFT JOIN tasks t ON c.id = t.column_id
      WHERE c.id = $1
      GROUP BY c.id, b.name, p.name, creator.username`,
      [columnId]
    );

    const row = fullColumnResult[0] as any;
    const updatedColumn: ColumnWithTasks = {
      id: row.id,
      name: row.name,
      board_id: row.board_id,
      color: row.color,
      position: row.position,
      task_limit: row.task_limit,
      is_done_column: row.is_done_column,
      settings: row.settings,
      created_at: row.created_at,
      updated_at: row.updated_at,
      tasks: [],
      task_count: parseInt(row.tasks_count)
    };

    return NextResponse.json({
      success: true,
      data: updatedColumn,
      message: 'Колонка успешно обновлена'
    });

  } catch (error) {
    console.error('Error updating column:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/columns/[id] - Удаление колонки
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

    await databaseAdapter.initialize();
    const { id: columnId } = await params;

    // Проверка доступа
    const accessCheck = await checkColumnAccess(authResult.user.userId, columnId);
    if (!accessCheck.canDelete) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Cannot delete this column' },
        { status: 403 }
      );
    }

    // Проверяем, есть ли задачи в колонке
    const tasksCheck = await databaseAdapter.query(
      'SELECT COUNT(*) as count FROM tasks WHERE column_id = $1',
      [columnId]
    );

    const tasksCount = parseInt((tasksCheck[0] as any)?.count || '0');
    
    if (tasksCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete column with ${tasksCount} tasks. Please move or delete tasks first.` 
        },
        { status: 400 }
      );
    }

    // Проверяем, существует ли колонка
    const columnExists = await databaseAdapter.query(
      'SELECT id, name FROM columns WHERE id = $1',
      [columnId]
    );

    if (columnExists.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Column not found' },
        { status: 404 }
      );
    }

    const columnName = (columnExists[0] as any).name;

    // Удаляем колонку
    await databaseAdapter.query(
      'DELETE FROM columns WHERE id = $1',
      [columnId]
    );

    return NextResponse.json({
      success: true,
      message: `Колонка "${columnName}" успешно удалена`
    });

  } catch (error) {
    console.error('Error deleting column:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}