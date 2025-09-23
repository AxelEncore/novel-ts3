#!/usr/bin/env node

// =====================================================
// СКРИПТ МИГРАЦИИ ДАННЫХ ИЗ TEMPDB В MYSQL
// =====================================================

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Конфигурация MySQL
const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'encore_tasks_db',
  charset: 'utf8mb4',
  timezone: '+00:00',
  multipleStatements: true
};

// Путь к файлу tempDb
const tempDbPath = path.join(__dirname, '../database/temp-db.json');

/**
 * Генерирует UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Форматирует дату для MySQL
 */
function formatDateForMySQL(date) {
  if (!date) return null;
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Читает данные из tempDb
 */
function readTempDb() {
  try {
    if (!fs.existsSync(tempDbPath)) {
      console.log('⚠️  Файл temp-db.json не найден');
      return null;
    }
    
    const data = fs.readFileSync(tempDbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Ошибка чтения temp-db.json:', error);
    return null;
  }
}

/**
 * Создает подключение к MySQL
 */
async function createConnection() {
  try {
    const connection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Подключение к MySQL установлено');
    return connection;
  } catch (error) {
    console.error('❌ Ошибка подключения к MySQL:', error);
    throw error;
  }
}

/**
 * Инициализирует базу данных MySQL
 */
async function initializeDatabase(connection) {
  try {
    console.log('🚀 Инициализация базы данных MySQL...');
    
    // Читаем SQL схему
    const schemaPath = path.join(__dirname, '../database/mysql_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Выполняем схему
    await connection.query(schema);
    
    console.log('✅ База данных MySQL инициализирована');
  } catch (error) {
    console.error('❌ Ошибка инициализации базы данных:', error);
    throw error;
  }
}

/**
 * Мигрирует пользователей
 */
async function migrateUsers(connection, tempData) {
  if (!tempData.users || tempData.users.length === 0) {
    console.log('ℹ️  Пользователи для миграции не найдены');
    return;
  }
  
  console.log(`🔄 Миграция ${tempData.users.length} пользователей...`);
  
  for (const user of tempData.users) {
    try {
      const query = `
        INSERT INTO users (
          id, name, email, password_hash, role, approval_status, 
          avatar, telegram_chat_id, telegram_username, notification_settings,
          last_login_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          password_hash = VALUES(password_hash),
          role = VALUES(role),
          approval_status = VALUES(approval_status),
          updated_at = VALUES(updated_at)
      `;
      
      const params = [
        user.id || generateUUID(),
        user.name,
        user.email,
        user.password,
        user.role || 'user',
        user.approvalStatus || 'approved',
        user.avatar || null,
        user.telegramChatId || null,
        user.telegramUsername || null,
        JSON.stringify(user.notificationSettings || {
          email: true,
          telegram: false,
          browser: true,
          taskAssigned: true,
          taskCompleted: true,
          projectUpdates: true
        }),
        formatDateForMySQL(user.lastLoginAt),
        formatDateForMySQL(user.createdAt || new Date()),
        formatDateForMySQL(user.updatedAt || new Date())
      ];
      
      await connection.execute(query, params);
      console.log(`  ✅ Пользователь ${user.email} мигрирован`);
    } catch (error) {
      console.error(`  ❌ Ошибка миграции пользователя ${user.email}:`, error.message);
    }
  }
  
  console.log('✅ Миграция пользователей завершена');
}

/**
 * Мигрирует проекты
 */
async function migrateProjects(connection, tempData) {
  if (!tempData.projects || tempData.projects.length === 0) {
    console.log('ℹ️  Проекты для миграции не найдены');
    return;
  }
  
  console.log(`🔄 Миграция ${tempData.projects.length} проектов...`);
  
  for (const project of tempData.projects) {
    try {
      const query = `
        INSERT INTO projects (
          id, name, description, color, creator_id, telegram_chat_id, 
          telegram_topic_id, is_archived, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          description = VALUES(description),
          color = VALUES(color),
          updated_at = VALUES(updated_at)
      `;
      
      const params = [
        project.id || generateUUID(),
        project.name,
        project.description || null,
        project.color || '#6366f1',
        project.creatorId || 'admin-user-id',
        project.telegramChatId || null,
        project.telegramTopicId || null,
        project.isArchived || false,
        formatDateForMySQL(project.createdAt || new Date()),
        formatDateForMySQL(project.updatedAt || new Date())
      ];
      
      await connection.execute(query, params);
      console.log(`  ✅ Проект ${project.name} мигрирован`);
    } catch (error) {
      console.error(`  ❌ Ошибка миграции проекта ${project.name}:`, error.message);
    }
  }
  
  console.log('✅ Миграция проектов завершена');
}

/**
 * Мигрирует доски
 */
async function migrateBoards(connection, tempData) {
  if (!tempData.boards || tempData.boards.length === 0) {
    console.log('ℹ️  Доски для миграции не найдены');
    return;
  }
  
  console.log(`🔄 Миграция ${tempData.boards.length} досок...`);
  
  for (const board of tempData.boards) {
    try {
      const query = `
        INSERT INTO boards (
          id, name, description, project_id, icon, position, 
          is_default, is_archived, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          description = VALUES(description),
          icon = VALUES(icon),
          position = VALUES(position),
          updated_at = VALUES(updated_at)
      `;
      
      const params = [
        board.id || generateUUID(),
        board.name,
        board.description || null,
        board.projectId,
        board.icon || 'kanban',
        board.position || 0,
        board.isDefault || false,
        board.isArchived || false,
        formatDateForMySQL(board.createdAt || new Date()),
        formatDateForMySQL(board.updatedAt || new Date())
      ];
      
      await connection.execute(query, params);
      console.log(`  ✅ Доска ${board.name} мигрирована`);
    } catch (error) {
      console.error(`  ❌ Ошибка миграции доски ${board.name}:`, error.message);
    }
  }
  
  console.log('✅ Миграция досок завершена');
}

/**
 * Мигрирует колонки
 */
async function migrateColumns(connection, tempData) {
  if (!tempData.columns || tempData.columns.length === 0) {
    console.log('ℹ️  Колонки для миграции не найдены');
    return;
  }
  
  console.log(`🔄 Миграция ${tempData.columns.length} колонок...`);
  
  for (const column of tempData.columns) {
    try {
      const query = `
        INSERT INTO columns (
          id, title, board_id, position, color, task_limit, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          position = VALUES(position),
          color = VALUES(color),
          task_limit = VALUES(task_limit),
          updated_at = VALUES(updated_at)
      `;
      
      const params = [
        column.id || generateUUID(),
        column.title,
        column.boardId,
        column.position || 0,
        column.color || '#6366f1',
        column.taskLimit || null,
        formatDateForMySQL(column.createdAt || new Date()),
        formatDateForMySQL(column.updatedAt || new Date())
      ];
      
      await connection.execute(query, params);
      console.log(`  ✅ Колонка ${column.title} мигрирована`);
    } catch (error) {
      console.error(`  ❌ Ошибка миграции колонки ${column.title}:`, error.message);
    }
  }
  
  console.log('✅ Миграция колонок завершена');
}

/**
 * Мигрирует задачи
 */
async function migrateTasks(connection, tempData) {
  if (!tempData.tasks || tempData.tasks.length === 0) {
    console.log('ℹ️  Задачи для миграции не найдены');
    return;
  }
  
  console.log(`🔄 Миграция ${tempData.tasks.length} задач...`);
  
  for (const task of tempData.tasks) {
    try {
      const query = `
        INSERT INTO tasks (
          id, title, description, status, priority, project_id, board_id, 
          column_id, reporter_id, parent_task_id, position, story_points, 
          estimated_hours, actual_hours, deadline, is_archived, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          description = VALUES(description),
          status = VALUES(status),
          priority = VALUES(priority),
          column_id = VALUES(column_id),
          position = VALUES(position),
          updated_at = VALUES(updated_at)
      `;
      
      const params = [
        task.id || generateUUID(),
        task.title,
        task.description || null,
        task.status || 'todo',
        task.priority || 'medium',
        task.projectId,
        task.boardId,
        task.columnId || null,
        task.reporterId || 'admin-user-id',
        task.parentTaskId || null,
        task.position || 0,
        task.storyPoints || null,
        task.estimatedHours || null,
        task.actualHours || null,
        formatDateForMySQL(task.deadline),
        task.isArchived || false,
        formatDateForMySQL(task.createdAt || new Date()),
        formatDateForMySQL(task.updatedAt || new Date())
      ];
      
      await connection.execute(query, params);
      console.log(`  ✅ Задача ${task.title} мигрирована`);
    } catch (error) {
      console.error(`  ❌ Ошибка миграции задачи ${task.title}:`, error.message);
    }
  }
  
  console.log('✅ Миграция задач завершена');
}

/**
 * Мигрирует сессии
 */
async function migrateSessions(connection, tempData) {
  if (!tempData.user_sessions || tempData.user_sessions.length === 0) {
    console.log('ℹ️  Сессии для миграции не найдены');
    return;
  }
  
  console.log(`🔄 Миграция ${tempData.user_sessions.length} сессий...`);
  
  for (const session of tempData.user_sessions) {
    try {
      // Пропускаем истекшие сессии
      if (new Date(session.expiresAt) < new Date()) {
        console.log(`  ⏭️  Пропуск истекшей сессии ${session.token}`);
        continue;
      }
      
      const query = `
        INSERT INTO user_sessions (
          id, user_id, session_token, refresh_token, ip_address, 
          user_agent, expires_at, created_at, last_activity_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          expires_at = VALUES(expires_at),
          last_activity_at = VALUES(last_activity_at)
      `;
      
      const params = [
        session.id || generateUUID(),
        session.userId,
        session.token,
        session.refreshToken || null,
        session.ipAddress || null,
        session.userAgent || null,
        formatDateForMySQL(session.expiresAt),
        formatDateForMySQL(session.createdAt || new Date()),
        formatDateForMySQL(session.lastActivityAt || new Date())
      ];
      
      await connection.execute(query, params);
      console.log(`  ✅ Сессия мигрирована`);
    } catch (error) {
      console.error(`  ❌ Ошибка миграции сессии:`, error.message);
    }
  }
  
  console.log('✅ Миграция сессий завершена');
}

/**
 * Создает резервную копию tempDb
 */
function backupTempDb() {
  try {
    const backupPath = path.join(__dirname, '../database/temp-db-backup.json');
    fs.copyFileSync(tempDbPath, backupPath);
    console.log('✅ Резервная копия temp-db.json создана');
  } catch (error) {
    console.error('❌ Ошибка создания резервной копии:', error);
  }
}

/**
 * Основная функция миграции
 */
async function main() {
  console.log('🚀 Начало миграции данных из TempDB в MySQL');
  console.log('=' .repeat(50));
  
  let connection;
  
  try {
    // Читаем данные из tempDb
    const tempData = readTempDb();
    if (!tempData) {
      console.log('❌ Не удалось прочитать данные из temp-db.json');
      process.exit(1);
    }
    
    // Создаем резервную копию
    backupTempDb();
    
    // Подключаемся к MySQL
    connection = await createConnection();
    
    // Инициализируем базу данных
    await initializeDatabase(connection);
    
    // Выполняем миграцию в правильном порядке
    await migrateUsers(connection, tempData);
    await migrateProjects(connection, tempData);
    await migrateBoards(connection, tempData);
    await migrateColumns(connection, tempData);
    await migrateTasks(connection, tempData);
    await migrateSessions(connection, tempData);
    
    console.log('=' .repeat(50));
    console.log('🎉 Миграция успешно завершена!');
    console.log('📊 Статистика миграции:');
    console.log(`   👥 Пользователи: ${tempData.users?.length || 0}`);
    console.log(`   📁 Проекты: ${tempData.projects?.length || 0}`);
    console.log(`   📋 Доски: ${tempData.boards?.length || 0}`);
    console.log(`   📝 Колонки: ${tempData.columns?.length || 0}`);
    console.log(`   ✅ Задачи: ${tempData.tasks?.length || 0}`);
    console.log(`   🔐 Сессии: ${tempData.user_sessions?.length || 0}`);
    console.log('');
    console.log('💡 Рекомендации:');
    console.log('   1. Обновите переменные окружения для использования MySQL');
    console.log('   2. Перезапустите приложение');
    console.log('   3. Проверьте работу всех функций');
    console.log('   4. Резервная копия сохранена в temp-db-backup.json');
    
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Соединение с MySQL закрыто');
    }
  }
}

// Запуск миграции
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  main,
  migrateUsers,
  migrateProjects,
  migrateBoards,
  migrateColumns,
  migrateTasks,
  migrateSessions
};