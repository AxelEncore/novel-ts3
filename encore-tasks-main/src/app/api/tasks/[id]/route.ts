import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth } from '@/lib/auth';
import { DatabaseAdapter } from '@/lib/database-adapter';
import { isValidUUID, isTemporaryId } from '@/lib/uuid-validation';

const databaseAdapter = DatabaseAdapter.getInstance();

// Схема валидации для обновления задачи
const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done', 'deferred']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional(),
  // Accept both UUID and 32-char hex ids (SQLite)
  columnId: z.string().min(1).optional(),
  position: z.number().min(0).optional(),
  assigneeId: z.string().uuid().optional(),
  isArchived: z.boolean().optional(),
  archivedAt: z.string().datetime().optional(),
});

// GET /api/tasks/[id] - Получение задачи по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const taskId = resolvedParams.id;
    
    // Проверяем, является ли ID временным
    if (isTemporaryId(taskId)) {
      return NextResponse.json(
        { error: 'Временные задачи не могут быть загружены' },
        { status: 400 }
      );
    }
    
    if (!taskId || !isValidUUID(taskId)) {
      return NextResponse.json(
        { error: 'Некорректный ID задачи' },
        { status: 400 }
      );
    }

    await databaseAdapter.initialize();
    console.log('DEBUG: Getting user by email:', authResult.user.email);
    // Получаем пользователя
    const user = await databaseAdapter.getUserByEmail(authResult.user.email);
    if (!user) {
      console.log('DEBUG: User not found for email:', authResult.user.email);
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }
    console.log('DEBUG: User found:', user.id);

    console.log('DEBUG: Getting task by ID:', taskId);
    // Получаем задачу
    const task = await databaseAdapter.getTaskById(taskId);
    if (!task) {
      console.log('DEBUG: Task not found for ID:', taskId);
      return NextResponse.json(
        { error: 'Задача не найдена' },
        { status: 404 }
      );
    }
    console.log('DEBUG: Task found:', task.id, task.title);

    // Проверяем права доступа к проекту
    const hasAccess = await databaseAdapter.hasProjectAccess(user.id, task.project_id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Нет прав доступа' },
        { status: 403 }
      );
    }

    // Подтягиваем исполнителей
    const assigneesRes = await databaseAdapter.query(
      `SELECT u.id, u.name, u.email FROM task_assignees ta JOIN users u ON u.id = ta.user_id WHERE ta.task_id = $1`,
      [taskId]
    );
    const arows = Array.isArray(assigneesRes) ? assigneesRes : (assigneesRes as any).rows || [];
    const assignees = arows.map((r: any) => ({ id: r.id, name: r.name || r.email }));

    return NextResponse.json({ ...task, assignees });
  } catch (error) {
    console.error('Error fetching task:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/[id] - Обновление задачи
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const taskId = resolvedParams.id;
    
    // Проверяем, является ли ID временным
    if (isTemporaryId(taskId)) {
      return NextResponse.json(
        { error: 'Временные задачи не могут быть обновлены' },
        { status: 400 }
      );
    }
    
    if (!taskId || !isValidUUID(taskId)) {
      return NextResponse.json(
        { error: 'Некорректный ID задачи' },
        { status: 400 }
      );
    }

    await databaseAdapter.initialize();
    const body = await request.json();
    const validatedData = updateTaskSchema.parse(body);

    // Собираем assignee_ids для обновления связей (если переданы)
    const incomingAssigneeIds: string[] | undefined = body.assignee_ids || body.assigneeIds || (Array.isArray(body.assignees) ? body.assignees.map((a: any) => a.id) : undefined);

    // Получаем пользователя
    const user = await databaseAdapter.getUserByEmail(authResult.user.email);
    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Проверяем существование задачи
    const existingTask = await databaseAdapter.getTaskById(taskId);
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Задача не найдена' },
        { status: 404 }
      );
    }

    // Проверяем права доступа к проекту
    const hasAccess = await databaseAdapter.hasProjectAccess(user.id, existingTask.project_id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Нет прав доступа' },
        { status: 403 }
      );
    }

    // Если изменяется колонка, проверяем её существование
    if (validatedData.columnId && validatedData.columnId !== existingTask.column_id) {
      const targetColumn = await databaseAdapter.getColumnById(validatedData.columnId);
      if (!targetColumn) {
        return NextResponse.json(
          { error: 'Целевая колонка не найдена' },
          { status: 400 }
        );
      }
    }

    // Обновляем задачу
    const updatedTask = await databaseAdapter.updateTask(taskId, validatedData);

    // Если пришли исполнители — обновляем связи
    if (incomingAssigneeIds) {
      // Сначала очищаем прежние связи
      await databaseAdapter.query(`DELETE FROM task_assignees WHERE task_id = $1`, [taskId]);
      // Вставляем новые
      for (const uid of incomingAssigneeIds) {
        await databaseAdapter.query(
          `INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [taskId, uid]
        );
      }
    }

    // Возвращаем задачу с актуальными исполнителями
    const assigneesRes = await databaseAdapter.query(
      `SELECT u.id, u.name, u.email FROM task_assignees ta JOIN users u ON u.id = ta.user_id WHERE ta.task_id = $1`,
      [taskId]
    );
    const arows = Array.isArray(assigneesRes) ? assigneesRes : (assigneesRes as any).rows || [];
    const assignees = arows.map((r: any) => ({ id: r.id, name: r.name || r.email }));

    return NextResponse.json({ ...updatedTask, assignees });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Некорректные данные', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Ошибка при обновлении задачи:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] - Обновление задачи (альтернативный метод)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Используем ту же логику что и в PATCH
  return PATCH(request, { params });
}

// DELETE /api/tasks/[id] - Удаление задачи
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const taskId = resolvedParams.id;
    
    // Проверяем, является ли ID временным
    if (isTemporaryId(taskId)) {
      return NextResponse.json(
        { error: 'Временные задачи не могут быть удалены' },
        { status: 400 }
      );
    }
    
    if (!taskId || !isValidUUID(taskId)) {
      return NextResponse.json(
        { error: 'Некорректный ID задачи' },
        { status: 400 }
      );
    }

    await databaseAdapter.initialize();
    // Получаем пользователя
    const user = await databaseAdapter.getUserByEmail(authResult.user.email);
    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Проверяем существование задачи
    const existingTask = await databaseAdapter.getTaskById(taskId);
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Задача не найдена' },
        { status: 404 }
      );
    }

    // Проверяем права доступа к проекту
    const hasAccess = await databaseAdapter.hasProjectAccess(user.id, existingTask.project_id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Нет прав доступа' },
        { status: 403 }
      );
    }

    // Удаляем задачу
    await databaseAdapter.deleteTask(taskId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении задачи:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}