#!/usr/bin/env node

/**
 * Скрипт для очистки базы данных Encore Tasks
 * Удаляет устаревшие данные согласно политикам хранения
 * 
 * Использование:
 *   node scripts/cleanup.js [options]
 * 
 * Опции:
 *   --dry-run      Показать что будет удалено без фактического удаления
 *   --force        Принудительная очистка без подтверждения
 *   --logs-only    Очистить только логи активности
 *   --sessions-only Очистить только истекшие сессии
 */

const { Pool } = require('pg');
require('dotenv').config();

// Централизованная конфигурация базы данных
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'encore_tasks',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(dbConfig);

// Конфигурация очистки
const cleanupConfig = {
  logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS) || 90,
  sessionRetentionDays: parseInt(process.env.SESSION_RETENTION_DAYS) || 7,
  notificationRetentionDays: 30, // Уведомления старше 30 дней
  archivedTaskRetentionDays: 365, // Архивированные задачи старше года
  deletedProjectRetentionDays: 30 // Удаленные проекты старше 30 дней
};

// Парсинг аргументов командной строки
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    force: false,
    logsOnly: false,
    sessionsOnly: false
  };
  
  for (const arg of args) {
    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--logs-only':
        options.logsOnly = true;
        break;
      case '--sessions-only':
        options.sessionsOnly = true;
        break;
    }
  }
  
  return options;
}

// Функция для получения подтверждения пользователя
function askForConfirmation(message) {
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question(`${message} (y/N): `, (answer) => {
      readline.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Очистка логов активности
async function cleanupActivityLogs(client, options) {
  console.log('📋 Очистка логов активности...');
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - cleanupConfig.logRetentionDays);
  
  // Подсчитываем количество записей для удаления
  const countResult = await client.query(`
    SELECT COUNT(*) as count
    FROM activity_logs
    WHERE created_at < $1
  `, [cutoffDate]);
  
  const recordsToDelete = parseInt(countResult.rows[0].count);
  
  if (recordsToDelete === 0) {
    console.log('  ✓ Устаревших логов не найдено');
    return 0;
  }
  
  console.log(`  📊 Найдено ${recordsToDelete} записей старше ${cleanupConfig.logRetentionDays} дней`);
  
  if (options.dryRun) {
    console.log('  🔍 Режим просмотра: записи не будут удалены');
    return recordsToDelete;
  }
  
  // Удаляем записи пакетами для избежания блокировок
  const batchSize = 1000;
  let totalDeleted = 0;
  
  while (totalDeleted < recordsToDelete) {
    const result = await client.query(`
      DELETE FROM activity_logs
      WHERE id IN (
        SELECT id FROM activity_logs
        WHERE created_at < $1
        ORDER BY created_at
        LIMIT $2
      )
    `, [cutoffDate, batchSize]);
    
    const deletedInBatch = result.rowCount;
    totalDeleted += deletedInBatch;
    
    if (deletedInBatch === 0) break;
    
    console.log(`  🗑️  Удалено ${totalDeleted}/${recordsToDelete} записей`);
  }
  
  console.log(`  ✅ Очистка логов завершена: удалено ${totalDeleted} записей`);
  return totalDeleted;
}

// Очистка истекших сессий
async function cleanupExpiredSessions(client, options) {
  console.log('🔐 Очистка истекших сессий...');
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - cleanupConfig.sessionRetentionDays);
  
  // Подсчитываем количество сессий для удаления
  const countResult = await client.query(`
    SELECT COUNT(*) as count
    FROM user_sessions
    WHERE (expires_at < NOW() OR last_activity_at < $1)
  `, [cutoffDate]);
  
  const sessionsToDelete = parseInt(countResult.rows[0].count);
  
  if (sessionsToDelete === 0) {
    console.log('  ✓ Истекших сессий не найдено');
    return 0;
  }
  
  console.log(`  📊 Найдено ${sessionsToDelete} истекших сессий`);
  
  if (options.dryRun) {
    console.log('  🔍 Режим просмотра: сессии не будут удалены');
    return sessionsToDelete;
  }
  
  const result = await client.query(`
    DELETE FROM user_sessions
    WHERE (expires_at < NOW() OR last_activity_at < $1)
  `, [cutoffDate]);
  
  console.log(`  ✅ Удалено ${result.rowCount} истекших сессий`);
  return result.rowCount;
}

// Очистка старых уведомлений
async function cleanupOldNotifications(client, options) {
  console.log('🔔 Очистка старых уведомлений...');
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - cleanupConfig.notificationRetentionDays);
  
  // Подсчитываем количество уведомлений для удаления
  const countResult = await client.query(`
    SELECT COUNT(*) as count
    FROM notifications
    WHERE created_at < $1 AND is_read = true
  `, [cutoffDate]);
  
  const notificationsToDelete = parseInt(countResult.rows[0].count);
  
  if (notificationsToDelete === 0) {
    console.log('  ✓ Старых прочитанных уведомлений не найдено');
    return 0;
  }
  
  console.log(`  📊 Найдено ${notificationsToDelete} старых прочитанных уведомлений`);
  
  if (options.dryRun) {
    console.log('  🔍 Режим просмотра: уведомления не будут удалены');
    return notificationsToDelete;
  }
  
  const result = await client.query(`
    DELETE FROM notifications
    WHERE created_at < $1 AND is_read = true
  `, [cutoffDate]);
  
  console.log(`  ✅ Удалено ${result.rowCount} старых уведомлений`);
  return result.rowCount;
}

