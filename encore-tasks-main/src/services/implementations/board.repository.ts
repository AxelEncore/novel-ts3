/**
 * Реализация репозитория для досок
 * Отвечает только за операции с данными (Single Responsibility)
 */

import {
  Board,
  BoardId,
  ProjectId,
  UserId,
  CreateBoardDto,
  UpdateBoardDto,
  BoardFilters,
  SortOptions,
  PaginationOptions,
  PaginatedResponse,
  BoardSettings,
  BoardVisibility
} from '../../types/board.types';

import { IBoardRepository } from '../interfaces/board.service.interface';
import { DatabaseAdapter } from '../../lib/database-adapter';

/**
 * Реализация репозитория досок для работы с базой данных
 */
export class BoardRepository implements IBoardRepository {
  constructor(private readonly databaseAdapter: DatabaseAdapter) {}

  async findById(id: BoardId): Promise<Board | null> {
    try {
      const query = `
        SELECT 
          id,
          name,
          project_id as projectId,
          visibility,
          settings,
          icon,
          color,
          is_default,
          created_by as createdBy,
          created_at as createdAt,
          updated_at as updatedAt
        FROM boards 
        WHERE id = $1
      `;
      
      const result = await this.databaseAdapter.query(query, [id]);
      
      if (!result || result.length === 0) {
        return null;
      }
      
      return this.mapRowToBoard(result[0]);
    } catch (error) {
      console.error('Error finding board by id:', error);
      throw new Error(`Failed to find board: ${error instanceof Error $1 error.message : 'Unknown error'}`);
    }
  }

