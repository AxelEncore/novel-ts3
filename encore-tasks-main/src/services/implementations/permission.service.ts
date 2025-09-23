/**
 * Реализация сервиса разрешений для досок
 * Управляет правами доступа пользователей к доскам и проектам
 */

import {
  BoardId,
  ProjectId,
  UserId,
  BoardPermissions
} from '../../types/board.types';

import { IBoardPermissionService } from '../interfaces/board.service.interface';
import { IDatabaseAdapter } from '../../lib/database-adapter.interface';

export class PermissionService implements IBoardPermissionService {
  constructor(private readonly databaseAdapter: IDatabaseAdapter) {}

  /**
   * Получает разрешения пользователя для доски
   */
  async getUserPermissions(boardId: BoardId, userId: UserId): Promise<BoardPermissions> {
    try {
      // Получаем информацию о доске и проекте
      const boardQuery = `
        SELECT b.project_id, b.created_by, b.visibility,
               p.creator_id as project_owner
        FROM boards b
        JOIN projects p ON b.project_id = p.id
        WHERE b.id = ?
      `;
      
      const boardResult = await this.databaseAdapter.query(boardQuery, [boardId]);
      
      if (!boardResult.rows || boardResult.rows.length === 0) {
        return {
          canView: false,
          canEdit: false,
          canDelete: false,
          canManage: false
        };
      }

      const board = boardResult.rows[0];
      
      // Проверяем членство в проекте
      const memberQuery = `
        SELECT role FROM project_members 
        WHERE project_id = ? AND user_id = ?
      `;
      
      const memberResult = await this.databaseAdapter.query(memberQuery, [board.project_id, userId]);
      const userRole = memberResult.rows?.[0]?.role;

      // Определяем разрешения на основе роли и владения
      const isProjectOwner = board.project_owner === userId;
      const isBoardCreator = board.created_by === userId;
      const isPublicBoard = board.visibility === 'public';
      
      let canView = false;
      let canEdit = false;
      let canDelete = false;
      let canManage = false;

      if (isProjectOwner) {
        // Владелец проекта имеет все права
        canView = true;
        canEdit = true;
        canDelete = true;
        canManage = true;
      } else if (userRole) {
        // Член проекта
        switch (userRole) {
          case 'admin':
            canView = true;
            canEdit = true;
            canDelete = true;
            canManage = true;
            break;
          case 'member':
            canView = true;
            canEdit = true;
            canDelete = isBoardCreator;
            canManage = false;
            break;
          case 'viewer':
            canView = true;
            canEdit = false;
            canDelete = false;
            canManage = false;
            break;
        }
      } else if (isPublicBoard) {
        // Публичная доска - только просмотр
        canView = true;
        canEdit = false;
        canDelete = false;
        canManage = false;
      }

      return {
        canView,
        canEdit,
        canDelete,
        canManage
      };
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canManage: false
      };
    }
  }

  /**
   * Проверяет, может ли пользователь просматривать доску
   */
  async canUserViewBoard(boardId: BoardId, userId: UserId): Promise<boolean> {
    const permissions = await this.getUserPermissions(boardId, userId);
    return permissions.canView;
  }

  /**
   * Проверяет, может ли пользователь редактировать доску
   */
  async canUserEditBoard(boardId: BoardId, userId: UserId): Promise<boolean> {
    const permissions = await this.getUserPermissions(boardId, userId);
    return permissions.canEdit;
  }

  /**
   * Проверяет, может ли пользователь удалить доску
   */
  async canUserDeleteBoard(boardId: BoardId, userId: UserId): Promise<boolean> {
    const permissions = await this.getUserPermissions(boardId, userId);
    return permissions.canDelete;
  }

  /**
   * Проверяет, может ли пользователь создавать доски в проекте
   */
  async canUserCreateBoard(projectId: ProjectId, userId: UserId): Promise<boolean> {
    try {
      console.log('canUserCreateBoard called with:', { projectId, userId });
      
      // Сначала проверяем роль пользователя в системе
      const user = await this.databaseAdapter.getUserById(userId);
      if (!user) {
        console.log('User not found');
        return false;
      }
      
      console.log('User role:', user.role);
      
      // Администраторы могут создавать доски в любом проекте
      if (user.role === 'admin') {
        console.log('User is admin - allowing board creation');
        return true;
      }
      
      // Проверяем владение проектом
      const ownerQuery = `
        SELECT creator_id FROM projects WHERE id = ?
      `;
      
      const ownerResult = await this.databaseAdapter.query(ownerQuery, [projectId]);
      console.log('Owner query result:', ownerResult);
      
      if (!ownerResult || ownerResult.rows.length === 0) {
        console.log('Project not found');
        return false;
      }

      const projectOwner = ownerResult.rows[0].creator_id;
      console.log('Project owner:', projectOwner, 'Current user:', userId);
      
      if (projectOwner === userId) {
        console.log('User is project owner - allowing board creation');
        return true;
      }

      // Проверяем членство в проекте
      const memberQuery = `
        SELECT role FROM project_members 
        WHERE project_id = ? AND user_id = ?
      `;
      
      const memberResult = await this.databaseAdapter.query(memberQuery, [projectId, userId]);
      console.log('Member query result:', memberResult.rows);
      const userRole = memberResult.rows?.[0]?.role;
      console.log('User role in project:', userRole);

      // Определяем права на создание досок
      switch (userRole) {
        case 'admin':
        case 'member':
          console.log('User has admin/member role - allowing board creation');
          return true;
        case 'viewer':
          console.log('User has viewer role - denying board creation');
          return false;
        default:
          console.log('User has no role in project - denying board creation');
          return false;
      }
    } catch (error) {
      console.error('Error checking board creation permission:', error);
      return false;
    }
  }


}