// Очистка архивированных задач
async function cleanupArchivedTasks(client, options) {
  console.log('📦 Очистка старых архивированных задач...');
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - cleanupConfig.archivedTaskRetentionDays);
  
  // Подсчитываем количество задач для удаления
  const countResult = await client.query(`
    SELECT COUNT(*) as count
    FROM tasks
    WHERE is_archived = true AND archived_at < $1
  `, [cutoffDate]);
  
  const tasksToDelete = parseInt(countResult.rows[0].count);
  
  if (tasksToDelete === 0) {
    console.log('  ✓ Старых архивированных задач не найдено');
    return 0;
  }
  
  console.log(`  📊 Найдено ${tasksToDelete} старых архивированных задач`);
  
  if (options.dryRun) {
    console.log('  🔍 Режим просмотра: задачи не будут удалены');
    return tasksToDelete;
  }
  
  // Удаляем связанные данные и сами задачи
  const taskIds = await client.query(`
    SELECT id FROM tasks
    WHERE is_archived = true AND archived_at < $1
  `, [cutoffDate]);
  
  if (taskIds.rows.length > 0) {
    const ids = taskIds.rows.map(row => row.id);
    
    // Удаляем связанные данные
    await client.query(`DELETE FROM task_tags WHERE task_id = ANY($1)`, [ids]);
    await client.query(`DELETE FROM task_assignees WHERE task_id = ANY($1)`, [ids]);
    await client.query(`DELETE FROM comments WHERE task_id = ANY($1)`, [ids]);
    await client.query(`DELETE FROM attachments WHERE task_id = ANY($1)`, [ids]);
    
    // Удаляем сами задачи
    const result = await client.query(`
      DELETE FROM tasks WHERE id = ANY($1)
    `, [ids]);
    
    console.log(`  ✅ Удалено ${result.rowCount} архивированных задач`);
    return result.rowCount;
  }
  
  return 0;
}

// Оптимизация таблиц после очистки
async function optimizeTables(client, options) {
  console.log('⚡ Оптимизация таблиц...');
  
  if (options.dryRun) {
    console.log('  🔍 Режим просмотра: оптимизация не будет выполнена');
    return;
  }
  
  const tables = [
    'activity_logs',
    'user_sessions', 
    'notifications',
    'tasks',
    'comments',
    'attachments'
  ];
  
  for (const table of tables) {
    try {
      await client.query(`VACUUM ANALYZE ${table}`);
      console.log(`  ✓ Таблица ${table} оптимизирована`);
    } catch (error) {
      console.warn(`  ⚠️  Ошибка оптимизации таблицы ${table}: ${error.message}`);
    }
  }
}

