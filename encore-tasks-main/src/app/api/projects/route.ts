import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbAdapter } from '@/lib/database-adapter';

const databaseAdapter = dbAdapter;
import { verifyAuth } from '@/lib/auth';
import { CreateProjectDto, ProjectWithStats } from '@/types/core.types';

// Схемы валидации
const createProjectSchema = z.object({
  name: z.string().min(1, 'Название проекта обязательно').max(100, 'Название слишком длинное'),
  description: z.string().max(500, 'Описание слишком длинное').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Неверный формат цвета').optional().default('#3B82F6'),
  icon_url: z.string().min(1, 'Иконка обязательна').optional().default('📋'),
  visibility: z.enum(['private', 'public']).optional().default('private'),
  telegram_chat_id: z.string().nullable().optional(),
  telegram_topic_id: z.string().nullable().optional(),
  member_ids: z.array(z.string()).optional().default([])
});

// updateProjectSchema удален - используем схему из validation.ts

// GET /api/projects - Получить все проекты пользователя
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Получаем все проекты пользователя
    const projects = await databaseAdapter.getUserProjects(authResult.user.userId);

    // Преобразуем в нужный формат
    const projectsWithStats = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      color: project.color || '#3B82F6',
      icon: project.icon_url || '📋',
      status: 'active',
      visibility: 'private',
      telegram_chat_id: null,
      telegram_topic_id: null,
      settings: null,
      created_at: project.created_at,
      updated_at: project.updated_at,
      created_by: project.created_by,
      created_by_username: 'admin',
      members_count: 1,
      boards_count: 0,
      tasks_count: 0
    }));

    return NextResponse.json({
      success: true,
      data: {
        projects: projectsWithStats,
        pagination: {
          page: 1,
          limit: 20,
          total: projectsWithStats.length,
          total_pages: 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Создать новый проект
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('📊 Received project data:', JSON.stringify(body, null, 2));
    
    const validationResult = createProjectSchema.safeParse(body);
    console.log('🔍 Validation result:', validationResult.success);

    if (!validationResult.success) {
      console.log('❌ Validation errors:', validationResult.error);
      console.log('❌ Validation error details:', JSON.stringify(validationResult.error.issues, null, 2));
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const projectData: CreateProjectDto = validationResult.data;

    // Создаем проект используя PostgreSQL адаптер
    const project = await databaseAdapter.createProject({
      name: projectData.name,
      description: projectData.description || '',
      created_by: authResult.user.userId,
      color: projectData.color || '#3B82F6',
      icon_url: projectData.icon || '📋',
      telegram_chat_id: projectData.telegram_chat_id || null,
      telegram_topic_id: projectData.telegram_topic_id || null
    });

    // Добавляем участников в проект (если они указаны)
    if (projectData.member_ids && projectData.member_ids.length > 0) {
      try {
        for (const memberId of projectData.member_ids) {
          await databaseAdapter.addProjectMember(project.id, memberId, 'member');
        }
        console.log(`✓ Added ${projectData.member_ids.length} members to project`);
      } catch (memberError) {
        console.error('Error adding project members:', memberError);
        // Не прерываем создание проекта из-за ошибки добавления участников
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        color: project.color,
        icon: project.icon_url || '📋',
        status: 'active',
        visibility: 'private',
        telegram_chat_id: project.telegram_chat_id,
        telegram_topic_id: project.telegram_topic_id,
        settings: null,
        created_at: project.created_at,
        updated_at: project.updated_at,
        created_by: project.created_by,
        created_by_username: 'admin',
        members_count: 1,
        boards_count: 0,
        tasks_count: 0
      },
      message: 'Проект успешно создан'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects - Удалить проекты (только для админов)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectIds = searchParams.get('ids')?.split(',') || [];

    if (projectIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No project IDs provided' },
        { status: 400 }
      );
    }

    // Удаление проектов пока не реализовано
    return NextResponse.json({
      success: false,
      error: 'Project deletion not implemented'
    }, { status: 501 });

  } catch (error) {
    console.error('Error deleting projects:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}