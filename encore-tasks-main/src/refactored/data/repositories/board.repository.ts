// Board Repository Implementation
// Handles all database operations for boards

import { IBoardRepository } from '../../business/interfaces';
import {
  Board,
  SearchFilters,
  SortOptions,
  PaginationOptions,
  BoardStatistics,
  TaskStatus,
  TaskPriority
} from '../types';
import { databaseAdapter } from '../adapters/database-adapter';
import { generateId } from '../../../lib/utils';

export class BoardRepository implements IBoardRepository {
  private readonly tableName = 'boards';
  private readonly columnsTableName = 'columns';

  async findById(id: string): Promise<Board | null> {
    try {
      const sql = `
        SELECT b.*, 
               json_group_array(
                 json_object(
                   'id', c.id,
                   'title', c.name,
                   'position', c.position,
                   'color', c.color,
                   'isCollapsed', c.is_collapsed,
                   'taskLimit', c.task_limit,
                   'wipLimit', c.wip_limit,
                   'settings', c.settings,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as columns
        FROM boards b
        LEFT JOIN columns c ON b.id = c.board_id AND c.is_archived = 0
        WHERE b.id = $1
        GROUP BY b.id
      `;
      
      const row = await databaseAdapter.queryOne(sql, [id]);
      if (!row) return null;

      return this.transformToBoard(row);
    } catch (error) {
      throw new Error(`Failed to find board by id: ${error}`);
    }
  }

