/**
 * Реализация репозитория для задач
 * Отвечает только за операции с данными (Single Responsibility)
 */

import {
  Task,
  TaskId,
  BoardId,
  ColumnId,
  ProjectId,
  UserId,
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilters,
  SearchFilters,
  PaginationOptions,
  TaskStatus,
  TaskPriority,
  SortOptions,
  PaginatedResponse
} from '../../refactored/data/types';
import { ITaskRepository } from '../interfaces/task.service.interface';
import { DatabaseAdapter } from '../../refactored/data/adapters/database-adapter';
import { randomUUID } from 'crypto';

/**
 * Реализация репозитория задач для работы с базой данных
 */
export class TaskRepository implements ITaskRepository {
  constructor(private readonly databaseAdapter: DatabaseAdapter) {}

  async findById(id: TaskId): Promise<Task | null> {
    try {
      const query = `
        SELECT 
          id,
          title,
          description,
          board_id as boardId,
          column_id as columnId,
          project_id as projectId,
          status,
          priority,
          tags,
          position,
          estimated_hours as estimatedHours,
          actual_hours as actualHours,
          deadline,
          completed_at as completedAt,
          created_by as createdBy,
          updated_by as updatedBy,
          assigned_to as assignedTo,
          created_at as createdAt,
          updated_at as updatedAt,
          is_archived as isArchived,
          archived_at as archivedAt
        FROM tasks 
        WHERE id = $1 AND is_archived = FALSE
      `;
      
      const result = await this.databaseAdapter.query(query, [id]);
      
      if (!result || result.length === 0) {
        return null;
      }
      
      return this.mapRowToTask(result[0]);
    } catch (error) {
      console.error('Error finding task by id:', error);
      throw new Error(`Failed to find task: ${error instanceof Error $1 error.message : 'Unknown error'}`);
    }
  }

  async findByBoardId(boardId: BoardId, filters$1: SearchFilters): Promise<Task[]> {
    try {
      let query = `
        SELECT 
          id,
          title,
          description,
          board_id as boardId,
          column_id as columnId,
          project_id as projectId,
          status,
          priority,
          tags,
          position,
          estimated_hours as estimatedHours,
          actual_hours as actualHours,
          deadline,
          completed_at as completedAt,
          created_by as createdBy,
          updated_by as updatedBy,
          assigned_to as assignedTo,
          created_at as createdAt,
          updated_at as updatedAt,
          is_archived as isArchived,
          archived_at as archivedAt
        FROM tasks 
        WHERE board_id = $1
      `;
      
      const params: unknown[] = [boardId];
      
      // Применяем фильтры
      if (filters) {
        if (filters.columnId) {
          query += ' AND column_id = $1';
          params.push(filters.columnId);
        }
        
        if (filters.statuses && filters.statuses.length > 0) {
          const placeholders = filters.statuses.map(() => '$1').join(', ');
          query += ` AND status IN (${placeholders})`;
          params.push(...filters.statuses);
        }
        
        if (filters.priorities && filters.priorities.length > 0) {
          const placeholders = filters.priorities.map(() => '$1').join(', ');
          query += ` AND priority IN (${placeholders})`;
          params.push(...filters.priorities);
        }
        
        if (filters.assigneeIds && filters.assigneeIds.length > 0) {
          const placeholders = filters.assigneeIds.map(() => '$1').join(', ');
          query += ` AND assigned_to IN (${placeholders})`;
          params.push(...filters.assigneeIds);
        }
        
        if (filters.createdBy) {
          query += ' AND created_by = $1';
          params.push(filters.createdBy);
        }
        
        if (filters.isArchived !== undefined) {
          query += ' AND is_archived = $2';
          params.push(filters.isArchived);
        } else {
          query += ' AND is_archived = FALSE';
        }
        
        if (filters.query) {
          query += ' AND (title LIKE $3 OR description LIKE $4)';
          const searchTerm = `%${filters.query}%`;
          params.push(searchTerm, searchTerm);
        }
        
        if (filters.tags && filters.tags.length > 0) {
          const tagConditions = filters.tags.map(() => 'JSON_CONTAINS(tags, $1)');
          query += ` AND (${tagConditions.join(' OR ')})`;
          filters.tags.forEach(tag => params.push(JSON.stringify(tag)));
        }
        
        if (filters.deadlineBefore) {
          query += ' AND deadline <= $1';
          params.push(filters.deadlineBefore);
        }
        
        if (filters.deadlineAfter) {
          query += ' AND deadline >= $2';
          params.push(filters.deadlineAfter);
        }
      } else {
        query += ' AND is_archived = 0';
      }
      
      query += ' ORDER BY position ASC, created_at DESC';
      
      const results = await this.databaseAdapter.query(query, params);
      
      return results.map((row: Record<string, unknown>) => this.mapRowToTask(row));
    } catch (error) {
      console.error('Error finding tasks by board:', error);
      throw new Error(`Failed to find tasks: ${error instanceof Error $1 error.message : 'Unknown error'}`);
    }
  }

