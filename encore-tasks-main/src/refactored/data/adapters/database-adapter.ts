// Refactored Database Adapter
// This adapter provides a clean, consistent interface for database operations

import { Pool, PoolClient } from 'pg';
import { IDatabaseAdapter } from '../../business/interfaces';

export class RefactoredDatabaseAdapter implements IDatabaseAdapter {
  private pool: Pool;
  private isConnected = false;
  private transactionActive = false;

  constructor() {
    // Initialize PostgreSQL connection pool
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'encore_tasks',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      // Test connection
      const client = await this.pool.connect();
      client.release();
      
      // Create tables if they don't exist
      await this.createTables();
      await this.createIndexes();
      this.isConnected = true;
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.pool.end();
      this.isConnected = false;
    } catch (error) {
      throw new Error(`Failed to disconnect from database: ${error}`);
    }
  }

  async beginTransaction(): Promise<void> {
    if (this.transactionActive) {
      throw new Error('Transaction already active');
    }
    const client = await this.pool.connect();
    await client.query('BEGIN');
    this.transactionActive = true;
  }

  async commitTransaction(): Promise<void> {
    if (!this.transactionActive) {
      throw new Error('No active transaction');
    }
    const client = await this.pool.connect();
    await client.query('COMMIT');
    client.release();
    this.transactionActive = false;
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.transactionActive) {
      throw new Error('No active transaction');
    }
    const client = await this.pool.connect();
    await client.query('ROLLBACK');
    client.release();
    this.transactionActive = false;
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ affectedRows: number; insertId$1: string }> {
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, params);
      client.release();
      return {
        affectedRows: result.rowCount || 0,
        insertId: result.rows[0]$2.id
      };
    } catch (error) {
      throw new Error(`Execute failed: ${error}`);
    }
  }

  async transaction<T>(callback: (adapter: IDatabaseAdapter) => Promise<T>): Promise<T> {
    await this.beginTransaction();
    try {
      const result = await callback(this);
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  async commit(): Promise<void> {
    await this.commitTransaction();
  }

  async rollback(): Promise<void> {
    await this.rollbackTransaction();
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, params);
      client.release();
      return result.rows as T[];
    } catch (error) {
      throw new Error(`Query failed: ${error}`);
    }
  }

  async queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, params);
      client.release();
      return result.rows[0] as T | null;
    } catch (error) {
      throw new Error(`Query failed: ${error}`);
    }
  }

  async insert<T = Record<string, unknown>>(table: string, data: Record<string, unknown>): Promise<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, values);
      client.release();
      return result.rows[0] as T;
    } catch (error) {
      throw new Error(`Insert failed: ${error}`);
    }
  }

  async update<T = Record<string, unknown>>(table: string, id: string, data: Record<string, unknown>): Promise<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');
    
    const sql = `UPDATE ${table} SET ${setClause}, updated_at = NOW() WHERE id = $${columns.length + 1} RETURNING *`;
    
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, [...values, id]);
      client.release();
      
      if (result.rowCount === 0) {
        throw new Error(`No record found with id: ${id}`);
      }
      
      return result.rows[0] as T;
    } catch (error) {
      throw new Error(`Update failed: ${error}`);
    }
  }

  async delete(table: string, id: string): Promise<void> {
    const sql = `DELETE FROM ${table} WHERE id = $1`;
    
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, [id]);
      client.release();
      
      if (result.rowCount === 0) {
        throw new Error(`No record found with id: ${id}`);
      }
    } catch (error) {
      throw new Error(`Delete failed: ${error}`);
    }
  }

  async createIndex(table: string, columns: string[], unique = false): Promise<void> {
    const indexName = `idx_${table}_${columns.join('_')}`;
    const uniqueClause = unique $1 'UNIQUE' : '';
    const sql = `CREATE ${uniqueClause} INDEX IF NOT EXISTS ${indexName} ON ${table} (${columns.join(', ')})`;
    
    try {
      const client = await this.pool.connect();
      await client.query(sql);
      client.release();
    } catch (error) {
      throw new Error(`Create index failed: ${error}`);
    }
  }

  async dropIndex(table: string, indexName: string): Promise<void> {
    const sql = `DROP INDEX IF EXISTS ${indexName}`;
    
    try {
      const client = await this.pool.connect();
      await client.query(sql);
      client.release();
    } catch (error) {
      throw new Error(`Drop index failed: ${error}`);
    }
  }

  async migrate(version: number): Promise<void> {
    // Implementation for database migrations
    console.log(`Migrating to version ${version}`);
    // Add migration logic here based on version
  }

  async seed(): Promise<void> {
    // Implementation for seeding initial data
    console.log('Seeding database with initial data');
    // Add seed logic here
  }

  private async createTables(): Promise<void> {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        avatar TEXT,
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMP,
        preferences JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,

      // Projects table
      `CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#3B82F6',
        creator_id VARCHAR(255) NOT NULL,
        is_archived BOOLEAN DEFAULT false,
        settings JSONB,
        statistics JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Project members table
      `CREATE TABLE IF NOT EXISTS project_members (
        id VARCHAR(255) PRIMARY KEY,
        project_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
        permissions JSONB,
        joined_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(project_id, user_id)
      )`,

      // Boards table
      `CREATE TABLE IF NOT EXISTS boards (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        project_id VARCHAR(255) NOT NULL,
        position INTEGER DEFAULT 0,
        is_archived BOOLEAN DEFAULT false,
        settings JSONB,
        statistics JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )`,

      // Columns table
      `CREATE TABLE IF NOT EXISTS columns (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        board_id VARCHAR(255) NOT NULL,
        position INTEGER DEFAULT 0,
        color VARCHAR(7),
        wip_limit INTEGER,
        is_collapsed BOOLEAN DEFAULT false,
        settings JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
      )`,

      // Tasks table
      `CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked')),
        priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        column_id VARCHAR(255) NOT NULL,
        board_id VARCHAR(255) NOT NULL,
        project_id VARCHAR(255) NOT NULL,
        position INTEGER DEFAULT 0,
        assignee_id VARCHAR(255),
        reporter_id VARCHAR(255) NOT NULL,
        due_date TIMESTAMP,
        estimated_hours DECIMAL(10,2),
        actual_hours DECIMAL(10,2),
        tags JSONB,
        is_archived BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE,
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Task dependencies table
      `CREATE TABLE IF NOT EXISTS task_dependencies (
        id VARCHAR(255) PRIMARY KEY,
        task_id VARCHAR(255) NOT NULL,
        depends_on_task_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('blocks', 'blocked_by', 'relates_to', 'duplicates')),
        created_at TIMESTAMP DEFAULT NOW(),
        created_by VARCHAR(255) NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(task_id, depends_on_task_id, type)
      )`,

      // Comments table
      `CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR(255) PRIMARY KEY,
        task_id VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        author_id VARCHAR(255) NOT NULL,
        parent_comment_id VARCHAR(255),
        is_edited BOOLEAN DEFAULT false,
        edited_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
      )`,

      // Attachments table
      `CREATE TABLE IF NOT EXISTS attachments (
        id VARCHAR(255) PRIMARY KEY,
        task_id VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        url TEXT NOT NULL,
        uploaded_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Time entries table
      `CREATE TABLE IF NOT EXISTS time_entries (
        id VARCHAR(255) PRIMARY KEY,
        task_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        duration INTEGER DEFAULT 0, -- in minutes
        description TEXT,
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Task actions (history) table
      `CREATE TABLE IF NOT EXISTS task_actions (
        id VARCHAR(255) PRIMARY KEY,
        task_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        old_value JSONB,
        new_value JSONB,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Sessions table
      `CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        token VARCHAR(500) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT true,
        user_agent TEXT,
        ip_address VARCHAR(45),
        last_activity_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    ];

    for (const table of tables) {
      const client = await this.pool.connect();
      await client.query(table);
      client.release();
    }
  }

  private async createIndexes(): Promise<void> {
    const indexes = [
      // User indexes
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)',
      
      // Project indexes
      'CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(creator_id)',
      'CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(is_archived)',
      
      // Project member indexes
      'CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id)',
      
      // Board indexes
      'CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_boards_position ON boards(project_id, position)',
      'CREATE INDEX IF NOT EXISTS idx_boards_archived ON boards(is_archived)',
      
      // Column indexes
      'CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id)',
      'CREATE INDEX IF NOT EXISTS idx_columns_position ON columns(board_id, position)',
      
      // Task indexes
      'CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_board ON tasks(board_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_reporter ON tasks(reporter_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(column_id, position)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(is_archived)',
      
      // Task dependency indexes
      'CREATE INDEX IF NOT EXISTS idx_task_deps_task ON task_dependencies(task_id)',
      'CREATE INDEX IF NOT EXISTS idx_task_deps_depends_on ON task_dependencies(depends_on_task_id)',
      
      // Comment indexes
      'CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id)',
      'CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id)',
      'CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id)',
      
      // Attachment indexes
      'CREATE INDEX IF NOT EXISTS idx_attachments_task ON attachments(task_id)',
      'CREATE INDEX IF NOT EXISTS idx_attachments_uploader ON attachments(uploaded_by)',
      
      // Time entry indexes
      'CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id)',
      'CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_time_entries_active ON time_entries(is_active)',
      
      // Task action indexes
      'CREATE INDEX IF NOT EXISTS idx_task_actions_task ON task_actions(task_id)',
      'CREATE INDEX IF NOT EXISTS idx_task_actions_user ON task_actions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_task_actions_created ON task_actions(created_at)',
      
      // Session indexes
      'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)'
    ];

    for (const index of indexes) {
      const client = await this.pool.connect();
      await client.query(index);
      client.release();
    }
  }

  // Helper methods for data transformation
  transformToEntity<T>(row: Record<string, unknown>, entityType: string): T {
    if (!row) return null as T;

    // Convert snake_case to camelCase and parse JSON fields
    const transformed: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(row)) {
      const camelKey = this.toCamelCase(key);
      
      // Parse JSON fields
      if (this.isJsonField(key, entityType) && typeof value === 'string') {
        try {
          transformed[camelKey] = JSON.parse(value);
        } catch {
          transformed[camelKey] = value;
        }
      } else if (key.includes('_at') && value) {
        // Convert datetime strings to Date objects
        transformed[camelKey] = new Date(value as string);
      } else if (typeof value === 'number' && (key.includes('is_') || key.includes('_active'))) {
        // Convert database values to proper types
        transformed[camelKey] = Boolean(value);
      } else {
        transformed[camelKey] = value;
      }
    }
    
    return transformed as T;
  }

  transformFromEntity(entity: Record<string, unknown>, entityType: string): Record<string, unknown> {
    const transformed: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(entity)) {
      const snakeKey = this.toSnakeCase(key);
      
      // Stringify JSON fields
      if (this.isJsonField(snakeKey, entityType) && typeof value === 'object' && value !== null) {
        transformed[snakeKey] = JSON.stringify(value);
      } else if (value instanceof Date) {
        // Convert Date objects to ISO strings
        transformed[snakeKey] = value.toISOString();
      } else if (typeof value === 'boolean') {
        // Convert booleans for database storage
        transformed[snakeKey] = value $1 1 : 0;
      } else {
        transformed[snakeKey] = value;
      }
    }
    
    return transformed;
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private isJsonField(field: string, entityType: string): boolean {
    const jsonFields: Record<string, string[]> = {
      users: ['preferences'],
      projects: ['settings', 'statistics'],
      project_members: ['permissions'],
      boards: ['settings', 'statistics'],
      columns: ['settings'],
      tasks: ['tags', 'metadata'],
      task_actions: ['old_value', 'new_value']
    };
    
    return jsonFields[entityType]?.includes(field) || false;
  }
}

// Export singleton instance
export const databaseAdapter = new RefactoredDatabaseAdapter();