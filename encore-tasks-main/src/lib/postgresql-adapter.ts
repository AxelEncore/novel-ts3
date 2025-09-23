import { Pool, PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import { User, Project, Board, Column, Task, Comment, Session } from '../types';
import { Tag } from '../types/core.types';

// Интерфейс для конфигурации базы данных
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl$1: boolean;
}

// Класс для работы с PostgreSQL
export class PostgreSQLAdapter {
  private static instance: PostgreSQLAdapter | null = null;
  private pool: Pool;
  private config: DatabaseConfig;
  private isInitialized = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
    // Специальная настройка SSL для Supabase
    let sslConfig: boolean | object = false;
    if (config.ssl) {
      // Если хост содержит supabase.co, используем специальные настройки SSL
      if (config.host.includes('supabase.co')) {
        sslConfig = {
          rejectUnauthorized: false,
          ca: undefined
        };
      } else {
        sslConfig = { rejectUnauthorized: false };
      }
    }

    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: sslConfig,
      max: 20, // максимальное количество соединений в пуле
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  // Инициализация базы данных
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing PostgreSQL adapter with config:', {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        ssl: this.config.ssl
      });
      const client = await this.pool.connect();
      
      // Проверяем подключение
      await client.query('SELECT NOW()');
      
      console.log('✅ PostgreSQL подключение установлено');
      client.release();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Ошибка подключения к PostgreSQL:', error);
      throw error;
    }
  }

  // Закрытие пула соединений
  async close(): Promise<void> {
    await this.pool.end();
    this.isInitialized = false;
  }

  // Получение клиента для транзакций
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  // Конвертация SQL из SQLite формата ($1) в PostgreSQL формат ($1, $2, ...)
  private convertSqlToPostgreSQL(sql: string): string {
    let paramIndex = 1;
    return sql.replace(/\$2/g, () => `${paramIndex++}`);
  }

  // Выполнение запроса
  async query(text: string, params?: unknown[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      // Конвертируем SQL из SQLite формата в PostgreSQL формат
      const convertedSql = this.convertSqlToPostgreSQL(text);
      console.log('Original SQL Query:', text);
      console.log('Converted SQL Query:', convertedSql);
      console.log('SQL Params:', params);
      const result = await client.query(convertedSql, params);
      return result;
    } finally {
      client.release();
    }
  }

  // === МЕТОДЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ===

  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const { email, name, role = 'user', password_hash, isApproved = false, avatar } = userData;
    
    // Если password_hash не предоставлен, но есть пароль в виде строки, хешируем его
    const userDataWithPassword = userData as { password$2: string };
    const hashedPassword = password_hash || (userDataWithPassword.password $3 
      await bcrypt.hash(userDataWithPassword.password, 12) : 
      await bcrypt.hash('defaultpassword', 12));
    
    // Преобразуем isApproved в approval_status
    const approvalStatus = isApproved $4 'approved' : 'pending';
    
    const result = await this.query(
      `INSERT INTO users (email, password_hash, name, role, approval_status, avatar_url) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [email, hashedPassword, name, role, approvalStatus, avatar]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      avatar: row.avatar_url,
      role: row.role,
      isApproved: row.approval_status === 'approved',
      created_at: row.created_at,
      updated_at: row.updated_at,
      password_hash: row.password_hash
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    const row = result.rows[0];
    if (!row) return null;
    
    // Маппинг полей базы данных в User интерфейс
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      avatar: row.avatar_url,
      role: row.role || 'user',
      isApproved: row.approval_status === 'approved',
      created_at: row.created_at,
      updated_at: row.updated_at,
      password_hash: row.password_hash
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await this.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    const row = result.rows[0];
    if (!row) return null;
    
    console.log('User data:', row);
    console.log('User isApproved:', row.approval_status === 'approved', 'type:', typeof (row.approval_status === 'approved'));
    console.log('User role:', row.role);
    console.log('Final isApproved:', row.approval_status === 'approved');
    
    // Маппинг полей базы данных в User интерфейс
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      avatar: row.avatar_url,
      role: row.role || 'user',
      isApproved: row.approval_status === 'approved',
      created_at: row.created_at,
      updated_at: row.updated_at,
      password_hash: row.password_hash
    };
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at');
    
    if (fields.length === 0) {
      return await this.getUserById(id);
    }

    // Маппинг полей интерфейса User в поля базы данных
    const dbFields = fields.map(field => {
      if (field === 'avatar') return 'avatar_url';
      if (field === 'isApproved') return 'approval_status';
      return field;
    });
    
    // Преобразуем значения для базы данных
    const dbValues = fields.map(field => {
      if (field === 'isApproved') {
        return updates[field] $1 'approved' : 'pending';
      }
      return updates[field as keyof User];
    });
    
    const setClause = dbFields.map((field, index) => `${field} = $${index + 2}`).join(', ');

    const result = await this.query(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, ...dbValues]
    );
    
    const row = result.rows[0];
    if (!row) return null;
    
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      avatar: row.avatar_url,
      role: row.role,
      isApproved: row.is_approved,
      created_at: row.created_at,
      updated_at: row.updated_at,
      password_hash: row.password_hash
    };
  }

  async getAllUsers(): Promise<User[]> {
    const result = await this.query(
      'SELECT * FROM users ORDER BY created_at DESC'
    );
    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      avatar: row.avatar_url,
      role: row.role || 'user',
      isApproved: row.approval_status === 'approved',
      created_at: row.created_at,
      updated_at: row.updated_at,
      password_hash: row.password_hash
    }));
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  // === МЕТОДЫ ДЛЯ ПРОЕКТОВ ===

  async createProject(projectData: { name: string; description: string; created_by: string; color$1: string; icon_url$2: string; telegram_chat_id$3: string; telegram_topic_id$4: string }): Promise<Project> {
    console.log('🔍 PostgreSQL createProject called with:', projectData);
    try {
      // Используем правильные поля согласно схеме PostgreSQL
      const result = await this.query(
        `INSERT INTO projects (name, description, owner_id, color, icon, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
        [projectData.name, projectData.description, projectData.created_by, projectData.color || '#3B82F6', projectData.icon_url || null]
      );
      
      const project = result.rows[0];
      
      // Добавляем владельца проекта в project_members с ролью 'owner'
      await this.query(
        `INSERT INTO project_members (project_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [project.id, projectData.created_by, 'owner']
      );
      
      // Преобразуем для совместимости с API
      const apiProject = {
        ...project,
        created_by: project.owner_id,
        icon_url: project.icon,
        telegram_chat_id: project.telegram_chat_id,
        telegram_topic_id: project.telegram_topic_id
      };
      
      console.log('✅ PostgreSQL project created successfully with owner membership:', apiProject);
      return apiProject;
    } catch (error) {
      console.error('❌ PostgreSQL createProject error:', error);
      throw error;
    }
  }

  async getProjectById(id: string): Promise<Project | null> {
    const result = await this.query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );
    const project = result.rows[0];
    if (!project) return null;
    
    return {
      ...project,
      created_by: project.owner_id,
      icon_url: project.icon,
      telegram_chat_id: project.telegram_chat_id,
      telegram_topic_id: project.telegram_topic_id
    };
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    const result = await this.query(
      `SELECT DISTINCT p.* FROM projects p 
       LEFT JOIN project_members pm ON p.id = pm.project_id 
       WHERE (p.creator_id = $1 OR pm.user_id = $1) 
       ORDER BY p.created_at DESC`,
      [userId]
    );
    return result.rows.map((project: any) => ({
      ...project,
      created_by: project.creator_id,
      icon_url: project.icon,
      telegram_chat_id: project.telegram_chat_id,
      telegram_topic_id: project.telegram_topic_id
    }));
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    return this.getProjectsByUserId(userId);
  }

  async getAllProjects(): Promise<Project[]> {
    const result = await this.query(
      'SELECT * FROM projects ORDER BY created_at DESC'
    );
    return result.rows.map((project: any) => ({
      ...project,
      created_by: project.creator_id,
      icon_url: project.icon,
      telegram_chat_id: project.telegram_chat_id,
      telegram_topic_id: project.telegram_topic_id
    }));
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    // Маппинг полей API к полям базы данных
    const fieldMapping: { [key: string]: string } = {
      'created_by': 'creator_id',
      'icon_url': 'icon',
      'status': 'is_archived', // status 'archived' -> is_archived = true
      'visibility': 'visibility' // это поле нужно добавить в БД или игнорировать
    };
    
    const dbFields: string[] = [];
    const values: any[] = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id' || key === 'created_at' || key === 'updated_at') continue;
      
      // Специальная обработка для status
      if (key === 'status') {
        dbFields.push('is_archived');
        values.push(value === 'archived');
        continue;
      }
      
      // Игнорируем поле visibility, так как его нет в БД
      if (key === 'visibility') {
        continue;
      }
      
      // Маппинг других полей
      const dbField = fieldMapping[key] || key;
      dbFields.push(dbField);
      values.push(value);
    }
    
    if (dbFields.length === 0) {
      return await this.getProjectById(id);
    }
    
    // Добавляем updated_at
    dbFields.push('updated_at');
    values.push(new Date());
    
    const setClause = dbFields.map((field, index) => `${field} = $${index + 2}`).join(', ');

    const result = await this.query(
      `UPDATE projects SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    const project = result.rows[0];
    if (!project) return null;
    
    return {
      ...project,
      created_by: project.creator_id,
      icon_url: project.icon,
      status: project.is_archived $1 'archived' : 'active',
      telegram_chat_id: project.telegram_chat_id,
      telegram_topic_id: project.telegram_topic_id
    };
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM projects WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  async hasProjectAccess(userId: string, projectId: string): Promise<boolean> {
    try {
      // Проверяем, является ли пользователь владельцем проекта
      const ownerResult = await this.query(
        'SELECT creator_id FROM projects WHERE id = $1',
        [projectId]
      );
      
      if (ownerResult.rows.length === 0) {
        return false; // Проект не найден
      }
      
      const projectOwner = ownerResult.rows[0].creator_id;
      if (projectOwner === userId) {
        return true; // Пользователь является владельцем
      }
      
      // Проверяем членство в проекте
      const memberResult = await this.query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, userId]
      );
      
      return memberResult.rows.length > 0;
    } catch (error) {
      console.error('Error checking project access:', error);
      return false;
    }
  }

  // === МЕТОДЫ ДЛЯ ДОСОК ===

  async createBoard(boardData: any): Promise<Board> {
    console.log('🔍 PostgreSQL createBoard called with:', boardData);
    const projectId = boardData.projectId || boardData.project_id;
    const createdBy = boardData.created_by || boardData.createdBy;
    
    console.log('🔍 Extracted values:', { projectId, createdBy });
    
    const result = await this.query(
      `INSERT INTO boards (name, description, project_id, created_by, color, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [boardData.name, boardData.description || '', projectId, createdBy, boardData.color || '#3B82F6']
    );
    console.log('✅ PostgreSQL board created:', result.rows[0]);
    return result.rows[0];
  }

  async getBoardById(id: string): Promise<Board | null> {
    const result = await this.query(
      'SELECT * FROM boards WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async getBoardsByProjectId(projectId: string): Promise<Board[]> {
    const result = await this.query(
      `SELECT b.* FROM boards b 
       JOIN projects p ON b.project_id = p.id 
       WHERE b.project_id = $1 
       ORDER BY b.position ASC, b.created_at DESC`,
      [projectId]
    );
    return result.rows;
  }

  async updateBoard(id: string, updates: Partial<Board>): Promise<Board | null> {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const values = fields.map(field => updates[field as keyof Board]);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    if (fields.length === 0) {
      return await this.getBoardById(id);
    }

    const result = await this.query(
      `UPDATE boards SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  async deleteBoard(id: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM boards WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  // === МЕТОДЫ ДЛЯ КОЛОНОК ===

  async createColumn(columnData: { name: string; boardId: string; position?: number; color?: string; created_by?: string }): Promise<Column> {
    const { name, boardId, position = 0, color = '#6B7280' } = columnData;
    const result = await this.query(
      `INSERT INTO columns (name, board_id, position, color) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, boardId, position, color]
    );
    return result.rows[0];
  }

  async getColumnById(id: string): Promise<Column | null> {
    const result = await this.query(
      'SELECT * FROM columns WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async getColumnsByBoardId(boardId: string): Promise<Column[]> {
    const result = await this.query(
      'SELECT * FROM columns WHERE board_id = $1 ORDER BY position ASC, created_at DESC',
      [boardId]
    );
    return result.rows;
  }

  async updateColumn(id: string, updates: Partial<Column>): Promise<Column | null> {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const values = fields.map(field => updates[field as keyof Column]);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    if (fields.length === 0) {
      return await this.getColumnById(id);
    }

    const result = await this.query(
      `UPDATE columns SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  async deleteColumn(id: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM columns WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  // === МЕТОДЫ ДЛЯ ЗАДАЧ ===

  async createTask(taskData: Partial<Task>): Promise<Task> {
    const {
      title,
      description,
      status = 'todo',
      priority = 'medium',
      project_id,
      board_id,
      column_id,
      assignee_id,
      reporter_id,
      position = 0
    } = taskData;

    // Создаем задачу без assignee_id (используется отдельная таблица task_assignees)
    const result = await this.query(
      `INSERT INTO tasks (title, description, status, priority, project_id, board_id, column_id, reporter_id, position) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [title, description, status, priority, project_id, board_id, column_id, reporter_id, position]
    );
    
    const task = result.rows[0];
    
    // Если указан assignee_id, создаем запись в таблице task_assignees
    if (assignee_id) {
      await this.query(
        `INSERT INTO task_assignees (task_id, user_id, assigned_by) 
         VALUES ($1, $2, $3)`,
        [task.id, assignee_id, reporter_id]
      );
    }
    
    return task;
  }

  async getTaskById(id: string): Promise<Task | null> {
    const result = await this.query(
      'SELECT * FROM tasks WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async getTasksByProjectId(projectId: string): Promise<Task[]> {
    const result = await this.query(
      'SELECT * FROM tasks WHERE project_id = $1 ORDER BY position ASC, created_at DESC',
      [projectId]
    );
    return result.rows;
  }

  async getTasksByColumnId(columnId: string): Promise<Task[]> {
    const result = await this.query(
      'SELECT * FROM tasks WHERE column_id = $1 ORDER BY position ASC, created_at DESC',
      [columnId]
    );
    return result.rows;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const values = fields.map(field => updates[field as keyof Task]);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    if (fields.length === 0) {
      return await this.getTaskById(id);
    }

    const result = await this.query(
      `UPDATE tasks SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM tasks WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  async getTaskAssignees(taskId: string): Promise<any[]> {
    const result = await this.query(
      `SELECT u.id, u.username, u.email, ta.assigned_at 
       FROM task_assignees ta 
       JOIN users u ON ta.user_id = u.id 
       WHERE ta.task_id = $1`,
      [taskId]
    );
    return result.rows;
  }

  async assignTaskToUser(taskId: string, userId: string, assignedBy: string): Promise<boolean> {
    try {
      await this.query(
        `INSERT INTO task_assignees (task_id, user_id, assigned_by) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (task_id, user_id) DO NOTHING`,
        [taskId, userId, assignedBy]
      );
      return true;
    } catch (error) {
      console.error('Error assigning task to user:', error);
      return false;
    }
  }

  async unassignTaskFromUser(taskId: string, userId: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM task_assignees WHERE task_id = $1 AND user_id = $2',
      [taskId, userId]
    );
    return result.rowCount > 0;
  }

  // === ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ДЛЯ СОВМЕСТИМОСТИ ===

  async getBoardColumns(boardId: string): Promise<Column[]> {
    return await this.getColumnsByBoardId(boardId);
  }

  async getColumnTasks(columnId: string): Promise<Task[]> {
    return await this.getTasksByColumnId(columnId);
  }

  // === МЕТОДЫ ДЛЯ СЕССИЙ ===

  async createSession(sessionData: Omit<Session, 'id' | 'created_at' | 'updated_at'>): Promise<Session> {
    const result = await this.query(
      'INSERT INTO sessions (session_token, user_id, expires_at) VALUES ($1, $2, $3) RETURNING *',
      [sessionData.token, sessionData.user_id, sessionData.expires_at]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      token: row.session_token,
      expires_at: row.expires_at,
      created_at: row.created_at
    };
  }

  async getSessionByToken(sessionToken: string): Promise<Session | null> {
    const result = await this.query(
      'SELECT * FROM sessions WHERE session_token = $1 AND expires_at > NOW()',
      [sessionToken]
    );
    
    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      token: row.session_token,
      expires_at: row.expires_at,
      created_at: row.created_at
    };
  }

  async deleteSession(sessionToken: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM sessions WHERE session_token = $1',
      [sessionToken]
    );
    return result.rowCount > 0;
  }

  async deleteUserSessions(userId: string): Promise<number> {
    const result = await this.query(
      'DELETE FROM sessions WHERE user_id = $1',
      [userId]
    );
    return result.rowCount;
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = await this.query(
      'DELETE FROM sessions WHERE expires_at <= NOW()'
    );
    return result.rowCount;
  }

  // === МЕТОДЫ ДЛЯ КОММЕНТАРИЕВ ===

  async createComment(content: string, taskId: string, authorId: string): Promise<Comment> {
    const result = await this.query(
      `INSERT INTO comments (content, task_id, author_id) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [content, taskId, authorId]
    );
    return result.rows[0];
  }

  async getCommentsByTaskId(taskId: string): Promise<Comment[]> {
    const result = await this.query(
      'SELECT * FROM comments WHERE task_id = $1 AND deleted_at IS NULL ORDER BY created_at',
      [taskId]
    );
    return result.rows;
  }

  async updateComment(id: string, content: string): Promise<Comment | null> {
    const result = await this.query(
      'UPDATE comments SET content = $2 WHERE id = $1 RETURNING *',
      [id, content]
    );
    return result.rows[0] || null;
  }

  async deleteComment(id: string): Promise<boolean> {
    const result = await this.query(
      'UPDATE comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  // === МЕТОДЫ ДЛЯ ТЕГОВ ===

  async createTag(name: string, color: string, projectId$1: string): Promise<Tag> {
    const result = await this.query(
      `INSERT INTO tags (name, color, project_id) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [name, color, projectId]
    );
    return result.rows[0];
  }

  async getTagsByProjectId(projectId: string): Promise<Tag[]> {
    const result = await this.query(
      'SELECT * FROM tags WHERE project_id = $1 ORDER BY name',
      [projectId]
    );
    return result.rows;
  }

  async addTagToTask(taskId: string, tagId: string): Promise<boolean> {
    try {
      await this.query(
        'INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2)',
        [taskId, tagId]
      );
      return true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return false;
    }
  }

  async removeTagFromTask(taskId: string, tagId: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM task_tags WHERE task_id = $1 AND tag_id = $2',
      [taskId, tagId]
    );
    return result.rowCount > 0;
  }

  async getTagsByTaskId(taskId: string): Promise<Tag[]> {
    const result = await this.query(
      `SELECT t.* FROM tags t 
       JOIN task_tags tt ON t.id = tt.tag_id 
       WHERE tt.task_id = $1`,
      [taskId]
    );
    return result.rows;
  }

  // Статический метод для получения экземпляра (Singleton)
  static getInstance(): PostgreSQLAdapter {
    if (!PostgreSQLAdapter.instance) {
      const config: DatabaseConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'encore_tasks',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        ssl: false // Отключаем SSL для локального PostgreSQL
      };
      
      PostgreSQLAdapter.instance = new PostgreSQLAdapter(config);
    }
    
    return PostgreSQLAdapter.instance;
  }
}

// Экспорт экземпляра адаптера
let dbAdapter: PostgreSQLAdapter | null = null;

export function getPostgreSQLAdapter(): PostgreSQLAdapter {
  if (!dbAdapter) {
    const config: DatabaseConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'encore_tasks',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.DB_SSL === 'true'
    };
    
    dbAdapter = new PostgreSQLAdapter(config);
  }
  
  return dbAdapter;
}

export default getPostgreSQLAdapter;