// =====================================================
// SQLITE ADAPTER FOR ENCORE TASKS
// =====================================================

import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export class SQLiteAdapter {
  private db: Database.Database;
  private isInitialized = false;

  constructor() {
    // Определяем путь к базе данных
    const dbPath = path.join(process.cwd(), 'database', 'encore_tasks.db');
    
    // Создаем директорию если её нет
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    console.log('🔧 SQLite Config:', {
      path: dbPath,
      exists: fs.existsSync(dbPath)
    });

    // Создаем подключение к SQLite
    this.db = new Database(dbPath);
    
    // Включаем внешние ключи
    this.db.pragma('foreign_keys = ON');
    
    // Настраиваем WAL режим для лучшей производительности
    this.db.pragma('journal_mode = WAL');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🔄 SQLite initialization starting...');
      
      // Проверяем, существует ли схема
      const tablesCount = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).get() as { count: number };

      if (tablesCount.count === 0) {
        console.log('📋 Creating SQLite schema...');
        await this.createSchema();
      }

      this.isInitialized = true;
      console.log('✅ SQLite adapter initialized successfully');
    } catch (error) {
      console.error('❌ SQLite initialization failed:', error);
      throw new Error('Database initialization failed');
    }
  }

  private async createSchema(): Promise<void> {
    // Читаем и выполняем SQL схему
    const schemaPath = path.join(process.cwd(), 'database', 'sqlite_schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      
      // Разбиваем схему на отдельные команды
      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--'));

      // Выполняем каждую команду
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            this.db.exec(statement);
          } catch (error) {
            // Игнорируем ошибки для команд, которые уже выполнены
            if (!error.message.includes('already exists')) {
              console.warn('Warning executing statement:', statement.substring(0, 50) + '...', error.message);
            }
          }
        }
      }
    } else {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }
  }

  isConnected(): boolean {
    return this.isInitialized;
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private generateId(): string {
    // Генерируем UUID-подобный ID для SQLite
    return uuidv4();
  }

  private dateToISO(date: Date | null): string | null {
    return date ? date.toISOString() : null;
  }

  private isoToDate(iso: string | null): Date | null {
    return iso ? new Date(iso) : null;
  }

  // =====================================================
  // RAW QUERY EXECUTION
  // =====================================================

  async executeRawQuery(query: string, params: any[] = []): Promise<any> {
    try {
      // Определяем тип запроса
      const trimmedQuery = query.trim().toUpperCase();
      
      if (trimmedQuery.startsWith('SELECT')) {
        const stmt = this.db.prepare(query);
        const results = stmt.all(params);
        return { rows: results, rowCount: results.length };
      } else if (trimmedQuery.startsWith('INSERT')) {
        const stmt = this.db.prepare(query);
        const result = stmt.run(params);
        return { rows: [], rowCount: result.changes, lastInsertRowid: result.lastInsertRowid };
      } else if (trimmedQuery.startsWith('UPDATE') || trimmedQuery.startsWith('DELETE')) {
        const stmt = this.db.prepare(query);
        const result = stmt.run(params);
        return { rows: [], rowCount: result.changes };
      } else {
        // Для других команд (CREATE, DROP и т.д.)
        this.db.exec(query);
        return { rows: [], rowCount: 0 };
      }
    } catch (error) {
      console.error('SQLite query error:', error, 'Query:', query, 'Params:', params);
      throw error;
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
    const id = this.generateId();

    const query = `
      INSERT INTO users (id, email, password_hash, name, role, approval_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    await this.executeRawQuery(query, [id, email, hashedPassword, name, role, 'pending']);
    
    // Получаем созданного пользователя
    const user = await this.getUserById(id);
    if (user) {
      user.is_approved = user.approval_status === 'approved';
    }
    
    return user;
  }

  async getUserById(id: string): Promise<any> {
    const query = 'SELECT id, email, name, role, approval_status, created_at, updated_at FROM users WHERE id = ?';
    const result = await this.executeRawQuery(query, [id]);
    const user = result.rows[0];
    
    if (user) {
      user.is_approved = user.approval_status === 'approved';
    }
    
    return user || null;
  }

  async getUserByEmail(email: string): Promise<any> {
    const query = 'SELECT * FROM users WHERE email = ?';
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
    
    for (const [key, value] of Object.entries(userData)) {
      if (key === 'password') {
        fields.push('password_hash = ?');
        values.push(await bcrypt.hash(value as string, 12));
      } else if (key === 'is_approved') {
        fields.push('approval_status = ?');
        const statusValue = value ? 'approved' : 'rejected';
        values.push(statusValue);
      } else if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push('updated_at = datetime(\'now\')');
    values.push(id);

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = ?
    `;

    await this.executeRawQuery(query, values);
    return this.getUserById(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = ?';
    const result = await this.executeRawQuery(query, [id]);
    return result.rowCount > 0;
  }

  async getAllUsers(): Promise<any[]> {
    const query = 'SELECT id, email, name, role, approval_status, created_at, updated_at FROM users ORDER BY created_at DESC';
    const result = await this.executeRawQuery(query, []);
    
    return result.rows.map((user: any) => ({
      ...user,
      is_approved: user.approval_status === 'approved'
    }));
  }

  async getUsersByEmails(emails: string[]): Promise<any[]> {
    if (emails.length === 0) return [];
    
    const placeholders = emails.map(() => '?').join(',');
    const query = `SELECT id, email, name, role, approval_status, created_at, updated_at FROM users WHERE email IN (${placeholders})`;
    const result = await this.executeRawQuery(query, emails);
    
    return result.rows.map((user: any) => ({
      ...user,
      is_approved: user.approval_status === 'approved'
    }));
  }

  // =====================================================
  // SESSION OPERATIONS
  // =====================================================

  async createSession(sessionData: any): Promise<any> {
    const { user_id, token, expires_at } = sessionData;
    const id = this.generateId();
    
    const expiresISO = expires_at instanceof Date ? expires_at.toISOString() : expires_at;

    const query = `
      INSERT INTO sessions (id, user_id, token, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    await this.executeRawQuery(query, [id, user_id, token, expiresISO]);
    return this.getSessionByToken(token);
  }

  async getSessionByToken(token: string): Promise<any> {
    const query = 'SELECT * FROM sessions WHERE token = ?';
    const result = await this.executeRawQuery(query, [token]);
    const session = result.rows[0];
    
    if (session) {
      session.expires_at = this.isoToDate(session.expires_at);
    }
    
    return session || null;
  }

  async deleteSession(token: string): Promise<boolean> {
    const query = 'DELETE FROM sessions WHERE token = ?';
    const result = await this.executeRawQuery(query, [token]);
    return result.rowCount > 0;
  }

  async deleteUserSessions(userId: string): Promise<boolean> {
    const query = 'DELETE FROM sessions WHERE user_id = ?';
    const result = await this.executeRawQuery(query, [userId]);
    return result.rowCount > 0;
  }

  // =====================================================
  // PROJECT OPERATIONS
  // =====================================================

  async createProject(projectData: any): Promise<any> {
    const { name, description, creator_id, color, icon } = projectData;
    const id = this.generateId();

    const query = `
      INSERT INTO projects (id, name, description, creator_id, color, icon, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    await this.executeRawQuery(query, [id, name, description, creator_id, color || '#6366f1', icon || 'folder']);
    
    // Добавляем создателя как владельца проекта
    await this.addProjectMember(id, creator_id, 'owner');
    
    return this.getProjectById(id);
  }

  async getProjectById(id: string): Promise<any> {
    const query = 'SELECT * FROM projects WHERE id = ?';
    const result = await this.executeRawQuery(query, [id]);
    const project = result.rows[0];
    
    if (project) {
      project.is_archived = Boolean(project.is_archived);
    }
    
    return project || null;
  }

  async getUserProjects(userId: string): Promise<any[]> {
    const query = `
      SELECT p.* 
      FROM projects p
      INNER JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = ?
      ORDER BY p.created_at DESC
    `;
    
    const result = await this.executeRawQuery(query, [userId]);
    
    return result.rows.map((project: any) => ({
      ...project,
      is_archived: Boolean(project.is_archived)
    }));
  }

  async updateProject(id: string, projectData: Partial<any>): Promise<any> {
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(projectData)) {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push('updated_at = datetime(\'now\')');
    values.push(id);

    const query = `
      UPDATE projects 
      SET ${fields.join(', ')}
      WHERE id = ?
    `;

    await this.executeRawQuery(query, values);
    return this.getProjectById(id);
  }

  async deleteProject(id: string): Promise<boolean> {
    const query = 'DELETE FROM projects WHERE id = ?';
    const result = await this.executeRawQuery(query, [id]);
    return result.rowCount > 0;
  }

  // =====================================================
  // PROJECT MEMBER OPERATIONS
  // =====================================================

  async getProjectMembers(projectId: string): Promise<any[]> {
    const query = `
      SELECT u.id, u.email, u.name, u.role as user_role, pm.role as project_role, pm.joined_at
      FROM users u
      INNER JOIN project_members pm ON u.id = pm.user_id
      WHERE pm.project_id = ?
    `;
    
    const result = await this.executeRawQuery(query, [projectId]);
    return result.rows;
  }

  async addProjectMember(projectId: string, userId: string, role: string = 'member'): Promise<any> {
    const id = this.generateId();
    
    const query = `
      INSERT INTO project_members (id, project_id, user_id, role, joined_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `;

    await this.executeRawQuery(query, [id, projectId, userId, role]);
    return { id, project_id: projectId, user_id: userId, role, joined_at: new Date() };
  }

  async removeProjectMember(projectId: string, userId: string): Promise<boolean> {
    const query = 'DELETE FROM project_members WHERE project_id = ? AND user_id = ?';
    const result = await this.executeRawQuery(query, [projectId, userId]);
    return result.rowCount > 0;
  }

  async hasProjectAccess(userId: string, projectId: string): Promise<boolean> {
    const query = 'SELECT COUNT(*) as count FROM project_members WHERE user_id = ? AND project_id = ?';
    const result = await this.executeRawQuery(query, [userId, projectId]);
    return result.rows[0].count > 0;
  }

  // =====================================================
  // BOARD OPERATIONS
  // =====================================================

  async createBoard(boardData: any): Promise<any> {
    const { name, description, project_id, icon } = boardData;
    const id = this.generateId();

    console.log('🔍 SQLiteAdapter createBoard called with:', boardData);

    const query = `
      INSERT INTO boards (id, name, description, project_id, icon, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    await this.executeRawQuery(query, [id, name, description, project_id, icon || 'kanban']);
    
    const result = await this.getBoardById(id);
    console.log('✅ SQLiteAdapter board created:', result);
    return result;
  }

  async getBoardById(id: string): Promise<any> {
    const query = 'SELECT * FROM boards WHERE id = ?';
    const result = await this.executeRawQuery(query, [id]);
    const board = result.rows[0];
    
    if (board) {
      board.is_default = Boolean(board.is_default);
    }
    
    return board || null;
  }

  async getProjectBoards(projectId: string): Promise<any[]> {
    const query = 'SELECT * FROM boards WHERE project_id = ? ORDER BY created_at ASC';
    const result = await this.executeRawQuery(query, [projectId]);
    
    return result.rows.map((board: any) => ({
      ...board,
      is_default: Boolean(board.is_default)
    }));
  }

  async updateBoard(id: string, updates: Partial<any>): Promise<any> {
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push('updated_at = datetime(\'now\')');
    values.push(id);

    const query = `
      UPDATE boards 
      SET ${fields.join(', ')}
      WHERE id = ?
    `;

    await this.executeRawQuery(query, values);
    return this.getBoardById(id);
  }

  async deleteBoard(id: string): Promise<boolean> {
    const query = 'DELETE FROM boards WHERE id = ?';
    const result = await this.executeRawQuery(query, [id]);
    return result.rowCount > 0;
  }

  // =====================================================
  // COLUMN OPERATIONS
  // =====================================================

  async createColumn(columnData: any): Promise<any> {
    const { title, board_id, position, color } = columnData;
    const id = this.generateId();

    const query = `
      INSERT INTO columns (id, title, board_id, position, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    await this.executeRawQuery(query, [id, title, board_id, position || 0, color || '#6b7280']);
    return this.getColumnById(id);
  }

  async getColumnById(id: string): Promise<any> {
    const query = 'SELECT * FROM columns WHERE id = ?';
    const result = await this.executeRawQuery(query, [id]);
    return result.rows[0] || null;
  }

  async getBoardColumns(boardId: string): Promise<any[]> {
    const query = 'SELECT * FROM columns WHERE board_id = ? ORDER BY position ASC';
    const result = await this.executeRawQuery(query, [boardId]);
    return result.rows;
  }

  async updateColumn(id: string, updates: Partial<any>): Promise<any> {
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push('updated_at = datetime(\'now\')');
    values.push(id);

    const query = `
      UPDATE columns 
      SET ${fields.join(', ')}
      WHERE id = ?
    `;

    await this.executeRawQuery(query, values);
    return this.getColumnById(id);
  }

  async deleteColumn(id: string): Promise<boolean> {
    const query = 'DELETE FROM columns WHERE id = ?';
    const result = await this.executeRawQuery(query, [id]);
    return result.rowCount > 0;
  }

  // =====================================================
  // TASK OPERATIONS
  // =====================================================

  async createTask(taskData: any): Promise<any> {
    const { title, description, project_id, board_id, column_id, reporter_id, priority, status, position } = taskData;
    const id = this.generateId();

    const query = `
      INSERT INTO tasks (id, title, description, project_id, board_id, column_id, reporter_id, priority, status, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    await this.executeRawQuery(query, [
      id, title, description, project_id, board_id, column_id, reporter_id, 
      priority || 'medium', status || 'todo', position || 0
    ]);
    
    return this.getTaskById(id);
  }

  async getTaskById(id: string): Promise<any> {
    const query = 'SELECT * FROM tasks WHERE id = ?';
    const result = await this.executeRawQuery(query, [id]);
    const task = result.rows[0];
    
    if (task) {
      task.due_date = this.isoToDate(task.due_date);
      task.completed_at = this.isoToDate(task.completed_at);
    }
    
    return task || null;
  }

  async getProjectTasks(projectId: string): Promise<any[]> {
    const query = 'SELECT * FROM tasks WHERE project_id = ? ORDER BY position ASC';
    const result = await this.executeRawQuery(query, [projectId]);
    
    return result.rows.map((task: any) => ({
      ...task,
      due_date: this.isoToDate(task.due_date),
      completed_at: this.isoToDate(task.completed_at)
    }));
  }

  async getBoardTasks(boardId: string): Promise<any[]> {
    const query = 'SELECT * FROM tasks WHERE board_id = ? ORDER BY position ASC';
    const result = await this.executeRawQuery(query, [boardId]);
    
    return result.rows.map((task: any) => ({
      ...task,
      due_date: this.isoToDate(task.due_date),
      completed_at: this.isoToDate(task.completed_at)
    }));
  }

  async getColumnTasks(columnId: string): Promise<any[]> {
    const query = 'SELECT * FROM tasks WHERE column_id = ? ORDER BY position ASC';
    const result = await this.executeRawQuery(query, [columnId]);
    
    return result.rows.map((task: any) => ({
      ...task,
      due_date: this.isoToDate(task.due_date),
      completed_at: this.isoToDate(task.completed_at)
    }));
  }

  async updateTask(id: string, updates: Partial<any>): Promise<any> {
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        if (key === 'due_date' || key === 'completed_at') {
          fields.push(`${key} = ?`);
          values.push(this.dateToISO(value as Date));
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push('updated_at = datetime(\'now\')');
    values.push(id);

    const query = `
      UPDATE tasks 
      SET ${fields.join(', ')}
      WHERE id = ?
    `;

    await this.executeRawQuery(query, values);
    return this.getTaskById(id);
  }

  async deleteTask(id: string): Promise<boolean> {
    const query = 'DELETE FROM tasks WHERE id = ?';
    const result = await this.executeRawQuery(query, [id]);
    return result.rowCount > 0;
  }

  // =====================================================
  // CLEANUP
  // =====================================================

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
    }
  }
}