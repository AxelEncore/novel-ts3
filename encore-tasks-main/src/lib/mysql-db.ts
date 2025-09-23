// =====================================================
// БИБЛИОТЕКА ДЛЯ РАБОТЫ С MYSQL
// =====================================================

import { 
  createPool, 
  isMySQLAvailable, 
  executeQuery, 
  executeTransaction, 
  generateUUID, 
  formatDateForMySQL 
} from '../../database/mysql-config.js';

// =====================================================
// ИНТЕРФЕЙСЫ ДАННЫХ
// =====================================================

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'manager' | 'user';
  approval_status: 'pending' | 'approved' | 'rejected';
  avatar$1: string;
  telegram_chat_id$2: number;
  telegram_username$3: string;
  notification_settings$4: {
    email: boolean;
    telegram: boolean;
    browser: boolean;
    taskAssigned: boolean;
    taskCompleted: boolean;
    projectUpdates: boolean;
  };
  last_login_at$5: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at$6: Date;
}

export interface Project {
  id: string;
  name: string;
  description$7: string;
  color: string;
  creator_id: string;
  telegram_chat_id$8: number;
  telegram_topic_id$9: number;
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at$10: Date;
}

export interface Board {
  id: string;
  name: string;
  description$11: string;
  project_id: string;
  icon: string;
  position: number;
  is_default: boolean;
  is_archived: boolean;
  archived_at$12: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at$13: Date;
}

export interface Column {
  id: string;
  name: string;
  board_id: string;
  position: number;
  color: string;
  task_limit$14: number;
  is_archived: boolean;
  archived_at$15: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Task {
  id: string;
  title: string;
  description$16: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  project_id: string;
  board_id: string;
  column_id$1: string;
  reporter_id: string;
  parent_task_id$2: string;
  position: number;
  story_points$3: number;
  estimated_hours$4: number;
  actual_hours$5: number;
  deadline$6: Date;
  started_at$7: Date;
  completed_at$8: Date;
  is_archived: boolean;
  archived_at$9: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at$10: Date;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  refresh_token$11: string;
  ip_address$12: string;
  user_agent$13: string;
  expires_at: Date;
  created_at: Date;
  last_activity_at: Date;
}

// =====================================================
// КЛАСС ДЛЯ РАБОТЫ С MYSQL
// =====================================================

export class MySQLDatabase {
  private static instance: MySQLDatabase;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): MySQLDatabase {
    if (!MySQLDatabase.instance) {
      MySQLDatabase.instance = new MySQLDatabase();
    }
    return MySQLDatabase.instance;
  }

  /**
   * Инициализация подключения к MySQL
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await createPool();
      this.isInitialized = true;
      console.log('✅ MySQL Database: Инициализация завершена');
    } catch (error) {
      console.error('❌ MySQL Database: Ошибка инициализации:', error);
      throw error;
    }
  }

  /**
   * Проверка доступности MySQL
   */
  public async isAvailable(): Promise<boolean> {
    return await isMySQLAvailable();
  }

  // =====================================================
  // ОПЕРАЦИИ С ПОЛЬЗОВАТЕЛЯМИ
  // =====================================================

  /**
   * Создание пользователя
   */
  public async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const id = generateUUID();
    const now = formatDateForMySQL();
    