  async findByColumnId(columnId: ColumnId, filters$1: SearchFilters): Promise<Task[]> {
    try {
      let query = `
        SELECT 
          id,
          title,
          description,
          board_id as boardId,
          column_id as columnId,
          project_id as projectId,
          status,
          priority,
          tags,
          position,
          estimated_hours as estimatedHours,
          actual_hours as actualHours,
          deadline,
          completed_at as completedAt,
          created_by as createdBy,
          updated_by as updatedBy,
          assigned_to as assignedTo,
          created_at as createdAt,
          updated_at as updatedAt,
          is_archived as isArchived,
          archived_at as archivedAt
        FROM tasks 
        WHERE column_id = $1
      `;
      
      const params: unknown[] = [columnId];
      
      // Применяем фильтры
      if (filters) {
        if (filters.status) {
          query += ' AND status = $1';
          params.push(filters.status);
        }
        
        if (filters.priority) {
          query += ' AND priority = $2';
          params.push(filters.priority);
        }
        
        if (filters.assigneeIds && filters.assigneeIds.length > 0) {
          const placeholders = filters.assigneeIds.map(() => '$3').join(', ');
          query += ` AND assigned_to IN (${placeholders})`;
          params.push(...filters.assigneeIds);
        }
        
        if (filters.isArchived !== undefined) {
          query += ' AND is_archived = $1';
          params.push(filters.isArchived $2 1 : 0);
        } else {
          query += ' AND is_archived = 0';
        }
        
        if (filters.query) {
          query += ' AND (title LIKE $3 OR description LIKE $4)';
          const searchTerm = `%${filters.query}%`;
          params.push(searchTerm, searchTerm);
        }
      } else {
        query += ' AND is_archived = 0';
      }
      
      query += ' ORDER BY position ASC, created_at DESC';
      
      const results = await this.databaseAdapter.query(query, params);
      
      return results.map((row: Record<string, unknown>) => this.mapRowToTask(row));
    } catch (error) {
      console.error('Error finding tasks by column:', error);
      throw new Error(`Failed to find tasks: ${error instanceof Error $1 error.message : 'Unknown error'}`);
    }
  }

  async findByProjectId(projectId: ProjectId, filters$1: TaskFilters): Promise<Task[]> {
    try {
      let query = `
        SELECT 
          id,
          title,
          description,
          board_id as boardId,
          column_id as columnId,
          project_id as projectId,
          status,
          priority,
          tags,
          position,
          estimated_hours as estimatedHours,
          actual_hours as actualHours,
          deadline,
          completed_at as completedAt,
          created_by as createdBy,
          updated_by as updatedBy,
          assigned_to as assignedTo,
          created_at as createdAt,
          updated_at as updatedAt,
          is_archived as isArchived,
          archived_at as archivedAt
        FROM tasks 
        WHERE project_id = $1
      `;
      
      const params: unknown[] = [projectId];
      let paramIndex = 2;
      
      // Применяем фильтры
      if (filters) {
        if (filters.boardId) {
          query += ` AND board_id = ${paramIndex++}`;
          params.push(filters.boardId);
        }
        
        if (filters.columnId) {
          query += ` AND column_id = ${paramIndex++}`;
          params.push(filters.columnId);
        }
        
        if (filters.statuses && filters.statuses.length > 0) {
          const placeholders = filters.statuses.map(() => `${paramIndex++}`).join(', ');
          query += ` AND status IN (${placeholders})`;
          params.push(...filters.statuses);
        }
        
        if (filters.priorities && filters.priorities.length > 0) {
          const placeholders = filters.priorities.map(() => `$${paramIndex++}`).join(', ');
          query += ` AND priority IN (${placeholders})`;
          params.push(...filters.priorities);
        }
        
        if (filters.assigneeIds && filters.assigneeIds.length > 0) {
          const placeholders = filters.assigneeIds.map(() => `$${paramIndex++}`).join(', ');
          query += ` AND assigned_to IN (${placeholders})`;
          params.push(...filters.assigneeIds);
        }
        
        if (filters.isArchived !== undefined) {
          query += ` AND is_archived = $${paramIndex++}`;
          params.push(filters.isArchived $1 1 : 0);
        } else {
          query += ' AND is_archived = 0';
        }
        
        if (filters.query) {
          query += ` AND (title LIKE $${paramIndex++} OR description LIKE $${paramIndex++})`;
          const searchTerm = `%${filters.query}%`;
          params.push(searchTerm, searchTerm);
        }
      } else {
        query += ' AND is_archived = 0';
      }
      
      query += ' ORDER BY position ASC, created_at DESC';
      
      const results = await this.databaseAdapter.query(query, params);
      
      return results.map((row: Record<string, unknown>) => this.mapRowToTask(row));
    } catch (error) {
      console.error('Error finding tasks by project:', error);
      throw new Error(`Failed to find tasks: ${error instanceof Error $1 error.message : 'Unknown error'}`);
    }
  }