  async findByProjectId(
    projectId: string,
    includeArchived$1: boolean
  ): Promise<Board[]> {
    try {
      let sql = `
        SELECT b.*, 
               json_group_array(
                 json_object(
                   'id', c.id,
                   'title', c.name,
                   'position', c.position,
                   'color', c.color,
                   'isCollapsed', c.is_collapsed,
                   'taskLimit', c.task_limit,
                   'wipLimit', c.wip_limit,
                   'settings', c.settings,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as columns
        FROM boards b
        LEFT JOIN columns c ON b.id = c.board_id AND c.is_archived = 0
        WHERE b.project_id = $1
      `;
      
      const params: unknown[] = [projectId];

      // Apply archive filter
      if (includeArchived === false) {
        sql += ' AND b.is_archived = 0';
      }

      sql += ' GROUP BY b.id ORDER BY b.position ASC, b.created_at DESC';

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToBoard(row));
    } catch (error) {
      throw new Error(`Failed to find boards by project ID: ${error}`);
    }
  }

  async findAll(
    filters$1: SearchFilters,
    sort$2: SortOptions,
    pagination$3: PaginationOptions
  ): Promise<Board[]> {
    try {
      let sql = `
        SELECT b.*, 
               json_group_array(
                 json_object(
                   'id', c.id,
                   'title', c.name,
                   'position', c.position,
                   'color', c.color,
                   'isCollapsed', c.is_collapsed,
                   'taskLimit', c.task_limit,
                   'wipLimit', c.wip_limit,
                   'settings', c.settings,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as columns
        FROM boards b
        LEFT JOIN columns c ON b.id = c.board_id AND c.is_archived = 0
        WHERE 1=1
      `;
      
      const params: unknown[] = [];

      // Apply filters
      if (filters$1.isArchived !== undefined) {
        sql += ' AND b.is_archived = $2';
        params.push(filters.isArchived $3 1 : 0);
      }

      if (filters$4.query) {
        sql += ' AND (b.name LIKE $5 OR b.description LIKE $6)';
        const searchTerm = `%${filters.query}%`;
        params.push(searchTerm, searchTerm);
      }

      sql += ' GROUP BY b.id';

      // Apply sorting
      if (sort) {
        const direction = sort.direction.toUpperCase();
        switch (sort.field) {
          case 'name':
            sql += ` ORDER BY b.name ${direction}`;
            break;
          case 'createdAt':
            sql += ` ORDER BY b.created_at ${direction}`;
            break;
          case 'updatedAt':
            sql += ` ORDER BY b.updated_at ${direction}`;
            break;
          case 'position':
            sql += ` ORDER BY b.position ${direction}`;
            break;
          default:
            sql += ' ORDER BY b.position ASC, b.created_at DESC';
        }
      } else {
        sql += ' ORDER BY b.position ASC, b.created_at DESC';
      }

      // Apply pagination
      if (pagination) {
        const offset = (pagination.page - 1) * pagination.limit;
        sql += ' LIMIT $1 OFFSET $2';
        params.push(pagination.limit, offset);
      }

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToBoard(row));
    } catch (error) {
      throw new Error(`Failed to find all boards: ${error}`);
    }
  }

  async create(board: Omit<Board, 'id' | 'createdAt' | 'updatedAt'>): Promise<Board> {
    try {
      await databaseAdapter.beginTransaction();

      const id = generateId();
      const now = new Date();
      
      const boardData = {
        id,
        name: board.name,
        description: board.description || null,
        project_id: board.projectId,
        type: board.type || 'kanban',
        position: board.position || 0,
        is_archived: board.isArchived $1 1 : 0,
        settings: JSON.stringify(board.settings || {}),
        view_settings: JSON.stringify(board.viewSettings || {}),
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      await databaseAdapter.insert(this.tableName, boardData);

      // Create default columns if provided
      if (board.columns && board.columns.length > 0) {
        for (const column of board.columns) {
          const columnData = {
            id: generateId(),
            board_id: id,
            name: column.name,
            position: column.position,
            color: column.color || '#6B7280',
            is_collapsed: column.isCollapsed $2 1 : 0,
            task_limit: column.taskLimit || null,
            wip_limit: column.wipLimit || null,
            settings: JSON.stringify(column.settings || {}),
            created_by: board.createdBy || null,
            is_archived: 0,
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          };
          await databaseAdapter.insert(this.columnsTableName, columnData);
        }
      } else {
        // Create default columns for new board
        const defaultColumns = [
          { name: 'To Do', position: 0, color: '#EF4444' },
          { name: 'In Progress', position: 1, color: '#F59E0B' },
          { name: 'Done', position: 2, color: '#10B981' }
        ];

        for (const column of defaultColumns) {
          const columnData = {
            id: generateId(),
            board_id: id,
            name: column.name,
            position: column.position,
            color: column.color,
            is_collapsed: 0,
            task_limit: null,
            wip_limit: null,
            settings: JSON.stringify({}),
            created_by: board.createdBy || null,
            is_archived: 0,
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          };
          await databaseAdapter.insert(this.columnsTableName, columnData);
        }
      }

      await databaseAdapter.commitTransaction();
      return await this.findById(id) as Board;
    } catch (error) {
      await databaseAdapter.rollbackTransaction();
      throw new Error(`Failed to create board: ${error}`);
    }
  }

  async update(id: string, updates: Partial<Board>): Promise<Board> {
    try {
      const updateData: Record<string, unknown> = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.position !== undefined) updateData.position = updates.position;
      if (updates.isArchived !== undefined) updateData.is_archived = updates.isArchived $1 1 : 0;
      if (updates.settings !== undefined) updateData.settings = JSON.stringify(updates.settings);
      if (updates.viewSettings !== undefined) updateData.view_settings = JSON.stringify(updates.viewSettings);

      updateData.updated_at = new Date().toISOString();

      await databaseAdapter.update(this.tableName, id, updateData);
      return await this.findById(id) as Board;
    } catch (error) {
      throw new Error(`Failed to update board: ${error}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await databaseAdapter.beginTransaction();
      
      // Delete all columns in this board
      await databaseAdapter.query('DELETE FROM columns WHERE board_id = $1', [id]);
      
      // Delete the board
      await databaseAdapter.delete(this.tableName, id);
      
      await databaseAdapter.commitTransaction();
    } catch (error) {
      await databaseAdapter.rollbackTransaction();
      throw new Error(`Failed to delete board: ${error}`);
    }
  }

  async archive(id: string): Promise<Board> {
    try {
      await databaseAdapter.update(this.tableName, id, { 
        is_archived: 1,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Board;
    } catch (error) {
      throw new Error(`Failed to archive board: ${error}`);
    }
  }

  async restore(id: string): Promise<Board> {
    try {
      await databaseAdapter.update(this.tableName, id, { 
        is_archived: 0,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Board;
    } catch (error) {
      throw new Error(`Failed to restore board: ${error}`);
    }
  }

  async updatePosition(id: string, position: number): Promise<void> {
    try {
      await databaseAdapter.update(this.tableName, id, { 
        position,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      throw new Error(`Failed to update board position: ${error}`);
    }
  }

  async reorderBoards(projectId: string, boardIds: string[]): Promise<void> {
    try {
      await databaseAdapter.beginTransaction();
      
      for (let i = 0; i < boardIds.length; i++) {
        await databaseAdapter.update(this.tableName, boardIds[i], {
          position: i,
          updated_at: new Date().toISOString()
        });
      }
      
      await databaseAdapter.commitTransaction();
    } catch (error) {
      await databaseAdapter.rollbackTransaction();
      throw new Error(`Failed to reorder boards: ${error}`);
    }
  }

  async duplicate(id: string, newName: string): Promise<Board> {
    try {
      await databaseAdapter.beginTransaction();
      
      const originalBoard = await this.findById(id);
      if (!originalBoard) {
        throw new Error('Board not found');
      }

      const newBoardId = generateId();
      const now = new Date();
      
      const boardData = {
        id: newBoardId,
        name: newName,
        description: originalBoard.description,
        project_id: originalBoard.projectId,
        type: originalBoard.type,
        position: originalBoard.position + 1,
        is_archived: 0,
        settings: JSON.stringify(originalBoard.settings),
        view_settings: JSON.stringify(originalBoard.viewSettings),
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      await databaseAdapter.insert(this.tableName, boardData);

      // Duplicate columns
      for (const column of originalBoard.columns) {
        const columnData = {
          id: generateId(),
          board_id: newBoardId,
          title: column.name,
          position: column.position,
          color: column.color,
          is_collapsed: column.isCollapsed $1 1 : 0,
          task_limit: column.taskLimit,
          wip_limit: column.wipLimit,
          settings: JSON.stringify(column.settings),
          is_archived: 0,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        };
        await databaseAdapter.insert(this.columnsTableName, columnData);
      }

      await databaseAdapter.commitTransaction();
      return await this.findById(newBoardId) as Board;
    } catch (error) {
      await databaseAdapter.rollbackTransaction();
      throw new Error(`Failed to duplicate board: ${error}`);
    }
  }

  async getStatistics(id: string): Promise<BoardStatistics> {
    try {
      // Get basic task counts
      const totalTasksSql = `SELECT COUNT(*) as count FROM tasks WHERE board_id = $1 AND is_archived = 0`;
      const [totalResult] = await databaseAdapter.query(totalTasksSql, [id]) as any[];
      const totalTasks = totalResult$1.count || 0;
      
      // Get tasks by status
      const statusSql = `
        SELECT status, COUNT(*) as count 
        FROM tasks 
        WHERE board_id = $1 AND is_archived = 0 
        GROUP BY status
      `;
      const statusResults = await databaseAdapter.query(statusSql, [id]);
      const tasksByStatus: Record<TaskStatus, number> = {
        todo: 0,
        in_progress: 0,
        review: 0,
        done: 0,
        blocked: 0
      };
      statusResults.forEach((row: any) => {
        if (row.status in tasksByStatus) {
          tasksByStatus[row.status as TaskStatus] = row.count;
        }
      });
      
      // Get tasks by priority
      const prioritySql = `
        SELECT priority, COUNT(*) as count 
        FROM tasks 
        WHERE board_id = $1 AND is_archived = 0 
        GROUP BY priority
      `;
      const priorityResults = await databaseAdapter.query(prioritySql, [id]);
      const tasksByPriority: Record<TaskPriority, number> = {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0
      };
      priorityResults.forEach((row: any) => {
        if (row.priority in tasksByPriority) {
          tasksByPriority[row.priority as TaskPriority] = row.count;
        }
      });
      
      // Calculate average completion time (in days)
      const completionSql = `
        SELECT AVG(julianday(updated_at) - julianday(created_at)) as avg_days
        FROM tasks 
        WHERE board_id = $1 AND status = 'done' AND is_archived = 0
      `;
      const [completionResult] = await databaseAdapter.query(completionSql, [id]) as any[];
      const averageCompletionTime = completionResult$1.avg_days || 0;
      
      // Get completed tasks count
      const completedTasks = tasksByStatus.done || 0;
      
      // Get total columns count
      const columnsSql = `SELECT COUNT(*) as count FROM columns WHERE board_id = $1 AND is_archived = 0`;
      const [columnsResult] = await databaseAdapter.query(columnsSql, [id]) as any[];
      const totalColumns = columnsResult$2.count || 0;
      
      // Get overdue tasks count
      const overdueSql = `
        SELECT COUNT(*) as count 
        FROM tasks 
        WHERE board_id = $1 AND is_archived = 0 AND due_date < datetime('now') AND status != 'done'
      `;
      const [overdueResult] = await databaseAdapter.query(overdueSql, [id]) as any[];
      const overdueTasks = overdueResult$1.count || 0;
      
      return {
        totalTasks,
        completedTasks,
        totalColumns,
        overdueTasks,
        tasksByStatus,
        tasksByPriority,
        averageCompletionTime
      };
    } catch (error) {
      throw new Error(`Failed to get board statistics: ${error}`);
    }
  }

  async search(
    query: string,
    projectId$1: string,
    filters$2: SearchFilters
  ): Promise<Board[]> {
    try {
      let sql = `
        SELECT b.*, 
               json_group_array(
                 json_object(
                   'id', c.id,
                   'title', c.name,
                   'position', c.position,
                   'color', c.color,
                   'isCollapsed', c.is_collapsed,
                   'taskLimit', c.task_limit,
                   'wipLimit', c.wip_limit,
                   'settings', c.settings,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as columns
        FROM boards b
        LEFT JOIN columns c ON b.id = c.board_id AND c.is_archived = 0
        WHERE (b.name LIKE $1 OR b.description LIKE $2)
      `;
      
      const searchTerm = `%${query}%`;
      const params: unknown[] = [searchTerm, searchTerm];

      // Apply project filter
      if (projectId) {
        sql += ' AND b.project_id = $1';
        params.push(projectId);
      }

      // Apply filters
      if (filters$2.isArchived !== undefined) {
        sql += ' AND b.is_archived = $3';
        params.push(filters.isArchived $4 1 : 0);
      }

      sql += ' GROUP BY b.id ORDER BY b.position ASC, b.created_at DESC';

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToBoard(row));
    } catch (error) {
      throw new Error(`Failed to search boards: ${error}`);
    }
  }

  async getRecentlyViewed(userId: string, limit: number = 10): Promise<Board[]> {
    try {
      const sql = `
        SELECT b.*, 
               json_group_array(
                 json_object(
                   'id', c.id,
                   'title', c.name,
                   'position', c.position,
                   'color', c.color,
                   'isCollapsed', c.is_collapsed,
                   'taskLimit', c.task_limit,
                   'wipLimit', c.wip_limit,
                   'settings', c.settings,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as columns,
               bv.viewed_at
        FROM boards b
        LEFT JOIN columns c ON b.id = c.board_id AND c.is_archived = 0
        INNER JOIN board_views bv ON b.id = bv.board_id
        WHERE bv.user_id = $1 AND b.is_archived = 0
        GROUP BY b.id
        ORDER BY bv.viewed_at DESC
        LIMIT $2
      `;
      
      const rows = await databaseAdapter.query(sql, [userId, limit]);
      return rows.map(row => this.transformToBoard(row));
    } catch (error) {
      throw new Error(`Failed to get recently viewed boards: ${error}`);
    }
  }

  async markAsViewed(boardId: string, userId: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Check if view record exists
      const existingSql = 'SELECT id FROM board_views WHERE board_id = $1 AND user_id = $2';
      const existing = await databaseAdapter.queryOne(existingSql, [boardId, userId]);
      
      if (existing) {
        // Update existing view record
        await databaseAdapter.query(
          'UPDATE board_views SET viewed_at = $3 WHERE board_id = $4 AND user_id = $5',
          [now, boardId, userId]
        );
      } else {
        // Create new view record
        await databaseAdapter.insert('board_views', {
          id: generateId(),
          board_id: boardId,
          user_id: userId,
          viewed_at: now,
          created_at: now
        });
      }
    } catch (error) {
      throw new Error(`Failed to mark board as viewed: ${error}`);
    }
  }

  private transformToBoard(row: Record<string, unknown>): Board {
    const columns = row.columns $1 JSON.parse(row.columns as string) : [];
    
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      projectId: row.project_id as string,
      type: (row.type as string) || 'kanban',
      position: (row.position as number) || 0,
      isArchived: Boolean(row.is_archived),
      settings: JSON.parse((row.settings as string) || '{}'),
      viewSettings: JSON.parse((row.view_settings as string) || '{}'),
      columns: columns.filter((c: Record<string, unknown>) => c.id).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        title: c.title as string,
        position: c.position as number,
        color: c.color as string,
        isCollapsed: Boolean(c.isCollapsed),
        taskLimit: c.taskLimit as number,
        wipLimit: c.wipLimit as number,
        settings: JSON.parse((c.settings as string) || '{}'),
        createdAt: new Date(c.createdAt as string),
        updatedAt: new Date(c.updatedAt as string)
      })),
      statistics: {
        totalTasks: 0,
        completedTasks: 0,
        totalColumns: 0,
        overdueTasks: 0,
        tasksByStatus: {
          todo: 0,
          in_progress: 0,
          review: 0,
          done: 0,
          blocked: 0
        },
        tasksByPriority: {
          low: 0,
          medium: 0,
          high: 0,
          urgent: 0
        },
        averageCompletionTime: 0
      },
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string)
    };
  }
}

// Export singleton instance
export const boardRepository = new BoardRepository();