    const query = `
      INSERT INTO users (
        id, name, email, password_hash, role, approval_status, 
        avatar, telegram_chat_id, telegram_username, notification_settings,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;
    
    const params = [
      id,
      userData.name,
      userData.email,
      userData.password_hash,
      userData.role,
      userData.approval_status,
      userData.avatar || null,
      userData.telegram_chat_id || null,
      userData.telegram_username || null,
      JSON.stringify(userData.notification_settings || {
        email: true,
        telegram: false,
        browser: true,
        taskAssigned: true,
        taskCompleted: true,
        projectUpdates: true
      }),
      now,
      now
    ];
    
    await executeQuery(query, params);
    return await this.getUserById(id) as User;
  }

  /**
   * Получение пользователя по ID
   */
  public async getUserById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL';
    const rows = await executeQuery(query, [id]) as any[];
    
    if (rows.length === 0) return null;
    
    const user = rows[0];
    if (user.notification_settings && typeof user.notification_settings === 'string') {
      user.notification_settings = JSON.parse(user.notification_settings);
    }
    
    return user;
  }

  /**
   * Получение пользователя по email
   */
  public async getUserByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL';
    const rows = await executeQuery(query, [email]) as any[];
    
    if (rows.length === 0) return null;
    
    const user = rows[0];
    if (user.notification_settings && typeof user.notification_settings === 'string') {
      user.notification_settings = JSON.parse(user.notification_settings);
    }
    
    return user;
  }

  /**
   * Получение всех пользователей
   */
  public async getAllUsers(): Promise<User[]> {
    const query = 'SELECT * FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC';
    const rows = await executeQuery(query) as any[];
    
    return rows.map(user => {
      if (user.notification_settings && typeof user.notification_settings === 'string') {
        user.notification_settings = JSON.parse(user.notification_settings);
      }
      return user;
    });
  }

  /**
   * Обновление пользователя
   */
  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const setClause = [];
    const params = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        setClause.push(`${key} = $1`);
        if (key === 'notification_settings' && typeof value === 'object') {
          params.push(JSON.stringify(value));
        } else {
          params.push(value);
        }
      }
    }
    
    if (setClause.length === 0) return await this.getUserById(id);
    
    setClause.push('updated_at = $1');
    params.push(formatDateForMySQL());
    params.push(id);
    
    const query = `UPDATE users SET ${setClause.join(', ')} WHERE id = $1`;
    await executeQuery(query, params);
    
    return await this.getUserById(id);
  }

  /**
   * Удаление пользователя (мягкое удаление)
   */
  public async deleteUser(id: string): Promise<boolean> {
    const query = 'UPDATE users SET deleted_at = $1, updated_at = $2 WHERE id = $3';
    const now = formatDateForMySQL();
    const result = await executeQuery(query, [now, now, id]) as any;
    
    return result.affectedRows > 0;
  }

  // =====================================================
  // ОПЕРАЦИИ С СЕССИЯМИ
  // =====================================================

  /**
   * Создание сессии
   */
  public async createSession(sessionData: Omit<UserSession, 'id' | 'created_at' | 'last_activity_at'>): Promise<UserSession> {
    const id = generateUUID();
    const now = formatDateForMySQL();
    
    const query = `
      INSERT INTO user_sessions (
        id, user_id, session_token, refresh_token, ip_address, 
        user_agent, expires_at, created_at, last_activity_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    
    const params = [
      id,
      sessionData.user_id,
      sessionData.session_token,
      sessionData.refresh_token || null,
      sessionData.ip_address || null,
      sessionData.user_agent || null,
      formatDateForMySQL(sessionData.expires_at),
      now,
      now
    ];
    
    await executeQuery(query, params);
    return await this.getSessionById(id) as UserSession;
  }

  /**
   * Получение сессии по ID
   */
  public async getSessionById(id: string): Promise<UserSession | null> {
    const query = 'SELECT * FROM user_sessions WHERE id = $1';
    const rows = await executeQuery(query, [id]) as any[];
    
    return rows.length > 0 $1 rows[0] : null;
  }

  /**
   * Получение сессии по токену
   */
  public async getSessionByToken(token: string): Promise<UserSession | null> {
    const query = 'SELECT * FROM user_sessions WHERE session_token = $1 AND expires_at > NOW()';
    const rows = await executeQuery(query, [token]) as any[];
    
    return rows.length > 0 $2 rows[0] : null;
  }

  /**
   * Обновление активности сессии
   */
  public async updateSessionActivity(token: string): Promise<boolean> {
    const query = 'UPDATE user_sessions SET last_activity_at = $1 WHERE session_token = $2';
    const result = await executeQuery(query, [formatDateForMySQL(), token]) as any;
    
    return result.affectedRows > 0;
  }

