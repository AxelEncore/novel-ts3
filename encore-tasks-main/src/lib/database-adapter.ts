// =====================================================
// POSTGRESQL DATABASE ADAPTER FOR ENCORE TASKS
// =====================================================

import { User, Project, Board, Column, Task, Session } from '@/types';
import { PostgreSQLAdapter } from './adapters/postgresql-adapter';

class DatabaseAdapter {
  private static instance: DatabaseAdapter;
  private adapter: PostgreSQLAdapter;
  private isInitialized = false;

  constructor() {
    this.adapter = new PostgreSQLAdapter();
  }

  public static getInstance(): DatabaseAdapter {
    if (!DatabaseAdapter.instance) {
      DatabaseAdapter.instance = new DatabaseAdapter();
    }
    return DatabaseAdapter.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.adapter.initialize();
      this.isInitialized = true;
      console.log('✅ PostgreSQL connection established');
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error);
      throw new Error('Database initialization failed');
    }
  }

  /**
   * Проверка инициализации перед выполнением операций
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  isConnected(): boolean {
    return this.adapter.isConnected();
  }

  getDatabaseType(): string {
    return 'postgresql';
  }

  // =====================================================
  // ОПЕРАЦИИ С ПОЛЬЗОВАТЕЛЯМИ
  // =====================================================

  // User operations
  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    role?: string;
  }): Promise<any> {
    await this.ensureInitialized();
    return this.adapter.createUser(userData);
  }

  async getUserById(id: string): Promise<any> {
    await this.ensureInitialized();
    return this.adapter.getUserById(id);
  }

  async getUserByEmail(email: string): Promise<any> {
    await this.ensureInitialized();
    return this.adapter.getUserByEmail(email);
  }

  async updateUser(id: string, userData: Partial<any>): Promise<any> {
    await this.ensureInitialized();
    return this.adapter.updateUser(id, userData);
  }

  async deleteUser(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.adapter.deleteUser(id);
  }

  async getAllUsers(): Promise<any[]> {
    await this.ensureInitialized();
    return this.adapter.getAllUsers();
  }

  async getUsers(): Promise<any[]> {
    await this.ensureInitialized();
    return this.adapter.getAllUsers();
  }

  // Session operations
  async createSession(sessionData: any): Promise<any> {
    await this.ensureInitialized();
    return this.adapter.createSession(sessionData);
  }

  async getSessionByToken(token: string): Promise<any> {
    await this.ensureInitialized();
    return this.adapter.getSessionByToken(token);
  }

  async deleteSession(token: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.adapter.deleteSession(token);
  }

  async deleteUserSessions(userId: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.adapter.deleteUserSessions(userId);
  }

  // Project operations
  async createProject(projectData: any): Promise<any> {
    await this.ensureInitialized();
    return this.adapter.createProject(projectData);
  }

  async getProjectById(id: string): Promise<any> {
    await this.ensureInitialized();
    return this.adapter.getProjectById(id);
  }

  async getUserProjects(userId: string): Promise<any[]> {
    await this.ensureInitialized();
    return this.adapter.getUserProjects(userId);
  }

  async updateProject(id: string, projectData: Partial<any>): Promise<any> {
    await this.ensureInitialized();
    return this.adapter.updateProject(id, projectData);
  }

  async deleteProject(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.adapter.deleteProject(id);
  }

  // Board operations
  async createBoard(boardData: any): Promise<any> {
    await this.ensureInitialized();
    console.log('🔍 DatabaseAdapter createBoard called with:', boardData);
    const result = await this.adapter.createBoard(boardData);
    console.log('✅ DatabaseAdapter board created:', result);
    return result;
  }

  async getBoardById(id: string): Promise<any> {
    await this.ensureInitialized();
    return this.adapter.getBoardById(id);
  }

  async getProjectBoards(projectId: string): Promise<any[]> {
    await this.ensureInitialized();
    return this.adapter.getProjectBoards(projectId);
  }

  async updateBoard(id: string, updates: Partial<any>): Promise<any> {
    await this.ensureInitialized();
    return this.adapter.updateBoard(id, updates);
  }

  async deleteBoard(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.adapter.deleteBoard(id);
  }

  // Column operations
  async createColumn(columnData: any): Promise<any> {
    await this.ensureInitialized();
    return this.adapter.createColumn(columnData);
  }

  async getColumnById(id: string): Promise<any> {
    await this.ensureInitialized();
    return this.adapter.getColumnById(id);
  }

  async getBoardColumns(boardId: string): Promise<any[]> {
    await this.ensureInitialized();
    return this.adapter.getBoardColumns(boardId);
  }

  async updateColumn(id: string, updates: Partial<any>): Promise<any> {
    await this.ensureInitialized();
    return this.adapter.updateColumn(id, updates);
  }

  async deleteColumn(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.adapter.deleteColumn(id);
  }

  // Task operations
  async createTask(taskData: any): Promise<any> {
    await this.ensureInitialized();
    return this.adapter.createTask(taskData);
  }

  async getTaskById(id: string): Promise<any> {
    await this.ensureInitialized();
    return this.adapter.getTaskById(id);
  }

  async getProjectTasks(projectId: string): Promise<any[]> {
    await this.ensureInitialized();
    return this.adapter.getProjectTasks(projectId);
  }

  async getBoardTasks(boardId: string): Promise<any[]> {
    await this.ensureInitialized();
    return this.adapter.getBoardTasks(boardId);
  }

  async getColumnTasks(columnId: string): Promise<any[]> {
    await this.ensureInitialized();
    return this.adapter.getColumnTasks(columnId);
  }

  async updateTask(id: string, updates: Partial<any>): Promise<any> {
    await this.ensureInitialized();
    return this.adapter.updateTask(id, updates);
  }

  async deleteTask(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.adapter.deleteTask(id);
  }

  // =====================================================
  // ACCESS CONTROL METHODS
  // =====================================================

  async hasProjectAccess(userId: string, projectId: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.adapter.hasProjectAccess(userId, projectId);
  }

  /**
   * Выполнение сырого SQL запроса (для совместимости с репозиториями)
   */
  public async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    await this.ensureInitialized();
    const result = await this.adapter.query(sql, params || []);
    return result.rows;
  }

  // Project member operations
  async getProjectMembers(projectId: string): Promise<any[]> {
    await this.ensureInitialized();
    return this.adapter.getProjectMembers(projectId);
  }

  async addProjectMember(projectId: string, userId: string, role: string = 'member'): Promise<any> {
    await this.ensureInitialized();
    return this.adapter.addProjectMember(projectId, userId, role);
  }

  async removeProjectMember(projectId: string, userId: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.adapter.removeProjectMember(projectId, userId);
  }

  async getUsersByEmails(emails: string[]): Promise<any[]> {
    await this.ensureInitialized();
    return this.adapter.getUsersByEmails(emails);
  }

  // Raw query execution
  async executeRawQuery(query: string, params: any[] = []): Promise<any> {
    await this.ensureInitialized();
    return this.adapter.executeRawQuery(query, params);
  }

  async close(): Promise<void> {
    if (this.adapter) {
      await this.adapter.close();
    }
  }
}

// Export singleton instance
export const dbAdapter = new DatabaseAdapter();

// Export class for getInstance() usage
export { DatabaseAdapter };
