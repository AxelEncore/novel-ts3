import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbAdapter } from '@/lib/database-adapter';
import crypto from 'crypto';

const databaseAdapter = dbAdapter;
import { verifyAuth } from '@/lib/auth';
import { CreateTaskDto, TaskWithDetails } from '@/types/core.types';

// Схема валидации для создания задачи
const createTaskSchema = z.object({
  title: z.string().min(1, 'Заголовок задачи обязателен').max(200, 'Заголовок слишком длинный'),
  description: z.string().max(2000, 'Описание слишком длинное').optional(),
  column_id: z.string().min(1, 'ID колонки обязателен'),
  assignee_ids: z.array(z.string().uuid('Неверный формат ID исполнителя')).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['todo', 'in_progress', 'review', 'done', 'deferred']).optional(),
  due_date: z.string().datetime().optional(),
  estimated_hours: z.number().min(0).max(1000).optional(),
  parent_task_id: z.string().uuid('Неверный формат ID родительской задачи').optional(),
  tags: z.array(z.string()).default([]),
  settings: z.record(z.string(), z.unknown()).optional()
});

// Проверка доступа к колонке/доске/проекту
async function checkTaskAccess(userId: string, columnId?: string, boardId?: string, projectId?: string) {
  console.log('checkTaskAccess called with:', { userId, columnId, boardId, projectId });
  let query = '';
  let params: (string | number)[] = [];
  
  if (columnId) {
    query = `SELECT pm.role, b.project_id, c.board_id FROM columns c JOIN boards b ON c.board_id = b.id JOIN project_members pm ON pm.project_id = b.project_id WHERE c.id = $1 AND pm.user_id = $2`;
    params = [columnId, userId];
  } else if (boardId) {
    query = `SELECT pm.role, b.project_id FROM boards b JOIN project_members pm ON pm.project_id = b.project_id WHERE b.id = $1 AND pm.user_id = $2`;
    params = [boardId, userId];
  } else if (projectId) {
    query = `SELECT pm.role FROM project_members pm WHERE pm.project_id = $1 AND pm.user_id = $2`;
    params = [projectId, userId];
  }
  
  if (!query) return { hasAccess: false, role: null };
  
  console.log('Executing query:', query);
  console.log('With params:', params);
  const result = await databaseAdapter.query(query, params);
  const rows = Array.isArray(result) ? result : (result.rows || []);
  return {
    hasAccess: rows.length > 0,
    role: rows[0]?.role || null,
    projectId: rows[0]?.project_id,
    boardId: rows[0]?.board_id
  };
}

