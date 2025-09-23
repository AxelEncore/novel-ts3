// Task Repository Implementation
// Handles all database operations for tasks

import { ITaskRepository } from '../../business/interfaces';
import {
  Task,
  Comment,
  SortOptions,
  PaginationOptions,
  TaskStatus,
  TaskPriority,
  Attachment,
  TaskDependency,
  TimeEntry,
  SearchFilters,
  TaskAction
} from '../types';
import { databaseAdapter } from '../adapters/database-adapter';
import { generateId } from '../../../lib/utils';

export class TaskRepository implements ITaskRepository {
  private readonly tableName = 'tasks';
  private readonly commentsTableName = 'comments';
  private readonly attachmentsTableName = 'attachments';
  private readonly timeEntriesTableName = 'time_entries';
  private readonly taskActionsTableName = 'task_actions';

  async findById(id: string): Promise<Task | null> {
    try {
      const sql = `
        SELECT t.*,
               json_group_array(
                 DISTINCT json_object(
                   'id', c.id,
                   'content', c.content,
                   'authorId', c.author_id,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as comments,
               json_group_array(
                 DISTINCT json_object(
                   'id', a.id,
                   'filename', a.filename,
                   'originalName', a.original_name,
                   'mimeType', a.mime_type,
                   'size', a.size,
                   'url', a.url,
                   'uploadedBy', a.uploaded_by,
                   'createdAt', a.created_at
                 )
               ) as attachments
        FROM tasks t
        LEFT JOIN comments c ON t.id = c.task_id
        LEFT JOIN attachments a ON t.id = a.task_id
        WHERE t.id = $1
        GROUP BY t.id
      `;
      
      const row = await databaseAdapter.queryOne(sql, [id]);
      if (!row) return null;

      return this.transformToTask(row);
    } catch (error) {
      throw new Error(`Failed to find task by id: ${error}`);
    }
  }

