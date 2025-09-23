// =====================================================
// КОНФИГУРАЦИЯ ПОДКЛЮЧЕНИЯ К MYSQL
// =====================================================

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Конфигурация подключения к MySQL
const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'encore_tasks_db',
  charset: 'utf8mb4',
  timezone: '+00:00',
  
  // Настройки пула соединений
  connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT) || 10,
  acquireTimeout: parseInt(process.env.MYSQL_ACQUIRE_TIMEOUT) || 60000,
  timeout: parseInt(process.env.MYSQL_TIMEOUT) || 60000,
  reconnect: true,
  
  // SSL настройки (если требуется)
  ssl: process.env.MYSQL_SSL === 'true' ? {
    rejectUnauthorized: process.env.MYSQL_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : false,
  
  // Дополнительные настройки
  multipleStatements: true,
  dateStrings: false,
  supportBigNumbers: true,
  bigNumberStrings: false,
  
  // Настройки для работы с JSON
  jsonStrings: false,
  
  // Настройки для отладки (только для разработки)
  debug: process.env.NODE_ENV === 'development' && process.env.MYSQL_DEBUG === 'true'
};

// Создание пула соединений
let pool = null;
let isConnected = false;

/**
 * Создает пул соединений с MySQL
 * @returns {Promise<mysql.Pool>}
 */
async function createPool() {
  try {
    if (pool) {
      return pool;
    }
    
    pool = mysql.createPool(mysqlConfig);
    
    // Тестируем соединение
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    
    isConnected = true;
    console.log('✅ MySQL: Пул соединений создан успешно');
    
    // Обработчики событий пула
    pool.on('connection', (connection) => {
      console.log(`🔗 MySQL: Новое соединение установлено (ID: ${connection.threadId})`);
    });
    
    pool.on('error', (err) => {
      console.error('❌ MySQL: Ошибка пула соединений:', err);
      isConnected = false;
      
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('🔄 MySQL: Попытка переподключения...');
        setTimeout(() => {
          createPool();
        }, 2000);
      }
    });
    
    return pool;
  } catch (error) {
    console.error('❌ MySQL: Ошибка создания пула соединений:', error);
    isConnected = false;
    throw error;
  }
}

/**
 * Проверяет доступность MySQL
 * @returns {Promise<boolean>}
 */
async function isMySQLAvailable() {
  try {
    if (!pool) {
      await createPool();
    }
    
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    
    isConnected = true;
    return true;
  } catch (error) {
    console.error('❌ MySQL: Проверка доступности не удалась:', error.message);
    isConnected = false;
    return false;
  }
}

/**
 * Выполняет SQL запрос
 * @param {string} query - SQL запрос
 * @param {Array} params - Параметры запроса
 * @returns {Promise<Array>}
 */
async function executeQuery(query, params = []) {
  try {
    if (!pool) {
      await createPool();
    }
    
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    console.error('❌ MySQL: Ошибка выполнения запроса:', error);
    throw error;
  }
}

/**
 * Выполняет транзакцию
 * @param {Function} callback - Функция с операциями транзакции
 * @returns {Promise<any>}
 */
async function executeTransaction(callback) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const result = await callback(connection);
    
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Инициализирует базу данных (создает таблицы)
 * @returns {Promise<void>}
 */
async function initializeDatabase() {
  try {
    console.log('🚀 MySQL: Инициализация базы данных...');
    
    // Читаем SQL схему
    const schemaPath = path.join(__dirname, 'mysql_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Разделяем на отдельные запросы
    const queries = schema
      .split(';')
      .map(query => query.trim())
      .filter(query => query.length > 0 && !query.startsWith('--'));
    
    // Выполняем каждый запрос
    for (const query of queries) {
      if (query.trim()) {
        try {
          await executeQuery(query);
        } catch (error) {
          // Игнорируем ошибки "уже существует"
          if (!error.message.includes('already exists') && 
              !error.message.includes('Duplicate entry')) {
            console.error('❌ MySQL: Ошибка выполнения запроса:', query.substring(0, 100) + '...');
            throw error;
          }
        }
      }
    }
    
    console.log('✅ MySQL: База данных инициализирована успешно');
  } catch (error) {
    console.error('❌ MySQL: Ошибка инициализации базы данных:', error);
    throw error;
  }
}

/**
 * Закрывает пул соединений
 * @returns {Promise<void>}
 */
async function closePool() {
  try {
    if (pool) {
      await pool.end();
      pool = null;
      isConnected = false;
      console.log('✅ MySQL: Пул соединений закрыт');
    }
  } catch (error) {
    console.error('❌ MySQL: Ошибка закрытия пула:', error);
  }
}

/**
 * Получает информацию о состоянии подключения
 * @returns {Object}
 */
function getConnectionInfo() {
  return {
    isConnected,
    config: {
      host: mysqlConfig.host,
      port: mysqlConfig.port,
      database: mysqlConfig.database,
      user: mysqlConfig.user
    },
    poolInfo: pool ? {
      totalConnections: pool._allConnections?.length || 0,
      freeConnections: pool._freeConnections?.length || 0,
      acquiringConnections: pool._acquiringConnections?.length || 0
    } : null
  };
}

/**
 * Генерирует UUID v4
 * @returns {string}
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
 * @param {Date} date
 * @returns {string}
 */
function formatDateForMySQL(date = new Date()) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// Обработка завершения процесса
process.on('SIGINT', async () => {
  console.log('🔄 MySQL: Получен сигнал SIGINT, закрываем соединения...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 MySQL: Получен сигнал SIGTERM, закрываем соединения...');
  await closePool();
  process.exit(0);
});

module.exports = {
  mysqlConfig,
  createPool,
  isMySQLAvailable,
  executeQuery,
  executeTransaction,
  initializeDatabase,
  closePool,
  getConnectionInfo,
  generateUUID,
  formatDateForMySQL,
  get pool() { return pool; },
  get isConnected() { return isConnected; }
};