import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth } from '@/lib/auth';
import { dbAdapter } from '@/lib/database-adapter';
const databaseAdapter = dbAdapter;

// Схема валидации для создания задачи
const createTaskSchema = z.object({
  title: z.string().min(1, 'Название задачи обязательно').max(500),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: z.union([z.string(), z.date()]).optional(),
  assigneeId: z.string().optional(),
  position: z.number().int().min(0).optional(),
});

// Схема валидации для обновления позиций задач
const updatePositionsSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string(),
      position: z.number().int().min(0),
      columnId: z.string().optional(), // Для перемещения между колонками
    })
  ),
});

// Общая проверка доступа к колонке через проект
async function ensureColumnAccess(userId: string, columnId: string) {
  const rows = await databaseAdapter.query(
    `SELECT b.project_id, c.board_id FROM columns c JOIN boards b ON c.board_id = b.id WHERE c.id = $1`,
    [columnId]
  );
  const data = Array.isArray(rows) ? rows : (rows as any).rows || [];
  if (data.length === 0) return { ok: false };
  const { project_id, board_id } = data[0];
  const has = await databaseAdapter.hasProjectAccess(userId, project_id);
  return { ok: has, project_id, board_id };
}

// GET /api/columns/[id]/tasks - получить задачи колонки
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: columnId } = await params;
    if (!columnId) {
      return NextResponse.json({ error: 'Invalid column ID' }, { status: 400 });
    }

    const access = await ensureColumnAccess(auth.user.userId, columnId);
    if (!access.ok) {
      return NextResponse.json({ error: 'Column not found or access denied' }, { status: 404 });
    }

    const column = await databaseAdapter.getColumnById(columnId);
    if (!column) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 });
    }

    const tasks = await databaseAdapter.getColumnTasks(columnId);

    return NextResponse.json({ column, tasks });
  } catch (error) {
    console.error('Error fetching column tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/columns/[id]/tasks - создать новую задачу в колонке
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: columnId } = await params;
    if (!columnId) {
      return NextResponse.json({ error: 'Invalid column ID' }, { status: 400 });
    }

    const access = await ensureColumnAccess(auth.user.userId, columnId);
    if (!access.ok) {
      return NextResponse.json({ error: 'Column not found or access denied' }, { status: 404 });
    }

    const body = await request.json();
    const validated = createTaskSchema.parse(body);

    // Определяем позицию для новой задачи
    let position = validated.position;
    if (position === undefined) {
      const tasks = await databaseAdapter.getColumnTasks(columnId);
      position = tasks.length > 0 ? Math.max(...tasks.map(t => t.position)) + 1 : 0;
    }

    // Определяем статус по названию колонки
    const col = await databaseAdapter.getColumnById(columnId);
    const titleLower = (col?.title || col?.name || '').toLowerCase();
    const statusByColumn = titleLower.includes('выполнено') || titleLower.includes('done') ? 'done'
      : titleLower.includes('проверк') || titleLower.includes('review') ? 'review'
      : titleLower.includes('работе') || titleLower.includes('progress') || titleLower.includes('процессе') ? 'in_progress'
      : titleLower.includes('беклог') || titleLower.includes('backlog') ? 'backlog'
      : titleLower.includes('отлож') || titleLower.includes('deferred') ? 'deferred'
      : 'todo';

    // Создаём задачу
    const task = await databaseAdapter.createTask({
      title: validated.title,
      description: validated.description,
      priority: validated.priority,
      due_date: validated.dueDate ? new Date(validated.dueDate as any) : null,
      position,
      column_id: columnId,
      board_id: (access as any).board_id,
      project_id: (access as any).project_id,
      reporter_id: auth.user.userId,
      assignee_id: validated.assigneeId,
      status: statusByColumn,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/columns/[id]/tasks - обновить позиции задач и перенос между колонками
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json(
        { error: 'Необходима аутентификация' },
        { status: 401 }
      );
    }

    const { id: columnId } = await params;
    if (!columnId) {
      return NextResponse.json(
        { error: 'Неверный ID колонки' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = updatePositionsSchema.parse(body);

    // Проверка прав: наличие доступа к исходной колонке достаточно,
    // перенос в другую колонку также разрешается в рамках того же проекта
    const access = await ensureColumnAccess(auth.user.userId, columnId);
    if (!access.ok) {
      return NextResponse.json(
        { error: 'Недостаточно прав для изменения задач' },
        { status: 403 }
      );
    }

    // Последовательно обновляем задачи (SQLite однопоточно, этого достаточно)
    for (const t of validated.tasks) {
      const updates: any = { position: t.position };
      if (t.columnId) {
        updates.columnId = t.columnId;
      }
      await databaseAdapter.updateTask(t.id, updates);
    }

    return NextResponse.json({ success: true, message: 'Позиции задач обновлены' });
  } catch (error) {
    console.error('Ошибка при обновлении позиций задач:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Неверные данные',
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
