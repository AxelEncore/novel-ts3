import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { dbAdapter } from '@/lib/database-adapter';
const databaseAdapter = dbAdapter;

// Схема валидации для создания задачи
const createTaskSchema = z.object({
  title: z.string().min(1, 'Название задачи обязательно').max(500),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().uuid().optional(),
  position: z.number().int().min(0).optional(),
});

// Схема валидации для обновления позиций задач
const updatePositionsSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
      columnId: z.string().uuid().optional(), // Для перемещения между колонками
    })
  ),
});

// GET /api/columns/[id]/tasks - получить задачи колонки
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const columnId = params.id;
    if (!columnId) {
      return NextResponse.json({ error: 'Invalid column ID' }, { status: 400 });
    }

    // Проверяем доступ к колонке
    const hasAccess = await databaseAdapter.checkColumnAccess(columnId, session.user.email);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Column not found or access denied' }, { status: 404 });
    }

    // Получаем информацию о колонке
    const column = await databaseAdapter.getColumnById(columnId);
    if (!column) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 });
    }

    // Получаем задачи колонки
    const tasks = await databaseAdapter.getColumnTasks(columnId);

    return NextResponse.json({
      column,
      tasks,
    });
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const columnId = params.id;
    if (!columnId) {
      return NextResponse.json({ error: 'Invalid column ID' }, { status: 400 });
    }

    // Проверяем доступ к колонке
    const hasAccess = await databaseAdapter.checkColumnAccess(columnId, session.user.email);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Column not found or access denied' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createTaskSchema.parse(body);

    // Получаем пользователя по email
    const user = await databaseAdapter.getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Определяем позицию для новой задачи
    let position = validatedData.position;
    if (position === undefined) {
      const tasks = await databaseAdapter.getColumnTasks(columnId);
      position = tasks.length > 0 ? Math.max(...tasks.map(t => t.position)) + 1 : 0;
    }

    // Создаем задачу
    const task = await databaseAdapter.createTask({
      title: validatedData.title,
      description: validatedData.description,
      priority: validatedData.priority,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
      position,
      columnId,
      createdBy: user.id,
      assigneeId: validatedData.assigneeId,
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

// PATCH /api/columns/[id]/tasks - обновить позиции задач
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверка аутентификации
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Необходима аутентификация' },
        { status: 401 }
      );
    }

    const columnId = parseInt(params.id);
    if (isNaN(columnId)) {
      return NextResponse.json(
        { error: 'Неверный ID колонки' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updatePositionsSchema.parse(body);

    // Проверка прав на изменение задач
    const column = await prisma.column.findFirst({
      where: {
        id: columnId,
        board: {
          project: {
            members: {
              some: {
                userId: session.user.id,
                role: {
                  in: ['OWNER', 'ADMIN', 'MEMBER'],
                },
              },
            },
          },
        },
      },
    });

    if (!column) {
      return NextResponse.json(
        { error: 'Недостаточно прав для изменения задач' },
        { status: 403 }
      );
    }

    // Обновление позиций задач в транзакции
    await prisma.$transaction(
      validatedData.tasks.map((task) => {
        const updateData: any = { position: task.position };
        if (task.columnId !== undefined) {
          updateData.columnId = task.columnId;
        }
        
        return prisma.task.update({
          where: { id: task.id },
          data: updateData,
        });
      })
    );

    return NextResponse.json({
      success: true,
      message: 'Позиции задач обновлены',
    });
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