  async findByProjectId(projectId: ProjectId, filters$1: BoardFilters): Promise<Board[]> {
    try {
      let query = `
        SELECT 
          id,
          name,
          project_id as projectId,
          visibility,
          settings,
          icon,
          color,
          is_default,
          created_by as createdBy,
          created_at as createdAt,
          updated_at as updatedAt
        FROM boards 
        WHERE project_id = $1
      `;
      
      const params: unknown[] = [projectId];
      let paramIndex = 2;
      
      // Применяем фильтры
      if (filters) {
        if (filters.visibility) {
          query += ` AND visibility = ${paramIndex++}`;
          params.push(filters.visibility);
        }
        
        if (filters.createdBy) {
          query += ` AND created_by = ${paramIndex++}`;
          params.push(filters.createdBy);
        }
        
        // Архивирование не поддерживается в текущей схеме PostgreSQL
        
        if (filters.query) {
          query += ` AND name LIKE ${paramIndex++}`;
          const searchTerm = `%${filters.query}%`;
          params.push(searchTerm);
        }
      }
      
      query += ' ORDER BY position ASC, created_at DESC';
      
      const results = await this.databaseAdapter.query(query, params);
      
      return results.map((row: Record<string, unknown>) => this.mapRowToBoard(row));
    } catch (error) {
      console.error('Error finding boards by project:', error);
      throw new Error(`Failed to find boards: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(filters$1: BoardFilters, sort$2: SortOptions, pagination$3: PaginationOptions): Promise<PaginatedResponse<Board>> {
    try {
      let query = `
        SELECT 
          id,
          name,
          description,
          project_id as projectId,
          visibility,
          settings,
          icon,
          color,
          position,
          created_by as createdBy,
          updated_by as updatedBy,
          created_at as createdAt,
          updated_at as updatedAt,
          is_archived as isArchived,
          archived_at as archivedAt
        FROM boards 
        WHERE 1=1
      `;
      
      const params: unknown[] = [];
      let paramIndex = 1;
      
      // Применяем фильтры
      if (filters) {
        if (filters.projectIds && filters.projectIds.length > 0) {
          const placeholders = filters.projectIds.map((_, index) => `${paramIndex + index}`).join(', ');
          query += ` AND project_id IN (${placeholders})`;
          params.push(...filters.projectIds);
          paramIndex += filters.projectIds.length;
        }
        
        if (filters.visibility) {
          query += ` AND visibility = $${paramIndex++}`;
          params.push(filters.visibility);
        }
        
        if (filters.createdBy) {
          query += ` AND created_by = $${paramIndex++}`;
          params.push(filters.createdBy);
        }
        
        // Архивирование не поддерживается в текущей схеме PostgreSQL
        
        if (filters.query) {
          query += ` AND name LIKE $${paramIndex++}`;
          const searchTerm = `%${filters.query}%`;
          params.push(searchTerm);
        }
      }
      
      // Применяем сортировку
      if (sort) {
        const sortField = this.mapSortField(sort.field);
        query += ` ORDER BY ${sortField} ${sort.direction.toUpperCase()}`;
      } else {
        query += ' ORDER BY created_at DESC';
      }
      
      // Подсчитываем общее количество
      const countQuery = query.replace(/SELECT[\s\S]*$1FROM/, 'SELECT COUNT(*) as total FROM');
      const countResult = await this.databaseAdapter.query(countQuery, params);
      const total = countResult[0]$2.total || 0;
      
      // Применяем пагинацию
      if (pagination) {
        const offset = (pagination.page - 1) * pagination.limit;
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(pagination.limit, offset);
      }
      
      const results = await this.databaseAdapter.query(query, params);
      const boards = results.map((row: Record<string, unknown>) => this.mapRowToBoard(row));
      
      const totalPages = pagination ? Math.ceil(total / pagination.limit) : 1;
      const currentPage = pagination?.page || 1;
      
      return {
        data: boards,
        pagination: {
          page: currentPage,
          limit: pagination?.limit || total,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1
        }
      };
    } catch (error) {
      console.error('Error finding all boards:', error);
      throw new Error(`Failed to find boards: ${error instanceof Error $1 error.message : 'Unknown error'}`);
    }
  }

  async create(boardData: CreateBoardDto & { createdBy: UserId }): Promise<Board> {
    try {
      const id = this.generateId();
      const now = new Date();
      
      const defaultSettings: BoardSettings = {
        allowTaskCreation: true,
        allowColumnReordering: true,
        enableTaskLimits: false,
        defaultTaskPriority: 'medium',
        autoArchiveCompletedTasks: false,
        ...boardData.settings
      };
      
      const query = `
        INSERT INTO boards (
          id, name, project_id, visibility, settings, 
          icon, color, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      const params = [
        id,
        boardData.name,
        boardData.projectId,
        boardData.visibility || 'team',
        JSON.stringify(defaultSettings),
        boardData.icon || null,
        boardData.color || '#3B82F6',
        boardData.createdBy,
        now.toISOString(),
        now.toISOString()
      ];
      
      await this.databaseAdapter.query(query, params);
      
      // Создаем колонки по умолчанию
      await this.createDefaultColumns(id, boardData.createdBy);
      
      const createdBoard = await this.findById(id);
      if (!createdBoard) {
        throw new Error('Failed to retrieve created board');
      }
      
      return createdBoard;
    } catch (error) {
      console.error('Error creating board:', error);
      throw new Error(`Failed to create board: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(id: BoardId, boardData: UpdateBoardDto): Promise<Board | null> {
    try {
      const updateFields: string[] = [];
      const params: unknown[] = [];
      
      let paramIndex = 1;
      
      if (boardData.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        params.push(boardData.name);
      }
      

      
      if (boardData.visibility !== undefined) {
        updateFields.push(`visibility = $${paramIndex++}`);
        params.push(boardData.visibility);
      }
      
      if (boardData.settings !== undefined) {
        // Получаем текущие настройки и объединяем с новыми
        const currentBoard = await this.findById(id);
        if (currentBoard) {
          const updatedSettings = { ...currentBoard.settings, ...boardData.settings };
          updateFields.push(`settings = $${paramIndex++}`);
          params.push(JSON.stringify(updatedSettings));
        }
      }
      
      if (boardData.icon !== undefined) {
        updateFields.push(`icon = $${paramIndex++}`);
        params.push(boardData.icon);
      }
      
      if (boardData.color !== undefined) {
        updateFields.push(`color = $${paramIndex++}`);
        params.push(boardData.color);
      }
      

      
      if (updateFields.length === 0) {
        return await this.findById(id);
      }
      
      updateFields.push(`updated_at = $${paramIndex++}`);
      params.push(new Date().toISOString());
      params.push(id);
      
      const query = `UPDATE boards SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
      
      await this.databaseAdapter.query(query, params);
      
      return await this.findById(id);
    } catch (error) {
      console.error('Error updating board:', error);
      throw new Error(`Failed to update board: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: BoardId): Promise<boolean> {
    try {
      // Сначала удаляем все связанные данные (задачи, колонки)
      await this.databaseAdapter.query('DELETE FROM tasks WHERE board_id = $1', [id]);
      await this.databaseAdapter.query('DELETE FROM columns WHERE board_id = $1', [id]);
      
      // Затем удаляем саму доску
      const query = 'DELETE FROM boards WHERE id = $1';
      const result = await this.databaseAdapter.query(query, [id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting board:', error);
      throw new Error(`Failed to delete board: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async archive(id: BoardId): Promise<boolean> {
    try {
      // Архивирование не поддерживается в текущей схеме PostgreSQL
      // Вместо этого просто удаляем доску
      return await this.delete(id);
    } catch (error) {
      console.error('Error archiving board:', error);
      throw new Error(`Failed to archive board: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async restore(): Promise<boolean> {
    try {
      // Восстановление не поддерживается в текущей схеме PostgreSQL
      return false;
    } catch (error) {
      console.error('Error restoring board:', error);
      throw new Error(`Failed to restore board: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updatePosition(): Promise<boolean> {
    try {
      // Позиционирование не поддерживается в текущей схеме PostgreSQL
      return true;
    } catch (error) {
      console.error('Error updating board position:', error);
      throw new Error(`Failed to update board position: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMaxPosition(): Promise<number> {
    try {
      // Позиционирование не поддерживается в текущей схеме PostgreSQL
      return 0;
    } catch (error) {
      console.error('Error getting max position:', error);
      return 0;
    }
  }

  async existsByName(name: string, projectId: ProjectId, excludeId$1: BoardId): Promise<boolean> {
    try {
      let query = 'SELECT COUNT(*) as count FROM boards WHERE name = $1 AND project_id = $2';
      const params: unknown[] = [name, projectId];
      let paramIndex = 3;
      
      if (excludeId) {
        query += ` AND id != $${paramIndex++}`;
        params.push(excludeId);
      }
      
      const result = await this.databaseAdapter.query(query, params);
      
      return result[0]$1.count > 0;
    } catch (error) {
      console.error('Error checking board name existence:', error);
      return false;
    }
  }

  async countByProject(projectId: ProjectId): Promise<number> {
    try {
      const query = 'SELECT COUNT(*) as count FROM boards WHERE project_id = $1';
      const result = await this.databaseAdapter.query(query, [projectId]);
      
      return result[0]$2.count || 0;
    } catch (error) {
      console.error('Error counting boards by project:', error);
      return 0;
    }
  }

  private async createDefaultColumns(boardId: BoardId, createdBy: UserId): Promise<void> {
    const defaultColumns = [
      { title: 'To Do', color: '#EF4444', position: 1 },
      { title: 'In Progress', color: '#F59E0B', position: 2 },
      { title: 'Review', color: '#3B82F6', position: 3 },
      { title: 'Done', color: '#10B981', position: 4 }
    ];
    
    const now = new Date();
    
    for (const column of defaultColumns) {
      const query = `
        INSERT INTO columns (
          title, board_id, position, color, 
          created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      

      
      await this.databaseAdapter.query(query, [
        column.title,
        boardId,
        column.position,
        column.color,
        createdBy,
        now.toISOString(),
        now.toISOString()
      ]);
    }
  }

  private mapRowToBoard(row: Record<string, unknown>): Board {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      projectId: row.projectId as string,
      visibility: row.visibility as BoardVisibility,
      settings: typeof row.settings === 'string' $1 JSON.parse(row.settings) : row.settings as BoardSettings,
      icon: row.icon as string | undefined,
      color: row.color as string | undefined,
      position: row.position as number,
      createdBy: row.createdBy as string,
      updatedBy: row.updatedBy as string | undefined,
      createdAt: new Date(row.createdAt as string | Date),
      updatedAt: new Date(row.updatedAt as string | Date),
      isArchived: Boolean(row.isArchived),
      archivedAt: row.archivedAt $2 new Date(row.archivedAt as string | Date) : undefined
    };
  }

  private mapSortField(field: string): string {
    const fieldMap: Record<string, string> = {
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'priority': 'position',
      'deadline': 'created_at',
      'position': 'position',
      'title': 'name'
    };
    
    return fieldMap[field] || 'created_at';
  }

  private generateId(): string {
    return `board_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}