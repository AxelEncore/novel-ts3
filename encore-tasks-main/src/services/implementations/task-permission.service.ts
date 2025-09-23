/**
 * Сервис для проверки прав доступа к задачам
 * Реализует бизнес-логику контроля доступа согласно требованиям:
 * - Администратор имеет полный контроль
 * - Обычный пользователь может удалять только созданные им задачи
 * - Обычный пользователь может перемещать задачи, где он назначен исполнителем
 */

import { IDatabaseAdapter } from '../../lib/database-adapter.interface';
import {
  TaskId,
  UserId,
  ProjectId
} from '../../refactored/data/types';

export interface TaskPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canMove: boolean;
  canAssign: boolean;
}

export class TaskPermissionService {
  constructor(private readonly databaseAdapter: IDatabaseAdapter) {}

  /**
   * Получает разрешения пользователя для задачи
   */
  async getUserTaskPermissions(taskId: TaskId, userId: UserId, userRole: string): Promise<TaskPermissions> {
    try {
      // Получаем информацию о задаче
      const taskQuery = `
        SELECT t.*, b.project_id, p.owner_id as project_owner
        FROM tasks t
        JOIN boards b ON t.board_id = b.id
        JOIN projects p ON b.project_id = p.id
        WHERE t.id = $1
      `;
      
      const taskResult = await this.databaseAdapter.query(taskQuery, [taskId]);
      
      if (!taskResult.rows || taskResult.rows.length === 0) {
        return {
          canView: false,
          canEdit: false,
          canDelete: false,
          canMove: false,
          canAssign: false
        };
      }

      const task = taskResult.rows[0];
      
      // Проверяем членство в проекте
      const memberQuery = `
        SELECT role FROM project_members 
        WHERE project_id = $1 AND user_id = $2
      `;
      
      const memberResult = await this.databaseAdapter.query(memberQuery, [task.project_id, userId]);
      const projectRole = memberResult.rows?.[0]?.role;

      // Проверяем, является ли пользователь исполнителем задачи
      const assigneeQuery = `
        SELECT 1 FROM task_assignees 
        WHERE task_id = $1 AND user_id = $2
      `;
      
      const assigneeResult = await this.databaseAdapter.query(assigneeQuery, [taskId, userId]);
      const isAssignee = assigneeResult.rows && assigneeResult.rows.length > 0;

      // Определяем разрешения
      const isProjectOwner = task.project_owner === userId;
      const isTaskCreator = task.created_by === userId;
      const isAdmin = userRole === 'admin';
      
      let canView = false;
      let canEdit = false;
      let canDelete = false;
      let canMove = false;
      let canAssign = false;

      // Администратор имеет полный контроль
      if (isAdmin) {
        canView = true;
        canEdit = true;
        canDelete = true;
        canMove = true;
        canAssign = true;
      }
      // Владелец проекта имеет полный контроль
      else if (isProjectOwner) {
        canView = true;
        canEdit = true;
        canDelete = true;
        canMove = true;
        canAssign = true;
      }
      // Член проекта
      else if (projectRole) {
        switch (projectRole) {
          case 'admin':
            canView = true;
            canEdit = true;
            canDelete = true;
            canMove = true;
            canAssign = true;
            break;
          case 'member':
            canView = true;
            canEdit = true;
            // Может удалять только созданные им задачи
            canDelete = isTaskCreator;
            // Может перемещать задачи, где он исполнитель
            canMove = isAssignee || isTaskCreator;
            canAssign = false;
            break;
          case 'viewer':
            canView = true;
            canEdit = false;
            canDelete = false;
            canMove = false;
            canAssign = false;
            break;
        }
      }

      return {
        canView,
        canEdit,
        canDelete,
        canMove,
        canAssign
      };
    } catch (error) {
      console.error('Error getting task permissions:', error);
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canMove: false,
        canAssign: false
      };
    }
  }

  /**
   * Проверяет, может ли пользователь просматривать задачу
   */
  async canUserViewTask(taskId: TaskId, userId: UserId, userRole: string): Promise<boolean> {
    const permissions = await this.getUserTaskPermissions(taskId, userId, userRole);
    return permissions.canView;
  }

  /**
   * Проверяет, может ли пользователь редактировать задачу
   */
  async canUserEditTask(taskId: TaskId, userId: UserId, userRole: string): Promise<boolean> {
    const permissions = await this.getUserTaskPermissions(taskId, userId, userRole);
    return permissions.canEdit;
  }

  /**
   * Проверяет, может ли пользователь удалить задачу
   */
  async canUserDeleteTask(taskId: TaskId, userId: UserId, userRole: string): Promise<boolean> {
    const permissions = await this.getUserTaskPermissions(taskId, userId, userRole);
    return permissions.canDelete;
  }

  /**
   * Проверяет, может ли пользователь перемещать задачу
   */
  async canUserMoveTask(taskId: TaskId, userId: UserId, userRole: string): Promise<boolean> {
    const permissions = await this.getUserTaskPermissions(taskId, userId, userRole);
    return permissions.canMove;
  }

  /**
   * Проверяет, может ли пользователь назначать исполнителей задачи
   */
  async canUserAssignTask(taskId: TaskId, userId: UserId, userRole: string): Promise<boolean> {
    const permissions = await this.getUserTaskPermissions(taskId, userId, userRole);
    return permissions.canAssign;
  }

  /**
   * Проверяет, может ли пользователь создавать задачи в проекте
   */
  async canUserCreateTask(projectId: ProjectId, userId: UserId, userRole: string): Promise<boolean> {
    try {
      // Администратор может создавать задачи везде
      if (userRole === 'admin') {
        return true;
      }

      // Проверяем владение проектом
      const ownerQuery = `
        SELECT creator_id FROM projects WHERE id = $1
      `;
      
      const ownerResult = await this.databaseAdapter.query(ownerQuery, [projectId]);
      
      if (!ownerResult || ownerResult.length === 0) {
        return false;
      }

      const projectOwner = ownerResult[0].creator_id;
      
      if (projectOwner === userId) {
        return true;
      }

      // Проверяем членство в проекте
      const memberQuery = `
        SELECT role FROM project_members 
        WHERE project_id = $1 AND user_id = $2
      `;
      
      const memberResult = await this.databaseAdapter.query(memberQuery, [projectId, userId]);
      const projectRole = memberResult.rows?.[0]?.role;

      // Определяем права на создание задач
      switch (projectRole) {
        case 'admin':
        case 'member':
          return true;
        case 'viewer':
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking task creation permission:', error);
      return false;
    }
  }
}