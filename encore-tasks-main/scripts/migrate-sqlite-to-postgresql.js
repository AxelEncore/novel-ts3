#!/usr/bin/env node

/**
 * Скрипт миграции данных из SQLite в PostgreSQL
 * Использование: node scripts/migrate-sqlite-to-postgresql.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const Database = require('better-sqlite3');
require('dotenv').config();

// Конфигурация PostgreSQL
const pgConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'encore_tasks',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
};

// Путь к SQLite базе данных
const sqlitePath = path.join(__dirname, '..', 'database.sqlite');

class DataMigrator {
  constructor() {
    this.pgPool = new Pool(pgConfig);
    this.sqliteDb = null;
  }

  async initialize() {
    try {
      // Проверяем подключение к PostgreSQL
      const pgClient = await this.pgPool.connect();
      console.log('✅ Подключение к PostgreSQL установлено');
      pgClient.release();

      // Проверяем наличие SQLite базы данных
      if (!fs.existsSync(sqlitePath)) {
        throw new Error(`SQLite база данных не найдена: ${sqlitePath}`);
      }

      // Подключаемся к SQLite
      this.sqliteDb = new Database(sqlitePath, { readonly: true });
      console.log('✅ Подключение к SQLite установлено');

    } catch (error) {
      console.error('❌ Ошибка инициализации:', error.message);
      throw error;
    }
  }

  async migrateUsers() {
    console.log('\n📋 Миграция пользователей...');
    
    try {
      const users = this.sqliteDb.prepare('SELECT * FROM users WHERE is_active = 1').all();
      console.log(`Найдено пользователей: ${users.length}`);

      for (const user of users) {
        await this.pgPool.query(
          `INSERT INTO users (id, email, password_hash, name, avatar_url, role, is_active, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
           ON CONFLICT (id) DO UPDATE SET 
           email = EXCLUDED.email, 
           password_hash = EXCLUDED.password_hash, 
           name = EXCLUDED.name, 
           avatar_url = EXCLUDED.avatar_url, 
           role = EXCLUDED.role, 
           is_active = EXCLUDED.is_active, 
           updated_at = EXCLUDED.updated_at`,
          [
            user.id,
            user.email,
            user.password_hash,
            user.name,
            user.avatar_url,
            user.role || 'user',
            user.is_active === 1,
            user.created_at,
            user.updated_at
          ]
        );
      }

      // Обновляем последовательность
      if (users.length > 0) {
        const maxId = Math.max(...users.map(u => u.id));
        await this.pgPool.query(`SELECT setval('users_id_seq', $1, true)`, [maxId]);
      }

      console.log('✅ Пользователи мигрированы успешно');
    } catch (error) {
      console.error('❌ Ошибка миграции пользователей:', error.message);
      throw error;
    }
  }

  async migrateProjects() {
    console.log('\n📋 Миграция проектов...');
    
    try {
      const projects = this.sqliteDb.prepare('SELECT * FROM projects WHERE is_active = 1').all();
      console.log(`Найдено проектов: ${projects.length}`);

      for (const project of projects) {
        await this.pgPool.query(
          `INSERT INTO projects (id, name, description, color, owner_id, is_active, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           ON CONFLICT (id) DO UPDATE SET 
           name = EXCLUDED.name, 
           description = EXCLUDED.description, 
           color = EXCLUDED.color, 
           owner_id = EXCLUDED.owner_id, 
           is_active = EXCLUDED.is_active, 
           updated_at = EXCLUDED.updated_at`,
          [
            project.id,
            project.name,
            project.description,
            project.color || '#3B82F6',
            project.owner_id,
            project.is_active === 1,
            project.created_at,
            project.updated_at
          ]
        );
      }

      // Обновляем последовательность
      if (projects.length > 0) {
        const maxId = Math.max(...projects.map(p => p.id));
        await this.pgPool.query(`SELECT setval('projects_id_seq', $1, true)`, [maxId]);
      }

      console.log('✅ Проекты мигрированы успешно');
    } catch (error) {
      console.error('❌ Ошибка миграции проектов:', error.message);
      throw error;
    }
  }

  async migrateProjectMembers() {
    console.log('\n📋 Миграция участников проектов...');
    
    try {
      const members = this.sqliteDb.prepare('SELECT * FROM project_members').all();
      console.log(`Найдено участников: ${members.length}`);

      for (const member of members) {
        await this.pgPool.query(
          `INSERT INTO project_members (id, project_id, user_id, role, joined_at) 
           VALUES ($1, $2, $3, $4, $5) 
           ON CONFLICT (id) DO UPDATE SET 
           project_id = EXCLUDED.project_id, 
           user_id = EXCLUDED.user_id, 
           role = EXCLUDED.role, 
           joined_at = EXCLUDED.joined_at`,
          [
            member.id,
            member.project_id,
            member.user_id,
            member.role || 'member',
            member.joined_at
          ]
        );
      }

      // Обновляем последовательность
      if (members.length > 0) {
        const maxId = Math.max(...members.map(m => m.id));
        await this.pgPool.query(`SELECT setval('project_members_id_seq', $1, true)`, [maxId]);
      }

      console.log('✅ Участники проектов мигрированы успешно');
    } catch (error) {
      console.error('❌ Ошибка миграции участников проектов:', error.message);
      throw error;
    }
  }

  async migrateBoards() {
    console.log('\n📋 Миграция досок...');
    
    try {
      const boards = this.sqliteDb.prepare('SELECT * FROM boards WHERE is_active = 1').all();
      console.log(`Найдено досок: ${boards.length}`);

      for (const board of boards) {
        await this.pgPool.query(
          `INSERT INTO boards (id, name, description, project_id, position, is_active, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           ON CONFLICT (id) DO UPDATE SET 
           name = EXCLUDED.name, 
           description = EXCLUDED.description, 
           project_id = EXCLUDED.project_id, 
           position = EXCLUDED.position, 
           is_active = EXCLUDED.is_active, 
           updated_at = EXCLUDED.updated_at`,
          [
            board.id,
            board.name,
            board.description,
            board.project_id,
            board.position || 0,
            board.is_active === 1,
            board.created_at,
            board.updated_at
          ]
        );
      }

      // Обновляем последовательность
      if (boards.length > 0) {
        const maxId = Math.max(...boards.map(b => b.id));
        await this.pgPool.query(`SELECT setval('boards_id_seq', $1, true)`, [maxId]);
      }

      console.log('✅ Доски мигрированы успешно');
    } catch (error) {
      console.error('❌ Ошибка миграции досок:', error.message);
      throw error;
    }
  }

  async migrateColumns() {
    console.log('\n📋 Миграция колонок...');
    
    try {
      const columns = this.sqliteDb.prepare('SELECT * FROM columns WHERE is_active = 1').all();
      console.log(`Найдено колонок: ${columns.length}`);

      for (const column of columns) {
        await this.pgPool.query(
          `INSERT INTO columns (id, name, board_id, position, color, task_limit, is_active, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
           ON CONFLICT (id) DO UPDATE SET 
           name = EXCLUDED.name, 
           board_id = EXCLUDED.board_id, 
           position = EXCLUDED.position, 
           color = EXCLUDED.color, 
           task_limit = EXCLUDED.task_limit, 
           is_active = EXCLUDED.is_active, 
           updated_at = EXCLUDED.updated_at`,
          [
            column.id,
            column.name,
            column.board_id,
            column.position || 0,
            column.color || '#6B7280',
            column.task_limit,
            column.is_active === 1,
            column.created_at,
            column.updated_at
          ]
        );
      }

      // Обновляем последовательность
      if (columns.length > 0) {
        const maxId = Math.max(...columns.map(c => c.id));
        await this.pgPool.query(`SELECT setval('columns_id_seq', $1, true)`, [maxId]);
      }

      console.log('✅ Колонки мигрированы успешно');
    } catch (error) {
      console.error('❌ Ошибка миграции колонок:', error.message);
      throw error;
    }
  }

  async migrateTasks() {
    console.log('\n📋 Миграция задач...');
    
    try {
      const tasks = this.sqliteDb.prepare('SELECT * FROM tasks WHERE is_active = 1').all();
      console.log(`Найдено задач: ${tasks.length}`);

      for (const task of tasks) {
        await this.pgPool.query(
          `INSERT INTO tasks (id, title, description, status, priority, project_id, board_id, column_id, assignee_id, reporter_id, parent_task_id, position, story_points, estimated_hours, actual_hours, deadline, started_at, completed_at, is_active, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) 
           ON CONFLICT (id) DO UPDATE SET 
           title = EXCLUDED.title, 
           description = EXCLUDED.description, 
           status = EXCLUDED.status, 
           priority = EXCLUDED.priority, 
           project_id = EXCLUDED.project_id, 
           board_id = EXCLUDED.board_id, 
           column_id = EXCLUDED.column_id, 
           assignee_id = EXCLUDED.assignee_id, 
           reporter_id = EXCLUDED.reporter_id, 
           parent_task_id = EXCLUDED.parent_task_id, 
           position = EXCLUDED.position, 
           story_points = EXCLUDED.story_points, 
           estimated_hours = EXCLUDED.estimated_hours, 
           actual_hours = EXCLUDED.actual_hours, 
           deadline = EXCLUDED.deadline, 
           started_at = EXCLUDED.started_at, 
           completed_at = EXCLUDED.completed_at, 
           is_active = EXCLUDED.is_active, 
           updated_at = EXCLUDED.updated_at`,
          [
            task.id,
            task.title,
            task.description,
            task.status || 'todo',
            task.priority || 'medium',
            task.project_id,
            task.board_id,
            task.column_id,
            task.assignee_id,
            task.reporter_id,
            task.parent_task_id,
            task.position || 0,
            task.story_points,
            task.estimated_hours,
            task.actual_hours,
            task.deadline,
            task.started_at,
            task.completed_at,
            task.is_active === 1,
            task.created_at,
            task.updated_at
          ]
        );
      }

      // Обновляем последовательность
      if (tasks.length > 0) {
        const maxId = Math.max(...tasks.map(t => t.id));
        await this.pgPool.query(`SELECT setval('tasks_id_seq', $1, true)`, [maxId]);
      }

      console.log('✅ Задачи мигрированы успешно');
    } catch (error) {
      console.error('❌ Ошибка миграции задач:', error.message);
      throw error;
    }
  }

  async migrateSessions() {
    console.log('\n📋 Миграция сессий...');
    
    try {
      const sessions = this.sqliteDb.prepare('SELECT * FROM sessions WHERE expires_at > datetime(\'now\')').all();
      console.log(`Найдено активных сессий: ${sessions.length}`);

      for (const session of sessions) {
        await this.pgPool.query(
          `INSERT INTO sessions (id, session_token, user_id, expires_at, created_at) 
           VALUES ($1, $2, $3, $4, $5) 
           ON CONFLICT (id) DO UPDATE SET 
           session_token = EXCLUDED.session_token, 
           user_id = EXCLUDED.user_id, 
           expires_at = EXCLUDED.expires_at, 
           created_at = EXCLUDED.created_at`,
          [
            session.id,
            session.session_token,
            session.user_id,
            session.expires_at,
            session.created_at
          ]
        );
      }

      // Обновляем последовательность
      if (sessions.length > 0) {
        const maxId = Math.max(...sessions.map(s => s.id));
        await this.pgPool.query(`SELECT setval('sessions_id_seq', $1, true)`, [maxId]);
      }

      console.log('✅ Сессии мигрированы успешно');
    } catch (error) {
      console.error('❌ Ошибка миграции сессий:', error.message);
      throw error;
    }
  }

  async migrateAll() {
    console.log('🚀 Начинаем миграцию данных из SQLite в PostgreSQL\n');
    
    try {
      await this.initialize();
      
      // Миграция в правильном порядке (учитывая внешние ключи)
      await this.migrateUsers();
      await this.migrateProjects();
      await this.migrateProjectMembers();
      await this.migrateBoards();
      await this.migrateColumns();
      await this.migrateTasks();
      await this.migrateSessions();
      
      console.log('\n🎉 Миграция завершена успешно!');
      
    } catch (error) {
      console.error('\n💥 Ошибка миграции:', error.message);
      throw error;
    } finally {
      if (this.sqliteDb) {
        this.sqliteDb.close();
      }
      await this.pgPool.end();
    }
  }

  async validateMigration() {
    console.log('\n🔍 Проверка результатов миграции...');
    
    try {
      const tables = ['users', 'projects', 'project_members', 'boards', 'columns', 'tasks', 'sessions'];
      
      for (const table of tables) {
        const sqliteCount = this.sqliteDb.prepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
        const pgResult = await this.pgPool.query(`SELECT COUNT(*) as count FROM ${table}`);
        const pgCount = parseInt(pgResult.rows[0].count);
        
        console.log(`📊 ${table}: SQLite=${sqliteCount}, PostgreSQL=${pgCount}`);
        
        if (sqliteCount !== pgCount) {
          console.warn(`⚠️  Несоответствие количества записей в таблице ${table}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Ошибка проверки:', error.message);
    }
  }
}

// Запуск миграции
async function main() {
  const migrator = new DataMigrator();
  
  try {
    await migrator.migrateAll();
    await migrator.validateMigration();
  } catch (error) {
    console.error('💥 Критическая ошибка:', error.message);
    process.exit(1);
  }
}

// Запускаем только если файл вызван напрямую
if (require.main === module) {
  main();
}

module.exports = DataMigrator;