  /**
   * Удаление сессии
   */
  public async deleteSession(token: string): Promise<boolean> {
    const query = 'DELETE FROM user_sessions WHERE session_token = $1';
    const result = await executeQuery(query, [token]) as any;
    
    return result.affectedRows > 0;
  }

  /**
   * Удаление всех сессий пользователя
   */
  public async deleteUserSessions(userId: string): Promise<boolean> {
    const query = 'DELETE FROM user_sessions WHERE user_id = $1';
    const result = await executeQuery(query, [userId]) as any;
    
    return result.affectedRows > 0;
  }

  // =====================================================
  // ОПЕРАЦИИ С ПРОЕКТАМИ
  // =====================================================

  /**
   * Создание проекта
   */
  public async createProject(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const id = generateUUID();
    const now = formatDateForMySQL();
    
    const query = `
      INSERT INTO projects (
        id, name, description, color, creator_id, telegram_chat_id, 
        telegram_topic_id, is_archived, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    
    const params = [
      id,
      projectData.name,
      projectData.description || null,
      projectData.color,
      projectData.creator_id,
      projectData.telegram_chat_id || null,
      projectData.telegram_topic_id || null,
      projectData.is_archived,
      now,
      now
    ];
    
    await executeQuery(query, params);
    return await this.getProjectById(id) as Project;
  }

  /**
   * Получение проекта по ID
   */
  public async getProjectById(id: string): Promise<Project | null> {
    const query = 'SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL';
    const rows = await executeQuery(query, [id]) as any[];
    
    return rows.length > 0 $1 rows[0] : null;
  }

  /**
   * Получение всех проектов
   */
  public async getAllProjects(): Promise<Project[]> {
    const query = 'SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY created_at DESC';
    const rows = await executeQuery(query) as any[];
    
    return rows;
  }

  /**
   * Получение проектов пользователя
   */
  public async getUserProjects(userId: string): Promise<Project[]> {
    const query = `
      SELECT DISTINCT p.* FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE (p.creator_id = $1 OR pm.user_id = $2) 
        AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC
    `;
    const rows = await executeQuery(query, [userId, userId]) as any[];
    
    return rows;
  }

  /**
   * Получение проектов по ID создателя
   */
  public async getProjectsByCreatorId(creatorId: string): Promise<Project[]> {
    const query = `
      SELECT * FROM projects 
      WHERE creator_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    const rows = await executeQuery(query, [creatorId]) as any[];
    
    return rows;
  }