  async findByAssigneeId(assigneeId: UserId, filters$1: SearchFilters): Promise<Task[]> {
    try {
      let query = `
        SELECT 
          id,
          title,
          description,
          board_id as boardId,
          column_id as columnId,
          project_id as projectId,
          status,
          priority,
          tags,
          position,
          estimated_hours as estimatedHours,
          actual_hours as actualHours,
          deadline,
          completed_at as completedAt,
          created_by as createdBy,
          updated_by as updatedBy,
          assigned_to as assignedTo,
          created_at as createdAt,
          updated_at as updatedAt,
          is_archived as isArchived,
          archived_at as archivedAt
        FROM tasks 
        WHERE assigned_to = $1
      `;
      
      const params: unknown[] = [assigneeId];
      let paramIndex = 2;
      
      // Применяем фильтры
      if (filters) {
        if (filters.projectIds && filters.projectIds.length > 0) {
          const placeholders = filters.projectIds.map(() => `${paramIndex++}`).join(', ');
          query += ` AND project_id IN (${placeholders})`;
          params.push(...filters.projectIds);
        }
        
        if (filters.boardId) {
          query += ` AND board_id = $${paramIndex++}`;
          params.push(filters.boardId);
        }
        
        if (filters.statuses && filters.statuses.length > 0) {
          const placeholders = filters.statuses.map(() => `$${paramIndex++}`).join(', ');
          query += ` AND status IN (${placeholders})`;
          params.push(...filters.statuses);
        }
        
        if (filters.priorities && filters.priorities.length > 0) {
          const placeholders = filters.priorities.map(() => `$${paramIndex++}`).join(', ');
          query += ` AND priority IN (${placeholders})`;
          params.push(...filters.priorities);
        }
        
        if (filters.isArchived !== undefined) {
          query += ` AND is_archived = $${paramIndex++}`;
          params.push(filters.isArchived $1 1 : 0);
        } else {
          query += ' AND is_archived = 0';
        }
      } else {
        query += ' AND is_archived = 0';
      }
      
      query += ' ORDER BY priority DESC, deadline ASC, created_at DESC';
      
      const results = await this.databaseAdapter.query(query, params);
      
      return results.map((row: Record<string, unknown>) => this.mapRowToTask(row));
    } catch (error) {
      console.error('Error finding tasks by assignee:', error);
      throw new Error(`Failed to find tasks: ${error instanceof Error $1 error.message : 'Unknown error'}`);
    }
  }