// Получение статистики базы данных
async function getDatabaseStats(client) {
  console.log('📊 Статистика базы данных:');
  
  const queries = [
    { name: 'Пользователи', query: 'SELECT COUNT(*) as count FROM users' },
    { name: 'Проекты', query: 'SELECT COUNT(*) as count FROM projects' },
    { name: 'Задачи', query: 'SELECT COUNT(*) as count FROM tasks' },
    { name: 'Активные сессии', query: 'SELECT COUNT(*) as count FROM user_sessions WHERE expires_at > NOW()' },
    { name: 'Логи активности', query: 'SELECT COUNT(*) as count FROM activity_logs' },
    { name: 'Уведомления', query: 'SELECT COUNT(*) as count FROM notifications' }
  ];
  
  for (const { name, query } of queries) {
    try {
      const result = await client.query(query);
      const count = parseInt(result.rows[0].count);
      console.log(`   ${name}: ${count.toLocaleString()}`);
    } catch (error) {
      console.log(`   ${name}: ошибка получения данных`);
    }
  }
}

// Основная функция очистки
async function performCleanup(options) {
  console.log('🧹 Очистка базы данных Encore Tasks\n');
  
  if (options.dryRun) {
    console.log('🔍 РЕЖИМ ПРОСМОТРА: никакие данные не будут удалены\n');
  }
  
  const client = await pool.connect();
  
  try {
    // Показываем текущую статистику
    await getDatabaseStats(client);
    console.log('');
    
    // Запрашиваем подтверждение если не в режиме просмотра и не принудительно
    if (!options.dryRun && !options.force) {
      const confirmed = await askForConfirmation('Продолжить очистку базы данных?');
      if (!confirmed) {
        console.log('❌ Очистка отменена пользователем');
        return;
      }
      console.log('');
    }
    
    await client.query('BEGIN');
    
    let totalCleaned = 0;
    
    // Выполняем очистку в зависимости от опций
    if (!options.sessionsOnly) {
      totalCleaned += await cleanupActivityLogs(client, options);
      totalCleaned += await cleanupOldNotifications(client, options);
      totalCleaned += await cleanupArchivedTasks(client, options);
    }
    
    if (!options.logsOnly) {
      totalCleaned += await cleanupExpiredSessions(client, options);
    }
    
    // Оптимизируем таблицы после очистки
    if (totalCleaned > 0) {
      await optimizeTables(client, options);
    }
    
    await client.query('COMMIT');
    
    console.log('');
    if (options.dryRun) {
      console.log(`🔍 Режим просмотра завершен. Найдено ${totalCleaned} записей для удаления`);
    } else {
      console.log(`✅ Очистка завершена успешно. Удалено ${totalCleaned} записей`);
    }
    
    // Показываем обновленную статистику
    if (!options.dryRun && totalCleaned > 0) {
      console.log('');
      await getDatabaseStats(client);
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Проверка переменных окружения
function validateEnvironment() {
  const required = ['DB_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Отсутствуют обязательные переменные окружения:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Создайте файл .env на основе .env.example');
    process.exit(1);
  }
}

// Основная функция
async function main() {
  console.log('🚀 Система очистки базы данных Encore Tasks\n');
  
  validateEnvironment();
  
  const options = parseArgs();
  
  console.log('⚙️  Конфигурация очистки:');
  console.log(`   Логи активности: ${cleanupConfig.logRetentionDays} дней`);
  console.log(`   Сессии: ${cleanupConfig.sessionRetentionDays} дней`);
  console.log(`   Уведомления: ${cleanupConfig.notificationRetentionDays} дней`);
  console.log(`   Архивированные задачи: ${cleanupConfig.archivedTaskRetentionDays} дней\n`);
  
  try {
    await performCleanup(options);
    
    console.log('\n🎉 Очистка базы данных завершена!');
    
  } catch (error) {
    console.error('❌ Ошибка при очистке базы данных:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Запускаем скрипт
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Неожиданная ошибка:', error);
    process.exit(1);
  });
}

module.exports = { performCleanup };