  async findByColumnId(columnId: string, includeArchived$1: boolean): Promise<Task[]> {
    try {
      let sql = `
        SELECT t.*,
               json_group_array(
                 DISTINCT json_object(
                   'id', c.id,
                   'content', c.content,
                   'authorId', c.author_id,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as comments,
               json_group_array(
                 DISTINCT json_object(
                   'id', a.id,
                   'filename', a.filename,
                   'originalName', a.original_name,
                   'mimeType', a.mime_type,
                   'size', a.size,
                   'url', a.url,
                   'uploadedBy', a.uploaded_by,
                   'createdAt', a.created_at
                 )
               ) as attachments
        FROM tasks t
        LEFT JOIN comments c ON t.id = c.task_id
        LEFT JOIN attachments a ON t.id = a.task_id
        WHERE t.column_id = $1
      `;
      
      const params: unknown[] = [columnId];

      // Apply archive filter
      if (includeArchived === false) {
        sql += ' AND t.is_archived = 0';
      } else if (includeArchived === true) {
        sql += ' AND t.is_archived = 1';
      }
      // If includeArchived is undefined, include all tasks

      sql += ' GROUP BY t.id ORDER BY t.position ASC, t.created_at DESC';

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToTask(row));
    } catch (error) {
      throw new Error(`Failed to find tasks by column id: ${error}`);
    }
  }

  async findByBoardId(boardId: string, includeArchived$1: boolean): Promise<Task[]> {
    try {
      let sql = `
        SELECT t.*,
               json_group_array(
                 DISTINCT json_object(
                   'id', c.id,
                   'content', c.content,
                   'authorId', c.author_id,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as comments,
               json_group_array(
                 DISTINCT json_object(
                   'id', a.id,
                   'filename', a.filename,
                   'originalName', a.original_name,
                   'mimeType', a.mime_type,
                   'size', a.size,
                   'url', a.url,
                   'uploadedBy', a.uploaded_by,
                   'createdAt', a.created_at
                 )
               ) as attachments
        FROM tasks t
        LEFT JOIN comments c ON t.id = c.task_id
        LEFT JOIN attachments a ON t.id = a.task_id
        WHERE t.board_id = $1
      `;
      
      const params: unknown[] = [boardId];

      // Apply archive filter
      if (includeArchived === false) {
        sql += ' AND t.is_archived = 0';
      } else if (includeArchived === true) {
        sql += ' AND t.is_archived = 1';
      }
      // If includeArchived is undefined, include all tasks

      sql += ' GROUP BY t.id ORDER BY t.position ASC, t.created_at DESC';

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToTask(row));
    } catch (error) {
      throw new Error(`Failed to find tasks by board id: ${error}`);
    }
  }

  async findByProjectId(projectId: string, includeArchived$1: boolean): Promise<Task[]> {
    try {
      let sql = `
        SELECT t.*,
               json_group_array(
                 DISTINCT json_object(
                   'id', c.id,
                   'content', c.content,
                   'authorId', c.author_id,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as comments,
               json_group_array(
                 DISTINCT json_object(
                   'id', a.id,
                   'filename', a.filename,
                   'originalName', a.original_name,
                   'mimeType', a.mime_type,
                   'size', a.size,
                   'url', a.url,
                   'uploadedBy', a.uploaded_by,
                   'createdAt', a.created_at
                 )
               ) as attachments
        FROM tasks t
        LEFT JOIN comments c ON t.id = c.task_id
        LEFT JOIN attachments a ON t.id = a.task_id
        WHERE t.project_id = $1
      `;
      
      const params: unknown[] = [projectId];

      // Apply archive filter
      if (includeArchived === false) {
        sql += ' AND t.is_archived = 0';
      } else if (includeArchived === true) {
        sql += ' AND t.is_archived = 1';
      }
      // If includeArchived is undefined, include all tasks

      sql += ' GROUP BY t.id ORDER BY t.position ASC, t.created_at DESC';

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToTask(row));
    } catch (error) {
      throw new Error(`Failed to find tasks by project id: ${error}`);
    }
  }

  async findAll(
    includeArchived$1: boolean,
    sort$2: SortOptions,
    pagination$3: PaginationOptions
  ): Promise<Task[]> {
    try {
      let sql = `
        SELECT t.*,
               json_group_array(
                 DISTINCT json_object(
                   'id', c.id,
                   'content', c.content,
                   'authorId', c.author_id,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as comments,
               json_group_array(
                 DISTINCT json_object(
                   'id', a.id,
                   'filename', a.filename,
                   'originalName', a.original_name,
                   'mimeType', a.mime_type,
                   'size', a.size,
                   'url', a.url,
                   'uploadedBy', a.uploaded_by,
                   'createdAt', a.created_at
                 )
               ) as attachments
        FROM tasks t
        LEFT JOIN comments c ON t.id = c.task_id
        LEFT JOIN attachments a ON t.id = a.task_id
        WHERE 1=1
      `;
      
      const params: unknown[] = [];

      // Apply archive filter
      if (includeArchived === false) {
        sql += ' AND t.is_archived = 0';
      } else if (includeArchived === true) {
        sql += ' AND t.is_archived = 1';
      }
      // If includeArchived is undefined, include all tasks

      sql += ' GROUP BY t.id';

      // Apply sorting
      if (sort) {
        const direction = sort.direction.toUpperCase();
        switch (sort.field) {
          case 'title':
            sql += ` ORDER BY t.title ${direction}`;
            break;
          case 'createdAt':
            sql += ` ORDER BY t.created_at ${direction}`;
            break;
          case 'updatedAt':
            sql += ` ORDER BY t.updated_at ${direction}`;
            break;
          case 'dueDate':
            sql += ` ORDER BY t.due_date ${direction}`;
            break;
          case 'priority':
            sql += ` ORDER BY t.priority ${direction}`;
            break;
          case 'position':
            sql += ` ORDER BY t.position ${direction}`;
            break;
          default:
            sql += ' ORDER BY t.position ASC, t.created_at DESC';
        }
      } else {
        sql += ' ORDER BY t.position ASC, t.created_at DESC';
      }

      // Apply pagination
      if (pagination) {
        const offset = (pagination.page - 1) * pagination.limit;
        sql += ' LIMIT $1 OFFSET $2';
        params.push(pagination.limit, offset);
      }

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToTask(row));
    } catch (error) {
      throw new Error(`Failed to find all tasks: ${error}`);
    }
  }

  async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    try {
      const id = generateId();
      const now = new Date();
      
      const taskData = {
        id,
        title: task.title,
        description: task.description || null,
        project_id: task.projectId,
        board_id: task.boardId,
        column_id: task.columnId,
        assigned_to: task.assigneeId || null,
        created_by: task.createdBy,
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        position: task.position || 0,
        due_date: task.dueDate $1 task.dueDate.toISOString() : null,
        estimated_hours: task.estimatedHours || null,
        actual_hours: task.actualHours || null,
        tags: JSON.stringify(task.tags || []),
        metadata: JSON.stringify(task.metadata || {}),
        is_archived: task.isArchived $2 1 : 0,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      await databaseAdapter.insert(this.tableName, taskData);
      return await this.findById(id) as Task;
    } catch (error) {
      throw new Error(`Failed to create task: ${error}`);
    }
  }

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    try {
      const updateData: Record<string, unknown> = {};

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.columnId !== undefined) updateData.column_id = updates.columnId;
      if (updates.assigneeId !== undefined) updateData.assigned_to = updates.assigneeId;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.position !== undefined) updateData.position = updates.position;
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate $1 updates.dueDate.toISOString() : null;
      if (updates.estimatedHours !== undefined) updateData.estimated_hours = updates.estimatedHours;
      if (updates.actualHours !== undefined) updateData.actual_hours = updates.actualHours;
      if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags);
      if (updates.metadata !== undefined) updateData.metadata = JSON.stringify(updates.metadata);
      if (updates.isArchived !== undefined) updateData.is_archived = updates.isArchived $2 1 : 0;

      updateData.updated_at = new Date().toISOString();

      await databaseAdapter.update(this.tableName, id, updateData);
      return await this.findById(id) as Task;
    } catch (error) {
      throw new Error(`Failed to update task: ${error}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await databaseAdapter.beginTransaction();
      
      // Delete related data
      await databaseAdapter.query('DELETE FROM comments WHERE task_id = $1', [id]);
      await databaseAdapter.query('DELETE FROM attachments WHERE task_id = $2', [id]);
      await databaseAdapter.query('DELETE FROM time_entries WHERE task_id = $3', [id]);
      await databaseAdapter.query('DELETE FROM task_actions WHERE task_id = $4', [id]);
      
      // Delete the task
      await databaseAdapter.delete(this.tableName, id);
      
      await databaseAdapter.commitTransaction();
    } catch (error) {
      await databaseAdapter.rollbackTransaction();
      throw new Error(`Failed to delete task: ${error}`);
    }
  }

  async archive(id: string): Promise<Task> {
    try {
      await databaseAdapter.update(this.tableName, id, { 
        is_archived: 1,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Task;
    } catch (error) {
      throw new Error(`Failed to archive task: ${error}`);
    }
  }

  async restore(id: string): Promise<Task> {
    try {
      await databaseAdapter.update(this.tableName, id, { 
        is_archived: 0,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Task;
    } catch (error) {
      throw new Error(`Failed to restore task: ${error}`);
    }
  }

  async updatePosition(id: string, position: number): Promise<void> {
    try {
      await databaseAdapter.update(this.tableName, id, { 
        position,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      throw new Error(`Failed to update task position: ${error}`);
    }
  }

  async moveToColumn(id: string, columnId: string, position: number): Promise<Task> {
    try {
      await databaseAdapter.update(this.tableName, id, {
        column_id: columnId,
        position,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Task;
    } catch (error) {
      throw new Error(`Failed to move task to column: ${error}`);
    }
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    try {
      await databaseAdapter.update(this.tableName, id, {
        status,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Task;
    } catch (error) {
      throw new Error(`Failed to update task status: ${error}`);
    }
  }

  async updatePriority(id: string, priority: TaskPriority): Promise<Task> {
    try {
      await databaseAdapter.update(this.tableName, id, {
        priority,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Task;
    } catch (error) {
      throw new Error(`Failed to update task priority: ${error}`);
    }
  }

  async assignTask(id: string, userId: string): Promise<Task> {
    try {
      await databaseAdapter.update(this.tableName, id, {
        assigned_to: userId,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Task;
    } catch (error) {
      throw new Error(`Failed to assign task: ${error}`);
    }
  }

  async unassignTask(id: string): Promise<Task> {
    try {
      await databaseAdapter.update(this.tableName, id, {
        assigned_to: null,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Task;
    } catch (error) {
      throw new Error(`Failed to unassign task: ${error}`);
    }
  }

  async addComment(taskId: string, comment: {
    content: string;
    authorId: string;
  }): Promise<void> {
    try {
      const commentData = {
        id: generateId(),
        task_id: taskId,
        content: comment.content,
        author_id: comment.authorId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await databaseAdapter.insert(this.commentsTableName, commentData);
    } catch (error) {
      throw new Error(`Failed to add comment: ${error}`);
    }
  }

  async updateComment(commentId: string, updates: Partial<Comment>): Promise<Comment> {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (updates.content !== undefined) {
        updateData.content = updates.content;
      }
      if (updates.isEdited !== undefined) {
        updateData.is_edited = updates.isEdited;
      }
      if (updates.updatedAt !== undefined) {
        updateData.updated_at = updates.updatedAt;
      } else {
        updateData.updated_at = new Date().toISOString();
      }

      await databaseAdapter.update(this.commentsTableName, commentId, updateData);
      
      // Return the updated comment
      const sql = `
        SELECT id, task_id, content, author_id as authorId, created_at as createdAt, 
               updated_at as updatedAt, is_edited as isEdited
        FROM comments WHERE id = $1
      `;
      const row = await databaseAdapter.queryOne(sql, [commentId]) as any;
      
      if (!row) {
        throw new Error('Comment not found after update');
      }
      
      return {
        id: row.id,
        taskId: row.task_id,
        content: row.content,
        authorId: row.authorId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        isEdited: Boolean(row.isEdited),
        parentCommentId: undefined
      };
    } catch (error) {
      throw new Error(`Failed to update comment: ${error}`);
    }
  }

  async deleteComment(commentId: string): Promise<void> {
    try {
      await databaseAdapter.delete(this.commentsTableName, commentId);
    } catch (error) {
      throw new Error(`Failed to delete comment: ${error}`);
    }
  }

  async addAttachment(taskId: string, attachment: Omit<Attachment, 'id' | 'createdAt' | 'updatedAt' | 'taskId'>, uploadedBy: string): Promise<Attachment> {
    try {
      const attachmentId = generateId();
      const attachmentData = {
        id: attachmentId,
        task_id: taskId,
        file_name: attachment.fileName,
        original_name: attachment.originalName,
        mime_type: attachment.mimeType,
        size: attachment.fileSize,
        url: attachment.url,
        uploaded_by: uploadedBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await databaseAdapter.insert(this.attachmentsTableName, attachmentData);
      
      return {
        id: attachmentId,
        taskId,
        fileName: attachment.fileName,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        url: attachment.url,
        uploadedBy: uploadedBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to add attachment: ${error}`);
    }
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    try {
      await databaseAdapter.delete(this.attachmentsTableName, attachmentId);
    } catch (error) {
      throw new Error(`Failed to delete attachment: ${error}`);
    }
  }

  async addDependency(taskId: string, dependency: Omit<TaskDependency, 'id' | 'createdAt' | 'createdBy'>, createdBy: string): Promise<TaskDependency> {
    try {
      const dependencyId = generateId();
      const dependencyData = {
        id: dependencyId,
        task_id: taskId,
        depends_on_task_id: dependency.dependsOnTaskId,
        dependency_type: dependency.type,
        created_by: createdBy,
        created_at: new Date().toISOString()
      };

      await databaseAdapter.insert('task_dependencies', dependencyData);
      
      return {
        id: dependencyId,
        taskId,
        dependsOnTaskId: dependency.dependsOnTaskId,
        type: dependency.type,
        createdBy: createdBy,
        createdAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to add dependency: ${error}`);
    }
  }

  async removeDependency(dependencyId: string): Promise<void> {
    try {
      await databaseAdapter.delete('task_dependencies', dependencyId);
    } catch (error) {
      throw new Error(`Failed to remove dependency: ${error}`);
    }
  }

  async startTimeTracking(taskId: string, userId: string): Promise<TimeEntry> {
    try {
      const entryId = generateId();
      const timeEntryData = {
        id: entryId,
        task_id: taskId,
        user_id: userId,
        start_time: new Date().toISOString(),
        end_time: null,
        duration: 0,
        description: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await databaseAdapter.insert(this.timeEntriesTableName, timeEntryData);
      
      return {
        id: entryId,
        taskId,
        userId,
        startTime: new Date(),
        endTime: undefined,
        duration: 0,
        description: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to start time tracking: ${error}`);
    }
  }

  async stopTimeTracking(entryId: string): Promise<TimeEntry> {
    try {
      const endTime = new Date();
      
      // Get the existing entry to calculate duration
      const sql = 'SELECT * FROM time_entries WHERE id = $1';
      const row = await databaseAdapter.queryOne(sql, [entryId]) as any;
      
      if (!row) {
        throw new Error('Time entry not found');
      }
      
      const startTime = new Date(row.start_time);
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // Duration in seconds
      
      await databaseAdapter.update(this.timeEntriesTableName, entryId, {
        end_time: endTime.toISOString(),
        duration,
        updated_at: endTime.toISOString()
      });
      
      return {
        id: entryId,
        taskId: row.task_id,
        userId: row.user_id,
        startTime: startTime,
        endTime: endTime,
        duration,
        description: row.description,
        isActive: false,
        createdAt: new Date(row.created_at),
        updatedAt: endTime
      };
    } catch (error) {
      throw new Error(`Failed to stop time tracking: ${error}`);
    }
  }

  async getTimeEntries(taskId: string): Promise<TimeEntry[]> {
    try {
      const sql = 'SELECT * FROM time_entries WHERE task_id = $1 ORDER BY created_at DESC';
      const rows = await databaseAdapter.query(sql, [taskId]) as any[];
      
      return rows.map((row: any) => ({
        id: row.id,
        taskId: row.task_id,
        userId: row.user_id,
        startTime: new Date(row.start_time),
        endTime: row.end_time $2 new Date(row.end_time) : undefined,
        duration: row.duration,
        description: row.description,
        isActive: !row.end_time,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      throw new Error(`Failed to get time entries: ${error}`);
    }
  }

  async addTimeEntry(taskId: string, timeEntry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt' | 'taskId'>): Promise<TimeEntry> {
    try {
      const entryId = generateId();
      const timeEntryData = {
        id: entryId,
        task_id: taskId,
        user_id: timeEntry.userId,
        start_time: timeEntry.startTime.toISOString(),
        end_time: timeEntry.endTime $1 timeEntry.endTime.toISOString() : null,
        duration: timeEntry.duration,
        description: timeEntry.description || null,
        is_active: timeEntry.isActive,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await databaseAdapter.insert(this.timeEntriesTableName, timeEntryData);
      
      return {
        id: entryId,
        taskId,
        userId: timeEntry.userId,
        startTime: timeEntry.startTime,
        endTime: timeEntry.endTime || undefined,
        duration: timeEntry.duration,
        description: timeEntry.description,
        isActive: timeEntry.isActive,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to add time entry: ${error}`);
    }
  }

  async updateTimeEntry(entryId: string, updates: Partial<TimeEntry>): Promise<TimeEntry> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.startTime) updateData.start_time = updates.startTime.toISOString();
      if (updates.endTime) updateData.end_time = updates.endTime.toISOString();
      if (updates.duration !== undefined) updateData.duration = updates.duration;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      await databaseAdapter.update(this.timeEntriesTableName, entryId, updateData);
      
      // Return the updated time entry
      const sql = 'SELECT * FROM time_entries WHERE id = $1';
      const row = await databaseAdapter.queryOne(sql, [entryId]) as any;
      
      if (!row) {
        throw new Error('Time entry not found after update');
      }
      
      return {
        id: row.id,
        taskId: row.task_id,
        userId: row.user_id,
        startTime: new Date(row.start_time),
        endTime: row.end_time $2 new Date(row.end_time) : undefined,
        duration: row.duration,
        description: row.description,
        isActive: Boolean(row.is_active),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      throw new Error(`Failed to update time entry: ${error}`);
    }
  }

  async deleteTimeEntry(entryId: string): Promise<void> {
    try {
      await databaseAdapter.delete(this.timeEntriesTableName, entryId);
    } catch (error) {
      throw new Error(`Failed to delete time entry: ${error}`);
    }
  }

  async logTimeEntry(taskId: string, timeEntry: {
    userId: string;
    hours: number;
    description$1: string;
    date: Date;
  }): Promise<void> {
    try {
      const timeEntryData = {
        id: generateId(),
        task_id: taskId,
        user_id: timeEntry.userId,
        hours: timeEntry.hours,
        description: timeEntry.description || null,
        date: timeEntry.date.toISOString().split('T')[0], // Date only
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await databaseAdapter.insert(this.timeEntriesTableName, timeEntryData);
    } catch (error) {
      throw new Error(`Failed to log time entry: ${error}`);
    }
  }

  async logAction(taskId: string, action: Omit<TaskAction, 'id' | 'createdAt'>): Promise<TaskAction> {
    try {
      const id = generateId();
      const createdAt = new Date().toISOString();
      
      const actionData = {
        id,
        task_id: taskId,
        user_id: action.userId,
        action: action.action,
        old_value: action.oldValue $1 JSON.stringify(action.oldValue) : null,
        new_value: action.newValue $2 JSON.stringify(action.newValue) : null,
        description: action.description,
        created_at: createdAt
      };

      await databaseAdapter.insert(this.taskActionsTableName, actionData);
      
      return {
        id,
        taskId,
        userId: action.userId,
        action: action.action,
        oldValue: action.oldValue,
        newValue: action.newValue,
        description: action.description,
        createdAt: new Date(createdAt),
        updatedAt: new Date(createdAt)
      };
    } catch (error) {
      throw new Error(`Failed to log action: ${error}`);
    }
  }

  async findByAssigneeId(assigneeId: string, includeArchived$1: boolean): Promise<Task[]> {
    try {
      let sql = `
        SELECT t.*,
               json_group_array(
                 DISTINCT json_object(
                   'id', c.id,
                   'content', c.content,
                   'authorId', c.author_id,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as comments,
               json_group_array(
                 DISTINCT json_object(
                   'id', a.id,
                   'filename', a.filename,
                   'originalName', a.original_name,
                   'mimeType', a.mime_type,
                   'size', a.size,
                   'url', a.url,
                   'uploadedBy', a.uploaded_by,
                   'createdAt', a.created_at
                 )
               ) as attachments
        FROM tasks t
        LEFT JOIN comments c ON t.id = c.task_id
        LEFT JOIN attachments a ON t.id = a.task_id
        WHERE t.assigned_to = $1
      `;
      
      const params: unknown[] = [assigneeId];

      // Apply archive filter
      if (includeArchived === false) {
        sql += ' AND t.is_archived = 0';
      } else if (includeArchived === true) {
        sql += ' AND t.is_archived = 1';
      }
      // If includeArchived is undefined, include all tasks

      sql += ' GROUP BY t.id ORDER BY t.position ASC, t.created_at DESC';

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToTask(row));
    } catch (error) {
      throw new Error(`Failed to find tasks by assignee id: ${error}`);
    }
  }

  async move(id: string, columnId: string, position: number): Promise<Task> {
    try {
      await databaseAdapter.update(this.tableName, id, {
        column_id: columnId,
        position,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Task;
    } catch (error) {
      throw new Error(`Failed to move task: ${error}`);
    }
  }

  async reorderTasks(columnId: string, taskIds: string[]): Promise<void> {
    try {
      await databaseAdapter.beginTransaction();
      
      for (let i = 0; i < taskIds.length; i++) {
        await databaseAdapter.update(this.tableName, taskIds[i], {
          position: i,
          updated_at: new Date().toISOString()
        });
      }
      
      await databaseAdapter.commitTransaction();
    } catch (error) {
      await databaseAdapter.rollbackTransaction();
      throw new Error(`Failed to reorder tasks: ${error}`);
    }
  }

  async duplicate(id: string): Promise<Task> {
    try {
      const originalTask = await this.findById(id);
      if (!originalTask) {
        throw new Error('Task not found');
      }

      const duplicatedTask = {
        ...originalTask,
        title: `${originalTask.title} (Copy)`,
        position: originalTask.position + 1
      };

      // Remove properties that shouldn't be duplicated
      delete (duplicatedTask as Partial<Task>).id;
      delete (duplicatedTask as Partial<Task>).createdAt;
      delete (duplicatedTask as Partial<Task>).updatedAt;
      delete (duplicatedTask as Partial<Task>).comments;
      delete (duplicatedTask as Partial<Task>).attachments;

      return await this.create(duplicatedTask as Omit<Task, 'id' | 'createdAt' | 'updatedAt'>);
    } catch (error) {
      throw new Error(`Failed to duplicate task: ${error}`);
    }
  }

  async search(
    query: string,
    filters$1: SearchFilters,
    sort$2: SortOptions,
    pagination$3: PaginationOptions
  ): Promise<Task[]> {
    try {
      let sql = `
        SELECT t.*,
               json_group_array(
                 DISTINCT json_object(
                   'id', c.id,
                   'content', c.content,
                   'authorId', c.author_id,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as comments,
               json_group_array(
                 DISTINCT json_object(
                   'id', a.id,
                   'filename', a.filename,
                   'originalName', a.original_name,
                   'mimeType', a.mime_type,
                   'size', a.size,
                   'url', a.url,
                   'uploadedBy', a.uploaded_by,
                   'createdAt', a.created_at
                 )
               ) as attachments
        FROM tasks t
        LEFT JOIN comments c ON t.id = c.task_id
        LEFT JOIN attachments a ON t.id = a.task_id
        WHERE (t.title LIKE $1 OR t.description LIKE $2)
      `;
      
      const searchTerm = `%${query}%`;
      const params: unknown[] = [searchTerm, searchTerm];

      // Apply filters
      if (filters$1.isArchived !== undefined) {
        sql += ' AND t.is_archived = $2';
        params.push(filters.isArchived $3 1 : 0);
      }

      sql += ' GROUP BY t.id';

      // Apply sorting
      if (sort) {
        const direction = sort.direction.toUpperCase();
        switch (sort.field) {
          case 'title':
            sql += ` ORDER BY t.title ${direction}`;
            break;
          case 'createdAt':
            sql += ` ORDER BY t.created_at ${direction}`;
            break;
          case 'updatedAt':
            sql += ` ORDER BY t.updated_at ${direction}`;
            break;
          case 'dueDate':
            sql += ` ORDER BY t.due_date ${direction}`;
            break;
          case 'priority':
            sql += ` ORDER BY t.priority ${direction}`;
            break;
          case 'position':
            sql += ` ORDER BY t.position ${direction}`;
            break;
          default:
            sql += ' ORDER BY t.position ASC, t.created_at DESC';
        }
      } else {
        sql += ' ORDER BY t.position ASC, t.created_at DESC';
      }

      // Apply pagination
      if (pagination) {
        const offset = (pagination.page - 1) * pagination.limit;
        sql += ' LIMIT $1 OFFSET $2';
        params.push(pagination.limit, offset);
      }

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToTask(row));
    } catch (error) {
      throw new Error(`Failed to search tasks: ${error}`);
    }
  }

  private transformToTask(row: Record<string, unknown>): Task {
    const comments = row.comments $1 JSON.parse(row.comments as string) : [];
    const attachments = row.attachments $2 JSON.parse(row.attachments as string) : [];
    
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string,
      projectId: row.project_id as string,
      boardId: row.board_id as string,
      columnId: row.column_id as string,
      assigneeId: row.assigned_to as string,
      reporterId: row.reporter_id as string,
      createdBy: row.created_by as string,
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      position: (row.position as number) || 0,
      dueDate: row.due_date $3 new Date(row.due_date as string) : undefined,
      estimatedHours: row.estimated_hours as number,
      actualHours: row.actual_hours as number,
      tags: JSON.parse((row.tags as string) || '[]'),
      metadata: JSON.parse((row.metadata as string) || '{}'),
      isArchived: Boolean(row.is_archived),
      comments: comments.filter((c: Record<string, unknown>) => c.id).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        content: c.content as string,
        authorId: c.authorId as string,
        createdAt: new Date(c.createdAt as string),
        updatedAt: new Date(c.updatedAt as string)
      })),
      attachments: attachments.filter((a: Record<string, unknown>) => a.id).map((a: Record<string, unknown>) => ({
        id: a.id as string,
        filename: a.filename as string,
        originalName: a.originalName as string,
        mimeType: a.mimeType as string,
        size: a.size as number,
        url: a.url as string,
        uploadedBy: a.uploadedBy as string,
        createdAt: new Date(a.createdAt as string)
      })),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      dependencies: [],
      timeEntries: [],
      history: []
    };
  }
}

// Export singleton instance
export const taskRepository = new TaskRepository();