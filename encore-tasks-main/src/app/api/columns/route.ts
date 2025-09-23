import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { dbAdapter } from '@/lib/database-adapter'
import { z } from 'zod'

const createColumnSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  board_id: z.union([z.string(), z.number()]).transform(val => val.toString()),
  position: z.number().optional(),
  color: z.string().optional()
})

// Функция для проверки доступа к проекту
async function checkProjectAccess(userId: string, projectId: string): Promise<boolean> {
  try {
    // Используем метод hasProjectAccess из database adapter
    return await dbAdapter.hasProjectAccess(userId, projectId)
  } catch (error) {
    console.error('Error checking project access:', error)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const boardId = searchParams.get('boardId') || searchParams.get('board_id')
    const projectId = searchParams.get('project_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Проверяем доступ к проекту
    if (projectId) {
      const hasAccess = await checkProjectAccess(authResult.user.userId, projectId)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Если указан board_id, получаем колонки для конкретной доски
    if (boardId) {
      // Проверяем доступ к доске через проект
      const boardResult = await dbAdapter.query(
        'SELECT project_id FROM boards WHERE id = $1',
        [boardId]
      )
      
      if (boardResult.length === 0) {
        return NextResponse.json({ error: 'Board not found' }, { status: 404 })
      }

      const projectId = boardResult[0].project_id
       const hasAccess = await checkProjectAccess(authResult.user.userId, projectId)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      
      // Получаем колонки для доски
      const columns = await dbAdapter.getBoardColumns(boardId)
      
      return NextResponse.json({
        columns,
        pagination: {
          page: 1,
          limit: columns.length,
          total: columns.length,
          totalPages: 1
        }
      })
    }

    // Если указан project_id, получаем все колонки проекта
    if (projectId) {
      const boards = await dbAdapter.query(
        'SELECT id FROM boards WHERE project_id = $1',
        [projectId]
      )
      
      const allColumns = []
      for (const board of boards) {
        const columns = await dbAdapter.getBoardColumns(board.id)
        allColumns.push(...columns)
      }
      
      // Применяем пагинацию
      const paginatedColumns = allColumns.slice(offset, offset + limit)
      
      return NextResponse.json({
        columns: paginatedColumns,
        pagination: {
          page,
          limit,
          total: allColumns.length,
          totalPages: Math.ceil(allColumns.length / limit)
        }
      })
    }

    return NextResponse.json({ error: 'Board ID or Project ID is required' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching columns:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createColumnSchema.parse(body)

    // Получаем информацию о доске и проекте
    const board = await dbAdapter.getBoardById(validatedData.board_id)

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    const projectId = board.project_id

    // Проверяем доступ к проекту
    console.log('🔍 Checking project access:', {
      userId: authResult.user.userId,
      projectId: projectId,
      boardId: validatedData.board_id
    })
    
    const hasAccess = await checkProjectAccess(authResult.user.userId, projectId)
    console.log('🔍 Project access result:', hasAccess)
    
    if (!hasAccess) {
      console.log('❌ Access denied for user', authResult.user.userId, 'to project', projectId)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Создаем колонку используя database adapter
    const columnData = {
      name: validatedData.name,
      title: validatedData.name, // Добавляем title для совместимости
      boardId: validatedData.board_id,
      position: validatedData.position,
      color: validatedData.color || '#6B7280',
      created_by: authResult.user.userId
    }

    const newColumn = await dbAdapter.createColumn(columnData)

    return NextResponse.json({
      column: newColumn
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating column:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const columnId = searchParams.get('id')

    if (!columnId) {
      return NextResponse.json({ error: 'Column ID is required' }, { status: 400 })
    }

    // Проверяем права на удаление колонки
    const columnResult = await dbAdapter.query(
      `SELECT c.*, b.project_id, p.created_by as project_creator
       FROM columns c
       JOIN boards b ON c.board_id = b.id
       JOIN projects p ON b.project_id = p.id
       WHERE c.id = $1`,
      [columnId]
    )

    if (columnResult.length === 0) {
       return NextResponse.json({ error: 'Column not found' }, { status: 404 })
     }

     const column = columnResult[0]
    const isCreator = column.created_by === authResult.user.userId
    const isProjectCreator = column.project_creator === authResult.user.userId
    const hasProjectAccess = await checkProjectAccess(authResult.user.userId, column.project_id)

    if (!isCreator && !isProjectCreator && !hasProjectAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Удаляем колонку используя database adapter
    await dbAdapter.deleteColumn(columnId)

    return NextResponse.json({ message: 'Column deleted successfully' })
  } catch (error) {
    console.error('Error deleting column:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}