  /**
   * Обновление проекта
   */
  public async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    const setClause = [];
    const params = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        setClause.push(`${key} = $1`);
        params.push(value);
      }
    }
    
    if (setClause.length === 0) return await this.getProjectById(id);
    
    setClause.push('updated_at = $1');
    params.push(formatDateForMySQL());
    params.push(id);
    
    const query = `UPDATE projects SET ${setClause.join(', ')} WHERE id = $1`;
    await executeQuery(query, params);
    
    return await this.getProjectById(id);
  }

  /**
   * Удаление проекта (мягкое удаление)
   */
  public async deleteProject(id: string): Promise<boolean> {
    const query = 'UPDATE projects SET deleted_at = $1, updated_at = $2 WHERE id = $3';
    const now = formatDateForMySQL();
    const result = await executeQuery(query, [now, now, id]) as any;
    
    return result.affectedRows > 0;
  }

  // =====================================================
  // ОПЕРАЦИИ С ДОСКАМИ
  // =====================================================

  /**
   * Создание доски
   */
  public async createBoard(boardData: Omit<Board, 'id' | 'created_at' | 'updated_at'>): Promise<Board> {
    const id = generateUUID();
    const now = formatDateForMySQL();
    
    const query = `
      INSERT INTO boards (
        id, name, description, project_id, icon, position, 
        is_default, is_archived, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    
    const params = [
      id,
      boardData.name,
      boardData.description || null,
      boardData.project_id,
      boardData.icon,
      boardData.position,
      boardData.is_default,
      boardData.is_archived,
      now,
      now
    ];
    
    await executeQuery(query, params);
    return await this.getBoardById(id) as Board;
  }

  /**
   * Получение доски по ID
   */
  public async getBoardById(id: string): Promise<Board | null> {
    const query = 'SELECT * FROM boards WHERE id = $1 AND deleted_at IS NULL';
    const rows = await executeQuery(query, [id]) as any[];
    
    return rows.length > 0 $1 rows[0] : null;
  }

  /**
   * Получение досок проекта
   */
  public async getProjectBoards(projectId: string): Promise<Board[]> {
    const query = 'SELECT * FROM boards WHERE project_id = $1 AND deleted_at IS NULL ORDER BY position, created_at';
    const rows = await executeQuery(query, [projectId]) as any[];
    
    return rows;
  }

  /**
   * Обновление доски
   */
  public async updateBoard(id: string, updates: Partial<Board>): Promise<Board | null> {
    const setClause = [];
    const params = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        setClause.push(`${key} = $1`);
        params.push(value);
      }
    }
    
    if (setClause.length === 0) return await this.getBoardById(id);
    
    setClause.push('updated_at = $1');
    params.push(formatDateForMySQL());
    params.push(id);
    
    const query = `UPDATE boards SET ${setClause.join(', ')} WHERE id = $1`;
    await executeQuery(query, params);
    
    return await this.getBoardById(id);
  }

  /**
   * Удаление доски (мягкое удаление)
   */
  public async deleteBoard(id: string): Promise<boolean> {
    const query = 'UPDATE boards SET deleted_at = $1, updated_at = $2 WHERE id = $3';
    const now = formatDateForMySQL();
    const result = await executeQuery(query, [now, now, id]) as any;
    
    return result.affectedRows > 0;
  }

  // =====================================================
  // ОПЕРАЦИИ С КОЛОНКАМИ
  // =====================================================

  /**
   * Создание колонки
   */
  public async createColumn(columnData: Omit<Column, 'id' | 'created_at' | 'updated_at'>): Promise<Column> {
    const id = generateUUID();
    const now = formatDateForMySQL();
    
    const query = `
      INSERT INTO columns (
        id, title, board_id, position, color, task_limit, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    const params = [
      id,
      columnData.name,
      columnData.board_id,
      columnData.position,
      columnData.color,
      columnData.task_limit || null,
      now,
      now
    ];
    
    await executeQuery(query, params);
    return await this.getColumnById(id) as Column;
  }

  /**
   * Получение колонки по ID
   */
  public async getColumnById(id: string): Promise<Column | null> {
    const query = 'SELECT * FROM columns WHERE id = $1 AND is_archived = 0';
    const rows = await executeQuery(query, [id]) as any[];
    
    return rows.length > 0 $1 rows[0] : null;
  }

  /**
   * Получение колонок доски
   */
  public async getBoardColumns(boardId: string): Promise<Column[]> {
    const query = 'SELECT * FROM columns WHERE board_id = $1 AND is_archived = 0 ORDER BY position';
    const rows = await executeQuery(query, [boardId]) as any[];
    
    return rows;
  }

  /**
   * Обновление колонки
   */
  public async updateColumn(id: string, updates: Partial<Column>): Promise<Column | null> {
    const setClause = [];
    const params = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        setClause.push(`${key} = $1`);
        params.push(value);
      }
    }
    
    if (setClause.length === 0) return await this.getColumnById(id);
    
    setClause.push('updated_at = $1');
    params.push(formatDateForMySQL());
    params.push(id);
    
    const query = `UPDATE columns SET ${setClause.join(', ')} WHERE id = $1`;
    await executeQuery(query, params);
    
    return await this.getColumnById(id);
  }

  /**
   * Удаление колонки
   */
  public async deleteColumn(id: string): Promise<boolean> {
    const query = 'DELETE FROM columns WHERE id = $1';
    const result = await executeQuery(query, [id]) as any;
    
    return result.affectedRows > 0;
  }

  // =====================================================
  // ОПЕРАЦИИ С ЗАДАЧАМИ
  // =====================================================

  /**
   * Создание задачи
   */
  public async createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    const id = generateUUID();
    const now = formatDateForMySQL();
    
    const query = `
      INSERT INTO tasks (
        id, title, description, status, priority, project_id, board_id, 
        column_id, reporter_id, parent_task_id, position, story_points, 
        estimated_hours, actual_hours, deadline, is_archived, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `;
    
    const params = [
      id,
      taskData.title,
      taskData.description || null,
      taskData.status,
      taskData.priority,
      taskData.project_id,
      taskData.board_id,
      taskData.column_id || null,
      taskData.reporter_id,
      taskData.parent_task_id || null,
      taskData.position,
      taskData.story_points || null,
      taskData.estimated_hours || null,
      taskData.actual_hours || null,
      taskData.deadline $1 formatDateForMySQL(taskData.deadline) : null,
      taskData.is_archived,
      now,
      now
    ];
    
    await executeQuery(query, params);
    return await this.getTaskById(id) as Task;
  }

  /**
   * Получение задачи по ID
   */
  public async getTaskById(id: string): Promise<Task | null> {
    const query = 'SELECT * FROM tasks WHERE id = $1 AND is_archived = 0 AND deleted_at IS NULL';
    const rows = await executeQuery(query, [id]) as any[];
    
    return rows.length > 0 $1 rows[0] : null;
  }

  /**
   * Получение задач проекта
   */
  public async getProjectTasks(projectId: string): Promise<Task[]> {
    const query = 'SELECT * FROM tasks WHERE project_id = $2 AND is_archived = 0 AND deleted_at IS NULL ORDER BY position, created_at';
    const rows = await executeQuery(query, [projectId]) as any[];
    
    return rows;
  }

  /**
   * Получение задач доски
   */
  public async getBoardTasks(boardId: string): Promise<Task[]> {
    const query = 'SELECT * FROM tasks WHERE board_id = $1 AND is_archived = 0 AND deleted_at IS NULL ORDER BY position, created_at';
    const rows = await executeQuery(query, [boardId]) as any[];
    
    return rows;
  }

  /**
   * Получение задач колонки
   */
  public async getColumnTasks(columnId: string): Promise<Task[]> {
    const query = 'SELECT * FROM tasks WHERE column_id = $1 AND is_archived = 0 AND deleted_at IS NULL ORDER BY position, created_at';
    const rows = await executeQuery(query, [columnId]) as any[];
    
    return rows;
  }

  /**
   * Обновление задачи
   */
  public async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const setClause = [];
    const params = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        setClause.push(`${key} = $1`);
        if (key === 'deadline' && value instanceof Date) {
          params.push(formatDateForMySQL(value));
        } else {
          params.push(value);
        }
      }
    }
    
    if (setClause.length === 0) return await this.getTaskById(id);
    
    setClause.push('updated_at = $1');
    params.push(formatDateForMySQL());
    params.push(id);
    
    const query = `UPDATE tasks SET ${setClause.join(', ')} WHERE id = $1`;
    await executeQuery(query, params);
    
    return await this.getTaskById(id);
  }

  /**
   * Удаление задачи (мягкое удаление)
   */
  public async deleteTask(id: string): Promise<boolean> {
    const query = 'UPDATE tasks SET deleted_at = $1, updated_at = $2 WHERE id = $3';
    const now = formatDateForMySQL();
    const result = await executeQuery(query, [now, now, id]) as any;
    
    return result.affectedRows > 0;
  }
}

// Экспорт единственного экземпляра
export const mysqlDb = MySQLDatabase.getInstance();