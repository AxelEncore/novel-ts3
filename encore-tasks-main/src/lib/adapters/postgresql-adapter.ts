// =====================================================
// POSTGRESQL ADAPTER FOR ENCORE TASKS
// =====================================================

import { Pool, PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export class PostgreSQLAdapter {
  private pool: Pool;
  private isInitialized = false;

  constructor() {
    // Используем переменные окружения Replit или fallback на стандартные
    const host = process.env.PGHOST || process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || process.env.DB_PORT || '5432');
    const database = process.env.PGDATABASE || process.env.POSTGRES_DB || process.env.DB_NAME || 'encore_tasks';
    const user = process.env.PGUSER || process.env.POSTGRES_USER || process.env.DB_USER || 'postgres';
    const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'postgres';
    
    // SSL настройки - проверяем различные переменные окружения
    const sslEnabled = process.env.DB_SSL === 'true' || 
                      process.env.POSTGRES_SSL === 'true' ||
                      process.env.POSTGRES_SSL === 'require' || 
                      process.env.DATABASE_URL?.includes('sslmode=require') ||
                      host.includes('neon.tech');
    
    console.log('🔧 PostgreSQL Config:', {
      host: host.substring(0, 20) + '...',
      port,
      database,
      user,
      ssl: sslEnabled
    });

    // For Replit/Neon, prefer DATABASE_URL if available
    if (process.env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: sslEnabled ? { rejectUnauthorized: false } : false,
        max: 5, // Reduced to avoid connection issues
        idleTimeoutMillis: 60000, // 1 minute
        connectionTimeoutMillis: 20000, // 20 seconds
        acquireTimeoutMillis: 20000, // 20 seconds
        statement_timeout: 30000, // 30 seconds
        query_timeout: 30000, // 30 seconds
      });
    } else {
      this.pool = new Pool({
        host,
        port,
        database,
        user,
        password,
        ssl: sslEnabled ? { rejectUnauthorized: false } : false,
        max: 5, // Reduced
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 20000,
        acquireTimeoutMillis: 20000,
      });
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return; // Already initialized
    }
    
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries && !this.isInitialized) {
      try {
        console.log(`🔄 PostgreSQL connection attempt ${retryCount + 1}/${maxRetries}`);
        // Test connection with timeout
        const client = await this.pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        this.isInitialized = true;
        console.log('✅ PostgreSQL adapter initialized successfully');
        return;
      } catch (error) {
        retryCount++;
        console.error(`❌ PostgreSQL connection attempt ${retryCount} failed:`, error);
        if (retryCount >= maxRetries) {
          console.error('❌ PostgreSQL adapter initialization failed after all retries');
          throw new Error('Database connection failed after retries');
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
      }
    }
  }

  isConnected(): boolean {
    return this.isInitialized;
  }

  async executeRawQuery(query: string, params: any[] = []): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, params);
      return result;
    } finally {
      client.release();
    }
  }

  async query(sql: string, params: unknown[]): Promise<any> {
    return this.executeRawQuery(sql, params as any[]);
  }

  // =====================================================
  // USER OPERATIONS
  // =====================================================

  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    role?: string;
  }): Promise<any> {
    const { email, password, name, role = 'user' } = userData;
    const hashedPassword = await bcrypt.hash(password, 12);
    const id = uuidv4();

    const query = `
      INSERT INTO users (id, email, password_hash, name, role, approval_status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, email, name, role, approval_status, created_at, updated_at
    `;

    const result = await this.executeRawQuery(query, [id, email, hashedPassword, name, role, 'pending']);
    const user = result.rows[0];
    
    if (user) {
      user.is_approved = user.approval_status === 'approved';
    }
    
    return user;
  }

  async getUserById(id: string): Promise<any> {
    const query = 'SELECT id, email, name, role, approval_status, created_at, updated_at FROM users WHERE id = $1';
    const result = await this.executeRawQuery(query, [id]);
    const user = result.rows[0];
    
    if (user) {
      user.is_approved = user.approval_status === 'approved';
    }
    
    return user || null;
  }

  async getUserByEmail(email: string): Promise<any> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.executeRawQuery(query, [email]);
    const user = result.rows[0];
    
    if (user) {
      user.is_approved = user.approval_status === 'approved';
    }
    
    return user || null;
  }

  async updateUser(id: string, userData: Partial<any>): Promise<any> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(userData)) {
      if (key === 'password') {
        fields.push(`password_hash = $${paramIndex}`);
        values.push(await bcrypt.hash(value as string, 12));
        paramIndex++;
      } else if (key === 'is_approved') {
        // Map is_approved to approval_status in database
        fields.push(`approval_status = $${paramIndex}`);
        const statusValue = value ? 'approved' : 'rejected';
        values.push(statusValue);
        paramIndex++;
      } else if (key !== 'id') {
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
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, name, role, approval_status, created_at, updated_at
    `;

    const result = await this.executeRawQuery(query, values);
    const user = result.rows[0];
    
    // Map approval_status back to is_approved for consistency
    if (user) {
      user.is_approved = user.approval_status === 'approved';
    }
    
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await this.executeRawQuery(query, [id]);
    return result.rowCount > 0;
  }

  async getAllUsers(): Promise<any[]> {
    const query = 'SELECT id, email, name, role, approval_status, created_at, updated_at FROM users ORDER BY created_at DESC';
    const result = await this.executeRawQuery(query);
    
    // Map approval_status to is_approved for each user
    const users = result.rows.map(user => ({
      ...user,
      is_approved: user.approval_status === 'approved'
    }));
    
    return users;
  }

  // =====================================================
  // SESSION OPERATIONS
  // =====================================================

  async createSession(sessionData: any): Promise<any> {
    const { userId, user_id, token, expiresAt, expires_at } = sessionData;
    const id = uuidv4();
    
    // Поддерживаем оба формата названий полей
    const userIdValue = userId || user_id;
    const expiresAtValue = expiresAt || expires_at;

    const query = `
      INSERT INTO sessions (id, user_id, token, expires_at, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;

    const result = await this.executeRawQuery(query, [id, userIdValue, token, expiresAtValue]);
    return result.rows[0];
  }

  async getSessionByToken(token: string): Promise<any> {
    const query = `
      SELECT s.*, u.id as user_id, u.email, u.name, u.role, u.approval_status
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = $1 AND s.expires_at > NOW()
    `;
    const result = await this.executeRawQuery(query, [token]);
    const session = result.rows[0];
    
    if (session) {
      session.is_approved = session.approval_status === 'approved';
    }
    
    return session || null;
  }

  async deleteSession(token: string): Promise<boolean> {
    const query = 'DELETE FROM sessions WHERE token = $1';
    const result = await this.executeRawQuery(query, [token]);
    return result.rowCount > 0;
  }

  async deleteUserSessions(userId: string): Promise<boolean> {
    const query = 'DELETE FROM sessions WHERE user_id = $1';
    const result = await this.executeRawQuery(query, [userId]);
    return result.rowCount > 0;
  }

  // =====================================================
  // PROJECT OPERATIONS
  // =====================================================

  async createProject(projectData: any): Promise<any> {
    const { name, description, created_by, color, icon_url } = projectData;
    const id = uuidv4();

    // Создаем проект
    const projectQuery = `
      INSERT INTO projects (id, name, description, creator_id, color, icon, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    const projectResult = await this.executeRawQuery(projectQuery, [id, name, description, created_by, color, icon_url]);
    const project = projectResult.rows[0];

    // Добавляем создателя как владельца в project_members
    const memberQuery = `
      INSERT INTO project_members (id, project_id, user_id, role, joined_at)
      VALUES ($1, $2, $3, $4, NOW())
    `;

    const memberId = uuidv4();
    await this.executeRawQuery(memberQuery, [memberId, id, created_by, 'owner']);

    return project;
  }

  async getProjectById(id: string): Promise<any> {
    const query = `
      SELECT p.*, u.name as owner_name
      FROM projects p
      JOIN users u ON p.creator_id = u.id
      WHERE p.id = $1
    `;
    const result = await this.executeRawQuery(query, [id]);
    return result.rows[0] || null;
  }

  async getUserProjects(userId: string): Promise<any[]> {
    const query = `
      SELECT p.*, u.name as owner_name
      FROM projects p
      JOIN users u ON p.creator_id = u.id
      WHERE p.creator_id = $1
      ORDER BY p.created_at DESC
    `;
    const result = await this.executeRawQuery(query, [userId]);
    return result.rows;
  }

  async updateProject(id: string, projectData: Partial<any>): Promise<any> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Map fields to database column names
    const fieldMapping: { [key: string]: string } = {
      icon_url: 'icon',
      created_by: 'creator_id'
    };

    for (const [key, value] of Object.entries(projectData)) {
      if (key !== 'id' && value !== undefined) {
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
      UPDATE projects 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.executeRawQuery(query, values);
    return result.rows[0];
  }

  async deleteProject(id: string): Promise<boolean> {
    const query = 'DELETE FROM projects WHERE id = $1';
    const result = await this.executeRawQuery(query, [id]);
    return result.rowCount > 0;
  }

  // =====================================================
  // BOARD OPERATIONS
  // =====================================================

  async createBoard(boardData: any): Promise<any> {
    console.log('🔧 PostgreSQL createBoard received:', boardData);
    const { name, description, project_id, projectId, createdBy, created_by, color, icon } = boardData;
    const finalProjectId = project_id || projectId;
    const finalCreatedBy = createdBy || created_by;
    const id = uuidv4();

    console.log('🔧 Extracted values:', { finalProjectId, finalCreatedBy, name, description, color, icon });

    const query = `
      INSERT INTO boards (id, name, description, project_id, icon, color, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;

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