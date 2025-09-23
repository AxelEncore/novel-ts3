// Deprecated PostgreSQL adapter shim
// This module now simply re-exports the SQLite-backed database adapter to maintain compatibility
// with any legacy imports. All PostgreSQL-specific logic has been removed.

import { dbAdapter } from '../database-adapter';

export const databaseAdapter = dbAdapter;
export default dbAdapter;

    const result = await this.executeRawQuery(query, [
      id, name, description, finalProjectId, icon || 'kanban', color || '#3B82F6', finalCreatedBy
    ]);
    console.log('✅ PostgreSQL board created:', result.rows[0]);
    return result.rows[0];
  }

  async getBoardById(id: string): Promise<any> {
    const query = 'SELECT * FROM boards WHERE id = $1';
    const result = await this.executeRawQuery(query, [id]);
    return result.rows[0] || null;
  }

  async getProjectBoards(projectId: string): Promise<any[]> {
    const query = 'SELECT * FROM boards WHERE project_id = $1 ORDER BY created_at ASC';
    const result = await this.executeRawQuery(query, [projectId]);
    return result.rows;
  }

  async updateBoard(id: string, updates: Partial<any>): Promise<any> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE boards 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.executeRawQuery(query, values);
    return result.rows[0];
  }

  async deleteBoard(id: string): Promise<boolean> {
    const query = 'DELETE FROM boards WHERE id = $1';
    const result = await this.executeRawQuery(query, [id]);
    return result.rowCount > 0;
  }

  // =====================================================
  // COLUMN OPERATIONS
  // =====================================================

  async createColumn(columnData: any): Promise<any> {
    const { name, title, boardId, position, color } = columnData;
    const columnName = title || name; // поддержка обоих названий
    const id = uuidv4();

    const query = `
      INSERT INTO columns (id, name, board_id, position, color, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *, name as title
    `;

    const result = await this.executeRawQuery(query, [id, columnName, boardId, position || 0, color || '#6b7280']);
    return result.rows[0];
  }

  async getColumnById(id: string): Promise<any> {
    const query = 'SELECT *, name as title FROM columns WHERE id = $1';
    const result = await this.executeRawQuery(query, [id]);
    return result.rows[0] || null;
  }

  async getBoardColumns(boardId: string): Promise<any[]> {
    const query = 'SELECT *, name as title FROM columns WHERE board_id = $1 ORDER BY position ASC, created_at ASC';
    const result = await this.executeRawQuery(query, [boardId]);
    return result.rows;
  }

  async updateColumn(id: string, updates: Partial<any>): Promise<any> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        // Если обновляют title, переименовываем в name
        const fieldName = key === 'title' ? 'name' : key;
        fields.push(`${fieldName} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE columns 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *, name as title
    `;

    const result = await this.executeRawQuery(query, values);
    return result.rows[0];
  }

  async deleteColumn(id: string): Promise<boolean> {
    const query = 'DELETE FROM columns WHERE id = $1';
    const result = await this.executeRawQuery(query, [id]);
    return result.rowCount > 0;
  }

  // =====================================================
  // TASK OPERATIONS
  // =====================================================

  async createTask(taskData: any): Promise<any> {
    const { title, description, columnId, projectId, boardId, assigneeId, priority, deadline, position, reporterId } = taskData;
    const id = uuidv4();

    const query = `
      INSERT INTO tasks (id, title, description, column_id, project_id, board_id, assignee_id, priority, deadline, position, status, reporter_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'todo', $11, NOW(), NOW())
      RETURNING *
    `;

    const result = await this.executeRawQuery(query, [
      id, title, description, columnId, projectId, boardId, assigneeId, priority || 'medium', deadline, position || 0, reporterId
    ]);
    return result.rows[0];
  }

  async getTaskById(id: string): Promise<any> {
    const query = `
      SELECT t.*, u.name as assignee_name, c.name as column_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN columns c ON t.column_id = c.id
      WHERE t.id = $1
    `;
    const result = await this.executeRawQuery(query, [id]);
    return result.rows[0] || null;
  }

  async getProjectTasks(projectId: string): Promise<any[]> {
    const query = `
      SELECT t.*, u.name as assignee_name, c.name as column_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN columns c ON t.column_id = c.id
      WHERE t.project_id = $1
      ORDER BY t.position ASC, t.created_at ASC
    `;
    const result = await this.executeRawQuery(query, [projectId]);
    return result.rows;
  }

  async getColumnTasks(columnId: string): Promise<any[]> {
    const query = `
      SELECT 
        t.id,
        t.title,
        t.description,
        t.priority,
        t.status,
        t.position,
        t.due_date,
        t.created_at,
        t.updated_at,
        t.column_id,
        t.created_by,
        t.assignee_id,
        u1.name as creator_name,
        u1.email as creator_email,
        u2.name as assignee_name,
        u2.email as assignee_email
      FROM tasks t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assignee_id = u2.id
      WHERE t.column_id = $1
      ORDER BY t.position ASC
    `;
    
    const result = await this.executeRawQuery(query, [columnId]);
    return result.rows;
  }

  async getBoardTasks(boardId: string): Promise<any[]> {
    const query = `
      SELECT t.*, u.name as assignee_name, c.name as column_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN columns c ON t.column_id = c.id
      WHERE c.board_id = $1
      ORDER BY t.position ASC, t.created_at ASC
    `;
    const result = await this.executeRawQuery(query, [boardId]);
    return result.rows;
  }



  async updateTask(id: string, updates: Partial<any>): Promise<any> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Map JavaScript camelCase to database snake_case
    const fieldMapping: { [key: string]: string } = {
      columnId: 'column_id',
      dueDate: 'due_date',
      assigneeId: 'assignee_id',
      projectId: 'project_id',
      boardId: 'board_id',
      estimatedHours: 'estimated_hours',
      actualHours: 'actual_hours',
      parentTaskId: 'parent_task_id',
      reporterId: 'reporter_id',
      createdBy: 'created_by'
    };

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        const dbField = fieldMapping[key] || key;
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE tasks 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.executeRawQuery(query, values);
    return result.rows[0];
  }

  async deleteTask(id: string): Promise<boolean> {
    const query = 'DELETE FROM tasks WHERE id = $1';
    const result = await this.executeRawQuery(query, [id]);
    return result.rowCount > 0;
  }

  // =====================================================
  // COMMENT OPERATIONS
  // =====================================================

  async getTaskComments(taskId: string): Promise<any[]> {
    const query = `
      SELECT 
        c.id,
        c.content,
        c.parent_id,
        c.created_at,
        c.updated_at,
        u.id as author_id,
        u.name as author_name,
        u.email as author_email
      FROM task_comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.task_id = $1 AND c.parent_id IS NULL
      ORDER BY c.created_at DESC
    `;
    const result = await this.executeRawQuery(query, [taskId]);
    
    // Получаем ответы для каждого комментария
    for (const comment of result.rows) {
      const repliesQuery = `
        SELECT 
          c.id,
          c.content,
          c.parent_id,
          c.created_at,
          c.updated_at,
          u.id as author_id,
          u.name as author_name,
          u.email as author_email
        FROM task_comments c
        JOIN users u ON c.author_id = u.id
        WHERE c.parent_id = $1
        ORDER BY c.created_at ASC
      `;
      const repliesResult = await this.executeRawQuery(repliesQuery, [comment.id]);
      comment.replies = repliesResult.rows;
    }
    
    return result.rows;
  }

  async createTaskComment(commentData: any): Promise<any> {
    const { content, taskId, authorId, parentId } = commentData;
    const id = uuidv4();

    const query = `
      INSERT INTO task_comments (id, content, task_id, author_id, parent_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;

    const result = await this.executeRawQuery(query, [
      id, content, taskId, authorId, parentId || null
    ]);
    
    // Получаем полную информацию о комментарии с автором
    const fullCommentQuery = `
      SELECT 
        c.id,
        c.content,
        c.parent_id,
        c.created_at,
        c.updated_at,
        u.id as author_id,
        u.name as author_name,
        u.email as author_email
      FROM task_comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.id = $1
    `;
    const fullResult = await this.executeRawQuery(fullCommentQuery, [id]);
    const comment = fullResult.rows[0];
    
    // Если это не ответ, получаем пустой массив ответов
    if (!parentId) {
      comment.replies = [];
    }
    
    return comment;
  }

  async getCommentById(id: string): Promise<any> {
    const query = `
      SELECT 
        c.id,
        c.content,
        c.task_id,
        c.parent_id,
        c.created_at,
        c.updated_at,
        u.id as author_id,
        u.name as author_name,
        u.email as author_email
      FROM task_comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.id = $1
    `;
    const result = await this.executeRawQuery(query, [id]);
    return result.rows[0] || null;
  }

  // =====================================================
  // PROJECT MEMBER OPERATIONS
  // =====================================================

  async addProjectMember(projectId: string, userId: string, role: string = 'MEMBER'): Promise<any> {
    const id = uuidv4();
    const query = `
      INSERT INTO project_members (id, project_id, user_id, role, joined_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    const result = await this.executeRawQuery(query, [id, projectId, userId, role]);
    return result.rows[0];
  }

  async getProjectMembers(projectId: string): Promise<any[]> {
    const query = `
      SELECT pm.*, u.name, u.email
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
      ORDER BY pm.joined_at ASC
    `;
    const result = await this.executeRawQuery(query, [projectId]);
    return result.rows;
  }

  async removeProjectMember(projectId: string, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM project_members 
      WHERE project_id = $1 AND user_id = $2
    `;
    const result = await this.executeRawQuery(query, [projectId, userId]);
    return result.rowCount > 0;
  }

  async updateProjectMemberRole(projectId: string, userId: string, role: string): Promise<boolean> {
    const query = `
      UPDATE project_members 
      SET role = $3
      WHERE project_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await this.executeRawQuery(query, [projectId, userId, role]);
    return result.rowCount > 0;
  }

  async getUsersByEmails(emails: string[]): Promise<any[]> {
    if (emails.length === 0) return [];
    
    const placeholders = emails.map((_, index) => `$${index + 1}`).join(', ');
    const query = `SELECT * FROM users WHERE email IN (${placeholders})`;
    const result = await this.executeRawQuery(query, emails);
    return result.rows;
  }

  async createBoardWithColumns(boardData: any, columnsData: any[] = []): Promise<any> {
    const { name, description, color, projectId } = boardData;
    const boardId = uuidv4();

    // Создаем доску
    const boardQuery = `
      INSERT INTO boards (id, name, description, color, project_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;
    
    const boardResult = await this.executeRawQuery(boardQuery, [
      boardId, name, description || '', color || '#10B981', projectId
    ]);
    const board = boardResult.rows[0];

    // Создаем колонки
    const createdColumns = [];
    if (columnsData.length > 0) {
      for (let i = 0; i < columnsData.length; i++) {
        const columnData = columnsData[i];
        const columnId = uuidv4();
        
        const columnQuery = `
          INSERT INTO columns (id, title, board_id, position, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          RETURNING *
        `;
        
        const columnResult = await this.executeRawQuery(columnQuery, [
          columnId, columnData.name, boardId, columnData.order || i
        ]);
        
        createdColumns.push({
          ...columnResult.rows[0],
          name: columnResult.rows[0].title,
          status: columnData.status,
          order: columnResult.rows[0].position
        });
      }
    }

    return {
      ...board,
      columns: createdColumns
    };
  }

  // =====================================================
  // ACCESS CONTROL OPERATIONS
  // =====================================================

  async hasProjectAccess(userId: string, projectId: string): Promise<boolean> {
    // Check if user is the creator of the project or a member
    const query = `
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.id = $1 AND (p.creator_id = $2 OR pm.user_id = $2)
    `;
    const result = await this.executeRawQuery(query, [projectId, userId]);
    return result.rows.length > 0;
  }

  async checkBoardAccess(userId: string, boardId: string): Promise<{ hasAccess: boolean, role$1: string }> {
    const query = `
      SELECT pm.role
      FROM boards b
      JOIN projects p ON b.project_id = p.id
      LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
      WHERE b.id = $2 AND (p.creator_id = $1 OR pm.user_id = $1)
    `;
    const result = await this.executeRawQuery(query, [userId, boardId]);
    
    if (result.rows.length === 0) {
      return { hasAccess: false };
    }
    
    return { hasAccess: true, role: result.rows[0].role || 'owner' };
  }

  async checkColumnAccess(userId: string, columnId: string): Promise<{ hasAccess: boolean, role$1: string, projectId$2: string }> {
    const query = `
      SELECT pm.role, p.id as project_id
      FROM columns c
      JOIN boards b ON c.board_id = b.id
      JOIN projects p ON b.project_id = p.id
      LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
      WHERE c.id = $2 AND (p.creator_id = $1 OR pm.user_id = $1)
    `;
    const result = await this.executeRawQuery(query, [userId, columnId]);
    
    if (result.rows.length === 0) {
      return { hasAccess: false };
    }
    
    return { 
      hasAccess: true, 
      role: result.rows[0].role || 'owner',
      projectId: result.rows[0].project_id
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
    this.isInitialized = false;
  }
}