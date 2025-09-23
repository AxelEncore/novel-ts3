import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { databaseAdapter } from '@/lib/adapters/postgresql-adapter';

// Схема валидации для создания комментария
const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().uuid().optional(), // Для ответов на комментарии
});

// GET /api/tasks/[id]/comments - Получение комментариев задачи
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const taskId = params.id;
    if (!taskId) {
      return NextResponse.json(
        { error: 'Некорректный ID задачи' },
        { status: 400 }
      );
    }

    // Получаем пользователя
    const user = await databaseAdapter.getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Получаем задачу и проверяем доступ
    const task = await databaseAdapter.getTaskById(taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Задача не найдена' },
        { status: 404 }
      );
    }

    // Проверяем доступ к проекту
    const hasAccess = await databaseAdapter.hasProjectAccess(task.project_id, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Нет доступа к задаче' },
        { status: 403 }
      );
    }

    // Получаем комментарии
    const comments = await databaseAdapter.getTaskComments(taskId);

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Ошибка при получении комментариев:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[id]/comments - Создание комментария
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const taskId = params.id;
    if (!taskId) {
      return NextResponse.json(
        { error: 'Некорректный ID задачи' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

    // Получаем пользователя
    const user = await databaseAdapter.getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Получаем задачу и проверяем доступ
    const task = await databaseAdapter.getTaskById(taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Задача не найдена' },
        { status: 404 }
      );
    }

    // Проверяем доступ к проекту
    const hasAccess = await databaseAdapter.hasProjectAccess(task.project_id, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Нет доступа к задаче' },
        { status: 403 }
      );
    }

    // Если это ответ на комментарий, проверяем существование родительского комментария
    if (validatedData.parentId) {
      const parentComment = await databaseAdapter.getCommentById(validatedData.parentId);
      if (!parentComment || parentComment.task_id !== taskId) {
        return NextResponse.json(
          { error: 'Родительский комментарий не найден' },
          { status: 400 }
        );
      }
    }

    // Создаем комментарий
    const comment = await databaseAdapter.createTaskComment({
      content: validatedData.content,
      taskId,
      authorId: user.id,
      parentId: validatedData.parentId || null
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Некорректные данные', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Ошибка при создании комментария:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}