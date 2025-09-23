import { NextRequest, NextResponse } from 'next/server';
import { DatabaseAdapter } from '@/lib/database-adapter';
import { verifyAuth } from '@/lib/auth';

const databaseAdapter = DatabaseAdapter.getInstance();

// Проверка доступа к доске
async function checkBoardAccess(boardId: string, userId: string) {
  const query = `
    SELECT pm.role, b.project_id
    FROM boards b
    JOIN project_members pm ON pm.project_id = b.project_id
    WHERE b.id = $1 AND pm.user_id = $2
  `;
  
  const result = await databaseAdapter.query(query, [boardId, userId]);
  const rows = Array.isArray(result) ? result : (result.rows || []);
  return {
    hasAccess: rows.length > 0,
    role: rows[0]?.role || null,
    projectId: rows[0]?.project_id
  };
}

// GET /api/boards/[id]/columns - Получить колонки доски
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const boardId = params.id;

    // Проверяем доступ к доске
    const accessCheck = await checkBoardAccess(boardId, authResult.user.userId);
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Получаем колонки доски
    const query = `
      SELECT id, title as name, position, color, board_id, created_at, updated_at
      FROM columns
      WHERE board_id = $1
      ORDER BY position ASC
    `;
    
    const result = await databaseAdapter.query(query, [boardId]);
    const columns = Array.isArray(result) ? result : (result.rows || []);

    return NextResponse.json({
      success: true,
      data: columns
    });

  } catch (error) {
    console.error('Error fetching board columns:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/boards/[id]/columns - Создать новую колонку
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const boardId = params.id;
    const body = await request.json();

    // Проверяем доступ к доске
    const accessCheck = await checkBoardAccess(boardId, authResult.user.userId);
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Проверяем права на редактирование
    if (!['admin', 'owner', 'editor'].includes(accessCheck.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { name, color = '#6B7280' } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Column name is required' },
        { status: 400 }
      );
    }

    // Получаем следующую позицию
    const positionQuery = `
      SELECT COALESCE(MAX(position), 0) + 1 as next_position
      FROM columns
      WHERE board_id = $1
    `;
    
    const positionResult = await databaseAdapter.query(positionQuery, [boardId]);
    const positionRows = Array.isArray(positionResult) ? positionResult : (positionResult.rows || []);
    const nextPosition = positionRows[0]?.next_position || 1;

    // Создаем колонку
    const insertQuery = `
      INSERT INTO columns (id, title, position, color, board_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    `;
    
    const columnId = crypto.randomUUID();
    await databaseAdapter.query(insertQuery, [
      columnId,
      name.trim(),
      nextPosition,
      color,
      boardId
    ]);

    // Получаем созданную колонку
    const selectQuery = `
      SELECT id, title as name, position, color, board_id, created_at, updated_at
      FROM columns
      WHERE id = $1
    `;
    
    const result = await databaseAdapter.query(selectQuery, [columnId]);
    const columns = Array.isArray(result) ? result : (result.rows || []);
    const newColumn = columns[0];

    return NextResponse.json({
      success: true,
      data: newColumn,
      message: 'Column created successfully'
    });

  } catch (error) {
    console.error('Error creating column:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}