// GET /api/tasks - Получение задач
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
    const columnId = searchParams.get('column_id');
    const boardId = searchParams.get('board_id');
    const projectId = searchParams.get('project_id');
    const assigneeId = searchParams.get('assignee_id');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    
    const offset = (page - 1) * limit;

    // Проверка доступа
    let hasAccess = false;
    if (columnId) {
      const accessCheck = await checkTaskAccess(authResult.user.userId, columnId);
      hasAccess = accessCheck.hasAccess;
    } else if (boardId) {
      const accessCheck = await checkTaskAccess(authResult.user.userId, null, boardId);
      hasAccess = accessCheck.hasAccess;
    } else if (projectId) {
      const accessCheck = await checkTaskAccess(authResult.user.userId, null, null, projectId);
      hasAccess = accessCheck.hasAccess;
    } else if (assigneeId) {
      // Пользователь может видеть свои задачи или если он админ
      hasAccess = assigneeId === authResult.user.userId || authResult.user.role === 'admin';
    } else {
      // Без фильтров показываем только задачи пользователя
      hasAccess = true;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Базовый запрос
    const whereConditions: string[] = ['1=1'];
    const queryParams: (string | number)[] = [];

    // Фильтры
    if (columnId) {
      whereConditions.push(`t.column_id = $${queryParams.length + 1}`);
      queryParams.push(columnId);
    } else if (boardId) {
      whereConditions.push(`c.board_id = $${queryParams.length + 1}`);
      queryParams.push(boardId);
    } else if (projectId) {
      whereConditions.push(`b.project_id = $${queryParams.length + 1}`);
      queryParams.push(projectId);
    } else if (assigneeId) {
      whereConditions.push(`t.reporter_id = $${queryParams.length + 1}`);
      queryParams.push(assigneeId);
    } else {
      // По умолчанию показываем задачи созданные пользователем
      whereConditions.push(`t.reporter_id = $${queryParams.length + 1}`);
      queryParams.push(authResult.user.userId);
    }

    if (status) {
      whereConditions.push(`t.status = $${queryParams.length + 1}`);
      queryParams.push(status);
    }

    if (priority) {
      whereConditions.push(`t.priority = $${queryParams.length + 1}`);
      queryParams.push(priority);
    }

    if (search) {
      whereConditions.push(`(
        t.title LIKE $${queryParams.length + 1} OR 
        t.description LIKE $${queryParams.length + 2}
      )`);
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // Валидация сортировки
    const allowedSortFields = ['title', 'priority', 'status', 'created_at', 'updated_at', 'position'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC';

    // Основной запрос (убираем несуществующие таблицы task_assignees)
    const tasksQuery = `
      SELECT 
        t.id, t.title, t.description, t.column_id, t.priority, t.status, t.position, 
        t.created_at, t.updated_at, t.reporter_id, 
        c.title as column_name, b.name as board_name, p.name as project_name, 
        u.email as reporter_email 
      FROM tasks t 
      LEFT JOIN columns c ON t.column_id = c.id 
      LEFT JOIN boards b ON c.board_id = b.id 
      LEFT JOIN projects p ON b.project_id = p.id 
      LEFT JOIN users u ON t.reporter_id = u.id 
      WHERE ${whereConditions.join(' AND ')} 
      ORDER BY t.${validSortBy} ${validSortOrder} 
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    queryParams.push(limit, offset);
    const tasksResult = await databaseAdapter.query(tasksQuery, queryParams);

    // Запрос для подсчета общего количества
    const countQuery = `
      SELECT COUNT(t.id) as total
      FROM tasks t
      LEFT JOIN columns c ON t.column_id = c.id
      LEFT JOIN boards b ON c.board_id = b.id
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN users u ON t.reporter_id = u.id
      WHERE ${whereConditions.join(' AND ')}
    `;
    
    const countResult = await databaseAdapter.query(countQuery, queryParams.slice(0, -2));
    console.log('Count result:', countResult);
    console.log('Tasks result:', tasksResult);
    
    // Обработка результата подсчета (может быть массивом или объектом с rows)
    const total = parseInt(
      Array.isArray(countResult) 
        ? countResult[0]?.total || '0'
        : countResult?.rows?.[0]?.total || '0'
    );

    // Обработка результата задач (может быть массивом или объектом с rows)
    const tasksData = Array.isArray(tasksResult) ? tasksResult : tasksResult?.rows || [];
    const tasks: TaskWithDetails[] = tasksData.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      column_id: row.column_id,
      priority: row.priority,
      status: row.status,
      position: row.position,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.reporter_id,
      column_name: row.column_name,
      board_name: row.board_name,
      project_name: null,
      created_by_username: null,
      assignee_usernames: []
    }));

    // Генерируем ETag для кэширования
    const etag = `"${Date.now()}-${tasks.length}"`;
    const ifNoneMatch = request.headers.get('if-none-match');
    
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          tasks,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      },
      {
        headers: {
          'ETag': etag,
          'Cache-Control': 'private, max-age=60'
        }
      }
    );

  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Создание задачи
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
    const validationResult = createTaskSchema.safeParse(body);

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

    const baseTaskData = validationResult.data;

    // Проверяем доступ к колонке
    console.log('Checking access for userId:', authResult.user.userId, 'columnId:', baseTaskData.column_id, 'type:', typeof baseTaskData.column_id);
    const accessCheck = await checkTaskAccess(authResult.user.userId, baseTaskData.column_id);
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Получаем информацию о колонке и доске
    const columnInfo = await databaseAdapter.query(
      `SELECT c.id, c.board_id, b.project_id, b.name as board_name
       FROM columns c 
       JOIN boards b ON c.board_id = b.id 
       WHERE c.id = $1`,
      [baseTaskData.column_id]
    );

    const columnRows = Array.isArray(columnInfo) ? columnInfo : (columnInfo.rows || []);
    if (columnRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Column not found' },
        { status: 404 }
      );
    }

    const { board_id, project_id } = columnRows[0];
    
    // Создаем полный объект taskData с необходимыми полями
    const taskData: CreateTaskDto = {
      ...baseTaskData,
      project_id,
      board_id
    };

    // Проверяем исполнителей, если указаны
    if (taskData.assignee_ids && taskData.assignee_ids.length > 0) {
      for (const assigneeId of taskData.assignee_ids) {
        const assigneeCheck = await databaseAdapter.query(
          `SELECT pm.user_id 
           FROM project_members pm 
           WHERE pm.project_id = $1 AND pm.user_id = $2`,
          [project_id, assigneeId]
        );

        const assigneeRows = Array.isArray(assigneeCheck) ? assigneeCheck : (assigneeCheck.rows || []);
        if (assigneeRows.length === 0) {
          return NextResponse.json(
            { success: false, error: 'One or more assignees are not members of the project' },
            { status: 400 }
          );
        }
      }
    }

    // Получаем следующую позицию в колонке
    const positionResult = await databaseAdapter.query(
      'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM tasks WHERE column_id = $1',
      [taskData.column_id]
    );
    const positionRows = Array.isArray(positionResult) ? positionResult : (positionResult.rows || []);
    const nextPosition = positionRows[0]?.next_position || 1;

    try {
      // Генерируем уникальный ID для задачи
      const taskId = crypto.randomUUID();
      
      // Вставляем задачу с заданным ID
      const taskResult = await databaseAdapter.query(
        `INSERT INTO tasks (
          id, title, description, column_id, project_id, board_id, 
          priority, due_date, position, status, reporter_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          taskId,
          taskData.title,
          taskData.description || null,
          taskData.column_id,
          project_id,
          board_id,
          taskData.priority,
          taskData.due_date ? new Date(taskData.due_date) : null,
          nextPosition,
          'todo',
          authResult.user.userId
        ]
      );
      
      const createdTaskId = taskId;
      
      const newTask = { id: createdTaskId };

      // Назначаем исполнителей, если указаны (пока таблица task_assignees не создана)
      // if (taskData.assignee_ids && taskData.assignee_ids.length > 0) {
      //   for (const assigneeId of taskData.assignee_ids) {
      //     await databaseAdapter.query(
      //       'INSERT INTO task_assignees (task_id, user_id, assigned_by) VALUES ($1, $2, $3)',
      //       [taskId, assigneeId, authResult.user.userId]
      //     );
      //   }
      // }

      // Добавляем теги, если указаны
      if (taskData.tag_ids && taskData.tag_ids.length > 0) {
        for (const tagId of taskData.tag_ids) {
          // Связываем тег с задачей
          await databaseAdapter.query(
          'INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [createdTaskId, tagId]
        );
        }
      }

      // Транзакция не нужна для простых операций

      // Получаем полную информацию о созданной задаче
      console.log('Searching for task with ID:', createdTaskId);
      const createdTaskResult = await databaseAdapter.query(
        `SELECT 
          t.id,
          t.title,
          t.description,
          t.column_id,
          t.project_id,
          t.board_id,
          t.priority,
          t.position,
          t.due_date,
          t.created_at,
          t.updated_at,
          c.title as column_name
        FROM tasks t
        LEFT JOIN columns c ON t.column_id = c.id
        WHERE t.id = $1`,
        [createdTaskId]
      );
      
      console.log('Task search result:', createdTaskResult);

      const taskRows = Array.isArray(createdTaskResult) ? createdTaskResult : (createdTaskResult.rows || []);
      if (!createdTaskResult || taskRows.length === 0) {
        throw new Error('Failed to retrieve created task');
      }
      
      const task = taskRows[0];
      
      // Получаем дополнительную информацию отдельными запросами
      const columnResult = await databaseAdapter.query(
        'SELECT title FROM columns WHERE id = $1',
        [task.column_id]
      );
      const columnRows = Array.isArray(columnResult) ? columnResult : (columnResult.rows || []);
      
      const boardResult = await databaseAdapter.query(
        'SELECT name FROM boards WHERE id = $1',
        [board_id]
      );
      const boardRows = Array.isArray(boardResult) ? boardResult : (boardResult.rows || []);
      
      const creatorResult = await databaseAdapter.query(
        'SELECT name FROM users WHERE id = $1',
        [authResult.user.userId]
      );
      const creatorRows = Array.isArray(creatorResult) ? creatorResult : (creatorResult.rows || []);
      
      const projectResult = await databaseAdapter.query(
        'SELECT name FROM projects WHERE id = $1',
        [project_id]
      );
      const projectRows = Array.isArray(projectResult) ? projectResult : (projectResult.rows || []);
      
      // Получаем исполнителей задачи (пока таблица task_assignees не создана)
      const assigneesResult = { rows: [] };
      
      const createdTask: TaskWithDetails = {
        id: task.id,
        title: task.title,
        description: task.description,
        column_id: task.column_id,
        board_id: task.board_id,
        project_id: task.project_id,
        priority: task.priority,
        status: 'todo', // default status
        due_date: task.due_date,
        estimated_hours: task.estimated_hours,
        actual_hours: null,
        parent_task_id: null,
        position: task.position,
        metadata: {},
        created_at: task.created_at,
        updated_at: task.updated_at,
        created_by: authResult.user.userId,
        column_name: columnRows[0]?.name || '',
        board_name: boardRows[0]?.name || '',
        project_name: projectRows[0]?.name || '',
        created_by_username: creatorRows[0]?.name || '',
        assignees: assigneesResult.rows.map(row => ({
          id: row.id,
          username: row.username,
          name: row.name
        })),
        tags: [],
        comments_count: 0,
        attachments_count: 0,
        subtasks_count: 0
      };

      return NextResponse.json(
        {
          success: true,
          data: createdTask,
          message: 'Задача успешно создана'
        },
        { status: 201 }
      );

    } catch (error) {
      throw error;
    }

  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}