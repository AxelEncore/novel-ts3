// Column Repository Implementation
// Handles all database operations for columns

import { IColumnRepository } from '../../business/interfaces';
import {
  Column,
  SearchFilters,
  SortOptions,
  PaginationOptions
} from '../types';
import { databaseAdapter } from '../adapters/database-adapter';
import { generateId } from '../../../lib/utils';

export class ColumnRepository implements IColumnRepository {
  private readonly tableName = 'columns';

  async findById(id: string): Promise<Column | null> {
    try {
      const sql = 'SELECT * FROM columns WHERE id = $1';
      const row = await databaseAdapter.queryOne(sql, [id]);
      if (!row) return null;

      return this.transformToColumn(row);
    } catch (error) {
      throw new Error(`Failed to find column by id: ${error}`);
    }
  }

  async findByBoardId(boardId: string, filters: SearchFilters): Promise<Column[]> {
    try {
      let sql = `
        SELECT 
          id,
          title,
          board_id,
          position,
          color,
          settings,
          created_by,
          task_limit,
          is_archived,
          created_at,
          updated_at
        FROM columns 
        WHERE board_id = $1`;
      const params: unknown[] = [boardId];

      // Apply filters
      if (filters.isArchived !== undefined) {
        sql += ' AND is_archived = $2';
        params.push(filters.isArchived ? 1 : 0);
      }

      if (filters.query) {
        sql += ' AND title LIKE $5';
        params.push(`%${filters.query}%`);
      }

      sql += ' ORDER BY position ASC, created_at DESC';

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToColumn(row));
    } catch (error) {
      throw new Error(`Failed to find columns by board id: ${error}`);
    }
  }

  async findAll(
    filters: SearchFilters,
    sort: SortOptions,
    pagination: PaginationOptions
  ): Promise<Column[]> {
    try {
      let sql = `
        SELECT 
          id,
          title,
          board_id,
          position,
          color,
          settings,
          created_by,
          task_limit,
          is_archived,
          created_at,
          updated_at
        FROM columns 
        WHERE 1=1`;
      const params: unknown[] = [];

      // Apply filters
      if (filters.isArchived !== undefined) {
        sql += ' AND is_archived = $2';
        params.push(filters.isArchived ? 1 : 0);
      }

      if (filters.query) {
        sql += ' AND title LIKE $5';
        params.push(`%${filters.query}%`);
      }

      // Apply sorting
      if (sort) {
        const direction = sort.direction.toUpperCase();
        switch (sort.field) {
          case 'title':
            sql += ` ORDER BY title ${direction}`;
            break;
          case 'createdAt':
            sql += ` ORDER BY created_at ${direction}`;
            break;
          case 'updatedAt':
            sql += ` ORDER BY updated_at ${direction}`;
            break;
          case 'position':
            sql += ` ORDER BY position ${direction}`;
            break;
          default:
            sql += ' ORDER BY position ASC, created_at DESC';
        }
      } else {
        sql += ' ORDER BY position ASC, created_at DESC';
      }

      // Apply pagination
      if (pagination) {
        const offset = (pagination.page - 1) * pagination.limit;
        sql += ' LIMIT $1 OFFSET $2';
        params.push(pagination.limit, offset);
      }

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToColumn(row));
    } catch (error) {
      throw new Error(`Failed to find all columns: ${error}`);
    }
  }

  async create(column: Omit<Column, 'id' | 'createdAt' | 'updatedAt'>): Promise<Column> {
    try {
      const id = generateId();
      const now = new Date();
      
      const columnData = {
        id,
        board_id: column.boardId,
        title: column.name,
        position: column.position || 0,
        color: column.color || '#6B7280',
        is_collapsed: column.isCollapsed ? 1 : 0,
        task_limit: column.taskLimit || null,
        wip_limit: column.wipLimit || null,
        settings: JSON.stringify(column.settings || {}),
        created_by: column.createdBy || null,
        is_archived: column.isArchived ? 1 : 0,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      await databaseAdapter.insert(this.tableName, columnData);
      return await this.findById(id) as Column;
    } catch (error) {
      throw new Error(`Failed to create column: ${error}`);
    }
  }

  async update(id: string, updates: Partial<Column>): Promise<Column> {
    try {
      const updateData: Record<string, unknown> = {};

      if (updates.name !== undefined) updateData.title = updates.name;
      if (updates.position !== undefined) updateData.position = updates.position;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.isCollapsed !== undefined) updateData.is_collapsed = updates.isCollapsed ? 1 : 0;
      if (updates.taskLimit !== undefined) updateData.task_limit = updates.taskLimit;
      if (updates.wipLimit !== undefined) updateData.wip_limit = updates.wipLimit;
      if (updates.settings !== undefined) updateData.settings = JSON.stringify(updates.settings);
      if (updates.isArchived !== undefined) updateData.is_archived = updates.isArchived ? 1 : 0;

      updateData.updated_at = new Date().toISOString();

      await databaseAdapter.update(this.tableName, id, updateData);
      return await this.findById(id) as Column;
    } catch (error) {
      throw new Error(`Failed to update column: ${error}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await databaseAdapter.beginTransaction();
      
      // Move all tasks from this column to the first column of the same board
      const column = await this.findById(id);
      if (column) {
        const firstColumn = await databaseAdapter.queryOne(
          'SELECT id FROM columns WHERE board_id = $1 AND id != $2 AND is_archived = 0 ORDER BY position ASC LIMIT 1',
          [column.boardId, id]
        );
        
        if (firstColumn) {
          await databaseAdapter.query(
            'UPDATE tasks SET column_id = $3, updated_at = datetime(\'now\') WHERE column_id = $4',
            [firstColumn.id, id]
          );
        }
      }
      
      // Delete the column
      await databaseAdapter.delete(this.tableName, id);
      
      await databaseAdapter.commitTransaction();
    } catch (error) {
      await databaseAdapter.rollbackTransaction();
      throw new Error(`Failed to delete column: ${error}`);
    }
  }

  async archive(id: string): Promise<Column> {
    try {
      await databaseAdapter.update(this.tableName, id, { 
        is_archived: 1,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Column;
    } catch (error) {
      throw new Error(`Failed to archive column: ${error}`);
    }
  }

  async restore(id: string): Promise<Column> {
    try {
      await databaseAdapter.update(this.tableName, id, { 
        is_archived: 0,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Column;
    } catch (error) {
      throw new Error(`Failed to restore column: ${error}`);
    }
  }

  async updatePosition(id: string, position: number): Promise<void> {
    try {
      await databaseAdapter.update(this.tableName, id, { 
        position,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      throw new Error(`Failed to update column position: ${error}`);
    }
  }

  async reorderColumns(boardId: string, columnIds: string[]): Promise<void> {
    try {
      await databaseAdapter.beginTransaction();
      
      for (let i = 0; i < columnIds.length; i++) {
        await databaseAdapter.update(this.tableName, columnIds[i], {
          position: i,
          updated_at: new Date().toISOString()
        });
      }
      
      await databaseAdapter.commitTransaction();
    } catch (error) {
      await databaseAdapter.rollbackTransaction();
      throw new Error(`Failed to reorder columns: ${error}`);
    }
  }

  async getTaskCount(id: string): Promise<number> {
    try {
      const result = await databaseAdapter.queryOne(
        'SELECT COUNT(*) as count FROM tasks WHERE column_id = $1 AND is_archived = 0',
        [id]
      ) as any;
      return result.count || 0;
    } catch (error) {
      throw new Error(`Failed to get task count: ${error}`);
    }
  }

  async duplicate(id: string, newTitle: string): Promise<Column> {
    try {
      const originalColumn = await this.findById(id);
      if (!originalColumn) {
        throw new Error('Column not found');
      }

      const newColumnId = generateId();
      const now = new Date();
      
      const columnData = {
        id: newColumnId,
        board_id: originalColumn.boardId,
        title: newTitle,
        position: originalColumn.position + 1,
        color: originalColumn.color,
        is_collapsed: originalColumn.isCollapsed ? 1 : 0,
        task_limit: originalColumn.taskLimit,
        wip_limit: originalColumn.wipLimit,
        settings: JSON.stringify(originalColumn.settings),
        is_archived: 0,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      await databaseAdapter.insert(this.tableName, columnData);
      return await this.findById(newColumnId) as Column;
    } catch (error) {
      throw new Error(`Failed to duplicate column: ${error}`);
    }
  }

  private transformToColumn(row: Record<string, unknown>): Column {
    return {
      id: row.id as string,
      boardId: row.board_id as string,
      name: row.title as string,
      position: (row.position as number) || 0,
      color: row.color as string,
      isCollapsed: Boolean(row.is_collapsed),
      taskLimit: row.task_limit as number,
      wipLimit: row.wip_limit as number,
      settings: JSON.parse((row.settings as string) || '{}'),
      isArchived: Boolean(row.is_archived),
      createdBy: row.created_by as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string)
    };
  }
}

// Export singleton instance
export const columnRepository = new ColumnRepository();