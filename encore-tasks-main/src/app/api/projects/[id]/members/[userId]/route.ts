import { NextRequest, NextResponse } from 'next/server';
import { DatabaseAdapter } from '@/lib/database-adapter';
import { verifyAuth } from '@/lib/auth';

const databaseAdapter = DatabaseAdapter.getInstance();

// Проверка доступа к проекту
async function checkProjectAccess(projectId: string, userId: string, userRole?: string): Promise<{ hasAccess: boolean; isOwner: boolean; isAdmin: boolean }> {
  try {
    const project = await databaseAdapter.getProjectById(projectId);
    if (!project) {
      return { hasAccess: false, isOwner: false, isAdmin: false };
    }
    
    const isOwner = project.created_by === userId || project.creator_id === userId;
    const isAdmin = userRole === 'admin';
    const hasAccess = isOwner || isAdmin;
    
    return { hasAccess, isOwner, isAdmin };
  } catch (error) {
    return { hasAccess: false, isOwner: false, isAdmin: false };
  }
}

// DELETE /api/projects/[id]/members/[userId] - Удалить участника из проекта
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId, userId } = await params;
    
    await databaseAdapter.initialize();

    // Проверяем доступ к проекту (владельцы и админы могут удалять участников)
    const accessCheck = await checkProjectAccess(projectId, authResult.user.userId, authResult.user.role);
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied - only project owners and admins can remove members' },
        { status: 403 }
      );
    }

    // Нельзя удалить владельца проекта
    if (accessCheck.isOwner && userId === authResult.user.userId) {
      return NextResponse.json(
        { success: false, error: 'Project owner cannot be removed' },
        { status: 400 }
      );
    }

    // Проверяем, что пользователь является участником проекта
    const members = await databaseAdapter.getProjectMembers(projectId);
    const isMember = members.some(member => member.user_id === userId);
    
    if (!isMember) {
      return NextResponse.json(
        { success: false, error: 'User is not a member of this project' },
        { status: 404 }
      );
    }

    // Удаляем участника
    const success = await databaseAdapter.removeProjectMember(projectId, userId);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Member removed successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to remove member' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error removing project member:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/members/[userId] - Обновить роль участника в проекте
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId, userId } = await params;
    const body = await request.json();
    const { role } = body;
    
    if (!role || !['owner', 'admin', 'member'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }
    
    await databaseAdapter.initialize();

    // Проверяем доступ к проекту (владельцы и админы могут менять роли участников)
    const accessCheck = await checkProjectAccess(projectId, authResult.user.userId, authResult.user.role);
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied - only project owners and admins can update member roles' },
        { status: 403 }
      );
    }

    // Проверяем, что пользователь является участником проекта
    const members = await databaseAdapter.getProjectMembers(projectId);
    const member = members.find(m => m.user_id === userId);
    
    if (!member) {
      return NextResponse.json(
        { success: false, error: 'User is not a member of this project' },
        { status: 404 }
      );
    }

    // Обновляем роль участника
    const success = await databaseAdapter.updateProjectMemberRole(projectId, userId, role);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Member role updated successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to update member role' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error updating project member role:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}