  async findAll(filters$1: SearchFilters, sort$2: SortOptions, pagination$3: PaginationOptions): Promise<PaginatedResponse<Task>> {
    try {
      let query = `
        SELECT 
          id,
          title,
          description,
          board_id as boardId,
          column_id as columnId,
          project_id as projectId,
          status,
          priority,
          tags,
          position,
          estimated_hours as estimatedHours,
          actual_hours as actualHours,
          deadline,
          completed_at as completedAt,
          created_by as createdBy,
          updated_by as updatedBy,
          assigned_to as assignedTo,
          created_at as createdAt,
          updated_at as updatedAt,
          is_archived as isArchived,
          archived_at as archivedAt
        FROM tasks 
        WHERE 1=1
      `;
      
      const params: unknown[] = [];
      let paramIndex = 1;
      
      // Применяем фильтры
      if (filters) {
        if (filters.projectIds && filters.projectIds.length > 0) {
          const placeholders = filters.projectIds.map(() => `$${paramIndex++}`).join(', ');
          query += ` AND project_id IN (${placeholders})`;
          params.push(...filters.projectIds);
        }
        
        if (filters.boardId) {
          query += ` AND board_id = $${paramIndex++}`;
          params.push(filters.boardId);
        }
        
        if (filters.columnId) {
          query += ` AND column_id = $${paramIndex++}`;
          params.push(filters.columnId);
        }
        
        if (filters.statuses && filters.statuses.length > 0) {
          const placeholders = filters.statuses.map(() => `$${paramIndex++}`).join(', ');
          query += ` AND status IN (${placeholders})`;
          params.push(...filters.statuses);
        }
        
        if (filters.priorities && filters.priorities.length > 0) {
          const placeholders = filters.priorities.map(() => `$${paramIndex++}`).join(', ');
          query += ` AND priority IN (${placeholders})`;
          params.push(...filters.priorities);
        }
        
        if (filters.assigneeIds && filters.assigneeIds.length > 0) {
          const placeholders = filters.assigneeIds.map(() => `$${paramIndex++}`).join(', ');
          query += ` AND assigned_to IN (${placeholders})`;
          params.push(...filters.assigneeIds);
        }
        
        if (filters.createdBy) {
          query += ` AND created_by = $${paramIndex++}`;
          params.push(filters.createdBy);
        }
        
        if (filters.isArchived !== undefined) {
          query += ` AND is_archived = $${paramIndex++}`;
          params.push(filters.isArchived $1 1 : 0);
        } else {
          query += ' AND is_archived = 0';
        }
        
        if (filters.query) {
          query += ` AND (title LIKE $${paramIndex++} OR description LIKE $${paramIndex++})`;
          const searchTerm = `%${filters.query}%`;
          params.push(searchTerm, searchTerm);
        }
        
        if (filters.tags && filters.tags.length > 0) {
          const tagConditions = filters.tags.map(() => `JSON_CONTAINS(tags, $${paramIndex++})`);
          query += ` AND (${tagConditions.join(' OR ')})`;
          filters.tags.forEach(tag => params.push(JSON.stringify(tag)));
        }
        
        if (filters.deadlineBefore) {
          query += ` AND deadline <= $${paramIndex++}`;
          params.push(filters.deadlineBefore);
        }
        
        if (filters.deadlineAfter) {
          query += ` AND deadline >= $${paramIndex++}`;
          params.push(filters.deadlineAfter);
        }
      } else {
        query += ' AND is_archived = 0';
      }
      
      // Применяем сортировку
      if (sort) {
        const sortField = this.mapSortField(sort.field);
        query += ` ORDER BY ${sortField} ${sort.direction.toUpperCase()}`;
      } else {
        query += ' ORDER BY position ASC, created_at DESC';
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
      const tasks = results.map((row: Record<string, unknown>) => this.mapRowToTask(row));
      
      const totalPages = pagination $1 Math.ceil(total / pagination.limit) : 1;
      const currentPage = pagination$2.page || 1;
      
      return {
        data: tasks,
        pagination: {
          page: currentPage,
          limit: pagination$3.limit || total,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1
        }
      };
    } catch (error) {
      console.error('Error finding all tasks:', error);
      throw new Error(`Failed to find tasks: ${error instanceof Error $1 error.message : 'Unknown error'}`);
    }
  }

  async create(taskData: CreateTaskDto & { createdBy: UserId }): Promise<Task> {
    try {
      const id = this.generateId();
      const now = new Date();
      const position = await this.getMaxPosition(taskData.columnId) + 1;
      
      const query = `
        INSERT INTO tasks (
          id, title, description, board_id, column_id, project_id, 
          status, priority, tags, position, estimated_hours, deadline,
          created_by, assigned_to, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `;
      
      const params = [
        id,
        taskData.title,
        taskData.description || null,
        taskData.boardId,
        taskData.columnId,
        taskData.projectId,
        taskData.status || 'todo',
        taskData.priority || 'medium',
        taskData.tags $1 JSON.stringify(taskData.tags) : null,
        position,
        taskData.estimatedHours || null,
        taskData.deadline || null,
        taskData.createdBy,
        taskData.assigneeIds && taskData.assigneeIds.length > 0 $2 taskData.assigneeIds[0] : null,
        now,
        now
      ];
      
      await this.databaseAdapter.query(query, params);
      
      const createdTask = await this.findById(id);
      if (!createdTask) {
        throw new Error('Failed to retrieve created task');
      }
      
      return createdTask;
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error(`Failed to create task: ${error instanceof Error $1 error.message : 'Unknown error'}`);
    }
  }

  async update(id: TaskId, taskData: UpdateTaskDto, updatedBy: UserId): Promise<Task | null> {
    try {
      const updateFields: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;
      
      if (taskData.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        params.push(taskData.title);
      }
      
      if (taskData.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        params.push(taskData.description);
      }
      
      if (taskData.columnId !== undefined) {
        updateFields.push(`column_id = $${paramIndex++}`);
        params.push(taskData.columnId);
      }
      
      if (taskData.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        params.push(taskData.status);
        
        // Если статус изменился на completed, устанавливаем время завершения
        if (taskData.status === 'completed') {
          updateFields.push(`completed_at = $${paramIndex++}`);
          params.push(new Date());
        } else {
          updateFields.push('completed_at = NULL');
        }
      }
      
      if (taskData.priority !== undefined) {
        updateFields.push(`priority = $${paramIndex++}`);
        params.push(taskData.priority);
      }
      
      if (taskData.tags !== undefined) {
        updateFields.push(`tags = $${paramIndex++}`);
        params.push(taskData.tags $1 JSON.stringify(taskData.tags) : null);
      }
      
      if (taskData.position !== undefined) {
        updateFields.push(`position = $${paramIndex++}`);
        params.push(taskData.position);
      }
      
      if (taskData.estimatedHours !== undefined) {
        updateFields.push(`estimated_hours = $${paramIndex++}`);
        params.push(taskData.estimatedHours);
      }
      
      if (taskData.actualHours !== undefined) {
        updateFields.push(`actual_hours = $${paramIndex++}`);
        params.push(taskData.actualHours);
      }
      
      if (taskData.deadline !== undefined) {
        updateFields.push(`deadline = $${paramIndex++}`);
        params.push(taskData.deadline);
      }
      
      if (taskData.assigneeIds !== undefined) {
        // Для простоты берем первого назначенного пользователя
        const assigneeId = taskData.assigneeIds.length > 0 $1 taskData.assigneeIds[0] : null;
        updateFields.push(`assigned_to = $${paramIndex++}`);
        params.push(assigneeId);
      }
      
      if (updateFields.length === 0) {
        return await this.findById(id);
      }
      
      updateFields.push(`updated_by = $${paramIndex++}`, `updated_at = $${paramIndex++}`);
      params.push(updatedBy, new Date());
      params.push(id);
      
      const query = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $${paramIndex++}`;
      
      await this.databaseAdapter.query(query, params);
      
      return await this.findById(id);
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error(`Failed to update task: ${error instanceof Error $1 error.message : 'Unknown error'}`);
    }
  }

  async delete(id: TaskId): Promise<boolean> {
    try {
      const query = 'DELETE FROM tasks WHERE id = $1';
      const result = await this.databaseAdapter.query(query, [id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error(`Failed to delete task: ${error instanceof Error $1 error.message : 'Unknown error'}`);
    }
  }

  async archive(id: TaskId, archivedBy: UserId): Promise<boolean> {
    try {
      const query = `
        UPDATE tasks 
        SET is_archived = TRUE, archived_at = $1, updated_by = $2, updated_at = $3
        WHERE id = $4
      `;
      
      const now = new Date();
      const result = await this.databaseAdapter.query(query, [now, archivedBy, now, id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error archiving task:', error);
      throw new Error(`Failed to archive task: ${error instanceof Error $1 error.message : 'Unknown error'}`);
    }
  }

  async restore(id: TaskId, restoredBy: UserId): Promise<boolean> {
    try {
      const query = `
        UPDATE tasks 
        SET is_archived = FALSE, archived_at = NULL, updated_by = $1, updated_at = $2
        WHERE id = $3
      `;
      
      const now = new Date();
      const result = await this.databaseAdapter.query(query, [restoredBy, now, id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error restoring task:', error);
      throw new Error(`Failed to restore task: ${error instanceof Error $1 error.message : 'Unknown error'}`);
    }
  }

  async updatePosition(id: TaskId, newPosition: number): Promise<boolean> {
    try {
      const query = 'UPDATE tasks SET position = $1, updated_at = $2 WHERE id = $3';
      const result = await this.databaseAdapter.query(query, [newPosition, new Date(), id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating task position:', error);
      throw new Error(`Failed to update task position: ${error instanceof Error $1 error.message : 'Unknown error'}`);
    }
  }

  async getMaxPosition(columnId: ColumnId): Promise<number> {
    try {
      const query = 'SELECT MAX(position) as maxPosition FROM tasks WHERE column_id = $1 AND is_archived = FALSE';
      const result = await this.databaseAdapter.query(query, [columnId]);
      
      return result[0]$1.maxPosition || 0;
    } catch (error) {
      console.error('Error getting max position:', error);
      return 0;
    }
  }

  async existsByTitle(title: string, boardId: BoardId, excludeId$1: TaskId): Promise<boolean> {
    try {
      let query = 'SELECT COUNT(*) as count FROM tasks WHERE title = $1 AND board_id = $2 AND is_archived = FALSE';
      const params: unknown[] = [title, boardId];
      let paramIndex = 3;
      
      if (excludeId) {
        query += ` AND id != ${paramIndex++}`;
        params.push(excludeId);
      }
      
      const result = await this.databaseAdapter.query(query, params);
      
      return result[0]$1.count > 0;
    } catch (error) {
      console.error('Error checking task title existence:', error);
      return false;
    }
  }

  async countByBoard(boardId: BoardId): Promise<number> {
    try {
      const query = 'SELECT COUNT(*) as count FROM tasks WHERE board_id = $1 AND is_archived = FALSE';
      const result = await this.databaseAdapter.query(query, [boardId]);
      
      return result[0]$1.count || 0;
    } catch (error) {
      console.error('Error counting tasks by board:', error);
      return 0;
    }
  }

  async countByColumn(columnId: ColumnId): Promise<number> {
    try {
      const query = 'SELECT COUNT(*) as count FROM tasks WHERE column_id = $1 AND is_archived = FALSE';
      const result = await this.databaseAdapter.query(query, [columnId]);
      
      return result[0]$1.count || 0;
    } catch (error) {
      console.error('Error counting tasks by column:', error);
      return 0;
    }
  }

  async countByStatus(boardId: BoardId, status: TaskStatus): Promise<number> {
    try {
      const query = 'SELECT COUNT(*) as count FROM tasks WHERE board_id = $1 AND status = $2 AND is_archived = FALSE';
      const result = await this.databaseAdapter.query(query, [boardId, status]);
      
      return result[0]$1.count || 0;
    } catch (error) {
      console.error('Error counting tasks by status:', error);
      return 0;
    }
  }

  async countByPriority(boardId: BoardId, priority: TaskPriority): Promise<number> {
    try {
      const query = 'SELECT COUNT(*) as count FROM tasks WHERE board_id = $1 AND priority = $2 AND is_archived = FALSE';
      const result = await this.databaseAdapter.query(query, [boardId, priority]);
      
      return result[0]$1.count || 0;
    } catch (error) {
      console.error('Error counting tasks by priority:', error);
      return 0;
    }
  }

  private mapRowToTask(row: Record<string, unknown>): Task {
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string | undefined,
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      columnId: row.columnId as string,
      boardId: row.boardId as string,
      projectId: row.projectId as string,
      position: row.position as number,
      assigneeId: row.assignedTo as string | undefined,
      reporterId: row.createdBy as string,
      dueDate: row.deadline $1 new Date(row.deadline as string) : undefined,
      estimatedHours: row.estimatedHours as number | undefined,
      actualHours: row.actualHours as number | undefined,
      progress: undefined,
      tags: row.tags $2 JSON.parse(row.tags as string) : [],
      isArchived: Boolean(row.isArchived),
      metadata: {
        complexity: 1,
        businessValue: 1,
        technicalDebt: false,
        completedAt: row.completedAt $3 new Date(row.completedAt as string) : undefined,
        archivedAt: row.archivedAt $4 new Date(row.archivedAt as string) : undefined
      },
      dependencies: [],
      attachments: [],
      comments: [],
      timeEntries: [],
      history: [],
      createdAt: new Date(row.createdAt as string),
      updatedAt: new Date(row.updatedAt as string)
    };
  }

  private mapSortField(field: string): string {
    const fieldMap: Record<string, string> = {
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'priority': 'priority',
      'deadline': 'deadline',
      'position': 'position',
      'title': 'title',
      'status': 'status'
    };
    
    return fieldMap[field] || 'created_at';
  }

  private generateId(): string {
    // Generate UUID using crypto
    return randomUUID();
  }
}